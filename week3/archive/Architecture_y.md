# Discharge Navigator — Complete Architecture Document
## Multi-Agent Post-Hospital Recovery System

---

## 1. Agent Goal (One Line)

> Takes a hospital discharge summary and becomes a 30-day recovery co-pilot — tracking medications, monitoring symptoms, scheduling follow-ups, and escalating to humans before anything goes wrong.

---

## 2. Problem Statement

Every year, 1 in 5 Medicare patients is readmitted within 30 days of discharge. The leading causes are not clinical failures — they are **coordination failures**: missed medications, skipped follow-up appointments, unrecognized warning signs, and overwhelmed caregivers with no support system. Patients leave the hospital with a paper sheet and a handshake. This agent is what should happen next.

---

## 3. User

**Primary:** Recently discharged patient (or their adult caregiver) managing recovery at home.
**Secondary:** The patient's primary care physician, who receives structured weekly summaries.

**Surface:** Streamlit web app (desktop and mobile browser). Entry points also include email/SMS nudge for daily check-ins.

**7 screens:**
1. Onboarding — PDF upload, patient setup, emergency contact consent
2. Care plan — day-by-day checklist, medications, warning signs, appointments
3. Daily check-in — ElevenLabs voice input with typed fallback
4. Approval queue — human review before any outbound communication
5. Recovery dashboard — daily vitals log, medication adherence bars, anomaly flags
6. Provider summary — auto-generated shareable brief for doctor appointments
7. Hospital history — auto-populated from discharge PDFs, manual entry for past stays

---

## 4. The One-Liner (Full Format)

My agent helps **recently discharged patients and their caregivers** do **30-day post-discharge recovery management** in a **Streamlit web app**, replacing **the fragmented manual process of tracking medications, appointments, and warning signs from a paper discharge sheet — which costs patients readmissions and families lost work hours**. It does the work on its own using **7 tools across 5 specialized subagents**, hands off to a human **when a warning symptom is flagged, before any provider message is sent, or when an escalation threshold is crossed**, and I'll know it works when a discharged patient goes from PDF upload to active recovery plan **in under 5 minutes, with zero missed medications or appointments in a 7-day tracked window, 8 out of 10 times.**

---

## 5. Multi-Agent Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      ORCHESTRATOR                        │
│  Routes between agents based on: day in recovery,        │
│  check-in responses, threshold flags, pending tasks      │
└──────┬──────────┬──────────┬───────────┬────────────────┘
       │          │          │           │
       ▼          ▼          ▼           ▼
  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐
  │ INTAKE  │ │CARE PLAN│ │MONITORING│ │   ESCALATION │
  │  AGENT  │ │  AGENT  │ │  AGENT   │ │    AGENT     │
  └─────────┘ └─────────┘ └──────────┘ └──────────────┘
                                │              │
                                ▲              ▼
                         ┌──────────────┐ ┌──────────────┐
                         │  ELEVENLABS  │ │    ADMIN     │
                         │  STT INPUT   │ │    AGENT     │
                         │ (voice →     │ └──────────────┘
                         │  transcript) │
                         └──────────────┘
