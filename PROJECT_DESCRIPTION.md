# SAUVEUR: Autonomous Productivity Core

SAUVEUR is a premium, high-stakes productivity system built for executive-level focus, leveraging a four-agent autonomous core (The Doer, The Planner, The Profiler, The Strategist) to handle task scheduling, artifact generation, risk assessment, and proactive workflow refinement.

## Security Posture
- **Endpoint Protection**: All sensitive API endpoints (`/api/*`) are protected by session-based authentication (`requireAuth` middleware).
- **Rate Limiting**: Applied across all API routes to mitigate potential DDoS and brute-force attempts.
- **Input Sanitization**: All incoming request body inputs are server-side sanitized (`sanitizeString`) before database persistence or Gemini ingestion.
- **Data Integrity**: All database queries utilize parameterized SQL inputs to prevent SQL injection vulnerabilities.
- **Secrets Management**: No API keys or sensitive secrets are exposed to the client; all LLM and mail operations are proxied through server-side handlers.
- **Authentication**: User password hashes are secured using `bcryptjs`.

## Demo Persona: The Final-Year Student ("Priya")
The demo environment is fully seeded on server boot with a highly detailed, realistic final-year student persona ("Priya") to demonstrate SAUVEUR's complete features instantly without manual creation:
- **Comprehensive Tasks**: A diverse list of active tasks across multiple urgency and mode states, including overdue assignments, high-stakes due-soon labs, and comfortably ahead placement applications.
- **Completed Tasks & Pre-generated Artifacts**: Includes several completed agent-directed tasks complete with real, downloadable cognitive specifications, blueprints, and progress CSV files generated directly inside the physical `/artifacts` workspace directory.
- **Detailed Habit Profile**: A fully realized habit profile modeled in The Profiler describing Priya's late-night surge tendencies, pace, and a detailed cognitive behavioral analysis.
- **Populated Calendar Roadmap**: A spread of dynamic daily work blocks scheduled across days leading up to deadlines, along with busy dates toggled as unavailable to showcase scheduling intelligence.
- **Strategist Warnings & Extension Queue**: Pre-configured workload density conflicts that trigger a "Mathematically Impossible Timeline" warning alongside a polished extension request email sitting in the proactive approval queue.
- **Rewards, Ledger & Store**: A populated points ledger with clear earning history (e.g., Early Bird completions) and a transactional, browsable redemption store pre-funded with 200 points.
- **Agent Activity Feed**: A comprehensive log of past autonomous agent actions, including an undoable calendar reshuffling action to demonstrate live state rollback.

## Final Polish & Design
- **Amber/Charcoal Theme**: A polished, high-contrast dark visual language optimized for deep focus.
- **Animations**: Staggered fade-in-up entrance transitions for task cards, coupled with pulsing urgency indicators for near-deadline alerts.
- **Agent Interaction**: Rich cognitive trace logging (Perceive → Reason → Act → Verify) for transparent autonomous execution.
- **Interactive Roadmap & Dynamic Rescheduling**: The calendar displays a comprehensive day-by-day roadmap of work blocks alongside deadline markers. Users can drag and drop blocks between dates, edit planned hours directly, or toggle days as busy/unavailable to trigger instant, mathematically verified workload redistribution that flags unfeasible deadlocks.

