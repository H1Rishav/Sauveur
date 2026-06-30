# SAUVEUR — The Last-Minute Life Saver
> **"It doesn't remind you, it does the work."**

---

## 💡 The Behavioral Thesis
Traditional productivity apps assume you fail because you forget. But you don't forget your final exams, your major product launches, or your term papers—you miss deadlines due to deeper cognitive and behavioral blocks: chronic procrastination, late-night high-speed academic surges, and poor initial pacing. 

**SAUVEUR** (meaning *Savior*) is a cognitive-behavioral productivity ecosystem. Rather than nagging you with alarms, it understands your work style, spreads out manageable daily focus blocks, writes your drafts, runs your simulations, and drafts your extension emails to buy you time when the schedule is mathematically impossible.

---

## ✨ Features

### 🕵️‍♂️ The Four Autonomous Agents
* **The Doer**: Executes tasks autonomously, analyzes images or files, and writes comprehensive deliverables (LaTeX proofs, research drafts, script specs, CSV reports) directly to your workspace as physical artifacts.
* **The Planner**: Computes customized daily hour-by-hour focus blocks tailored to your behavioral profile, spreading remaining workloads dynamically to prevent last-minute crunch.
* **The Profiler**: Performs a detailed cognitive analysis of your performance patterns (e.g., peak performance hours, completion speed, historical deadline miss rates) to build a persistent behavioral traits profile.
* **The Strategist**: Monitors your entire academic pipeline, warns you of impending deadline collisions, and automatically compiles polite extension request emails when workloads become mathematically impossible.

### ⚙️ Core Systems & Mechanics
* **Momentum Mode**: A high-focus, full-screen study environment with a built-in focus timer, active task goals, and automatic point generation upon completion.
* **Tamper-Proof Rewards & Redemption**: Earn points for completing tasks early, maintaining focus streaks, or sticking to scheduled blocks, and redeem them for store items (such as Streak Freezes or theme upgrades).
* **Interactive Roadmap & Calendar**: A fluid dynamic scheduler displaying daily block-by-block time allocations, deadline flags, busy date markers, and downloadable `.ics` exports.
* **Approval Gates & Nodemailer Mailing**: Collaborative agent-directed tasks feature a "Requires Human Review" approval gate, allowing you to edit or authorize email dispatches sent via SMTP.
* **Agent Activity Feed & State Rollback (Undo)**: A complete audit log of every autonomous action taken by the agents, featuring full cryptographic one-click "Undo" buttons to revert state changes instantly.

---

## 🧠 How the Agents Work (C-LARA Loop)
All four cognitive engines run a server-authoritative **Perceive → Reason → Act → Verify** cycle powered by Gemini LLM orchestration and localized execution:

```
[Perceive] ----> [Reason] ----> [Act] ----> [Verify]
   |                |              |             |
Reads active    Calculates     Generates files,  Validates results
tasks, profile  optimal path   drafts email, or  against goals,
and constraints  or work blocks  updates state     updates audit log
```

1. **Perceive**: The agent reads the local state, SQLite database tables, active task descriptions, and the user's habit profile traits.
2. **Reason**: The model reasons about priority stakes, behavioral vulnerabilities, and constraints to devise an action plan.
3. **Act**: The agent performs the database insertions, writes physical files into the local workspace, or constructs email drafts.
4. **Verify**: The system validates that the artifact or state change matches standard execution rules before logging it as a completed action in the Agent Activity Feed.

---

## 🛠️ Tech Stack
* **Frontend**: React 18 (TypeScript), Vite, Tailwind CSS (for fluid, high-contrast typography and layout), Recharts (data-driven visualizations), Framer Motion (for polished transitions).
* **Backend**: Node.js, Express, Better-SQLite3 (database engine running write-ahead logging with robust schema constraints).
* **Ecosystem Utilities**: BcryptJS (secure hashing), JSON Web Tokens (session authorization), Nodemailer (secure transactional email dispatching).
* **AI Orchestration**: Gemini API utilizing server-side proxy routes with strict prompt-injection defenses.

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone <repository-url>
cd sauveur
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory by copying `.env.example`:
```bash
cp .env.example .env
```
Fill in the following variables:
* `GEMINI_API_KEY`: Your Google Gemini API Key (required for agent reasoning).
* `SESSION_SECRET` / `JWT_SECRET`: Random long secure keys used to sign credentials.
* `MAIL_USER`: Your Gmail address (to test automatic email dispatches).
* `MAIL_APP_PASSWORD`: Your Google Account App Password (not your standard password).

### 4. Run Locally
Start the development server (runs both Express and Vite concurrently):
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

### 5. Instant Showcase (One-Click Demo)
No signup is required! Click **"Try the demo"** on the login screen to enter a pre-seeded, fully realized showcase account representing **"Priya"**, a final-year student with overlapping midterms. The demo is populated with complex schedules, custom generated PDF blueprints, draft extension emails, active and overdue tasks, rewards points, and undoable activity histories.

---

## 🔐 Security
* **Server-Authoritative Session & Token Validation**: No critical API secrets or API keys are exposed to the client browser.
* **Data Sanitization**: Complete validation bounds on tasks, input content, and reward ledger balances.
* **Tamper-Proof Ledger**: Rewards balances are derived from a cryptographic transaction history in SQLite, preventing client-side point manipulation.

---

## 📁 Project Structure
```
├── artifacts/             # Physical file output generated by The Doer
├── server/                # Backend API & Autonomous Agent Engines
│   ├── db.ts              # SQLite Schema, initialization, and seed logic
│   ├── doer.ts            # The Doer agent orchestrator
│   ├── planner.ts         # The Planner scheduler and block assigner
│   ├── profiler.ts        # The Profiler behavioral analyst
│   └── strategist.ts      # The Strategist collision warning logic
├── src/                   # React Frontend App
│   ├── components/        # Dashboards, Calendars, Rewards, & Settings
│   ├── App.tsx            # Root UI Router & State Core
│   └── types.ts           # Shared TypeScript definitions
└── server.ts              # Express server & centralized API routes
```

---

## ⚠️ Limitations & Future Scope
* **Free-Tier Limits**: Relies on standard Gemini rate limits. Heavy concurrent agent reasoning runs may occasionally hit token limits.
* **Personalization Depth**: Future releases will incorporate broader vector embeddings of academic curricula to write more specialized artifacts.
* **Scalability**: While SQLite is optimal for this single-user local deployment, a multi-tenant cloud release will migrate to Firebase Firestore or PostgreSQL.
