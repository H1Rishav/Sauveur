# SAUVEUR: Autonomous Productivity Core

SAUVEUR is a premium, high-stakes productivity system built for executive-level focus, leveraging a four-agent autonomous core (The Doer, The Planner, The Profiler, The Strategist) to handle task scheduling, artifact generation, risk assessment, and proactive workflow refinement.

## Security Posture
- **Endpoint Protection**: All sensitive API endpoints (`/api/*`) are protected by session-based authentication (`requireAuth` middleware).
- **Rate Limiting**: Applied across all API routes to mitigate potential DDoS and brute-force attempts.
- **Input Sanitization**: All incoming request body inputs are server-side sanitized (`sanitizeString`) before database persistence or Gemini ingestion.
- **Data Integrity**: All database queries utilize parameterized SQL inputs to prevent SQL injection vulnerabilities.
- **Secrets Management**: No API keys or sensitive secrets are exposed to the client; all LLM and mail operations are proxied through server-side handlers.
- **Authentication**: User password hashes are secured using `bcryptjs`.

## Demo Persona: The Final-Year Student
The demo environment is pre-populated with a high-stress persona to showcase SAUVEUR's capabilities:
- **Tasks**: 4 colliding responsibilities (Algorithms Exam, Operating Systems Exam, Database Assignment, Placement Form).
- **Habit Profile**: "Fast worker, chronic last-minute, misses ~30%".
- **Agent Feed**: Past agent actions showing strategic intervention in scheduling crunch periods.

## Final Polish & Design
- **Amber/Charcoal Theme**: A polished, high-contrast dark visual language optimized for deep focus.
- **Animations**: Staggered fade-in-up entrance transitions for task cards, coupled with pulsing urgency indicators for near-deadline alerts.
- **Agent Interaction**: Rich cognitive trace logging (Perceive → Reason → Act → Verify) for transparent autonomous execution.
