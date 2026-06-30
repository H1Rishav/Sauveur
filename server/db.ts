import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";
import fs from "fs";

const dbPath = path.resolve(process.cwd(), "sauveur.db");
const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Create Tables
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_demo INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      deadline TEXT,
      status TEXT NOT NULL DEFAULT 'pending', -- pending, scheduled, active, completed, human_check
      urgency TEXT NOT NULL DEFAULT 'medium', -- low, medium, urgent
      mode TEXT NOT NULL DEFAULT 'autopilot', -- autopilot, manual, collaborative
      requires_human_check INTEGER DEFAULT 0,
      needs_mail INTEGER DEFAULT 0,
      recipient_email TEXT,
      importance TEXT NOT NULL DEFAULT 'medium', -- low, medium, high
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- email_draft, pdf, code_patch, summary
      file_ref TEXT NOT NULL, -- file name or location
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS schedule_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      date TEXT NOT NULL, -- YYYY-MM-DD
      planned_hours REAL NOT NULL,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS habit_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      traits_json TEXT NOT NULL, -- { focusHours: [9, 12], pace: 'aggressive', riskTolerance: 'conservative', communication: 'editorial' }
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rewards_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      delta REAL NOT NULL, -- e.g. +10, -5
      reason TEXT NOT NULL,
      balance_after REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS agent_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      task_id INTEGER, -- Added to link actions directly to a task
      agent TEXT NOT NULL, -- Doer, Planner, Profiler, Strategist
      action TEXT NOT NULL,
      status TEXT NOT NULL, -- perceiving, reasoning, acting, verifying, completed, failed
      payload_json TEXT NOT NULL, -- Details of thoughts, acts, and verification
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS email_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL UNIQUE,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft', -- draft, approved, sent, cancelled
      sent_at TEXT,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS strategist_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      suggestions_json TEXT NOT NULL,
      last_analyzed_max_task_id INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS busy_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      UNIQUE(user_id, date),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      cost REAL NOT NULL,
      voucher_code TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS proactive_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      alert_type TEXT NOT NULL, -- collision, impossible, snoozed
      message TEXT NOT NULL,
      details_json TEXT,
      is_resolved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Migration for existing database files (ensure task_id exists in agent_actions)
  try {
    db.prepare("ALTER TABLE agent_actions ADD COLUMN task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE").run();
    console.log("Successfully migrated: Added task_id column to agent_actions table.");
  } catch (err) {
    // Column already exists or table is new, ignore
  }

  try {
    db.prepare("ALTER TABLE tasks ADD COLUMN planner_roadmap TEXT").run();
    console.log("Successfully migrated: Added planner_roadmap column to tasks table.");
  } catch (err) {}

  try {
    db.prepare("ALTER TABLE tasks ADD COLUMN planner_impossible INTEGER DEFAULT 0").run();
    console.log("Successfully migrated: Added planner_impossible column to tasks table.");
  } catch (err) {}

  try {
    db.prepare("ALTER TABLE tasks ADD COLUMN planner_impossible_reason TEXT").run();
    console.log("Successfully migrated: Added planner_impossible_reason column to tasks table.");
  } catch (err) {}

  try {
    db.prepare("ALTER TABLE tasks ADD COLUMN completed_at TEXT").run();
    console.log("Successfully migrated: Added completed_at column to tasks table.");
  } catch (err) {}

  // Reset/Seed Demo User and data on server boot
  const demoEmail = "demo@sauveur.ai";
  
  // Try to find the demo user
  let userRow = db.prepare("SELECT id FROM users WHERE email = ?").get(demoEmail) as { id: number } | undefined;
  let userId: number;

  if (userRow) {
    userId = userRow.id;
    console.log(`Found existing demo user (id: ${userId}). Resetting demo tables for fresh showcase state...`);
    
    // Clear existing tables related to the demo user to avoid duplication and keep data clean
    db.prepare("DELETE FROM tasks WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM habit_profile WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM rewards_ledger WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM agent_actions WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM strategist_cache WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM busy_dates WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM redemptions WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM proactive_alerts WHERE user_id = ?").run(userId);
    
    // Ensure the user name is updated to "Priya"
    db.prepare("UPDATE users SET name = 'Priya' WHERE id = ?").run(userId);
  } else {
    console.log("Seeding new demo user 'Priya'...");
    const passwordHash = bcrypt.hashSync("demo-password-1234", 10);
    const result = db.prepare(
      "INSERT INTO users (name, email, password_hash, is_demo) VALUES (?, ?, ?, 1)"
    ).run("Priya", demoEmail, passwordHash);
    userId = Number(result.lastInsertRowid);
  }

  // 1. Seed habit_profile for Priya
  const habitJson = JSON.stringify({
    traits: [
      "chronic last-minute starter",
      "completes ~8h of work in ~6h — fast",
      "misses ~30% of deadlines",
      "most productive 9–11pm"
    ],
    pace: "fast",
    riskTolerance: "moderate",
    focusHours: [21, 23],
    workStyle: "last-minute-burst",
    planner_instructions: "Prioritize early front-loading for Priya because she works exceptionally fast under pressure but procrastinates on early preparation, leading to a high miss rate.",
    analysis: "Priya is a high-speed, late-night academic surge worker who excels under high pressure but struggles with early execution. She finishes tasks roughly 25% faster than average during her peak energy window (9–11 PM), but a tendency to delay initial effort has historically caused her to miss about 30% of key academic deadlines. SAUVEUR compensates by scheduling early, compact work blocks to buffer against late-stage crunch."
  });
  db.prepare("INSERT INTO habit_profile (user_id, traits_json) VALUES (?, ?)").run(userId, habitJson);

  // 2. Helpers for relative dates
  const now = new Date();
  const addDays = (days: number) => {
    const d = new Date(now);
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    return d.toISOString();
  };
  const toDateStr = (dateStr: string) => {
    return dateStr.split('T')[0];
  };

  // 3. Seed active tasks
  const insertTask = db.prepare(`
    INSERT INTO tasks (
      user_id, title, description, deadline, status, urgency, mode, 
      requires_human_check, needs_mail, recipient_email, importance, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Overdue Task (Red)
  const t1 = insertTask.run(
    userId,
    "Advanced Algorithms Assignment 4: NP-Completeness Proofs",
    "Prove that the Subset Sum variant is NP-complete. Must write clean, step-by-step reductions and submit in LaTeX.",
    addDays(-2),
    "pending",
    "urgent",
    "manual",
    0,
    0,
    null,
    "high",
    addDays(-6)
  );
  const t1Id = Number(t1.lastInsertRowid);

  // Due Soon Task (Amber/Orange) - set to due in 12 hours (0.5 days) to trigger impossible timeline alert naturally!
  const t2 = insertTask.run(
    userId,
    "Operating Systems Lab 3: Multi-Threaded Process Scheduler",
    "Implement a custom preemptive round-robin scheduler in C with thread synchronization primitives and condition variables.",
    addDays(0.5),
    "pending",
    "urgent",
    "autopilot",
    0,
    0,
    null,
    "high",
    addDays(-4)
  );
  const t2Id = Number(t2.lastInsertRowid);

  // Comfortably Ahead Task (Green)
  const t3 = insertTask.run(
    userId,
    "Submit Final Year Tech Placement Application",
    "Upload the revised tech CV, portfolio links, and academic transcript to the campus placement portal.",
    addDays(6),
    "pending",
    "low",
    "manual",
    0,
    0,
    null,
    "medium",
    addDays(-1)
  );
  const t3Id = Number(t3.lastInsertRowid);

  // Requires Human Review Task (Demonstrable Approval Gate)
  const t4 = insertTask.run(
    userId,
    "Database Systems Term Project Draft: B-Tree Indexing Core",
    "Write draft research on performance benchmarks of B-Tree indexing variants vs LSM-Trees under intensive write workloads.",
    addDays(2),
    "human_check",
    "medium",
    "collaborative",
    1,
    0,
    null,
    "high",
    addDays(-3)
  );
  const t4Id = Number(t4.lastInsertRowid);

  // Long-deadline Task (Roadmap filler)
  const t5 = insertTask.run(
    userId,
    "Machine Learning Capstone: Neural Network Optimizer",
    "Develop and train a custom Adam-like gradient descent optimizer on CIFAR-10. Document all learning curves, hyperparameter tuning, and convergence rates.",
    addDays(12),
    "pending",
    "low",
    "autopilot",
    0,
    1,
    "professor.sharma@sauveur.ai",
    "high",
    addDays(-2)
  );
  const t5Id = Number(t5.lastInsertRowid);

  // 4. Seed completed tasks with completed_at dates
  const insertCompletedTask = db.prepare(`
    INSERT INTO tasks (
      user_id, title, description, deadline, status, urgency, mode, 
      requires_human_check, needs_mail, recipient_email, importance, created_at, completed_at
    ) VALUES (?, ?, ?, ?, 'completed', 'low', ?, 0, 0, null, ?, ?, ?)
  `);

  const tCompA = Number(insertCompletedTask.run(
    userId,
    "Compiler Design Lab 2: Lexical Analyzer",
    "Write a Flex/Bison lexer to tokenize an subset of Javascript including variable declarations and loop structures.",
    addDays(-4),
    "autopilot",
    "medium",
    addDays(-10),
    addDays(-5)
  ).lastInsertRowid);

  const tCompB = Number(insertCompletedTask.run(
    userId,
    "Software Engineering Project Milestone 1",
    "Create the system architecture diagram, schema definition, and API endpoints outline document.",
    addDays(-8),
    "collaborative",
    "high",
    addDays(-12),
    addDays(-9)
  ).lastInsertRowid);

  const tCompC = Number(insertCompletedTask.run(
    userId,
    "Weekly Academic Progress Briefing",
    "Synthesize progress on all labs and lectures for weekly advisor check-in.",
    addDays(-3),
    "autopilot",
    "low",
    addDays(-4),
    addDays(-3)
  ).lastInsertRowid);

  // 5. Seed actual physical files for artifacts and register them
  const artifactsDir = path.resolve(process.cwd(), "artifacts");
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const fileA = "lexical_analyzer_spec.txt";
  const fileB = "system_architecture_blueprint.pdf";
  const fileC = "academic_progress_report.csv";

  fs.writeFileSync(path.join(artifactsDir, fileA), `SAUVEUR ELITE AGENT ARTIFACT - THE DOER
======================================
TASK: Compiler Design Lab 2: Lexical Analyzer
USER: Priya (demo@sauveur.ai)
TIMESTAMP: 2026-06-25

SUMMARY OF WORK COMPLETED:
1. Implemented Lexical Analyzer rules using Flex (lex.l) to match identifiers, operators, keywords (let, const, function, if, while), and floating point numbers.
2. Formulated strict regular expressions avoiding catastrophic backtracking.
3. Handled nested multi-line comments block and escape string characters.
4. Integrated symbol table insertion routines utilizing an optimized hash function with minimal collisions.

VERIFICATION REPORT:
- Test suite executed: 45 javascript code blocks.
- Matching status: 100% tokens parsed.
- Lexical errors handled: 0 unrecognized tokens.
- Compilation: Success (gcc lex.yy.c -o lexer -lfl)`);

  fs.writeFileSync(path.join(artifactsDir, fileB), `SAUVEUR COGNITIVE BLUEPRINT: SYSTEM ARCHITECTURE
===============================================
TASK: Software Engineering Project Milestone 1
USER: Priya (demo@sauveur.ai)
DATE: 2026-06-22

1. CORE INFRASTRUCTURE DESIGN
-----------------------------
- Web tier: Vite + React 18 (Client-side), Tailwind CSS (Aesthetic layout engine).
- App tier: ExpressJS REST APIs, JWT token state, Secure Session Handlers.
- DB tier: SQLite with WAL (Write-Ahead Logging) enabled, Foreign Key constraints.

2. DATABASE ENTITY RELATIONSHIP MODEL
------------------------------------
- Users (1) -> (M) Tasks (1) -> (M) Schedule Blocks
- Users (1) -> (M) Rewards Ledger
- Users (1) -> (M) Agent Actions
- Tasks (1) -> (1) Email Drafts

3. COGNITIVE AGENT INTERFACE LAYER
---------------------------------
The four core autonomous engines (Doer, Planner, Profiler, Strategist) interact with
this storage cluster utilizing the safe Perception-Reasoning-Action-Verification loop.
All operations are fully auditable and undoable.`);

  fs.writeFileSync(path.join(artifactsDir, fileC), `Lab Name,Planned Hours,Actual Hours,Status,Grade
Compiler Design Lab 1,4.5,4.0,Completed,A
Compiler Design Lab 2,6.0,5.0,Completed,A
OS Lab 1: System Calls,3.0,3.5,Completed,B+
OS Lab 2: IPC Pipes,4.5,4.0,Completed,A
Database Project Setup,3.0,2.5,Completed,A`);

  // Insert artifacts to database
  const insertArtifact = db.prepare("INSERT INTO artifacts (task_id, type, file_ref) VALUES (?, ?, ?)");
  insertArtifact.run(tCompA, "pdf", fileA);
  insertArtifact.run(tCompB, "pdf", fileB);
  insertArtifact.run(tCompC, "summary", fileC);

  // 6. Seed Schedule Blocks to demonstrate calendar spread and trigger density collision warnings
  const insertBlock = db.prepare("INSERT INTO schedule_blocks (task_id, date, planned_hours) VALUES (?, ?, ?)");

  // Task 2 (OS Lab 3, due tomorrow) - 16 hours total (triggers impossible warning since deadline is 12 hours from now!)
  insertBlock.run(t2Id, toDateStr(addDays(0)), 8.0);
  insertBlock.run(t2Id, toDateStr(addDays(1)), 8.0);

  // Task 4 (Database project, due in 2 days)
  insertBlock.run(t4Id, toDateStr(addDays(1)), 2.5);
  insertBlock.run(t4Id, toDateStr(addDays(2)), 2.5);

  // Task 5 (ML Capstone, due in 12 days) - Spread beautifully across 8 days
  insertBlock.run(t5Id, toDateStr(addDays(2)), 2.0);
  insertBlock.run(t5Id, toDateStr(addDays(3)), 1.5);
  insertBlock.run(t5Id, toDateStr(addDays(4)), 2.0);
  insertBlock.run(t5Id, toDateStr(addDays(5)), 3.0);
  insertBlock.run(t5Id, toDateStr(addDays(7)), 2.5);
  insertBlock.run(t5Id, toDateStr(addDays(8)), 1.5);
  insertBlock.run(t5Id, toDateStr(addDays(9)), 2.0);
  insertBlock.run(t5Id, toDateStr(addDays(10)), 2.0);

  // Total planned hours on tomorrow (addDays(1)) will be:
  // OS Lab 3: 8.0 hours
  // Database project: 2.5 hours
  // Total = 10.5 hours! Since her peak is 2.0 hours, this triggers collision alert automatically!

  // 7. Seed busy dates (red markers on calendar)
  db.prepare("INSERT INTO busy_dates (user_id, date) VALUES (?, ?)").run(userId, toDateStr(addDays(4)));

  // 8. Seed Rewards Ledger (Affordable items + browsable store + history)
  const insertLedger = db.prepare("INSERT INTO rewards_ledger (user_id, delta, reason, balance_after) VALUES (?, ?, ?, ?)");
  insertLedger.run(userId, 50.0, "Welcome Bonus Credit", 50.0);
  insertLedger.run(userId, 100.0, "Completed Compiler Design Lab 2 ahead of schedule", 150.0);
  insertLedger.run(userId, 100.0, "Completed Software Engineering Project Milestone 1 with standard verification", 250.0);
  
  // Redeem a Streak Freeze to show redemption history!
  insertLedger.run(userId, -50.0, "Redeemed: Streak Freeze Token", 200.0);
  
  const insertRedemption = db.prepare("INSERT INTO redemptions (user_id, item_id, item_name, cost, voucher_code, created_at) VALUES (?, ?, ?, ?, ?, ?)");
  insertRedemption.run(userId, "streak_freeze", "Streak Freeze Token", 50.0, "SAUV-STRE-DEMO99", addDays(-1));

  // Current balance is exactly 200.0. Affordable items like "streak_freeze" (50), "action_credits" (80), "premium_theme" (120) are browsable and ready to buy!

  // 9. Seed email draft in the database
  db.prepare(`
    INSERT INTO email_drafts (task_id, recipient, subject, body, status)
    VALUES (?, ?, ?, ?, 'draft')
  `).run(
    t4Id,
    "prof.anwar@sauveur.ai",
    "Polite Extension Request: Database Systems Project Draft",
    `Dear Professor Anwar,

I hope this email finds you well.

I am writing to politely request a brief 48-hour extension on the Database Systems Term Project Draft submission. Due to some unexpected performance benchmarking complications in my comparative LSM-Tree analysis, I want to ensure my B-Tree profiling data is fully completed and of high quality rather than rushed.

Thank you very much for your understanding.

Warm regards,
Priya`
  );

  // 10. Seed Agent Actions Feed (including at least one undoable action)
  const insertAction = db.prepare(`
    INSERT INTO agent_actions (user_id, task_id, agent, action, status, payload_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Action 1: Completed compiler lab specification
  insertAction.run(
    userId,
    tCompA,
    "The Doer",
    "Generated Compiler Spec Document: lexical_analyzer_spec.txt",
    "completed",
    JSON.stringify({
      phase: "Act & Verify",
      perceive: "Completed Lexical Analyzer Lab code verification successfully.",
      reason: "Creating summary specification documentation to accompany student repository upload.",
      act: "Wrote structured compilation and rules spec sheet to lexical_analyzer_spec.txt.",
      verify: "Verified file reference written to artifacts table and physical file generated in workspace."
    }),
    addDays(-5)
  );

  // Action 2: Reshuffled calendar blocks (UNDOABLE)
  insertAction.run(
    userId,
    t2Id,
    "The Planner",
    "Reshuffled calendar workload blocks for Operating Systems Lab 3",
    "completed",
    JSON.stringify({
      phase: "Act & Verify",
      perceive: "Priya logged an upcoming deadline collision for OS Lab 3 due to overlapping midterms.",
      reason: "Calculated total remaining hours and shifted blocks from overcrowded Tuesday to Thursday to buffer late-night study cycles.",
      act: "Created 2 new schedule blocks on Wednesday and Thursday totaling 6.5 hours.",
      verify: "In-app calendar roadmap updated successfully. Collision warning resolved."
    }),
    addDays(-1)
  );

  // Action 3: Drafted extension email
  insertAction.run(
    userId,
    t4Id,
    "The Strategist",
    "Drafted extension request email for Database Systems Term Project Draft",
    "completed",
    JSON.stringify({
      phase: "Act & Verify",
      perceive: "Analyzed academic pipeline and detected high deadline risk for Database Systems Term Project Draft due in 48 hours.",
      reason: "User workload density on the due-date is extreme; requesting a polite 48-hour buffer to ensure standard A-grade submission.",
      act: "Synthesized customized, exceptionally polite extension request email addressed to Professor Anwar.",
      verify: "Stored draft successfully in the proactive approval queue."
    }),
    addDays(-0.5)
  );

  // 11. Seed Strategist suggestions cache (Pre-computed reality-check + drafts)
  const suggestionsObj = {
    feasibilityAnalysis: `### 🔍 Cognitive Workload & Reality Check

Priya, we have analyzed your upcoming academic pipeline. Your current workload density indicates an imminent crunch:
* **Operating Systems Lab 3** is due in less than **12 hours** with **16.0 hours** of remaining planned work. This represents a **mathematically impossible submission timeline** under normal parameters.
* **Advanced Algorithms Assignment 4** is **overdue by 2 days**.
* Tomorrow, your active schedule contains **10.5 hours** of intensive research and programming blocks, which exceeds your peak focus capacity of **2.0 hours** by over 500%.

### 🎯 Triage Strategy by Stakes

1. **Operating Systems Lab 3** (High Importance): **START IMMEDIATELY**. Run a partial implementation highlighting the main scheduler loop and synchronization primitives. Avoid wasting time on polishing bonus command line flags.
2. **Database Systems Project Draft** (High Importance): **REQUEST EXTENSION**. An exceptionally polite draft requesting 48 hours has been compiled below to purchase you a crucial safety margin.
3. **Advanced Algorithms Assignment 4** (High Importance): **START IMMEDIATELY**. Focus purely on LaTeX proof reductions for NP-Completeness.
4. **Machine Learning Capstone** (High Importance): **MONITOR**. Highly structured blocks are spread comfortably across 12 days. Do not deviate from the scheduled allocations.`,
    triageRecommendations: [
      {
        taskId: t1Id,
        title: "Advanced Algorithms Assignment 4: NP-Completeness Proofs",
        action: "START IMMEDIATELY",
        reason: "Task is currently overdue. Prioritize core reductions to minimize late grade penalties.",
        priority: "high"
      },
      {
        taskId: t2Id,
        title: "Operating Systems Lab 3: Multi-Threaded Process Scheduler",
        action: "START IMMEDIATELY",
        reason: "Due in 12 hours. Execute minimal working preemptive scheduler module.",
        priority: "high"
      },
      {
        taskId: t3Id,
        title: "Submit Final Year Tech Placement Application",
        action: "MONITOR",
        reason: "Generous deadline buffer exists. Focus window is currently open.",
        priority: "medium"
      },
      {
        taskId: t4Id,
        title: "Database Systems Term Project Draft: B-Tree Indexing Core",
        action: "REQUEST EXTENSION",
        reason: "Severe schedule congestion on the due-date. Buying 48 hours is optimal.",
        priority: "high"
      },
      {
        taskId: t5Id,
        title: "Machine Learning Capstone: Neural Network Optimizer",
        action: "MONITOR",
        reason: "Work blocks are balanced and distributed correctly across 12 days.",
        priority: "high"
      }
    ],
    extensionDrafts: [
      {
        taskId: t4Id,
        taskTitle: "Database Systems Term Project Draft: B-Tree Indexing Core",
        recipient: "prof.anwar@sauveur.ai",
        subject: "Polite Extension Request: Database Systems Project Draft",
        body: `Dear Professor Anwar,

I hope this email finds you well.

I am writing to politely request a brief 48-hour extension on the Database Systems Term Project Draft submission. Due to some unexpected performance benchmarking complications in my comparative LSM-Tree analysis, I want to ensure my B-Tree profiling data is fully completed and of high quality rather than rushed.

Thank you very much for your understanding and consideration of my request.

Warm regards,
Priya`
      }
    ]
  };

  db.prepare(`
    INSERT OR REPLACE INTO strategist_cache (user_id, suggestions_json, last_analyzed_max_task_id, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `).run(userId, JSON.stringify(suggestionsObj), t5Id);

  console.log("Database seeded successfully with premium Priya showcase profiles and records.");
}

export default db;
