import { GoogleGenAI, Type } from "@google/genai";
import db from "./db.js";
import { getGeminiClient, generateContentWithRetry, getModelForAgent } from "./gemini_client.js";

export interface UserTraits {
  traits: string[];
  pace: "deliberate" | "aggressive" | "fast" | "standard";
  riskTolerance: "conservative" | "moderate" | "aggressive";
  focusHours: number[]; // e.g., [9, 12] or [21, 23]
  workStyle: string; // e.g., "deep-focus", "sprint", "erratic"
  planner_instructions: string; // text directions on how the Planner adjusts schedules
  analysis: string; // transparent human-friendly narrative
}

export async function runProfiler(userId: number): Promise<UserTraits | null> {
  try {
    // 1. Fetch user tasks
    const tasks = db.prepare(`
      SELECT id, title, description, deadline, status, urgency, importance, created_at, completed_at 
      FROM tasks 
      WHERE user_id = ?
    `).all(userId) as any[];

    // 2. Fetch existing profile
    const existingRow = db.prepare("SELECT traits_json FROM habit_profile WHERE user_id = ?").get(userId) as any;
    let existingTraits: any = null;
    if (existingRow) {
      try {
        existingTraits = JSON.parse(existingRow.traits_json);
      } catch (_) {}
    }

    const aiClient = getGeminiClient();
    // If Gemini isn't configured, use a sensible default or return existing
    if (!aiClient) {
      console.warn("Gemini is not configured. Skipping Profiler run.");
      if (existingTraits) return existingTraits;
      
      const defaultTraits: UserTraits = {
        traits: ["balanced pacing", "standard task load", "consistent completions"],
        pace: "standard",
        riskTolerance: "moderate",
        focusHours: [9, 12],
        workStyle: "deep-focus",
        planner_instructions: "No special scheduling adjustments. Provide standard balanced workloads.",
        analysis: "SAUVEUR is gathering data to map out your specific behavioral habits."
      };
      return defaultTraits;
    }

    // 3. Process task statistics for prompt context
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === "completed");
    const pendingTasks = tasks.filter(t => t.status !== "completed");
    
    // Check overdue/missed deadlines
    const nowStr = new Date().toISOString();
    const missedTasksCount = tasks.filter(t => t.status !== "completed" && t.deadline && t.deadline < nowStr).length;
    
    // Formatting task details for Gemini
    const taskDetails = tasks.map(t => ({
      title: t.title,
      importance: t.importance,
      status: t.status,
      created_at: t.created_at,
      deadline: t.deadline,
      completed_at: t.completed_at
    }));

    const systemInstruction = `
You are SAUVEUR The Profiler, an elite cognitive behavioral agent that tracks user habits and energy thresholds.
Your goal is to continuously learn how the user behaves with respect to deadlines, task complexity, and completions, compounding your memory over time.
Analyze their task list, deadlines, creation times, completion times, and existing traits.

Deduce core insights such as:
1. Whether they procrastinate (creating/completing close to deadlines, e.g. "chronic last-minute starter").
2. Their productivity pace (e.g. "completes ~8h of work in ~6h — fast" or "takes longer to refine detail").
3. Their reliability/miss rate (e.g. "misses ~30% of deadlines").
4. Their peak focus hours/intervals (e.g. "most productive 9–11pm" or morning person).

You MUST output your insights strictly in JSON format matching the schema requested. Ensure the analysis is professional, transparent, encourages trust, and speaks as a supportive copilot.
`;

    const prompt = `
=== USER TASK HISTORY ===
Total tasks logged: ${totalTasks}
Completed tasks: ${completedTasks.length}
Pending tasks: ${pendingTasks.length}
Deadlines missed: ${missedTasksCount}

Tasks database entries:
${JSON.stringify(taskDetails, null, 2)}

=== EXISTING PROFILE TRAITS ===
${existingTraits ? JSON.stringify(existingTraits, null, 2) : "None (New profile initialization required)"}

=== ACTIONS REQUIRED ===
Analyze the task dataset. Based on task created timestamps, deadlines, and completed times, derive deep, supportive, and transparent conclusions about user traits.
Refine the pacing speed, risk tolerance, focus hours, work style, and write explicit directions for 'The Planner' agent to schedule their work optimally.
- If they are a procrastinator, instruct the Planner to schedule earlier, smaller front-loaded chunks and earlier internal deadlines than the real one.
- If they are a frequent deadline misser, instruct the Planner to schedule tasks to start sooner with explicit per-session hour targets.
- If they are a fast worker, instruct the Planner to allocate tighter, more concentrated budgets.

Return JSON only conforming to this TypeScript definition:
{
  "traits": string[], // 3 to 5 short human readable bullet traits (e.g., ["chronic last-minute starter", "completes ~8h of work in ~6h — fast", "misses ~30% of deadlines", "most productive 9–11pm"])
  "pace": "deliberate" | "aggressive" | "fast" | "standard",
  "riskTolerance": "conservative" | "moderate" | "aggressive",
  "focusHours": number[], // Peak energy hours, e.g. [9, 11] (9am to 11am) or [21, 23] (9pm to 11pm)
  "workStyle": string, // "deep-focus" | "sprint" | "erratic" | "deliberate"
  "planner_instructions": string, // Explicit instructions read by The Planner to adjust scheduling
  "analysis": string // Transparent, friendly, objective narrative of what SAUVEUR has learned about their focus patterns. (approx 2-3 sentences)
}
`;

    // 4. Query Gemini
    const response = await generateContentWithRetry(aiClient, {
      model: getModelForAgent('PROFILER'),
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            traits: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of behavioral traits/insights."
            },
            pace: {
              type: Type.STRING,
              enum: ["deliberate", "aggressive", "fast", "standard"]
            },
            riskTolerance: {
              type: Type.STRING,
              enum: ["conservative", "moderate", "aggressive"]
            },
            focusHours: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
              description: "Two integers representing start and end of peak hour interval."
            },
            workStyle: {
              type: Type.STRING
            },
            planner_instructions: {
              type: Type.STRING,
              description: "Directions for The Planner on how to schedule blocks for this user."
            },
            analysis: {
              type: Type.STRING,
              description: "Friendly transparent summary narrative."
            }
          },
          required: ["traits", "pace", "riskTolerance", "focusHours", "workStyle", "planner_instructions", "analysis"]
        }
      }
    });

    const text = response.text ? response.text.trim() : "{}";
    const result: UserTraits = JSON.parse(text);

    // 5. Update/Insert in database
    db.prepare(`
      INSERT INTO habit_profile (user_id, traits_json, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        traits_json = excluded.traits_json,
        updated_at = CURRENT_TIMESTAMP
    `).run(userId, JSON.stringify(result));

    // 6. Log Agent Action for visibility
    db.prepare(`
      INSERT INTO agent_actions (user_id, agent, action, status, payload_json)
      VALUES (?, 'The Profiler', 'Synthesizing focus and performance traits', 'completed', ?)
    `).run(
      userId,
      JSON.stringify({
        phase: "Act & Verify",
        perceive: `Analyzed ${totalTasks} historical tasks and completion parameters.`,
        reason: `Refined user pace to '${result.pace}', risk tolerance to '${result.riskTolerance}', peak hours to ${JSON.stringify(result.focusHours)}.`,
        act: `Persisted updated traits to habit_profile table.`,
        verify: `Traits successfully saved. Planner instructions compiled: "${result.planner_instructions}"`
      })
    );

    return result;
  } catch (err) {
    console.error("Profiler failed to run:", err);
    return null;
  }
}
