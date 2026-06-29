import { GoogleGenAI } from "@google/genai";
import db from "./db.js";
import { getGeminiClient, generateContentWithRetry } from "./gemini_client.js";

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
    let userTraitsStr = "Pacing: standard, style: balanced";
    if (habitProfileRow) {
      try {
        const traits = JSON.parse(habitProfileRow.traits_json);
        userTraitsStr = `Pacing: ${traits.pace || 'standard'}
Focus hours: ${JSON.stringify(traits.focusHours || [])}
Risk tolerance: ${traits.riskTolerance || 'moderate'}
Work style: ${traits.workStyle || 'balanced'}
Behavioral Traits: ${JSON.stringify(traits.traits || [])}
Adaptive Planner Directions (MANDATORY): ${traits.planner_instructions || 'Align schedule standardly.'}`;
      } catch (_) {}
    }

    // Current local time anchor
    const now = new Date();
    const currentDateStr = now.toISOString().split("T")[0];
    const deadlineDateStr = new Date(task.deadline).toISOString().split("T")[0];

    const msDiff = new Date(task.deadline).getTime() - now.getTime();
    const hoursDiff = msDiff / (1000 * 60 * 60);
    const hasMoreThanADay = hoursDiff >= 24;

    const aiClient = getGeminiClient();

    // 3. Consult Gemini to draft a precise roadmap
    if (!aiClient) {
      // Fallback if Gemini key is missing
      console.warn("Gemini is not configured. Creating simple linear schedule block fallback.");
      const daysDiff = Math.max(1, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
      const blocks: { date: string; hours: number }[] = [];
      const hoursPerDay = task.importance === 'high' ? 3 : task.importance === 'medium' ? 1.5 : 0.5;

      if (hasMoreThanADay) {
        for (let i = 0; i < Math.min(daysDiff, 14); i++) {
          const d = new Date();
          d.setDate(now.getDate() + i);
          blocks.push({
            date: d.toISOString().split("T")[0],
            hours: hoursPerDay
          });
        }
      }

      // Save blocks
      db.prepare("DELETE FROM schedule_blocks WHERE task_id = ?").run(taskId);
      const insertBlock = db.prepare("INSERT INTO schedule_blocks (task_id, date, planned_hours) VALUES (?, ?, ?)");
      for (const b of blocks) {
        insertBlock.run(taskId, b.date, b.hours);
      }

      const fallbackMsg = hasMoreThanADay 
        ? `Linear scheduling fallback: ${hoursPerDay} hours/day budgeted over ${daysDiff} days.`
        : "Deadline is in less than a day. No hourly schedule blocks allocated.";

      db.prepare(`
        UPDATE tasks 
        SET planner_roadmap = ?, planner_impossible = 0, planner_impossible_reason = NULL 
        WHERE id = ?
      `).run(fallbackMsg, taskId);

      return {
        roadmap_text: fallbackMsg,
        impossible: false,
        impossible_reason: "",
        blocks
      };
    }

    // Prepare prompt with explicit task description analysis and time availability rules
    const prompt = `
You are SAUVEUR The Planner, an elite cognitive scheduling and resource allocation agent.
A user has a task that must be fully executed and delivered before the specified deadline.
Your goal is to budget a day-by-day hourly work roadmap (stored as schedule_blocks) so the work is completed on time.

=== TASK SPECIFICATION ===
Title: "${task.title}"
Description: "${task.description || 'No description provided.'}"
Deadline Date: "${deadlineDateStr}"
Current Date: "${currentDateStr}"
Importance Level: "${task.importance}"

=== USER TRAITS ===
${userTraitsStr}

=== NEW SCHEDULING CONSTRAINTS / RESHUFFLE COMMANDS ===
User remarks: "${userConstraints || 'None'}"

=== RULES OF ENGAGEMENT ===
1. GAIN INFERENCE OF THE TASK FROM DESCRIPTION AND TITLE:
   - Carefully analyze the task title and description. Deduce the realistic workload and hours required.
   - Do NOT just default to rigid generic ranges if the description implies a very simple task. For example, a simple email draft should only require 0.5 to 1 hour, whereas a complex presentation layout may require 4 to 8 hours.
   
2. TIME AVAILABILITY ASSESSMENT:
   - There are exactly ${hoursDiff.toFixed(1)} hours (approx. ${(hoursDiff / 24).toFixed(1)} days) remaining between the current time and the deadline.
   - CRITICAL REQUIREMENT: It only makes sense to allot daily hour-wise schedule blocks if there is at least a WHOLE day (24 hours or more) available before the deadline based on the task.
   - If there is LESS than 24 hours available before the deadline, or if the time frame is too small relative to the task scope, you MUST NOT allot any hour-wise blocks. In this case, keep the "blocks" list empty: [].
   - If there is at least 24 hours available, budget the hour-wise schedule blocks on the calendar up to the deadline.
   - If the task is extremely trivial and can be done in a single short session, you may also keep the blocks empty if multi-day allocation makes no sense.

3. ADAPTIVE SCHEDULING ENFORCEMENT:
   - Carefully read the "Adaptive Planner Directions" in the USER TRAITS section.
   - If the instructions state the user is a procrastinator, front-load their schedule with smaller, concentrated blocks, and set an earlier internal deadline in the roadmap description than the real one.
   - If the user is a frequent deadline misser, schedule the blocks to start sooner and provide explicit daily session hour targets in your roadmap narrative.
   - If the user is a fast worker, allocate tighter, more concentrated hour budgets.
   - Strictly follow any other constraints defined in the Adaptive Planner Directions.

4. If allotting blocks, generate an hour budget for each calendar date starting from "${currentDateStr}" up to and including "${deadlineDateStr}".
5. Adapt the schedule dynamically to the user's remarks. If they are busy on a specific date or day of the week, set the hour budget for that day to 0 (or near 0).
6. MAXIMUM hours per single day is 12 hours. If it is mathematically impossible to complete on time given the remaining time and constraints, set "impossible" to true and describe why in "impossible_reason".
7. Provide an encouraging, highly professional overview in "roadmap_text" explaining the allocation of hours and pacing strategy.

Respond strictly in JSON format matching this schema:
{
  "roadmap_text": "An elegant, human-centric overview of the daily hour roadmap and strategy.",
  "impossible": false,
  "impossible_reason": "",
  "blocks": [
    { "date": "YYYY-MM-DD", "hours": 2.5 }
  ]
}
Do NOT wrap in markdown block, just return raw JSON.
`;

    const response = await generateContentWithRetry(aiClient, {
      model: "gemini-2.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text ? response.text.trim() : "{}";
    const result: PlannerResult = JSON.parse(text);

    // Hard programmatic guard to enforce no schedule blocks if there is less than a whole day (24 hours) available
    if (!hasMoreThanADay) {
      result.blocks = [];
      result.roadmap_text = "As the deadline is in less than a whole day, no daily scheduling blocks are allocated. The task should be executed in one immediate continuous session.";
    }

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
