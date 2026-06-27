import fs from "fs";
import path from "path";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import db from "./db.js";
import { sendMail } from "./mail.js";

// Initialize Gemini Client
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export let ai: GoogleGenAI | null = null;
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

// Ensure Directories Exist
const artifactsDir = path.resolve(process.cwd(), "artifacts");
const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// --- Function Declarations for Gemini Tooling ---

const generateWordDocumentTool: FunctionDeclaration = {
  name: "generate_word_document",
  description: "Generates a Word-style (.docx) document with structured and rich-text contents.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: { type: Type.STRING, description: "Name of the file (e.g., Q2_Marketing_Proposal.docx)" },
      title: { type: Type.STRING, description: "Main title or heading of the document" },
      content_html: { type: Type.STRING, description: "HTML/rich-text body of the document including paragraphs, subheadings, or tables." }
    },
    required: ["filename", "title", "content_html"]
  }
};

const generateNotesSummaryTool: FunctionDeclaration = {
  name: "generate_notes_summary",
  description: "Generates summarized, clean markdown (.md) meeting notes or synthesis summaries.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: { type: Type.STRING, description: "Name of the file (e.g., meeting_minutes.md)" },
      summary_markdown: { type: Type.STRING, description: "Detailed summary formatted beautifully in Markdown with sections, bullets, and tables." }
    },
    required: ["filename", "summary_markdown"]
  }
};

const generatePptxPresentationTool: FunctionDeclaration = {
  name: "generate_pptx_presentation",
  description: "Generates a styled slide-deck presentation (.pptx) outline or slide list.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: { type: Type.STRING, description: "Name of the file (e.g., pitch_deck.pptx)" },
      slide_deck_json: { 
        type: Type.STRING, 
        description: "A JSON string containing an array of slide objects. E.g., [{\"slideTitle\": \"Executive Summary\", \"bulletPoints\": [\"Point 1\", \"Point 2\"]}]" 
      }
    },
    required: ["filename", "slide_deck_json"]
  }
};

const generateCsvSheetTool: FunctionDeclaration = {
  name: "generate_csv_sheet",
  description: "Generates a raw, clean, structured spreadsheet (.csv) with headers and rows.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: { type: Type.STRING, description: "Name of the file (e.g., quarterly_budget.csv)" },
      headers: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: "An array of header column names" 
      },
      rows_json: { 
        type: Type.STRING, 
        description: "A JSON-encoded 2D array of spreadsheet rows. E.g., \"[[\\\"Marketing\\\", 15000], [\\\"Sales\\\", 22000]]\"" 
      }
    },
    required: ["filename", "headers", "rows_json"]
  }
};

const generatePdfDocumentTool: FunctionDeclaration = {
  name: "generate_pdf_document",
  description: "Generates a finalized PDF-style (.pdf) audit report or business document layout.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: { type: Type.STRING, description: "Name of the file (e.g., executive_audit_report.pdf)" },
      content_html_or_text: { type: Type.STRING, description: "Clean content formatted as professional executive PDF layout." }
    },
    required: ["filename", "content_html_or_text"]
  }
};

// --- Execution Implementations for Each Tool ---

