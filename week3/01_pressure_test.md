# Nexus — Rubric Pressure Test
## Does it check every requirement of Week 3?

---

## The One-Liner

> My agent helps **recently discharged patients (or their caregivers)** do **post-hospital recovery management** in a **Streamlit web app**, replacing **the manual, fragmented, error-prone process of tracking medications, appointments, warning signs, and paperwork from a paper discharge sheet — which costs patients readmissions, families lost work hours, and the system $26B annually in preventable readmissions**. It does the work on its own using **6 tools across 5 specialized subagents**, hands off to a human **when a warning symptom is flagged, before any provider message is sent, or when an escalation threshold is crossed**, and I'll know it works when a recently discharged patient can go from discharge summary PDF to a fully structured recovery plan with daily monitoring active — **in under 5 minutes, with zero missed medications or appointments in a 7-day tracked cohort, 8 times out of 10.**

---

## Requirement Checklist

### ✅ 1. Not a one-shot LLM call
The system runs a **continuous monitoring loop** — the Monitoring Agent checks in daily, compares responses against thresholds, and triggers downstream agents conditionally. This is fundamentally different from a single prompt → response pattern.

**Evidence:** Day 1 check-in → Day 2 check-in → pattern comparison → conditional escalation. Each step depends on prior state.

---

### ✅ 2. Not a RAG lookup
RAG is present (discharge summary ingested into Pinecone) but it is **one tool among six**, not the product. The product is the agentic loop that persists across days, makes decisions, and takes actions.

**Evidence:** The system ingests the discharge PDF on Day 0, then operates independently for 30 days without the user re-uploading anything. That's not RAG — that's an agent with memory.

---

### ✅ 3. Agent decides what to do next
The Orchestrator routes to different subagents based on:
- What day it is in the recovery timeline
- What the patient reported in their daily check-in
- Whether any thresholds have been crossed
- Whether pending tasks (appointments, refills) are overdue

**Evidence:** If monitoring detects "chest pain" it routes to Escalation Agent, not Admin Agent. The decision is conditional, not linear.

---

### ✅ 4. Calls tools
Six distinct tools are called across the pipeline:

| Tool | Type | Agent That Uses It |
|---|---|---|
| PDF parser (PyMuPDF) | Read | Intake Agent |
| Pinecone vector store | Read/Write | Intake Agent, Care Plan Agent |
| Claude API (claude-sonnet-4-6) | Read | All agents |
| Medication interaction checker (OpenFDA API) | Read | Care Plan Agent |
| Calendar/reminder setter | Write | Admin Agent |
| Provider message drafter → human queue | Write (gated) | Provider Comms Agent |

---

### ✅ 5. Holds state across steps
State is maintained at two levels:
- **Within a session:** Orchestrator passes structured JSON state between subagents
- **Across sessions:** Pinecone stores the patient's care plan, check-in history, and flagged symptoms persistently across 30 days

**Evidence:** On Day 7, the Monitoring Agent can compare today's symptom report against Day 1, 2, 3 baseline — without the user re-entering anything.

---

### ✅ 6. Recovers from errors
Explicit error handling at each node:

| Failure Mode | Recovery Behavior |
|---|---|
| PDF parse fails | Asks user to re-upload or enter manually |
| OpenFDA API timeout | Retries 3x, then flags for pharmacist review |
| Check-in response is ambiguous | Asks one clarifying follow-up question |
| Pinecone write fails | Logs to local SQLite fallback, retries on next run |
| Claude API rate limit | Exponential backoff, queues the task |

---

### ✅ 7. Hands off to human when it should
Three distinct, well-defined human handoff points:

1. **Before any message is sent to a provider** — drafted by Provider Comms Agent, queued in Streamlit UI for patient/caregiver approval
2. **When a red-flag symptom is reported** — Escalation Agent surfaces crisis guidance and notifies designated emergency contact (with prior consent)
3. **When medication conflict is detected** — Care Plan Agent flags it, never auto-resolves, always surfaces to pharmacist/physician review queue

---

### ✅ 8. Multi-agent (not just tool-chain)
Five specialized subagents with distinct responsibilities, each with its own system prompt and tool access scope:

```
Orchestrator
├── Intake Agent          — document understanding
├── Care Plan Agent       — clinical reasoning + conflict detection  
├── Monitoring Agent      — daily loop + pattern detection
├── Escalation Agent      — threshold crossing + emergency routing
└── Admin Agent           — scheduling + reminders + family coordination
```

Each agent has a **single responsibility**. The Orchestrator does not do clinical reasoning — that belongs to Care Plan Agent. The Monitoring Agent does not draft messages — that belongs to Provider Comms Agent. This is true delegation, not a fat orchestrator with helper functions.

---

### ✅ 9. Uses specified tech stack
| Requirement | How It's Met |
|---|---|
| n8n | Orchestration layer — triggers daily check-in workflow, routes between agents, handles retry logic |
| Pinecone | Vector store for discharge summary chunks + persistent check-in history |
| Python | All agent logic, tool wrappers, API clients |
| Claude | LLM backbone for all 5 agents (claude-sonnet-4-6) |
| Streamlit | Patient/caregiver UI — upload portal, daily check-in, human approval queue, recovery dashboard |
| Git | Full repo with README, requirements.txt, .env.example, agent modules, n8n workflow JSON export |

---

### ✅ 10. Clear success metric
> A recently discharged patient can go from discharge PDF upload to active recovery plan in under 5 minutes, with zero missed medications or appointments tracked over 7 days, 8 times out of 10.

This is measurable, specific, and demo-able in a live presentation.

---

## Potential Weak Points — Honest Assessment

| Risk | Mitigation |
|---|---|
| HIPAA compliance concern | Clearly scope as a prototype/demo. Add disclaimer. Use synthetic patient data in demo. Do not store real PHI. |
| OpenFDA API may not cover all medications | Fallback to Claude's knowledge + flag for pharmacist review |
| Daily check-in requires user behavior change | Demo shows SMS/email nudge as entry point, not just app open |
| n8n + Streamlit + Pinecone is a lot of moving parts | Build in this order: Intake → Care Plan → Monitoring → Admin → Escalation. Get each working before connecting. |

---

---

### ✅ 10. Nebius Token Factory (Required by rubric)
The rubric states: *"Both tracks must use Nebius Token Factory for at least one model call."*

**Where it's used:** The Care Plan Agent runs the care plan generation step via Nebius Token Factory (Meta-Llama-3.1-70B-Instruct), using the OpenAI-compatible API endpoint. All other agents use Claude claude-sonnet-4-6 via Anthropic API directly. This gives you a direct comparison of model outputs to discuss in your cohort review.

---

### ✅ 11. Submission Deliverables
The rubric requires three deliverables:

| Deliverable | How it's met |
|---|---|
| Google Doc | Project overview, prompts used during vibe coding, iterations tried, learnings |
| Video demo (≤5 min) | Live walkthrough: PDF upload → care plan → RED check-in → escalation → approval queue |
| GitHub repo | Full codebase, README, .env.example, n8n workflow JSON export, synthetic test data |

---

## Verdict

**Nexus passes every requirement of the Week 3 rubric.** It is not a chatbot. It is not a RAG app. It is a multi-agent system with persistent state, conditional routing, tool use, error recovery, and principled human handoff — applied to one of the most broken workflows in American healthcare.

The Nebius Token Factory integration is covered. The LangGraph track is the correct choice per rubric guidance: *"Default to Track 2 (LangChain + LangGraph) if your agent is multi-agent or has complex state."* n8n handles the daily scheduling layer. All three submission deliverables are accounted for in the build guide.
