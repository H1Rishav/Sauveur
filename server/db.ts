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
      focusHours: [9, 17],
      pace: "fast",
      riskTolerance: "moderate",
      communication: "direct",
      workStyle: "last-minute-burst"
    });
    db.prepare("INSERT INTO habit_profile (user_id, traits_json) VALUES (?, ?)").run(userId, habitJson);

    // Seed tasks (colliding)
    const insertTask = db.prepare(`
      INSERT INTO tasks (user_id, title, description, deadline, status, urgency, mode, importance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Helper for task insertion
    const now = new Date();
    const addDays = (days: number) => {
        const d = new Date(now);
        d.setDate(d.getDate() + days);
        return d.toISOString();
    };

    insertTask.run(userId, "Advanced Algorithms Exam", "Final exam covering NP-hardness.", addDays(0), "pending", "urgent", "autopilot", "high");
    insertTask.run(userId, "Operating Systems Exam", "Comprehensive final.", addDays(0), "pending", "urgent", "autopilot", "high");
    insertTask.run(userId, "Database Systems Assignment", "Implement B-Tree indexing.", addDays(1), "pending", "urgent", "collaborative", "medium");
    insertTask.run(userId, "Placement Drive Application", "Final date to upload CV.", addDays(2), "pending", "medium", "manual", "high");
    insertTask.run(userId, "Complete Sample Demo Task", "This task is completed to test undo.", addDays(0), "completed", "low", "autopilot", "low");

    // Seed rewards
    const insertReward = db.prepare(`
      INSERT INTO rewards_ledger (user_id, delta, reason, balance_after) VALUES (?, ?, ?, ?)
    `);
    insertReward.run(userId, 50.0, "Welcome Bonus", 50.0);
    insertReward.run(userId, 100.0, "Early Bird Completion", 150.0);

    // Seed agent activity
    const insertAction = db.prepare(`
      INSERT INTO agent_actions (user_id, agent, action, status, payload_json) VALUES (?, ?, ?, ?, ?)
    `);

    insertAction.run(userId, "The Strategist", "Analyzing upcoming crunch.", "completed", JSON.stringify({
        perceive: "Deadline collision detected in 24 hours.",
        reason: "Two exams and a major assignment overlap.",
        act: "Prioritizing Algorithm exam review.",
        verify: "Schedule set."
    }));

    console.log("Database seeded successfully.");
  }
}

export default db;