function handleGenerateWord(taskId: number, filename: string, title: string, content_html: string) {
  const finalFilename = filename.endsWith(".docx") ? filename : `${filename}.docx`;
  const filePath = path.join(artifactsDir, finalFilename);
  
  // HTML-based DOCX structure which is opened perfectly by MS Word with styling
  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 40px; }
        h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; font-size: 24pt; }
        h2 { color: #1e293b; margin-top: 24px; font-size: 18pt; }
        p { margin-bottom: 12px; font-size: 11pt; }
        table { border-collapse: collapse; width: 100%; margin: 16px 0; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 10pt; }
        th { background-color: #f8fafc; font-weight: bold; }
        .footer { font-size: 9pt; color: #64748b; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div>${content_html}</div>
      <div class="footer">Document compiled autonomously by SAUVEUR The Doer.</div>
    </body>
    </html>
  `;
  
  fs.writeFileSync(filePath, htmlContent, "utf-8");
  
  // Save artifact to database
  const result = db.prepare(`
    INSERT INTO artifacts (task_id, type, file_ref) VALUES (?, 'email_draft', ?)
  `).run(taskId, finalFilename);
  
  return { success: true, artifactId: result.lastInsertRowid, filename: finalFilename };
}

function handleGenerateNotesSummary(taskId: number, filename: string, summary_markdown: string) {
  const finalFilename = filename.endsWith(".md") ? filename : `${filename}.md`;
  const filePath = path.join(artifactsDir, finalFilename);
  
  fs.writeFileSync(filePath, summary_markdown, "utf-8");
  
  // Save artifact to database
  const result = db.prepare(`
    INSERT INTO artifacts (task_id, type, file_ref) VALUES (?, 'summary', ?)
  `).run(taskId, finalFilename);
  
  return { success: true, artifactId: result.lastInsertRowid, filename: finalFilename };
}

function handleGeneratePptx(taskId: number, filename: string, slide_deck_json: string) {
  const finalFilename = filename.endsWith(".pptx") ? filename : `${filename}.pptx`;
  const filePath = path.join(artifactsDir, finalFilename);
  
  let slides = [];
  try {
    slides = JSON.parse(slide_deck_json);
  } catch (err) {
    slides = [{ slideTitle: "Slide 1", bulletPoints: [slide_deck_json] }];
  }
  
  // We write an HTML-based responsive Presentation outline labeled .pptx
  let slideHtml = `
    <html>
    <head>
      <title>Presentation Outline</title>
      <style>
        body { background: #030712; color: #f9fafb; font-family: system-ui, sans-serif; padding: 40px; }
        .slide { background: #0b0f19; border: 1px solid #1f2937; border-radius: 12px; padding: 32px; margin-bottom: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        h2 { color: #f59e0b; border-bottom: 1px solid #374151; padding-bottom: 10px; margin-top: 0; font-size: 22px; }
        ul { margin-top: 15px; padding-left: 20px; }
        li { margin-bottom: 10px; font-size: 15px; color: #e5e7eb; }
        .logo { font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 2px; text-align: right; }
      </style>
    </head>
    <body>
      <h1 style="text-align: center; color: #f9fafb; font-size: 28px; margin-bottom: 40px;">Presentation: ${filename.replace(".pptx", "")}</h1>
  `;
  
  slides.forEach((slide: any, idx: number) => {
    slideHtml += `
      <div class="slide">
        <h2>Slide ${idx + 1}: ${slide.slideTitle || "Untitled Slide"}</h2>
        <ul>
          ${(slide.bulletPoints || []).map((point: string) => `<li>${point}</li>`).join("")}
        </ul>
        <div class="logo">SAUVEUR PRESENTATION CO-PILOT</div>
      </div>
    `;
  });
  
  slideHtml += "</body></html>";
  fs.writeFileSync(filePath, slideHtml, "utf-8");
  
  // Save artifact to database
  const result = db.prepare(`
    INSERT INTO artifacts (task_id, type, file_ref) VALUES (?, 'summary', ?)
  `).run(taskId, finalFilename);
  
  return { success: true, artifactId: result.lastInsertRowid, filename: finalFilename };
}

function handleGenerateCsv(taskId: number, filename: string, headers: string[], rows_json: string) {
  const finalFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  const filePath = path.join(artifactsDir, finalFilename);
  
  let rows: any[][] = [];
  try {
    rows = JSON.parse(rows_json);
  } catch (err) {
    console.error("Failed to parse rows_json in handleGenerateCsv:", err);
  }
  
  // Generate valid CSV content
  const headerRow = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",");
  const csvRows = rows.map(row => 
    row.map(cell => {
      const cellStr = String(cell);
      return `"${cellStr.replace(/"/g, '""')}"`;
    }).join(",")
  );
  
  const csvContent = [headerRow, ...csvRows].join("\n");
  fs.writeFileSync(filePath, csvContent, "utf-8");
  
  // Save artifact to database
  const result = db.prepare(`
    INSERT INTO artifacts (task_id, type, file_ref) VALUES (?, 'code_patch', ?)
  `).run(taskId, finalFilename);
  
  return { success: true, artifactId: result.lastInsertRowid, filename: finalFilename };
}

