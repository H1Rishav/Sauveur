# SAUVEUR: Autonomous Productivity Core

### 🚨 Problem Statement
Traditional tools fail last-minute surge workers because they focus on reminders rather than solving cognitive procrastination, leaving students and professionals to struggle under unmanageable deadlines.

### 🧠 Solution Overview
SAUVEUR is an autonomous cognitive-behavioral productivity system designed for late-night academic surge workers. Built on the thesis that deadlines are missed due to behavioral blocks rather than forgetfulness, SAUVEUR doesn't nudge or nag—it understands your pace, maps out compact daily work allocations, writes your research artifacts, and drafts polite extension request emails when workloads become mathematically impossible.

### ✨ Key Features
* **Autonomous Artifact Generation**: The Doer agent creates high-fidelity study notes, LaTeX proofs, reports, and code specs directly in your workspace.
* **Dynamic Calendar Roadmap**: Calculates, spreads, and dynamically redistributes hourly daily workloads to prevent last-minute crunch.
* **Proactive Collision Detection**: Automatically flags "mathematically impossible timelines" and prepares polite extension emails in an approval queue.
* **Cognitive Behavioral Profiler**: Analyzes peak performance, completion speeds, and historical miss rates to dynamically adapt schedules.
* **Tamper-Proof Rewards & Store**: Earn points for focus streaks and early completions, and spend them in a browsable redemption store.
* **Agent Feed & Cryptographic Reversal**: Audit all past agent operations with one-click cryptographic "Undo" to revert any state change.

### 🧠 Agentic Depth
Four specialized server-authoritative agents run a persistent **Perceive → Reason → Act → Verify (P→R→A→V)** cognitive execution loop. The agents autonomously read SQLite databases, reason about priorities and constraints, generate physical outputs, and verify integrity standards prior to logging.

### 🌐 Google Technologies
* **Google Gemini Function Calling**: Drives decision-making and tool execution for the four autonomous agents.
* **Gemini-1.5-Flash**: Real-time server-side text, document, and image processing.
* **Google Search Grounding**: Injects verified, up-to-date documentation and academic schemas into student research artifacts.
* **Google Cloud Run**: Highly scalable, low-latency container environment.

### 🛠️ Technologies Used
Vite, React 18, Tailwind CSS, Recharts, Express, Better-SQLite3, BCryptJS, JWT, and Nodemailer.

### 🔐 Security
Uses session token verification, strict server-side rate limits, input sanitization, and server-authoritative transaction logging to prevent points tampering.

### ⚠️ Limitations & Future Scope
* **Model Rate Limits**: Relies on standard token rate limits (excessive rapid executions may hit temporary thresholds).
* **Deep Personalization**: Future updates will introduce vectorized course-syllabus embeddings for ultra-precise academic artifact context.
* **Scale-Out Strategy**: Highly optimized local SQLite database is ready to scale to PostgreSQL for multi-tenant deployments.
