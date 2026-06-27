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