```

---

## 6. Subagent Specifications

### Agent 0 — Orchestrator
**Role:** Master coordinator. Never does clinical work. Only routes, tracks state, and manages the recovery timeline.

**System Prompt (abbreviated):**
```
You are the Discharge Navigator Orchestrator. Your only job is to 
decide which subagent to invoke next based on the current recovery 
state. You never generate clinical content yourself. You maintain 
the recovery_state JSON object and pass it to the correct subagent.
Current recovery_state: {state}
Today is Day {N} of recovery.
Pending flags: {flags}
```

**Decision Logic:**
- Day 0 → always invoke Intake Agent
- Day 0 after intake → invoke Care Plan Agent
- Day 1–30, morning → invoke Monitoring Agent
- Monitoring returns RED flag → invoke Escalation Agent
- Monitoring returns YELLOW flag → invoke Care Plan Agent for re-evaluation
- Monitoring returns GREEN → invoke Admin Agent for daily task check
- Any day, provider message needed → invoke Provider Comms Agent (sub-function of Admin Agent)

**State Object (JSON):**
```json
{
  "patient_id": "uuid",
  "discharge_date": "2025-06-01",
  "recovery_day": 7,
  "diagnosis": "CHF exacerbation",
  "medications": [...],
  "follow_up_appointments": [...],
  "warning_signs": [...],
  "dietary_restrictions": [...],
  "check_in_history": [...],
  "active_flags": [],
  "human_approval_queue": []
}
```

---

### Agent 1 — Intake Agent
**Single Job:** Read and structure the discharge summary.

**Tools:**
- PyMuPDF (PDF text extraction)
- Claude claude-sonnet-4-6 (structured extraction)
- Pinecone (store chunked discharge content)

**Input:** Raw discharge summary PDF (uploaded via Streamlit)

**Output:** Structured JSON matching the recovery_state schema above

**System Prompt (abbreviated):**
```
You are a medical document intake specialist. Extract the following 
fields from this discharge summary with exact precision:
- Primary diagnosis and ICD-10 code
- All medications (name, dose, frequency, duration, food interactions)
- Follow-up appointments (provider, specialty, timeframe required)
- Activity restrictions
- Dietary restrictions  
- Warning signs that require immediate medical attention
- Warning signs that require a call to the doctor within 24 hours
Return ONLY valid JSON matching this schema: {schema}
If any field is unclear or missing, set it to null and add it to 
the "needs_clarification" array.
```

**Error Handling:**
- PDF parse fails → prompt user to re-upload or enter fields manually via Streamlit form
- Field extraction confidence low → adds field to needs_clarification, surfaces to user in UI
- Pinecone write fails → writes to local SQLite fallback, retries on next agent invocation

**Pinecone Storage Strategy:**
- Chunk discharge summary by section (medications, appointments, restrictions, warnings)
- Embed each chunk with metadata: patient_id, section_type, discharge_date
- Namespace: `patient_{id}_discharge`

---

### Agent 2 — Care Plan Agent
**Single Job:** Turn extracted discharge data into a structured, prioritized, day-by-day care plan. Detect medication conflicts.

**Tools:**
- Pinecone (retrieve discharge chunks for context)
- OpenFDA API (medication interaction check)
- Claude claude-sonnet-4-6 (care plan generation)

**Input:** Structured JSON from Intake Agent

**Output:** 
- 30-day care plan with daily task checklist
- Medication schedule (formatted for patient comprehension, not clinical notation)
- Flagged medication interactions (if any) → routed to human approval queue
- Priority-ranked warning signs with plain-language descriptions

**System Prompt (abbreviated):**
```
You are a patient care coordinator creating a recovery plan for a 
recently discharged patient. Your audience is the patient and their 
family — not clinicians. Use plain language. Avoid medical jargon.

Discharge data: {discharge_json}
Medication interaction check results: {fda_results}

Generate:
1. A day-by-day checklist for the first 7 days (most critical period)
2. A weekly checklist for days 8–30
3. A medication schedule in plain language
4. A "call your doctor if..." list in plain language
5. A "go to the ER immediately if..." list in plain language

If any medication interactions were flagged, do NOT include them in 
the plan. Add them to the flagged_items array for physician review.
NEVER resolve a medication conflict yourself.
```

**Hard Limits:**
- Never auto-resolve a medication conflict
- Never change a prescribed dose
- Never recommend stopping a medication
- All flagged items go to human approval queue before plan is finalized

---

### Agent 3 — Monitoring Agent
**Single Job:** Run the daily check-in loop. Accept voice or typed input. Detect deviations from expected recovery trajectory. Classify each check-in as GREEN / YELLOW / RED.

**Tools:**
- ElevenLabs Speech-to-Text API (transcribe spoken check-in → text)
- Pinecone (retrieve patient history + care plan)
- Claude claude-sonnet-4-6 (symptom assessment + classification)
- Streamlit session (render check-in UI — voice button or typed fallback)

**Input:** Patient's daily check-in responses (structured via Streamlit form or free text)

**Voice Check-in Input (ElevenLabs STT):**
Patient clicks the microphone button in Streamlit. Audio is recorded in the browser, sent to ElevenLabs Speech-to-Text API, and the returned transcript is parsed into structured check-in responses by Claude. Typed input remains available as a fallback if the patient prefers or if STT fails.

```
Patient speaks → ElevenLabs STT → raw transcript
→ Claude parses transcript into structured responses
→ Monitoring Agent classifies responses → GREEN / YELLOW / RED
```

Demo moment: patient says *"I've been having trouble breathing and I gained 3 pounds since yesterday"* → RED classification → Escalation Agent triggered → provider message drafted — all from one spoken sentence.

**Check-in Questions (generated dynamically based on diagnosis):**
```
For CHF patient, Day 7:
- Did you weigh yourself this morning? What was the weight?
- Are you experiencing any shortness of breath at rest?
- Did you take all your medications today? (list each one)
- Any swelling in your ankles or legs compared to yesterday?
- How would you rate your energy level today? (1-10)
- Did you follow your sodium restriction today?
```

**Classification Logic:**
```
RED  → Any ER warning sign present, weight gain >2lbs in 24hrs,
        reports chest pain, difficulty breathing at rest,
        confusion or disorientation
        → Immediately invoke Escalation Agent

