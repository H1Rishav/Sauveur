import { GoogleGenAI } from "@google/genai";
import db from "./db.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

interface PlannerResult {
  roadmap_text: string;
  impossible: boolean;
  impossible_reason: string;
  blocks: { date: string; hours: number }[];
}

export async function runPlannerAgent(taskId: number, userConstraints: string = ""): Promise<PlannerResult | null> {
  try {
    // 1. Fetch task details
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as any;
    if (!task) {
      console.error(`Planner error: Task ${taskId} not found.`);
      return null;
    }

    if (!task.deadline) {
      console.log(`Planner info: Task ${taskId} has no deadline; skipping scheduling roadmap.`);
      return null;
    }

    // 2. Fetch User Profile for work pace & preferred load
    const habitProfileRow = db.prepare("SELECT traits_json FROM habit_profile WHERE user_id = ?").get(task.user_id) as any;
    let userTraitsStr = "pacing: standard, style: balanced";
    if (habitProfileRow) {
      try {
        const traits = JSON.parse(habitProfileRow.traits_json);
        userTraitsStr = `Pacing: ${traits.pace || 'standard'}, Focus hours: ${JSON.stringify(traits.focusHours || [])}, Risk tolerance: ${traits.riskTolerance || 'moderate'}`;
      } catch (_) {}
    }

    // Current local time anchor
    const now = new Date();
    const currentDateStr = now.toISOString().split("T")[0];
    const deadlineDateStr = new Date(task.deadline).toISOString().split("T")[0];

    // Total days range
    const daysRangeText = `Today's date is ${currentDateStr}. The task deadline is ${deadlineDateStr}.`;

    // 3. Consult Gemini to draft a precise roadmap
    if (!ai) {
      // Fallback if Gemini key is missing
      console.warn("Gemini is not configured. Creating simple linear schedule block fallback.");
      const daysDiff = Math.max(1, Math.ceil((new Date(task.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const blocks: { date: string; hours: number }[] = [];
      const hoursPerDay = task.importance === 'high' ? 3 : task.importance === 'medium' ? 1.5 : 0.5;

      for (let i = 0; i < Math.min(daysDiff, 14); i++) {
        const d = new Date();
        d.setDate(now.getDate() + i);
        blocks.push({
          date: d.toISOString().split("T")[0],
          hours: hoursPerDay
        });
      }

      // Save blocks
      db.prepare("DELETE FROM schedule_blocks WHERE task_id = ?").run(taskId);
      const insertBlock = db.prepare("INSERT INTO schedule_blocks (task_id, date, planned_hours) VALUES (?, ?, ?)");
      for (const b of blocks) {
        insertBlock.run(taskId, b.date, b.hours);
      }

      db.prepare(`
        UPDATE tasks 
        SET planner_roadmap = ?, planner_impossible = 0, planner_impossible_reason = NULL 
        WHERE id = ?
      `).run(`Linear scheduling fallback: ${hoursPerDay} hours/day budgeted over ${daysDiff} days.`, taskId);

      return {
        roadmap_text: `Linear scheduling fallback: ${hoursPerDay} hours/day budgeted over ${daysDiff} days.`,
        impossible: false,
        impossible_reason: "",
        blocks
      };
    }

    // Prepare prompt
    const prompt = `
You are SAUVEUR The Planner, an elite cognitive scheduling and resource allocation agent.
A user has a task that must be fully executed and delivered before the specified deadline.
Your goal is to budget a day-by-day hourly work roadmap (stored as schedule_blocks) so the work is completed on time.

=== TASK SPECIFICATION ===
Title: "${task.title}"
Description: "${task.description || 'No description provided.'}"
Deadline Date: "${deadlineDateStr}"
Current Date: "${currentDateStr}"
Importance Level: "${task.importance}" (high requires more hours, medium is standard, low is light)

=== USER TRAITS ===
${userTraitsStr}

=== NEW SCHEDULING CONSTRAINTS / RESHUFFLE COMMANDS ===
User remarks: "${userConstraints || 'None'}" (e.g. "I'm busy Tuesday", "I have an event Day 2", "I cannot work on Friday")

=== RULES OF ENGAGEMENT ===
1. Generate an hour budget for each calendar date starting from "${currentDateStr}" up to and including "${deadlineDateStr}".
2. Adapt the schedule dynamically to the user's remarks. If they are busy on a specific date or day of the week, set the hour budget for that day to 0 (or near 0) and re-distribute/push those hours onto the remaining free days.
3. Total estimated hours should align with the importance:
   - "high" importance: 8 to 18 hours total.
   - "medium" importance: 4 to 8 hours total.
   - "low" importance: 1 to 3 hours total.
4. MAXIMUM hours per single day is 12 hours. If the user constraints and deadline proximity make it mathematically impossible to fit the required hours (e.g. deadline is tomorrow, but the user says they are busy all day today and tomorrow, or the required daily load exceeds 12 hours), set "impossible" to true, state the reasons clearly in "impossible_reason", and distribute the workload as best as physically possible.
5. Provide a beautiful, highly professional and encouraging overview in "roadmap_text" explaining the allocation of hours and pacing strategy.

Respond strictly in JSON format matching this schema:
{
  "roadmap_text": "An elegant, human-centric overview of the daily hour roadmap and strategy.",
  "impossible": false, // true if mathematically impossible to complete on time given the constraints
  "impossible_reason": "", // explanation of the conflict if impossible
  "blocks": [
    { "date": "YYYY-MM-DD", "hours": 2.5 }
  ]
}
Do NOT wrap in markdown block, just return raw JSON.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text ? response.text.trim() : "{}";
    const result: PlannerResult = JSON.parse(text);

    // Save schedule blocks to database
    db.transaction(() => {
      db.prepare("DELETE FROM schedule_blocks WHERE task_id = ?").run(taskId);
      if (result.blocks && Array.isArray(result.blocks)) {
        const insertBlock = db.prepare("INSERT INTO schedule_blocks (task_id, date, planned_hours) VALUES (?, ?, ?)");
        for (const b of result.blocks) {
          if (b.date && typeof b.hours === "number") {
            insertBlock.run(taskId, b.date, Math.max(0, b.hours));
          }
        }
      }

      db.prepare(`
        UPDATE tasks 
        SET planner_roadmap = ?, planner_impossible = ?, planner_impossible_reason = ? 
        WHERE id = ?
      `).run(
        result.roadmap_text || "Schedule successfully budgeted.",
        result.impossible ? 1 : 0,
        result.impossible_reason || null,
        taskId
      );
    })();

    // Log the planning activity in agent_actions
    db.prepare(`
      INSERT INTO agent_actions (user_id, task_id, agent, action, status, payload_json)
      VALUES (?, ?, 'The Planner', ?, 'completed', ?)
    `).run(
      task.user_id,
      taskId,
      `Calculated scheduler roadmap for "${task.title}"`,
      JSON.stringify({
        phase: "Schedule Completed",
        perceive: `Task: "${task.title}". Active constraints: "${userConstraints || 'None'}".`,
        reason: `Allocated hours up to ${deadlineDateStr}. Status of schedule: ${result.impossible ? 'IMPOSSIBLE CONFLICT' : 'FEASIBLE'}.`,
        act: `Drafted ${result.blocks?.length || 0} date-hour budget allocations.`,
        verify: result.impossible ? `Flagged: ${result.impossible_reason}` : "Schedule meets risk profile rules."
      })
    );

    return result;
  } catch (err) {
    console.error("The Planner agent run crashed:", err);
    return null;
  }
}
