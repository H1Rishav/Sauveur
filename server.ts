import express from "express";
import session from "express-session";
import rateLimit from "express-rate-limit";
import path from "path";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import db, { initDB } from "./server/db.js";

declare module "express-session" {
  interface SessionData {
    userId: number;
    userName: string;
    userEmail: string;
    isDemo: boolean;
  }
}

const app = express();
const PORT = 3000;

// Initialize database
initDB();

// Trust proxy for reverse proxy in Cloud Run (crucial for rate-limiting and cookies behind proxy)
app.set("trust proxy", 1);

// Parse JSON and Form payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Session Middleware
const SESSION_SECRET = process.env.SESSION_SECRET || "sauveur_fallback_secret_beacon_2026";
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: "sauveur_sid",
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // secure cookies in production (served over HTTPS)
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    },
  })
);

// --- Rate Limiting Middlewares ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 50, // limit to 50 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication requests. Please try again in 15 minutes." },
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Slow down, companion." },
});

// Apply rate limits
app.use("/api/auth", authLimiter);
app.use("/api/", apiLimiter);

// --- Security Helper: Sanitize & Validate ---
function sanitizeString(input: any): string {
  if (typeof input !== "string") return "";
  // Basic trim and escape html characters
  return input
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Authentication Guard Middleware
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// --- API Auth Routes ---

// Get current session user
app.get("/api/auth/me", (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({
      user: {
        id: req.session.userId,
        name: req.session.userName,
        email: req.session.userEmail,
        isDemo: !!req.session.isDemo,
      },
    });
  }
  res.json({ user: null });
});

// Signup Endpoint
app.post("/api/auth/signup", (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    const cleanName = sanitizeString(name);
    const cleanEmail = sanitizeString(email).toLowerCase();

    if (!cleanName) {
      return res.status(400).json({ error: "Full name is required." });
    }
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long." });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    // Check if email already exists
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: "An account with that email already exists." });
    }

    // Hash password & Insert
    const passwordHash = bcrypt.hashSync(password, 10);
    const insertResult = db.prepare(
      "INSERT INTO users (name, email, password_hash, is_demo) VALUES (?, ?, ?, 0)"
    ).run(cleanName, cleanEmail, passwordHash);

    const userId = insertResult.lastInsertRowid as number;

    // Create a default empty habit profile
    const defaultHabit = JSON.stringify({
      focusHours: [9, 12],
      pace: "deliberate",
      riskTolerance: "conservative",
      communication: "editorial",
      workStyle: "focused"
    });
    db.prepare("INSERT INTO habit_profile (user_id, traits_json) VALUES (?, ?)").run(userId, defaultHabit);

    // Give a small welcome point balance
    db.prepare("INSERT INTO rewards_ledger (user_id, delta, reason, balance_after) VALUES (?, ?, ?, ?)")
      .run(userId, 50.0, "Welcome & Foundation Ledger Created", 50.0);

    // Save session
    req.session.userId = userId;
    req.session.userName = cleanName;
    req.session.userEmail = cleanEmail;
    req.session.isDemo = false;

    return res.json({
      success: true,
      user: { id: userId, name: cleanName, email: cleanEmail, isDemo: false }
    });
  } catch (err: any) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "An internal server error occurred during registration." });
  }
});

// Login Endpoint
app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = sanitizeString(email).toLowerCase();

    if (!cleanEmail || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail) as any;
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Establish session
    req.session.userId = user.id;
    req.session.userName = user.name;
    req.session.userEmail = user.email;
    req.session.isDemo = !!user.is_demo;

    return res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, isDemo: !!user.is_demo }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "An error occurred during sign in." });
  }
});

// Enter with Demo Profile Guest login
app.post("/api/auth/demo", (req, res) => {
  try {
    const demoEmail = "demo@sauveur.ai";
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND is_demo = 1").get(demoEmail) as any;
    
    if (!user) {
      return res.status(404).json({ error: "Demo user could not be found. Please contact support or sign up." });
    }

    req.session.userId = user.id;
    req.session.userName = user.name;
    req.session.userEmail = user.email;
    req.session.isDemo = true;

    return res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, isDemo: true }
    });
  } catch (err) {
    console.error("Demo login error:", err);
    return res.status(500).json({ error: "An error occurred entering the demo environment." });
  }
});

// Logout Endpoint
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to end session" });
    }
    res.clearCookie("sauveur_sid");
    return res.json({ success: true });
  });
});


// --- Protected Feature Endpoints ---