YELLOW → Mild symptom present not on ER list, missed >1 medication,
          declining trend across 2+ consecutive check-ins,
          patient expresses confusion about care plan
          → Invoke Care Plan Agent for re-evaluation
          → Add note to provider communication queue

GREEN  → No flags, all medications taken, vitals within range
          → Log check-in, invoke Admin Agent for task reminders
```

**Pattern Detection (across sessions):**
- Compares today's check-in against prior 7 days stored in Pinecone
- Flags declining trends even when individual check-ins are YELLOW not RED
- Example: weight +0.5lb/day for 5 days → YELLOW escalating to RED

**Error Handling:**
- Patient doesn't complete check-in by 10am → send SMS/email nudge
- Patient doesn't complete check-in by 6pm → flag for caregiver notification
- Ambiguous response → ask one clarifying follow-up (max 2 follow-ups before flagging)

---

### Agent 4 — Escalation Agent
**Single Job:** Handle RED flags. Surface crisis resources. Notify emergency contact. Draft urgent provider message. Never act without human confirmation except life-threatening threshold.

**Tools:**
- Claude claude-sonnet-4-6 (message drafting)
- Streamlit push notification (alert patient/caregiver on screen)
- Email/SMS tool (notify emergency contact)
- Provider message queue (draft urgent message)

**Escalation Tiers:**

```
TIER 1 — Urgent but not life-threatening
  → Surface "Call your doctor now" guidance
  → Draft provider message for patient/caregiver approval
  → Notify caregiver via email/SMS
  → Human must approve before message is sent

TIER 2 — Potentially life-threatening
  → Surface "Go to ER now" guidance with nearest ER
  → Auto-notify emergency contact (pre-consented)
  → Draft ER handoff summary patient can show on arrival
  → Log event in Pinecone for physician follow-up

TIER 3 — Actively life-threatening (e.g. "I can't breathe")
  → Display 911 instruction immediately, full screen
  → Auto-notify emergency contact
  → No other agent actions until human acknowledges
```

**Hard Limits:**
- Never diagnose
- Never tell patient NOT to go to the ER
- Never send a provider message without patient/caregiver approval (Tier 1)
- Tier 2 auto-notify is only triggered with explicit prior consent at onboarding

**Human Handoff UI:**
Streamlit shows a prominent approval card:
```
⚠️  URGENT MESSAGE READY FOR YOUR REVIEW
To: Dr. Sarah Chen | Cardiology
Re: John's recovery — symptom flag Day 7

[Message preview]

