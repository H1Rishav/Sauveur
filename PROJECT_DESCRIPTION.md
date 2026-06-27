# SAUVEUR — Autonomous AI Productivity Companion

## 1. App Purpose & Thesis
**SAUVEUR** (French for *savior*) is a high-end personal focus system that shifts the paradigm from traditional reminder lists to active, autonomous delegation. The core thesis is that a modern productivity companion should not force the user to organize, schedule, and execute everything manually; instead, it proactively processes information, coordinates calendars, drafts artifacts, and schedules work blocks behind the scenes, requesting human verification only when risk parameters require explicit confirmation.

---

## 2. Core Four-Agent Architecture
The system runs an integrated server-side multi-agent core. Every agent operates on a continuous loop of **Perceive → Reason → Act → Verify (PRAV)**:

1. **The Doer**: Synthesizes custom reports, processes tables, formats boards, and prepares email drafts.
2. **The Planner**: Dynamically maps incoming tasks into specific, uninterrupted deep focus blocks, balancing workload density relative to user energy thresholds.
3. **The Profiler**: Silently tracks behaviors and completed tasks to adjust tempo settings (e.g., deliberate vs. aggressive) and dial down communication frequencies.
4. **The Strategist**: Performs continuous safety auditing, evaluates risk curves, and inserts human checkpoint locks on highly critical dispatches.

---

## 3. Cognitive Cycle (PRAV)
- **Perceive**: Inspects user events, incoming items, and manually input guidelines.
- **Reason**: Compares inputs against current user habits, energy states, and safety limits.
- **Act**: Executes database writes, schedules time blocks, or compiles file drafts.
- **Verify**: Audits compiled results against strict verification parameters before marking tasks as ready or requesting human reviews.

---

## 4. Technology Stack
- **Frontend**: React (v19) + Tailwind CSS (v4) with micro-animations via Motion.
- **Backend**: Node.js + Express.js. Sessions managed using `express-session` with client IP rate-limiting via `express-rate-limit`.
- **Database**: SQLite managed locally via `better-sqlite3` inside the workspace container.
- **Security**: Cryptographically hashed passwords (via `bcryptjs`), parameterized SQL queries, server-side data sanitization/validation, and full CORS/reverse proxy trust policies.

---

## 5. Relational Data Model Schema
The system stores all state variables in a local file database (`sauveur.db`) utilizing the following relational tables:

- **`users`**: Stores user authentication credentials, names, emails, and flags for demo reviewers.
- **`tasks`**: Tracks the primary pipeline tasks, including deadline, mode (Autopilot vs. Collaborative), importance thresholds, and dispatch routing.
- **`artifacts`**: Stores references to generated drafts, files, or reports compiled by the Doer.
- **`schedule_blocks`**: Chronologically maps tasks directly into calendar segments.
- **`habit_profile`**: Persists behavioral metrics, target focus intervals, and communication preferences managed by the Profiler.
- **`rewards_ledger`**: Logs gamified feedback point credits awarded for completions and approvals.
- **`agent_actions`**: Records the comprehensive cognitive traces of agent-specific background processes following the PRAV flow.

---

## 6. Key Implemented Features
6.1 Interactive Task Control Board (Home Dashboard)
- **Active Focus Queue**: Shows incomplete tasks sorted descending by urgency level.
- **Completed History**: Stores finished tasks. Users can manually mark any task complete using the prominent "Mark Complete" action button.
- **Completed History Cleanup**: Includes a "Clear History" action with a visual confirmation banner to permanently erase all archived completed tasks and keep the board light and fast.
- **Full Interactive CRUD**: Create, read, edit/re-align parameters, and delete tasks directly. Deleting a task permanently expunges it from the system with an inline confirmation dialog, preventing deleted tasks from appearing in Completed History.
- **Dynamic Live UI**: The entire Pipeline Control Board updates dynamically without manual reloads. Remainder times and countdowns are re-evaluated on a continuous 30-second timer to ensure absolute state accuracy.

### 6.2 Automation & Delegation Modes
- **Just Remind Me (Manual)**: Serves as a passive checklist with explicit manual completion buttons.
- **Agent Does the Work (Collaborative)**: Prepares draft assets (artifacts) and holds them for human review, with manual completion support.
- **Agent Does Work & Mails It (Autopilot)**: Fully executes task completion and automatically sends compiled dispatches to specified recipient emails, while retaining manual verification fallback.

### 6.3 "The Doer" Autonomous Worker & Capabilities
- **Background Execution Pipeline**: When a task's mode is set to Collaborative or Autopilot, users can command The Doer with custom instructions and file uploads. The task runs as a background job that doesn't block the UI, polling live agent state steps at high-resolution interval.
- **Dynamic Phase Stepper (PRAV Loop)**: Shows real-time, glowing visual phase transitions directly inside the task card:
  - **Perceive**: Reads user specifications, attached image/document content, and custom habit traits.
  - **Reason**: Formulates cognitive tool mappings and decides execution structure using Gemini models.
  - **Act**: Executes function calling to write files and catalog DB items.
  - **Verify**: Performs integrity checking, size audits, and user lock authorizations.
- **Gemini-Callable Capability Suite**:
  - **Word-Style Documents**: Generates professional, styled HTML-based `.docx` files.
  - **Summarized Notes**: Outputs beautifully formatted Markdown `.md` minutes or syntheses.
  - **Slide Deck Presentations**: Generates HTML/JS presentation slide outlines labeled `.pptx`.
  - **Spreadsheets**: Creates raw, clean, structured tabular `.csv` datasets.
  - **Executive Reports**: Drafts official audit logs or PDFs labeled `.pdf`.
- **Downloadable Artifact Archive**: All outputs are stored securely on the local storage and are downloadable with authorization-backed secure stream clicks.

### 6.4 Voice Input & Prompt-Injection Safety
- **Integrated Microphone Dictation**: Adds a convenient mic button next to text input/textarea fields in both the main Task Creation form and the inline Doer workspace command panel.
- **Server-Side Sanitization**: Transcripts captured via the browser's Web Speech API are sent to a dedicated server-side endpoint `/api/voice/sanitize` where Gemini filters dysfluencies, proofreads the formatting, and runs security scans.
- **Prompt Injection Defense**: The sanitization engine strictly blocks malicious override codes (e.g., "ignore previous instructions", "system override"), neutralizing injected strings before they can reach downstream LLMs or databases.

### 6.5 Deadline-Based Color-Coding & Alerts
- **Dynamic Alerts**: Automatically monitors and counts down remaining hours relative to the deadline timestamp:
  - **Calm Green**: Deadlines greater than 72 hours away.
  - **Amber Alert**: Deadlines approaching within 12 to 72 hours (e.g. `Due in 1d 4h`).
  - **Urgent Red**: Deadlines less than 12 hours away or overdue (e.g. `Due in 3h`, `OVERDUE BY 2d`).
- **Overdue Task Integrity**: Any task whose deadline passes without completion is flagged as overdue and remains visible in the Active Queue as incomplete to prevent hidden critical misses.
- **Textual Warning Headers**: Clear status badges explaining exactly how much time remains before milestone exhaustion.