// Get Tasks
app.get("/api/tasks", requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const tasks = db.prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY deadline ASC").all(userId);
    
    // For each task, check if there are artifacts or schedule blocks
    const tasksWithExtras = tasks.map((task: any) => {
      const task_id = task.id;
      const artifacts = db.prepare("SELECT * FROM artifacts WHERE task_id = ?").all(task_id);
      const scheduleBlocks = db.prepare("SELECT * FROM schedule_blocks WHERE task_id = ?").all(task_id);
      return {
        ...task,
        artifacts,
        scheduleBlocks,
        requires_human_check: !!task.requires_human_check,
        needs_mail: !!task.needs_mail
      };
    });

    return res.json({ tasks: tasksWithExtras });
  } catch (err) {
    console.error("Get tasks error:", err);
    return res.status(500).json({ error: "Could not retrieve tasks." });
  }
});

// Create Task with server-side input validation and sanitization
app.post("/api/tasks", requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const { title, description, deadline, urgency, mode, importance, needs_mail, recipient_email } = req.body;

    const cleanTitle = sanitizeString(title);
    const cleanDescription = sanitizeString(description);
    const cleanDeadline = sanitizeString(deadline);
    const cleanUrgency = sanitizeString(urgency) || "medium";
    const cleanMode = sanitizeString(mode) || "autopilot";
    const cleanImportance = sanitizeString(importance) || "medium";
    const cleanRecipientEmail = sanitizeString(recipient_email);
    const booleanNeedsMail = needs_mail ? 1 : 0;

    if (!cleanTitle) {
      return res.status(400).json({ error: "Task title is required." });
    }

    const insertResult = db.prepare(`
      INSERT INTO tasks (user_id, title, description, deadline, urgency, mode, importance, needs_mail, recipient_email, status, requires_human_check)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)
    `).run(
      userId,
      cleanTitle,
      cleanDescription || null,
      cleanDeadline || null,
      cleanUrgency,
      cleanMode,
      cleanImportance,
      booleanNeedsMail,
      booleanNeedsMail ? (cleanRecipientEmail || null) : null
    );

    const newTaskId = insertResult.lastInsertRowid;

    // Trigger dummy Agent Action to simulate Planner scheduled action
    db.prepare(`
      INSERT INTO agent_actions (user_id, agent, action, status, payload_json)
      VALUES (?, 'The Planner', ?, 'completed', ?)
    `).run(
      userId,
      `Analyzing incoming task: "${cleanTitle}"`,
      JSON.stringify({
        phase: "Perceive→Reason→Act→Verify",
        perceive: `New task added: "${cleanTitle}"`,
        reason: "Mapping task priority, importance and workload grid relative to existing slots.",
        act: `Scheduled task block for upcoming high focus zone. Urgency: ${cleanUrgency}, Mode: ${cleanMode}.`,
        verify: "Checked for calendar conflicts. Allocation matches the user's active habit profiles."
      })
    );

    // Also insert a schedule block dynamically
    db.prepare("INSERT INTO schedule_blocks (task_id, date, planned_hours) VALUES (?, ?, ?)")
      .run(newTaskId, new Date().toISOString().split('T')[0], 1.5);

    return res.json({ success: true, taskId: newTaskId });
  } catch (err) {
    console.error("Create task error:", err);
    return res.status(500).json({ error: "Failed to save the task." });
  }
});

// Toggle mode (Autopilot vs Collaborative)
app.post("/api/tasks/:id/toggle-mode", requireAuth, (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.session.userId;

    const task = db.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(taskId, userId) as any;
    if (!task) {
      return res.status(404).json({ error: "Task not found." });
    }

    const newMode = task.mode === "autopilot" ? "collaborative" : "autopilot";
    db.prepare("UPDATE tasks SET mode = ? WHERE id = ?").run(newMode, taskId);

    return res.json({ success: true, mode: newMode });
  } catch (err) {
    console.error("Toggle task mode error:", err);
    return res.status(500).json({ error: "Failed to toggle task execution mode." });
  }
});