[SEND NOW]   [EDIT FIRST]   [I'LL CALL INSTEAD]
```

---

### Agent 5 — Admin Agent
**Single Job:** Handle scheduling, reminders, family coordination, and the provider communication queue for non-urgent items.

**Tools:**
- Calendar tool (Google Calendar API or iCal)
- Claude claude-sonnet-4-6 (message drafting)
- Pinecone (retrieve appointments and task state)
- Email tool (send reminders to caregiver network)

**Responsibilities:**
- Reminds patient of upcoming appointments 48hrs and 2hrs in advance
- Reminds patient of prescription refill dates (calculated from discharge)
- Generates weekly summary email for family caregivers
- Drafts non-urgent provider messages (e.g. "question about dietary restriction") for human approval
- Tracks task completion and updates Pinecone state

**Provider Communication Queue:**
All drafted messages sit in a Streamlit approval queue. Patient or caregiver must explicitly approve before sending. Message log is stored in Pinecone for continuity.

---

## 7. Control Flow — Step by Step

```
Step 1  Patient/caregiver uploads discharge summary PDF via Streamlit
Step 2  Orchestrator invokes Intake Agent
Step 3  Intake Agent parses PDF → extracts structured data → stores in Pinecone
Step 3a Intake Agent auto-populates hospitalization history record (date, diagnosis, hospital, ICD-10)
Step 4  Orchestrator invokes Care Plan Agent
Step 5  Care Plan Agent checks OpenFDA for medication interactions
Step 6  If interactions found → added to human approval queue → patient notified
Step 7  Care Plan Agent generates 30-day plan → stored in Pinecone
Step 8  Streamlit displays care plan + medication schedule to patient
Step 9  Patient reviews and confirms (or requests edits)
        ── DAILY LOOP BEGINS ──
Step 10 n8n triggers Monitoring Agent at 8am daily
Step 11 Monitoring Agent serves personalized check-in via Streamlit
Step 12a Patient speaks check-in → ElevenLabs STT transcribes audio → Claude parses transcript
Step 12b (fallback) Patient types responses directly into Streamlit form
Step 13 Monitoring Agent classifies response: GREEN / YELLOW / RED
Step 13a Monitoring Agent logs vitals (weight, BP, energy, meds taken) to daily record in Pinecone
Step 14a GREEN → Admin Agent logs check-in, sends task reminders
Step 14b YELLOW → Care Plan Agent re-evaluates, adds note to provider queue
Step 14c RED → Escalation Agent triggered immediately
Step 15 Escalation Agent determines tier, surfaces guidance, queues messages
Step 16 Human reviews and approves any outbound communications
Step 17 Admin Agent sends approved messages, updates calendar, notifies family
Step 18 Orchestrator updates recovery_state in Pinecone
Step 19 Repeat Step 10 next morning
        ── PROVIDER SUMMARY (on demand or weekly) ──
Step 20 Patient navigates to Provider Summary screen
Step 21 Admin Agent compiles vitals trend, medication adherence, anomaly flags from Pinecone
Step 22 Generates structured one-page brief → patient downloads PDF or shares link
        ── HOSPITAL HISTORY (on demand) ──
Step 23 Patient navigates to Hospital History screen
Step 24 Current stay auto-populated from Step 3a intake record
Step 25 Patient can manually add past hospitalizations (name, dates, diagnosis)
Step 26 All records stored in Pinecone under patient namespace
        ── END OF RECOVERY PERIOD ──
Step 27 On Day 30, Admin Agent generates final recovery summary
Step 28 Summary formatted for patient to share with primary care physician
```

---

## 8. Tools Inventory

| Tool | Library/API | Agent | Read/Write | Purpose |
|---|---|---|---|---|
| PDF Parser | PyMuPDF | Intake | Read | Extract text from discharge PDF |
| Vector Store | Pinecone | All | R/W | Store and retrieve patient state across sessions |
| LLM | Claude claude-sonnet-4-6 via Anthropic API | All | Read | All reasoning, extraction, drafting |
| Medication Checker | OpenFDA API | Care Plan | Read | Drug interaction detection |
| Voice STT | ElevenLabs Speech-to-Text API | Monitoring | Read | Transcribe spoken check-in to text |
| Calendar | Google Calendar API | Admin | Write | Schedule appointments + reminders |
| Notification | SMTP email + Twilio SMS | Admin, Escalation | Write | Nudges, caregiver alerts |

---

## 9. Memory Architecture

| Memory Type | What's Stored | Where | Scope |
|---|---|---|---|
| Discharge content | PDF chunks, structured extraction | Pinecone | Persistent across 30 days |
| Daily check-ins | Responses, classifications, vitals, timestamps | Pinecone | Persistent, queried for trends |
| Care plan | Full 30-day plan, task completion status | Pinecone | Updated daily |
| Human approval queue | Pending messages, approval status | Pinecone + Streamlit session | Persistent until actioned |
| Recovery state | Current JSON state object | Pinecone + n8n workflow | Updated after each agent run |
| Emergency contacts | Name, relationship, contact method | Pinecone (encrypted field) | Set at onboarding, persistent |
| Daily vitals log | Weight, BP, energy score, meds taken per day | Pinecone | Queried for provider summary and dashboard trends |
| Hospitalization history | Admit date, discharge date, diagnosis, hospital, ICD-10, physician | Pinecone | Persistent across all sessions; auto-populated from intake, manually extensible |

---

## 10. Hard Limits — What This Agent Must Never Do

1. **Never diagnose** — it can surface warning signs, never assign a diagnosis
2. **Never change a prescribed medication** — dose, frequency, or drug selection is always physician territory
3. **Never send a message to a provider without explicit human approval** (except Tier 3 emergency contact)
4. **Never store real PHI in plaintext** — demo uses synthetic data; production would require HIPAA-compliant infrastructure
5. **Never tell a patient not to seek care** — when in doubt, escalate
6. **Never auto-resolve a medication conflict** — always routes to human review

---

## 11. Human-in-the-Loop Design

| Trigger | Handoff Type | Human Action Required |
|---|---|---|
| Medication interaction detected | Blocking — plan not finalized until resolved | Review flag, consult pharmacist, approve or modify |
| Outbound provider message drafted | Non-blocking — message queued, not sent | Review, edit if needed, approve to send |
| YELLOW check-in flag | Advisory — plan re-evaluated, note queued | Review provider note, decide whether to send |
| RED check-in flag | Urgent — escalation guidance surfaced | Follow guidance, confirm ER or call |
| Tier 2 RED — auto-notify emergency contact | Auto (with prior consent) | Emergency contact receives alert, takes action |
| Day 30 final summary | Informational | Patient downloads/shares with physician |

---

## 12. Error Handling Matrix

| Failure | Agent Affected | Recovery Behavior |
|---|---|---|
| PDF fails to parse | Intake | Prompt re-upload; offer manual entry form |
| OpenFDA API timeout | Care Plan | Retry 3x with backoff; flag for pharmacist review if all fail |
| ElevenLabs STT fails or times out | Monitoring | Auto-fallback to typed check-in form; patient sees "Voice unavailable — please type your responses" |
| ElevenLabs STT returns empty transcript | Monitoring | Prompt patient to re-record once; switch to typed input after second failure |
| Patient misses check-in | Monitoring | SMS nudge at 10am; email caregiver at 6pm |
| Ambiguous check-in response | Monitoring | Ask one clarifying question; flag if still ambiguous |
| Pinecone write failure | All | Write to local SQLite fallback; retry on next n8n trigger |
| Claude API rate limit | All | Exponential backoff; queue task for retry |
| Calendar API failure | Admin | Log reminder in Streamlit UI; notify user of scheduling issue |
| Emergency contact unreachable | Escalation | Surface alternate contact; display 911 guidance |

---

## 13. Success Metrics

**Primary:**
> Patient goes from discharge PDF upload to active recovery plan in under 5 minutes, 8 out of 10 attempts.

**Secondary:**
> Zero missed medications or appointments in a 7-day tracked cohort, 8 out of 10 patients.

**Demo metric (for presentation):**
> Live demo: upload a synthetic discharge PDF → care plan generated in under 2 minutes → patient *speaks* Day 7 check-in ("I've been having trouble breathing and gained 3 pounds") → ElevenLabs STT transcribes → Monitoring Agent classifies RED → Escalation Agent triggered → provider message drafted → human approval UI displayed. End to end in under 5 minutes on stage.

---

## 14. Suggested Framework

**Orchestration:** n8n (workflow triggers, daily scheduling, agent routing, retry logic)
**Agent Logic:** Python (LangGraph + direct Anthropic SDK calls per agent)
**LLM:** Claude claude-sonnet-4-6 via Anthropic API
**Voice STT:** ElevenLabs Speech-to-Text API (daily check-in voice input)
**Vector Store:** Pinecone (patient state, discharge content, check-in history)
**UI:** Streamlit — 7 screens: onboarding, care plan, voice check-in, approval queue, recovery dashboard, provider summary, hospital history
**UI Theme:** Soft purple — primary `#534AB7`, dark `#3C3489`, light `#EEEDFE`, accent `#7F77DD` (configured via `.streamlit/config.toml`)
**Notifications:** SMTP (email) + Twilio (SMS)
**PDF Parsing:** PyMuPDF (fitz)
**Medication Check:** OpenFDA REST API
**Calendar:** Google Calendar API
**Version Control:** GitHub (full repo with README, .env.example, n8n workflow JSON export)