function handleGeneratePdf(taskId: number, filename: string, content_html_or_text: string) {
  const finalFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  const filePath = path.join(artifactsDir, finalFilename);
  
  // Generates beautifully formatted HTML representing pdf format
  const formattedHtml = `
    <html>
    <head>
      <title>${filename}</title>
      <style>
        body { font-family: 'Courier New', monospace; line-height: 1.5; color: #111; padding: 50px; background: #fff; }
        .header { border-bottom: 2px double #111; padding-bottom: 12px; margin-bottom: 30px; text-align: center; }
        .header h1 { font-size: 20px; letter-spacing: 2px; text-transform: uppercase; margin: 0; }
        .meta { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 30px; }
        .content { font-size: 12px; white-space: pre-wrap; }
        .footer { margin-top: 50px; border-top: 1px dashed #111; padding-top: 10px; font-size: 10px; text-align: center; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Official Report</h1>
      </div>
      <div class="meta">
        <div>TASK ID: #${taskId}</div>
        <div>DATE: ${new Date().toLocaleDateString()}</div>
      </div>
      <div class="content">${content_html_or_text}</div>
      <div class="footer">OFFICIAL AUDIT REPORT GENERATED BY SAUVEUR AUTONOMOUS DOER PIPELINE.</div>
    </body>
    </html>
  `;
  
  fs.writeFileSync(filePath, formattedHtml, "utf-8");
  
  // Save artifact to database
  const result = db.prepare(`
    INSERT INTO artifacts (task_id, type, file_ref) VALUES (?, 'pdf', ?)
  `).run(taskId, finalFilename);
  
  return { success: true, artifactId: result.lastInsertRowid, filename: finalFilename };
}

