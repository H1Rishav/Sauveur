import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

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
      agent TEXT NOT NULL, -- Doer, Planner, Profiler, Strategist
      action TEXT NOT NULL,
      status TEXT NOT NULL, -- perceiving, reasoning, acting, verifying, completed, failed
      payload_json TEXT NOT NULL, -- Details of thoughts, acts, and verification
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Seed Demo User and data if it doesn't exist
  const demoEmail = "demo@sauveur.ai";
  const row = db.prepare("SELECT id FROM users WHERE email = ?").get(demoEmail) as { id: number } | undefined;

  if (!row) {
    console.log("Seeding demo user and sample data...");
    
    const passwordHash = bcrypt.hashSync("demo-password-1234", 10);
    const insertUser = db.prepare(
      "INSERT INTO users (name, email, password_hash, is_demo) VALUES (?, ?, ?, 1)"
    );
    const result = insertUser.run("Guest Reviewer", demoEmail, passwordHash);
    const userId = result.lastInsertRowid;

    // Seed habit_profile
    const habitJson = JSON.stringify({
      focusHours: [8, 11],
      pace: "deliberate",
      riskTolerance: "conservative",
      communication: "editorial",
      workStyle: "deep-focus"
    });
    db.prepare("INSERT INTO habit_profile (user_id, traits_json) VALUES (?, ?)").run(userId, habitJson);

    // Seed tasks
    const insertTask = db.prepare(`
      INSERT INTO tasks (user_id, title, description, deadline, status, urgency, mode, requires_human_check, needs_mail, recipient_email, importance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const task1 = insertTask.run(
      userId,
      "Summarize Q2 Financial Report & Draft Board Memo",
      "Process the massive CSV sheet containing Q2 expenses, identify anomalies in marketing spend, and generate an executive memo.",
      "2026-06-30T17:00:00",
      "completed",
      "urgent",
      "autopilot",
      0,
      1,
      "board@company.com",
      "high"
    );

    const task2 = insertTask.run(
      userId,
      "Draft Client Renewal Proposal (Zenith Corp)",
      "Review historical Zenith correspondence, draft a tailored multi-year service renewal contract highlighting our Q1 milestones.",
      "2026-07-02T12:00:00",
      "human_check",
      "medium",
      "collaborative",
      1,
      1,
      "accounts@zenithcorp.com",
      "high"
    );

    const task3 = insertTask.run(
      userId,
      "Synthesize Competitor Pricing & Rebalance Standard Plan",
      "Audit 5 competitor pricing tiers. Propose and simulate revenue curves for an alternative 12% margin structure.",
      "2026-07-05T09:00:00",
      "pending",
      "low",
      "autopilot",
      0,
      0,
      null,
      "medium"
    );

    // Seed artifacts
    const insertArtifact = db.prepare(`
      INSERT INTO artifacts (task_id, type, file_ref) VALUES (?, ?, ?)
    `);
    insertArtifact.run(task1.lastInsertRowid, "email_draft", "Board Memo: Q2 Review & Projections");
    insertArtifact.run(task1.lastInsertRowid, "pdf", "q2_anomalies_summary.pdf");
    insertArtifact.run(task2.lastInsertRowid, "email_draft", "Service Renewal Proposal: Zenith Corp");

    // Seed schedule blocks
    const insertSchedule = db.prepare(`
      INSERT INTO schedule_blocks (task_id, date, planned_hours) VALUES (?, ?, ?)
    `);
    insertSchedule.run(task1.lastInsertRowid, "2026-06-27", 2.5);
    insertSchedule.run(task2.lastInsertRowid, "2026-06-28", 1.5);
    insertSchedule.run(task3.lastInsertRowid, "2026-06-29", 3.0);

    // Seed rewards ledger
    const insertReward = db.prepare(`
      INSERT INTO rewards_ledger (user_id, delta, reason, balance_after) VALUES (?, ?, ?, ?)
    `);
    insertReward.run(userId, 50.0, "Welcome & Profile Initialization", 50.0);
    insertReward.run(userId, 120.0, "Autonomous Completion of Q2 Financial Summary", 170.0);
    insertReward.run(userId, -20.0, "Planner Token Cost for Multi-Agent Optimization", 150.0);

    // Seed agent activity (Perceive -> Reason -> Act -> Verify)
    const insertAction = db.prepare(`
      INSERT INTO agent_actions (user_id, agent, action, status, payload_json) VALUES (?, ?, ?, ?, ?)
    `);

    // The Doer: Act & Verify
    insertAction.run(
      userId,
      "The Doer",
      "Re-indexing local financial ledger rows",
      "completed",
      JSON.stringify({
        phase: "Act & Verify",
        perceive: "Identified 3 CSV streams in /financials",
        reason: "Calculated discrepancy in marketing rows due to currency conversion mismatch.",
        act: "Amended 14 rows, compiled verified output in q2_anomalies_summary.pdf.",
        verify: "Checked that sum of delta columns equals 0. Audit trail verified with 100% precision."
      })
    );

    // The Planner: Perceive & Reason
    insertAction.run(
      userId,
      "The Planner",
      "Multi-day calendar alignment for pricing strategy",
      "completed",
      JSON.stringify({
        phase: "Perceive & Reason",
        perceive: "Received Zenith Proposal requirement + Competitor Pricing task.",
        reason: "Identified high overlap. Pricing strategy must run before renewal proposal so renewal incorporates new plans.",
        act: "Shifted zenith review to June 28, scheduled rebalancing to June 29 morning during high-focus zone.",
        verify: "No conflicts detected. Allocated 7 hours of high-focus blocks across 3 days."
      })
    );

    // The Profiler
    insertAction.run(
      userId,
      "The Profiler",
      "Adjusting work style parameters",
      "completed",
      JSON.stringify({
        phase: "Perceive & Reason",
        perceive: "User skipped 2 evening tasks in a row.",
        reason: "User demonstrates very low energy & task completion rate after 18:00.",
        act: "Moved evening deep work blocks to morning (08:00 - 11:00) window. Lowered afternoon expectations.",
        verify: "Pace threshold set to 'deliberate'. Notification frequency dialed down."
      })
    );

    // The Strategist
    insertAction.run(
      userId,
      "The Strategist",
      "Evaluating project risk curves",
      "completed",
      JSON.stringify({
        phase: "Verify",
        perceive: "Pricing rebalance task deadline approaches on July 5.",
        reason: "Delay in competitor pricing rebalance puts renewal proposals at risk.",
        act: "Flagged Pricing Synthesizer with higher urgency, sent alert requesting proactive execution model.",
        verify: "Risk tolerance profile checked: conservative. Proactive agent modes enabled."
      })
    );

    console.log("Database seeded successfully.");
  }
}

export default db;