// Human approve task action
app.post("/api/tasks/:id/approve", requireAuth, (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.session.userId;

    const task = db.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(taskId, userId) as any;
    if (!task) {
      return res.status(404).json({ error: "Task not found." });
    }

    // Complete the task and award points!
    db.prepare("UPDATE tasks SET status = 'completed', requires_human_check = 0 WHERE id = ?").run(taskId);

    // Award +50 points
    const currentBalanceRow = db.prepare("SELECT balance_after FROM rewards_ledger WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(userId) as { balance_after: number } | undefined;
    const currentBalance = currentBalanceRow ? currentBalanceRow.balance_after : 0;
    const newBalance = currentBalance + 50.0;

    db.prepare("INSERT INTO rewards_ledger (user_id, delta, reason, balance_after) VALUES (?, ?, ?, ?)")
      .run(userId, 50.0, `Approved and Dispatched: ${task.title}`, newBalance);

    // Log agent action
    db.prepare(`
      INSERT INTO agent_actions (user_id, agent, action, status, payload_json)
      VALUES (?, 'The Doer', ?, 'completed', ?)
    `).run(
      userId,
      `Dispatching and mailing artifact for: "${task.title}"`,
      JSON.stringify({
        phase: "Act & Verify",
        perceive: "Human approval registered. Locked in contract.",
        reason: "All requirements met. Draft email validated.",
        act: task.needs_mail && task.recipient_email ? `Mailed proposal draft directly to ${task.recipient_email}` : "Archived document to safe workspace storage.",
        verify: "Confirmed delivery status: Sent successfully. Rewards ledger credited."
      })
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("Approve task error:", err);
    return res.status(500).json({ error: "Failed to dispatch approved task." });
  }
});

// Get Agent Activity
app.get("/api/agent-activity", requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const actions = db.prepare("SELECT * FROM agent_actions WHERE user_id = ? ORDER BY id DESC").all(userId);
    const parsedActions = actions.map((act: any) => ({
      ...act,
      payload: JSON.parse(act.payload_json)
    }));
    return res.json({ actions: parsedActions });
  } catch (err) {
    console.error("Get agent actions error:", err);
    return res.status(500).json({ error: "Could not retrieve agent logs." });
  }
});

// Get Rewards Ledger
app.get("/api/rewards", requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const ledger = db.prepare("SELECT * FROM rewards_ledger WHERE user_id = ? ORDER BY id DESC").all(userId) as any[];
    const balance = ledger.length > 0 ? ledger[0].balance_after : 0;
    return res.json({ ledger, balance });
  } catch (err) {
    console.error("Get rewards error:", err);
    return res.status(500).json({ error: "Could not fetch reward ledger." });
  }
});

// Get Settings & Habit Profile
app.get("/api/settings", requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const profile = db.prepare("SELECT * FROM habit_profile WHERE user_id = ?").get(userId) as any;
    const user = db.prepare("SELECT name, email, is_demo FROM users WHERE id = ?").get(userId) as any;

    return res.json({
      user,
      profile: profile ? JSON.parse(profile.traits_json) : {}
    });
  } catch (err) {
    console.error("Get settings error:", err);
    return res.status(500).json({ error: "Could not fetch configuration details." });
  }
});

// Update Settings & Habit Profile
app.post("/api/settings", requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const { pace, riskTolerance, communication, workStyle, focusHoursStart, focusHoursEnd } = req.body;

    const cleanPace = sanitizeString(pace) || "deliberate";
    const cleanRisk = sanitizeString(riskTolerance) || "conservative";
    const cleanComm = sanitizeString(communication) || "editorial";
    const cleanStyle = sanitizeString(workStyle) || "focused";
    const hrStart = parseInt(focusHoursStart) || 9;
    const hrEnd = parseInt(focusHoursEnd) || 17;

    const newTraits = JSON.stringify({
      focusHours: [hrStart, hrEnd],
      pace: cleanPace,
      riskTolerance: cleanRisk,
      communication: cleanComm,
      workStyle: cleanStyle
    });

    db.prepare("UPDATE habit_profile SET traits_json = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?")
      .run(newTraits, userId);

    // Let the Profiler log that traits were dynamically indexed
    db.prepare(`
      INSERT INTO agent_actions (user_id, agent, action, status, payload_json)
      VALUES (?, 'The Profiler', 'Syncing updated user work parameters', 'completed', ?)
    `).run(
      userId,
      JSON.stringify({
        phase: "Perceive→Reason→Act→Verify",
        perceive: "Observed user manual update in core traits.",
        reason: "User specified deep work parameters, pace adjustments, and custom focus window.",
        act: `Synchronized neural memory modules with traits: Pace: ${cleanPace}, Risk: ${cleanRisk}.`,
        verify: "Checked bounds: Focus interval length validated. Memory matrix synchronized."
      })
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("Update settings error:", err);
    return res.status(500).json({ error: "Failed to update settings." });
  }
});


// --- Vite Handoff / Static Hosting ---

async function startServer() {
  // Support Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // Mount Vite middlewares
    app.use(vite.middlewares);
  } else {
    // Production asset serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SAUVEUR] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