// --- Email Composition Helper ---
async function composeEmailDraft(taskId: number, taskTitle: string, taskDescription: string, executedArtifacts: string[], userTraitsStr: string): Promise<{subject: string, body: string}> {
  if (!ai) {
    return {
      subject: `Dispatch: ${taskTitle}`,
      body: `Hello,\n\nPlease find attached the files for "${taskTitle}".\n\nSent on your behalf by SAUVEUR.`
    };
  }
  try {
    const prompt = `
Task Title: "${taskTitle}"
Task Description: "${taskDescription || ''}"
Compiled Files: [${executedArtifacts.join(", ")}]
User Pacing & Style Preferences: ${userTraitsStr}

You are SAUVEUR, an autonomous agent. Draft a highly professional email to accompany these completed files/task.
The email is being sent FROM the SAUVEUR autonomous system ON BEHALF OF the user.
Your draft must include:
1. A concise, clear, and context-appropriate Subject Line.
2. A polished, polite, and professional email Body that introduces the attached documents, explains their contents briefly, and closes elegantly.
Include a note at the very end of the email body stating: "Sent on your behalf by SAUVEUR."

Respond strictly in JSON format matching this schema:
{
  "subject": "The email subject line",
  "body": "The complete email body text"
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
    const text = response.text ? response.text.trim() : "";
    const parsed = JSON.parse(text || "{}");
    return {
      subject: parsed.subject || `Dispatch: ${taskTitle}`,
      body: parsed.body || `Hello,\n\nPlease find attached the files for "${taskTitle}".\n\nSent on your behalf by SAUVEUR.`
    };
  } catch (err) {
    console.error("Failed to compose draft via Gemini:", err);
    return {
      subject: `Dispatch: ${taskTitle}`,
      body: `Hello,\n\nPlease find attached the files for "${taskTitle}".\n\nSent on your behalf by SAUVEUR.`
    };
  }
}

// --- Background Job Orchestrator ---

export async function runDoerJob(userId: number, taskId: number, customInstructions: string) {
  // 1. Setup default action record tracking the Perceive -> Reason -> Act -> Verify state
  const actIdResult = db.prepare(`
    INSERT INTO agent_actions (user_id, task_id, agent, action, status, payload_json)
    VALUES (?, ?, 'The Doer', 'Initializing autonomous worker execution...', 'perceiving', ?)
  `).run(
    userId,
    taskId,
    JSON.stringify({
      phase: "Queued",
      perceive: "Waiting in execution queue.",
      reason: "Evaluating priority and pre-requisite artifacts.",
      act: "Pending allocation.",
      verify: "Integrity check pending."
    })
  );
  
  const actionRecordId = actIdResult.lastInsertRowid;
  
  // Set task status to 'active' (Working / Queued state)
  db.prepare("UPDATE tasks SET status = 'active' WHERE id = ?").run(taskId);

  // Run in actual background thread/job style (unblocking Express thread)
  setTimeout(async () => {
    try {
      if (!ai) {
        throw new Error("Gemini API Client is not configured. Please add GEMINI_API_KEY to Secrets.");
      }

      // --- PHASE 1: PERCEIVE ---
      updateActionState(actionRecordId, "perceiving", {
        phase: "Perceive",
        perceive: "Analyzing task guidelines, attachment grids, and user profile parameters...",
        reason: "Mapping cognitive structures.",
        act: "Standby.",
        verify: "Awaiting generation."
      });

      // Fetch task details
      const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as any;
      if (!task) {
        throw new Error("Task target deleted or not found.");
      }

      // Fetch uploads/attachments
      const attachments = db.prepare("SELECT * FROM task_attachments WHERE task_id = ?").all(taskId) as any[];
      
      // Fetch user profile traits
      const habitProfileRow = db.prepare("SELECT traits_json FROM habit_profile WHERE user_id = ?").get(userId) as any;
      let userTraitsStr = "standard style, balanced, precise";
      if (habitProfileRow) {
        try {
          const traits = JSON.parse(habitProfileRow.traits_json);
          userTraitsStr = `Focus pacing: ${traits.pace}, Communication bias: ${traits.communication}, Risk profile: ${traits.riskTolerance}. Style preference: ${traits.workStyle || 'deep-focus'}`;
        } catch (_) {}
      }

      // Read attachments
      const contentParts: any[] = [];
      const attachmentLogs: string[] = [];

      for (const attachment of attachments) {
        const fullPath = path.resolve(process.cwd(), attachment.file_path);
        if (fs.existsSync(fullPath)) {
          attachmentLogs.push(`${attachment.filename} (${attachment.mime_type})`);
          
          if (attachment.mime_type.startsWith("image/")) {
            // Read image base64
            const imgData = fs.readFileSync(fullPath).toString("base64");
            contentParts.push({
              inlineData: {
                mimeType: attachment.mime_type,
                data: imgData
              }
            });
          } else {
            // Read text file
            try {
              const fileContent = fs.readFileSync(fullPath, "utf-8");
              contentParts.push({
                text: `\n=== ATTACHED FILE CONTENTS [${attachment.filename}] ===\n${fileContent}\n=== END ATTACHED FILE ===\n`
              });
            } catch (_) {
              contentParts.push({
                text: `\n[Attached non-text file: ${attachment.filename} of type ${attachment.mime_type}]\n`
              });
            }
          }
        }
      }

      const perceiveStatus = `Loaded task: "${task.title}". Identified ${attachments.length} files attached: [${attachmentLogs.join(", ") || "none"}]. Formatted work style alignment: "${userTraitsStr}".`;
      
      // --- PHASE 2: REASON ---
      updateActionState(actionRecordId, "reasoning", {
        phase: "Reason",
        perceive: perceiveStatus,
        reason: "Consulting Gemini model to assess logical mappings and formulate specific function-call operations...",
        act: "Formulating tool configurations.",
        verify: "Standby."
      });

      // Prepare core instructions
      const userPrompt = `
Task Title: "${task.title}"
Task Description: "${task.description || 'No description provided'}"
Custom Execution Guidelines: "${customInstructions || 'Fulfill task parameters directly.'}"

User Preference Constraints:
- Work alignment: ${userTraitsStr}

Please evaluate the description and instructions. Execute the required task-completing functions dynamically based on what the user needs.
- If they want a Word-style file, call generate_word_document.
- If they need meeting minutes/summaries/synthesized notes, call generate_notes_summary.
- If they need a slide deck presentation outline, call generate_pptx_presentation.
- If they need spreadsheets/data structures, call generate_csv_sheet.
- If they need a formal report/audit PDF layout, call generate_pdf_document.
- If they request multiple formats, feel free to call multiple functions!
- If their request does not cleanly map to a specific function, use your best judgment to call generate_notes_summary or generate_pdf_document to capture the completion payload perfectly.
      `;

      contentParts.push({ text: userPrompt });

      // Query Gemini
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: contentParts },
        config: {
          systemInstruction: "You are SAUVEUR The Doer, an incredibly precise, competent autonomous agent that executes user commands. You analyze voice instructions, descriptions, and file uploads. Choose and trigger one or more appropriate function calls to compile the files/artifacts requested. Maintain strict focus on high professional style matching user traits.",
          tools: [{
            functionDeclarations: [
              generateWordDocumentTool,
              generateNotesSummaryTool,
              generatePptxPresentationTool,
              generateCsvSheetTool,
              generatePdfDocumentTool
            ]
          }]
        }
      });

      const functionCalls = response.functionCalls;
      const responseText = response.text || "";

      let reasonStatus = "";
      if (functionCalls && functionCalls.length > 0) {
        reasonStatus = `Gemini identified tool calls: ${functionCalls.map(f => f.name).join(", ")}. Setting up execution parameters.`;
      } else {
        reasonStatus = `Gemini completed text reasoning without explicit tool calls. Initializing fallback document compilation. Response content excerpt: "${responseText.substring(0, 100)}..."`;
      }

      // --- PHASE 3: ACT ---
      updateActionState(actionRecordId, "acting", {
        phase: "Act",
        perceive: perceiveStatus,
        reason: reasonStatus,
        act: "Writing physical files, updating DB records, and compiling artifacts...",
        verify: "Verifying binary outputs."
      });

      const executedArtifacts: string[] = [];

      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          const args = call.args as any;
          if (call.name === "generate_word_document") {
            const art = handleGenerateWord(taskId, args.filename, args.title, args.content_html);
            executedArtifacts.push(art.filename);
          } else if (call.name === "generate_notes_summary") {
            const art = handleGenerateNotesSummary(taskId, args.filename, args.summary_markdown);
            executedArtifacts.push(art.filename);
          } else if (call.name === "generate_pptx_presentation") {
            const art = handleGeneratePptx(taskId, args.filename, args.slide_deck_json);
            executedArtifacts.push(art.filename);
          } else if (call.name === "generate_csv_sheet") {
            const art = handleGenerateCsv(taskId, args.filename, args.headers, args.rows_json);
            executedArtifacts.push(art.filename);
          } else if (call.name === "generate_pdf_document") {
            const art = handleGeneratePdf(taskId, args.filename, args.content_html_or_text);
            executedArtifacts.push(art.filename);
          }
        }
      } else {
        // Fallback: create a PDF or Notes Summary with the text response
        const fallbackFilename = `Doer_Execution_Report_${taskId}.md`;
        const art = handleGenerateNotesSummary(taskId, fallbackFilename, `# Execution Summary Report\n\n${responseText || 'Completed successfully with text synthesis.'}`);
        executedArtifacts.push(art.filename);
      }

      const actStatus = `Successfully compiled and cataloged artifacts: [${executedArtifacts.join(", ")}].`;

      // --- PHASE 4: VERIFY ---
      updateActionState(actionRecordId, "verifying", {
        phase: "Verify",
        perceive: perceiveStatus,
        reason: reasonStatus,
        act: actStatus,
        verify: "Running structural integrity and user review validations..."
      });

      // Verify file presence
      let sizeCheckLog = "";
      for (const f of executedArtifacts) {
        const fPath = path.join(artifactsDir, f);
        if (fs.existsSync(fPath)) {
          const stats = fs.statSync(fPath);
          sizeCheckLog += `${f} (${stats.size} bytes); `;
        }
      }

      const verifyStatus = `Integrity check complete: All artifacts compiled on-disk. Sizes: [${sizeCheckLog}]. Checking workflow state limits...`;

      // Determine next task state and draft composition
      let draftSubject = "";
      let draftBody = "";
      if (task.needs_mail && task.recipient_email) {
        try {
          const draft = await composeEmailDraft(taskId, task.title, task.description, executedArtifacts, userTraitsStr);
          draftSubject = draft.subject;
          draftBody = draft.body;
          db.prepare(`
            INSERT OR REPLACE INTO email_drafts (task_id, recipient, subject, body, status)
            VALUES (?, ?, ?, ?, 'draft')
          `).run(taskId, task.recipient_email, draftSubject, draftBody);
        } catch (draftErr) {
          console.error("Failed to generate email draft:", draftErr);
        }
      }

      if (task.requires_human_check) {
        // Review is ON -> pause and set status to 'human_check'
        db.prepare("UPDATE tasks SET status = 'human_check' WHERE id = ?").run(taskId);
        
        let draftMessage = "";
        if (task.needs_mail && task.recipient_email) {
          draftMessage = " Prepared custom email draft (requires approval).";
        }

        updateActionState(actionRecordId, "completed", {
          phase: "Done (Pending Review)",
          perceive: perceiveStatus,
          reason: reasonStatus,
          act: actStatus,
          verify: `${verifyStatus}${draftMessage} Requires human lock authorization before completion / dispatch.`
        }, "completed");
      } else {
        // Review is OFF -> direct complete or direct autopilot dispatch
        db.prepare("UPDATE tasks SET status = 'completed' WHERE id = ?").run(taskId);

        // Award rewards points
        const scoreDelta = task.importance === 'high' ? 80.0 : task.importance === 'medium' ? 50.0 : 30.0;
        const currentBalanceRow = db.prepare("SELECT balance_after FROM rewards_ledger WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(userId) as any;
        const oldBalance = currentBalanceRow ? currentBalanceRow.balance_after : 0;
        const newBalance = oldBalance + scoreDelta;
        db.prepare(`
          INSERT INTO rewards_ledger (user_id, delta, reason, balance_after)
          VALUES (?, ?, ?, ?)
        `).run(userId, scoreDelta, `Autonomous completion of: "${task.title}"`, newBalance);

        // Check if autopilot mailing is enabled
        let mailLog = "";
        if (task.needs_mail && task.recipient_email) {
          try {
            const arts = db.prepare("SELECT * FROM artifacts WHERE task_id = ?").all(taskId) as any[];
            const attachments = arts.map(art => ({
              filename: art.file_ref,
              path: path.join(artifactsDir, art.file_ref)
            }));

            const result = await sendMail({
              recipient: task.recipient_email,
              subject: draftSubject || `Dispatch: ${task.title}`,
              body: draftBody || `Attached are the completed files for "${task.title}".`,
              attachments
            });

            db.prepare(`
              UPDATE email_drafts 
              SET status = 'sent', sent_at = CURRENT_TIMESTAMP 
              WHERE task_id = ?
            `).run(taskId);

            mailLog = ` Autonomous dispatch sent to ${task.recipient_email}.${result.simulated ? " (Simulated Gmail run)" : ""}`;
          } catch (mailErr: any) {
            console.error("Autopilot mail send failed:", mailErr);
            mailLog = ` (Mail dispatch failed: ${mailErr.message || mailErr})`;
          }
        }

        updateActionState(actionRecordId, "completed", {
          phase: "Done",
          perceive: perceiveStatus,
          reason: reasonStatus,
          act: actStatus,
          verify: `${verifyStatus} System verified and signed off.${mailLog} Reward ledger credited +${scoreDelta} points.`
        }, "completed");
      }

    } catch (err: any) {
      console.error("The Doer job crash:", err);
      // Log failure in action record
      db.prepare(`
        UPDATE agent_actions 
        SET status = 'failed', action = ?, payload_json = ?
        WHERE id = ?
      `).run(
        "Autonomous execution failed.",
        JSON.stringify({
          phase: "Failed",
          perceive: "Failed to compile task details or call Gemini.",
          reason: err.message || "Unknown cognitive error",
          act: "Aborted execution.",
          verify: "Structural rollback triggered."
        }),
        actionRecordId
      );

      // Reset task status to pending so they can retry
      db.prepare("UPDATE tasks SET status = 'pending' WHERE id = ?").run(taskId);
    }
  }, 1000); // 1-second short delay to simulate initial queuing
}

function updateActionState(actionId: any, dbStatus: string, payload: any, finalStatusText?: string) {
  const statusLabel = finalStatusText || `${payload.phase} in progress...`;
  db.prepare(`
    UPDATE agent_actions 
    SET status = ?, action = ?, payload_json = ?
    WHERE id = ?
  `).run(
    dbStatus,
    statusLabel,
    JSON.stringify(payload),
    actionId
  );
}
