import { GoogleGenAI, Type } from "@google/genai";
import db from "./db.js";
import { getGeminiClient, generateContentWithRetry, getModelForAgent } from "./gemini_client.js";

export interface ExtensionDraft {
  taskId: number;
  taskTitle: string;
  recipient: string;
  subject: string;
  body: string;
}

export interface StrategistResult {
  feasibilityAnalysis: string; // Markdown text (Honest reality-check, comparing required hours vs remaining hours)
  triageRecommendations: {
    taskId: number;
    title: string;
    action: "START IMMEDIATELY" | "MINIMIZE" | "REQUEST EXTENSION" | "DELEGATE" | "MONITOR";
    reason: string;
    priority: "high" | "medium" | "low";
  }[];
  extensionDrafts: ExtensionDraft[];
}

export async function runStrategist(userId: number): Promise<StrategistResult> {
  try {
    // 1. Fetch incomplete tasks for the user
    const tasks = db.prepare(`
      SELECT id, title, description, deadline, status, urgency, importance, mode, created_at, recipient_email
      FROM tasks
      WHERE user_id = ? AND status != 'completed'
    `).all(userId) as any[];

    // 2. Fetch planned hours from schedule blocks
    const scheduleBlocks = db.prepare(`
      SELECT sb.*
      FROM schedule_blocks sb
      JOIN tasks t ON sb.task_id = t.id
      WHERE t.user_id = ? AND t.status != 'completed'
    `).all(userId) as any[];

    // Fallback if no tasks
    if (tasks.length === 0) {
      return {
        feasibilityAnalysis: "You currently have no active or pending tasks. Your workspace is perfectly optimized!",
        triageRecommendations: [],
        extensionDrafts: []
      };
    }

    // Prepare time parameters
    const now = new Date();
    // Use IST (UTC+5:30) for the strategizer's perspective
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + istOffset);
    const nowStr = nowIST.toISOString().replace('Z', ' (IST)');

    // Map tasks and calculate remaining hours to deadline
    const tasksWithMetadata = tasks.map(t => {
      const msDiff = t.deadline ? (new Date(t.deadline).getTime() - now.getTime()) : null;
      const hoursRemaining = msDiff !== null ? msDiff / (1000 * 60 * 60) : null;
      
      // Calculate budgeted hours in DB
      const blocksForTask = scheduleBlocks.filter(b => b.task_id === t.id);
      const budgetedHours = blocksForTask.reduce((sum, b) => sum + b.planned_hours, 0);

      return {
        id: t.id,
        title: t.title,
        description: t.description || "",
        deadline: t.deadline,
        urgency: t.urgency,
        importance: t.importance,
        mode: t.mode,
        hoursRemaining,
        budgetedHours,
        recipient_email: t.recipient_email
      };
    });

    const aiClient = getGeminiClient();
    // If Gemini is not configured, return a basic calculated fallback
    if (!aiClient) {
      console.warn("Gemini is not configured. Creating deterministic strategist fallback.");
      
      let totalNeeded = 0;
      let totalAvailable = 0;
      let minHoursRemaining = Infinity;

      tasksWithMetadata.forEach(t => {
        totalNeeded += t.budgetedHours || 2; // Default to 2 hours if not budgeted
        if (t.hoursRemaining !== null) {
          totalAvailable = Math.max(totalAvailable, t.hoursRemaining);
          minHoursRemaining = Math.min(minHoursRemaining, t.hoursRemaining);
        }
      });

      const feasibilityAnalysis = `**Deterministic Fallback Reality Check**:
You have ${tasksWithMetadata.length} active tasks totaling approximately ${totalNeeded.toFixed(1)} hours of required work. 
The nearest deadline is in ${(minHoursRemaining === Infinity ? 0 : minHoursRemaining).toFixed(1)} hours.
${totalNeeded > totalAvailable ? "⚠️ WARNING: Workload exceeds maximum available window. Proactive triage advised." : "✅ Feasible: You have sufficient time buffers to complete this work."}`;

      const triageRecommendations = tasksWithMetadata.map(t => {
        let action: any = "MONITOR";
        let reason = "Task has a safe deadline margin.";
        if (t.hoursRemaining !== null && t.hoursRemaining < 24) {
          action = t.importance === 'high' ? "START IMMEDIATELY" : "REQUEST EXTENSION";
          reason = `Due in ${t.hoursRemaining.toFixed(1)} hours. Stakes are ${t.importance}.`;
        } else if (t.hoursRemaining !== null && t.hoursRemaining < 72) {
          action = "START IMMEDIATELY";
          reason = "Due within 3 days; schedule blocks are active.";
        }
        return {
          taskId: t.id,
          title: t.title,
          action,
          reason,
          priority: t.importance as any
        };
      });

      const extensionDrafts = tasksWithMetadata
        .filter(t => t.importance === 'high' || (t.hoursRemaining !== null && t.hoursRemaining < 36))
        .map(t => ({
          taskId: t.id,
          taskTitle: t.title,
          recipient: t.mode === 'autopilot' && t.recipient_email ? t.recipient_email : "professor@university.edu",
          subject: `Polite Request for Extension: ${t.title}`,
          body: `Dear Professor/Manager,\n\nI hope this message finds you well.\n\nI am writing to politely request a short extension on the submission deadline for "${t.title}". Due to an unexpected alignment of several high-priority responsibilities this week, I want to ensure the final deliverable meets the highest standards of quality rather than rushing to meet the current milestone.\n\nWould it be possible to adjust the submission window by 24 to 48 hours? I am fully prepared to deliver the completed work by then.\n\nThank you very much for your understanding and consideration.\n\nSincerely,\n[Your Name]`
        }));

      return { feasibilityAnalysis, triageRecommendations, extensionDrafts };
    }

    // 3. Query Gemini for precise cognitive triage & reality-check
    const systemInstruction = `
You are SAUVEUR The Strategist, an elite proactive triage and safety-auditing agent.
Your core goal is to run a high-fidelity "Reality Check" and "Triage by Stakes" on the user's active task pipeline.
You reason deeply about available time vs. required workloads, providing raw, honest, encouraging, yet perfectly realistic advice (never sugarcoated "AI slop", but true human-like cognitive judgment).

=== CORE BEHAVIOR RULES ===
1. REALITY-CHECK: Compare the total estimated hours needed against the actual remaining time to nearest deadlines. If they have 14h of work and 6h left, say so honestly and provide a concrete action plan.
2. TRIAGE BY STAKES: When deadlines are less than 36 hours (~1 day) away, ruthlessly rank what to start immediately, what to minimize (do a basic version), and what to request an extension on, based on task importance and gravity.
3. DEEP CONTENT ANALYSIS: FOR EVERY TASK, YOU MUST READ BOTH THE 'title' AND THE 'description' TO INFER REALISTIC EFFORT. Do NOT use generic shortcuts or default 1.5-hour estimations. If a task says "Read 1000-page book", recognize this takes dozens of hours, not 1.5 hours. Your estimation must be grounded in the text content, not generic defaults.
4. EXTENSION MAILS: Be realistic. Note honestly in your analysis that not all professors/managers grant extensions and sometimes a slightly late submission beats asking. Draft exceptionally polite, tailored extension-request emails for tasks where extensions are highly recommended.
5. NO TASK NUMBERS: DO NOT use task number indices (e.g., "Task 6", "Task 7") anywhere in your response or in "feasibilityAnalysis". Always refer to tasks solely by their descriptive title or a human-friendly shorthand (e.g., "your Algorithms Exam review" or "the Book Summary assignment").
`;

    const prompt = `
Current Date & Time: ${nowStr}

Active tasks in pipeline:
${JSON.stringify(tasksWithMetadata, null, 2)}

Provide your strategic analysis. Write a comprehensive markdown reality check as "feasibilityAnalysis".
FOR EACH TASK, FIRST ESTIMATE THE REALISTIC TOTAL HOURS REQUIRED BY ANALYZING THE TITLE AND DESCRIPTION. DO NOT USE GENERIC DEFAULTS.
Categorize each active task into a specific "triageRecommendations" action ("START IMMEDIATELY", "MINIMIZE", "REQUEST EXTENSION", "DELEGATE", "MONITOR") with a clear objective reasoning statement grounded in your realistic effort estimation.
Compile polished, bespoke extension request drafts in "extensionDrafts" for any tasks that are high-stakes, congested, or highly appropriate for extension requests.

Return JSON strictly conforming to this schema:
{
  "feasibilityAnalysis": string, // Markdown text with clear headings, bolding, bullet points.
  "triageRecommendations": [
    {
      "taskId": number,
      "title": string,
      "action": "START IMMEDIATELY" | "MINIMIZE" | "REQUEST EXTENSION" | "DELEGATE" | "MONITOR",
      "reason": string,
      "priority": "high" | "medium" | "low"
    }
  ],
  "extensionDrafts": [
    {
      "taskId": number,
      "taskTitle": string,
      "recipient": string, // suggested email recipient based on task or a standard placeholder like professor@university.edu
      "subject": string,
      "body": string // polite, tailored, high-end request email
    }
  ]
}
`;

    const response = await generateContentWithRetry(aiClient, {
      model: getModelForAgent('STRATEGIST'),
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            feasibilityAnalysis: { type: Type.STRING },
            triageRecommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  taskId: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  action: {
                    type: Type.STRING,
                    enum: ["START IMMEDIATELY", "MINIMIZE", "REQUEST EXTENSION", "DELEGATE", "MONITOR"]
                  },
                  reason: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ["high", "medium", "low"] }
                },
                required: ["taskId", "title", "action", "reason", "priority"]
              }
            },
            extensionDrafts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  taskId: { type: Type.INTEGER },
                  taskTitle: { type: Type.STRING },
                  recipient: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  body: { type: Type.STRING }
                },
                required: ["taskId", "taskTitle", "recipient", "subject", "body"]
              }
            }
          },
          required: ["feasibilityAnalysis", "triageRecommendations", "extensionDrafts"]
        }
      }
    });

    const text = response.text ? response.text.trim() : "{}";
    const result: StrategistResult = JSON.parse(text);

    // Save action log for visibility
    db.prepare(`
      INSERT INTO agent_actions (user_id, agent, action, status, payload_json)
      VALUES (?, 'The Strategist', 'Synthesizing pipeline feasibility and extension triage options', 'completed', ?)
    `).run(
      userId,
      JSON.stringify({
        phase: "Verify",
        perceive: `Inspected ${tasksWithMetadata.length} pending tasks with estimated load of ${tasksWithMetadata.reduce((acc, t) => acc + (t.budgetedHours || 2), 0)} hours.`,
        reason: "Calculated task deadlines congestion curves against current server time.",
        act: `Drafted ${result.extensionDrafts.length} extension requests. Formulated custom actions.`,
        verify: "Reality check complete. Safe and clear strategic recommendations generated."
      })
    );

    return result;
  } catch (err) {
    console.error("Strategist failed to run:", err);
    return {
      feasibilityAnalysis: "Strategic analysis currently offline. Please review your deadlines manually in the task list.",
      triageRecommendations: [],
      extensionDrafts: []
    };
  }
}
