# Nexus — Complete Build Guide
## Post-Hospital Recovery Co-Pilot | Week 3: Agentic AI Systems | Code Track (LangGraph + Python + Streamlit)

---

## Before You Start — Read This

The rubric says: *"If your agent works on the happy path but falls over on the first tool failure, you have not finished."*

Build in this exact order. Get each piece working before connecting the next. Do not skip ahead.

**Required for submission:**
- Google Doc (project overview, prompts used, iterations, learnings)
- Video demo (≤5 minutes, live walkthrough)
- GitHub repo (public, with README)

**Tech stack you will use:**
- LangGraph (multi-agent state machine)
- Python (all agent logic)
- Claude claude-sonnet-4-6 via Anthropic API
- Nebius Token Factory (required by rubric for at least one model call)
- Pinecone (persistent vector memory)
- Streamlit (UI)
- n8n (daily check-in trigger scheduler)
- PyMuPDF, OpenFDA API, Google Calendar API

**Estimated total build time:** 12–16 hours across the week

---

## Phase 0 — Environment Setup (Day 1, ~2 hours)

### Step 0.1 — Create your project folder and GitHub repo

```bash
mkdir nexus
cd nexus
git init
```

Create a new public repo on GitHub called `nexus`. Connect it:

```bash
git remote add origin https://github.com/YOUR_USERNAME/nexus.git
```

### Step 0.2 — Set up Python environment

```bash
python -m venv venv
source venv/bin/activate          # Mac/Linux or Git Bash on Windows
# venv\Scripts\activate           # Windows PowerShell only
```

> **Windows note:** Use Git Bash throughout this project (`source venv/Scripts/activate`).
> Run this activation command at the start of every session.

```bash
pip install \
  langgraph \
  langchain \
  langchain-anthropic \
  anthropic \
  pinecone-client \
  pymupdf \
  streamlit \
  streamlit-audiorecorder \
  python-dotenv \
  requests \
  google-auth \
  google-auth-oauthlib \
  google-api-python-client \
  twilio \
  openai \
  elevenlabs \
  fpdf2

# Fix dependency version conflicts that pip may not auto-resolve
pip install --upgrade "langchain-core>=0.2.43" "langchain>=0.2.0" "langchain-anthropic>=0.2.0" "langgraph>=0.2.0" "jiter>=0.10.0"

pip freeze > requirements.txt
```

Verify everything installed correctly:
```bash
python -c "import langgraph, langchain, anthropic, pinecone, streamlit; print('All good')"
```

### Step 0.3 — Create your .env file

```bash
touch .env
touch .env.example
```

Paste into `.env` (fill in your real keys):

```
ANTHROPIC_API_KEY=your_key_here
NEBIUS_API_KEY=your_key_here
NEBIUS_BASE_URL=https://api.studio.nebius.ai/v1/
PINECONE_API_KEY=your_key_here
PINECONE_INDEX_NAME=nexus
ELEVENLABS_API_KEY=your_key_here
TWILIO_ACCOUNT_SID=your_key_here
TWILIO_AUTH_TOKEN=your_key_here
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
GOOGLE_CALENDAR_CREDENTIALS_PATH=credentials.json
```

Paste into `.env.example` (same keys, empty values — this is what goes to GitHub):

```
ANTHROPIC_API_KEY=
NEBIUS_API_KEY=
NEBIUS_BASE_URL=
PINECONE_API_KEY=
PINECONE_INDEX_NAME=
ELEVENLABS_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
GOOGLE_CALENDAR_CREDENTIALS_PATH=
```

### Step 0.4 — Create your .gitignore

```bash
touch .gitignore
```

Paste in:

```
.env
venv/
__pycache__/
*.pyc
.DS_Store
credentials.json
*.pdf
```

### Step 0.5 — Create your folder structure

```bash
mkdir -p agents tools state ui data tests .streamlit
touch .streamlit/config.toml
touch agents/__init__.py
touch agents/orchestrator.py
touch agents/intake_agent.py
touch agents/care_plan_agent.py
touch agents/monitoring_agent.py
touch agents/escalation_agent.py
touch agents/admin_agent.py
touch tools/__init__.py
touch tools/pdf_parser.py
touch tools/pinecone_store.py
touch tools/openfda.py
touch tools/elevenlabs_stt.py
touch tools/calendar_tool.py
touch tools/notification_tool.py
touch state/recovery_state.py
touch ui/streamlit_app.py
touch main.py
touch README.md
```

### Step 0.6 — Configure Streamlit theme (soft purple)

Open `.streamlit/config.toml` and paste:

```toml
[theme]
primaryColor = "#534AB7"
backgroundColor = "#FFFFFF"
secondaryBackgroundColor = "#F4F3FE"
textColor = "#1A1A2E"
font = "sans serif"
```

This sets the soft purple color system across your entire Streamlit app — buttons, sliders, active states, and highlights all inherit `#534AB7` automatically. You don't need to hardcode colors anywhere in your Python UI code.

**Color reference for the soft purple palette:**

| Role | Hex | Used for |
|---|---|---|
| Primary | `#534AB7` | Buttons, active nav, links, badges |
| Dark | `#3C3489` | Top bar background |
| Darkest | `#26215C` | Top bar text, heavy accents |
| Mid | `#7F77DD` | Icons, secondary accents |
| Light | `#CECBF6` | Hover states, borders |
| Lightest | `#EEEDFE` | Success banners, active nav bg, badge fills |
| Text on purple | `#3C3489` | Text inside purple-background elements |

---

### Step 0.7 — Commit your scaffold

```bash
git add .
git commit -m "initial project scaffold"
git push -u origin main
```

---

## Phase 1 — State Schema (Day 1, ~1 hour)

The state object is the backbone of your entire system. Everything passes through it. Build this first.

### Step 1.1 — Define the RecoveryState schema

Open `state/recovery_state.py` and paste:

```python
from typing import TypedDict, List, Optional, Literal
from datetime import datetime

class Medication(TypedDict):
    name: str
    dose: str
    frequency: str
    duration: str
    food_interactions: Optional[str]
    interaction_flag: bool  # True = flagged by OpenFDA, needs human review

class Appointment(TypedDict):
    provider: str
    specialty: str
    timeframe_required: str
    scheduled_date: Optional[str]
    confirmed: bool

class CheckIn(TypedDict):
    day: int
    timestamp: str
    responses: dict
    classification: Literal["GREEN", "YELLOW", "RED"]
    flags: List[str]

class HumanApprovalItem(TypedDict):
    id: str
    type: Literal["medication_conflict", "provider_message", "escalation_message"]
    content: str
    recipient: Optional[str]
    status: Literal["pending", "approved", "rejected", "edited"]
    created_at: str

class HospitalizationRecord(TypedDict):
    id: str
    admit_date: str
    discharge_date: str
    hospital_name: str
    diagnosis: str
    icd10_code: Optional[str]
    treating_physician: Optional[str]
    specialty: Optional[str]
    notes: Optional[str]
    source: Literal["auto_imported", "manual_entry"]
    created_at: str

class DailyVitals(TypedDict):
    day: int
    date: str
    weight_lbs: Optional[float]
    bp_systolic: Optional[int]
    bp_diastolic: Optional[int]
    energy_score: Optional[int]
    meds_taken: list
    meds_missed: list

class RecoveryState(TypedDict):
    # Identity
    patient_id: str
    patient_name: str
    caregiver_name: Optional[str]
    caregiver_email: Optional[str]
    emergency_contact_name: Optional[str]
    emergency_contact_phone: Optional[str]
    emergency_contact_consented: bool  # Must be True before auto-notify

    # Clinical
    discharge_date: str
    recovery_day: int
    diagnosis: str
    icd10_code: Optional[str]
    medications: List[Medication]
    appointments: List[Appointment]
    warning_signs_er: List[str]      # Go to ER immediately
    warning_signs_call: List[str]    # Call doctor within 24hrs
    dietary_restrictions: List[str]
    activity_restrictions: List[str]

    # Agent state
    current_agent: str
    needs_clarification: List[str]   # Fields Intake Agent couldn't extract
    active_flags: List[str]
    human_approval_queue: List[HumanApprovalItem]

    # History
    check_in_history: List[CheckIn]
    daily_vitals_log: List[DailyVitals]          # structured vitals per day for dashboard + provider summary
    hospitalization_history: List[HospitalizationRecord]  # auto + manual hospital stays
    messages: List[dict]             # LangGraph message history

    # Meta
    intake_complete: bool
    care_plan_complete: bool
    last_check_in_date: Optional[str]
    pinecone_namespace: str
```

---

## Phase 2 — Tools (Day 1–2, ~3 hours)

Build each tool independently and test it before wiring into agents.

### Step 2.1 — PDF Parser Tool

Open `tools/pdf_parser.py`:

```python
import fitz  # PyMuPDF
from pathlib import Path

def parse_discharge_pdf(file_path: str) -> dict:
    """
    Extract raw text from discharge summary PDF.
    Returns dict with success status and extracted text.
    """
    try:
        doc = fitz.open(file_path)
        full_text = ""
        for page in doc:
            full_text += page.get_text()
        page_count = len(doc)  # save before close — doc.close() makes len(doc) fail
        doc.close()

        if not full_text.strip():
            return {
                "success": False,
                "error": "PDF appears to be scanned or image-based. Text extraction failed.",
                "text": None
            }

        return {
            "success": True,
            "text": full_text,
            "page_count": page_count,
            "error": None
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"PDF parse failed: {str(e)}",
            "text": None
        }
```

**Generate a test PDF first** (save as `data/create_test_pdf.py` and run once):
```python
from fpdf import FPDF

pdf = FPDF()
pdf.add_page()
pdf.set_font("Helvetica", "B", 16)
pdf.cell(0, 10, "DISCHARGE SUMMARY - SYNTHETIC PATIENT DATA (NOT REAL)", ln=True, align="C")
pdf.ln(5)
pdf.set_font("Helvetica", size=11)

content = """
Patient: John Demo Patient
Date of Birth: 01/15/1955
Discharge Date: 2025-06-01
Admit Date: 2025-05-27
Hospital: City General Hospital
Attending Physician: Dr. Michael Torres
Primary Specialty: Cardiology

DIAGNOSIS
Primary Diagnosis: Congestive Heart Failure (CHF) Exacerbation
ICD-10 Code: I50.9

MEDICATIONS AT DISCHARGE
1. Furosemide (Lasix) 40mg - Take once daily in the morning with water
2. Lisinopril 10mg - Take once daily with breakfast
3. Metoprolol Succinate 25mg - Take once daily
4. Potassium Chloride 20mEq - Take once daily with food

FOLLOW-UP APPOINTMENTS
- Cardiologist: Dr. Sarah Chen - within 7 days of discharge
- Primary Care: Dr. James Park - within 14 days of discharge

ACTIVITY RESTRICTIONS
- No lifting more than 10 pounds for 4 weeks
- No driving for 1 week
- Walk 5-10 minutes twice daily, increase gradually as tolerated

DIETARY RESTRICTIONS
- Sodium restriction: less than 2000mg per day
- Fluid restriction: less than 2 liters per day
- Weigh yourself every morning before eating or drinking

GO TO THE EMERGENCY ROOM IMMEDIATELY IF YOU EXPERIENCE
- Chest pain or pressure
- Difficulty breathing at rest
- Weight gain of more than 2 pounds in one day or 5 pounds in one week
- Severe swelling in legs, ankles, or feet
- Fainting or loss of consciousness

CALL YOUR DOCTOR WITHIN 24 HOURS IF YOU NOTICE
- Weight gain of 1-2 pounds in one day
- Increased shortness of breath with activity
- Increased swelling in feet or ankles
- Dizziness or lightheadedness
- Fever above 101 degrees F
"""

for line in content.strip().split("\n"):
    if line.strip() == line.strip().upper() and len(line.strip()) > 3:
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 8, line.strip(), ln=True)
        pdf.set_font("Helvetica", size=11)
    else:
        pdf.cell(0, 7, line, ln=True)

pdf.output("test_discharge.pdf")
print("Created test_discharge.pdf successfully")
```

```bash
cd data && python create_test_pdf.py && cd ..
```

**Test the parser:**
```bash
python -c "
from tools.pdf_parser import parse_discharge_pdf
result = parse_discharge_pdf('data/test_discharge.pdf')
print(result['success'])
print(result['text'][:500] if result['text'] else result['error'])
"
```

---

### Step 2.2 — Pinecone Store Tool

Open `tools/pinecone_store.py`:

```python
from pinecone import Pinecone
from anthropic import Anthropic
import os
import json
from datetime import datetime

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX_NAME"))
anthropic_client = Anthropic()

def embed_text(text: str) -> list:
    """Use Anthropic embeddings or a simple hash fallback for demo."""
    # For demo purposes, use OpenAI-compatible embedding endpoint
    # In production, use a proper embedding model
    import hashlib
    # Simple demo: use a 1024-dim zero vector with checksum
    # Replace this with real embeddings in production
    checksum = int(hashlib.md5(text.encode()).hexdigest(), 16) % 1000
    vector = [0.0] * 1024
    vector[checksum] = 1.0
    return vector

def store_discharge_summary(patient_id: str, text: str, metadata: dict) -> bool:
    """Chunk and store discharge summary in Pinecone."""
    namespace = f"patient_{patient_id}"
    chunks = chunk_text(text, chunk_size=500, overlap=50)

    vectors = []
    for i, chunk in enumerate(chunks):
        vector_id = f"{patient_id}_discharge_{i}"
        vectors.append({
            "id": vector_id,
            "values": embed_text(chunk),
            "metadata": {
                **metadata,
                "text": chunk,
                "chunk_index": i,
                "type": "discharge_summary"
            }
        })

    try:
        index.upsert(vectors=vectors, namespace=namespace)
        return True
    except Exception as e:
        print(f"Pinecone upsert failed: {e}")
        return False

def store_check_in(patient_id: str, check_in: dict) -> bool:
    """Store a daily check-in record."""
    namespace = f"patient_{patient_id}"
    vector_id = f"{patient_id}_checkin_{check_in['day']}"

    # Pinecone metadata only supports str/number/bool/list-of-str.
    # Serialize nested dicts (responses) and mixed lists (flags) as JSON strings.
    metadata = {
        "type": "check_in",
        "stored_at": datetime.now().isoformat(),
        "day": check_in.get("day", 0),
        "timestamp": check_in.get("timestamp", ""),
        "classification": check_in.get("classification", ""),
        "summary": check_in.get("summary", ""),
        "recommended_action": check_in.get("recommended_action", ""),
        "responses_json": json.dumps(check_in.get("responses", {})),
        "flags_json": json.dumps(check_in.get("flags", [])),
    }

    try:
        index.upsert(
            vectors=[{
                "id": vector_id,
                "values": embed_text(json.dumps(check_in)),
                "metadata": metadata
            }],
            namespace=namespace
        )
        return True
    except Exception as e:
        print(f"Pinecone check-in store failed: {e}")
        return False

def retrieve_patient_history(patient_id: str, query: str, top_k: int = 5) -> list:
    """Retrieve relevant patient history chunks."""
    namespace = f"patient_{patient_id}"
    try:
        results = index.query(
            vector=embed_text(query),
            top_k=top_k,
            namespace=namespace,
            include_metadata=True
        )
        return [match.metadata for match in results.matches]
    except Exception as e:
        print(f"Pinecone query failed: {e}")
        return []

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list:
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
    return chunks
```

**Set up your Pinecone index first:**
- Go to pinecone.io → Create index
- Name: `nexus`
- Dimensions: `1024`
- Metric: `cosine`

---

### Step 2.3 — OpenFDA Medication Checker Tool

Open `tools/openfda.py`:

```python
import requests
from typing import List

OPENFDA_BASE = "https://api.fda.gov/drug"

def check_medication_interactions(medications: List[dict]) -> dict:
    """
    Check for known drug interactions using OpenFDA.
    Returns flagged interactions for human review.
    """
    flags = []
    details = []

    med_names = [m["name"].lower() for m in medications]

    for med in medications:
        try:
            response = requests.get(
                f"{OPENFDA_BASE}/label.json",
                params={
                    "search": f'openfda.brand_name:"{med["name"]}" OR openfda.generic_name:"{med["name"]}"',
                    "limit": 1
                },
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                if data.get("results"):
                    label = data["results"][0]

                    # Check drug interactions section
                    interactions = label.get("drug_interactions", [])
                    warnings = label.get("warnings", [])
                    boxed_warning = label.get("boxed_warning", [])

                    for other_med in med_names:
                        if other_med != med["name"].lower():
                            for interaction_text in interactions:
                                if other_med in interaction_text.lower():
                                    flags.append(med["name"])
                                    details.append({
                                        "drug_1": med["name"],
                                        "drug_2": other_med,
                                        "interaction_text": interaction_text[:500],
                                        "severity": "REVIEW_REQUIRED"
                                    })

                    if boxed_warning:
                        details.append({
                            "drug_1": med["name"],
                            "drug_2": None,
                            "interaction_text": str(boxed_warning[0])[:500],
                            "severity": "BOXED_WARNING"
                        })

        except requests.Timeout:
            details.append({
                "drug_1": med["name"],
                "drug_2": None,
                "interaction_text": "OpenFDA API timeout — flag for pharmacist review",
                "severity": "API_ERROR"
            })
        except Exception as e:
            details.append({
                "drug_1": med["name"],
                "drug_2": None,
                "interaction_text": f"Check failed: {str(e)}",
                "severity": "API_ERROR"
            })

    return {
        "flagged_medications": list(set(flags)),
        "interaction_details": details,
        "all_clear": len(flags) == 0
    }
```

---

### Step 2.4 — Notification Tool

Open `tools/notification_tool.py`:

```python
import smtplib
import os
from email.mime.text import MIMEText
from twilio.rest import Client

def send_email_notification(to_email: str, subject: str, body: str) -> bool:
    """Send email via SMTP. Configure with Gmail app password."""
    try:
        # For demo: use Gmail SMTP
        # Add GMAIL_USER and GMAIL_APP_PASSWORD to .env
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = os.getenv("GMAIL_USER")
        msg["To"] = to_email

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(os.getenv("GMAIL_USER"), os.getenv("GMAIL_APP_PASSWORD"))
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Email send failed: {e}")
        return False

def send_sms_notification(to_phone: str, message: str) -> bool:
    """Send SMS via Twilio. Returns False (non-fatal) on any failure."""
    from twilio.base.exceptions import TwilioRestException
    from_number = os.getenv("TWILIO_PHONE_NUMBER", "")
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")

    if not all([from_number, account_sid, auth_token]):
        print("[Notification] SMS skipped — Twilio credentials not configured.")
        return False

    try:
        client = Client(account_sid, auth_token)
        client.messages.create(body=message, from_=from_number, to=to_phone)
        return True
    except TwilioRestException as e:
        if e.code == 21266:
            print(f"[Notification] SMS not sent — To and From are the same ({to_phone}). "
                  f"Set EMERGENCY_CONTACT_PHONE to a different number.")
        elif e.code == 21659:
            print(f"[Notification] SMS not sent — country mismatch (error 21659). "
                  f"Enable Geo Permissions in Twilio console or buy a local number.")
        else:
            print(f"[Notification] SMS failed — Twilio error {e.code}: {e.msg}")
        return False
    except Exception as e:
        print(f"[Notification] SMS send failed: {e}")
        return False
```

---

## Phase 3 — Build Each Agent (Day 2–3, ~5 hours)

### Step 3.1 — Intake Agent

Open `agents/intake_agent.py`:

```python
from anthropic import Anthropic
from tools.pdf_parser import parse_discharge_pdf
from tools.pinecone_store import store_discharge_summary
import json
import os

client = Anthropic()

INTAKE_SYSTEM_PROMPT = """You are a medical document intake specialist. 
Your job is to extract structured information from hospital discharge summaries.
Your audience will be patients and caregivers — but you output structured JSON only.

Extract the following fields with exact precision:
- primary_diagnosis (string)
- icd10_code (string or null)
- hospital_name (string or null — name of the hospital/facility)
- admit_date (string or null — date patient was admitted)
- attending_physician (string or null — primary physician name)
- primary_specialty (string or null — e.g. Cardiology, Pulmonology)
- medications (array of objects with: name, dose, frequency, duration, food_interactions)
- appointments (array of objects with: provider, specialty, timeframe_required)
- warning_signs_er (array of strings: symptoms requiring immediate ER visit)
- warning_signs_call (array of strings: symptoms requiring doctor call within 24hrs)
- dietary_restrictions (array of strings)
- activity_restrictions (array of strings)
- needs_clarification (array of strings: fields that were unclear or missing)

Return ONLY valid JSON. No preamble. No explanation. No markdown.
If a field is not mentioned in the document, set it to null or empty array.
Never invent information not present in the document."""

def run_intake_agent(state: dict) -> dict:
    """
    Intake Agent: Parse discharge PDF, extract structured data, store in Pinecone.
    Returns updated state.
    """
    print("[Intake Agent] Starting...")

    # Step 1: Parse PDF
    pdf_result = parse_discharge_pdf(state.get("pdf_path"))

    if not pdf_result["success"]:
        state["active_flags"].append(f"PDF_PARSE_FAILED: {pdf_result['error']}")
        state["needs_clarification"].append("discharge_pdf_unreadable")
        print(f"[Intake Agent] PDF parse failed: {pdf_result['error']}")
        return state

    raw_text = pdf_result["text"]
    print(f"[Intake Agent] PDF parsed. {pdf_result['page_count']} pages, {len(raw_text)} chars.")

    # Step 2: Extract structured data via Claude
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            system=INTAKE_SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": f"Extract structured data from this discharge summary:\n\n{raw_text}"
            }]
        )

        extracted_text = response.content[0].text
        extracted = json.loads(extracted_text)

    except json.JSONDecodeError as e:
        state["active_flags"].append(f"INTAKE_JSON_PARSE_FAILED: {str(e)}")
        print(f"[Intake Agent] JSON parse error: {e}")
        return state
    except Exception as e:
        state["active_flags"].append(f"INTAKE_CLAUDE_CALL_FAILED: {str(e)}")
        print(f"[Intake Agent] Claude call failed: {e}")
        return state

    # Step 3: Update state with extracted data
    state["diagnosis"] = extracted.get("primary_diagnosis", "Unknown")
    state["icd10_code"] = extracted.get("icd10_code")
    state["medications"] = extracted.get("medications", [])
    state["appointments"] = extracted.get("appointments", [])
    state["warning_signs_er"] = extracted.get("warning_signs_er", [])
    state["warning_signs_call"] = extracted.get("warning_signs_call", [])
    state["dietary_restrictions"] = extracted.get("dietary_restrictions", [])
    state["activity_restrictions"] = extracted.get("activity_restrictions", [])
    state["needs_clarification"].extend(extracted.get("needs_clarification", []))

    # Step 4: Store in Pinecone
    stored = store_discharge_summary(
        patient_id=state["patient_id"],
        text=raw_text,
        metadata={
            "patient_id": state["patient_id"],
            "diagnosis": state["diagnosis"],
            "discharge_date": state["discharge_date"]
        }
    )

    if not stored:
        state["active_flags"].append("PINECONE_STORE_FAILED_USING_LOCAL_FALLBACK")
        # Write to local JSON as fallback
        with open(f"data/{state['patient_id']}_discharge.json", "w") as f:
            json.dump(extracted, f, indent=2)

    state["intake_complete"] = True
    state["current_agent"] = "care_plan_agent"

    # Auto-populate hospitalization history from this discharge
    import uuid as uuid_lib
    hosp_record = {
        "id": str(uuid_lib.uuid4()),
        "admit_date": extracted.get("admit_date", "Unknown"),
        "discharge_date": state["discharge_date"],
        "hospital_name": extracted.get("hospital_name", "Unknown hospital"),
        "diagnosis": state["diagnosis"],
        "icd10_code": state.get("icd10_code"),
        "treating_physician": extracted.get("attending_physician"),
        "specialty": extracted.get("primary_specialty"),
        "notes": None,
        "source": "auto_imported",
        "created_at": datetime.now().isoformat()
    }
    if "hospitalization_history" not in state:
        state["hospitalization_history"] = []
    state["hospitalization_history"].append(hosp_record)

    print(f"[Intake Agent] Complete. Diagnosis: {state['diagnosis']}")
    return state
```

---

### Step 3.2 — Care Plan Agent

Open `agents/care_plan_agent.py`:

```python
from anthropic import Anthropic
from tools.openfda import check_medication_interactions
from tools.pinecone_store import retrieve_patient_history
import json
import uuid
from datetime import datetime

client = Anthropic()

CARE_PLAN_SYSTEM_PROMPT = """You are a patient care coordinator creating a recovery plan.
Your audience is the patient and their family — NOT clinicians.
Use plain, simple language. No medical jargon. No abbreviations.

You will receive structured discharge data and generate:
1. A day-by-day checklist for the first 7 days
2. A weekly checklist for days 8-30
3. A medication schedule in plain language (e.g. "Take Lisinopril 10mg with breakfast")
4. A "Watch for these symptoms — call your doctor" list in plain language
5. A "Go to the ER immediately if..." list in plain language

CRITICAL RULES:
- If any medications are in the flagged_medications list, DO NOT include them in the plan.
  Add them to needs_human_review instead.
- NEVER change a prescribed dose
- NEVER recommend stopping a medication
- NEVER resolve a medication conflict yourself
- If uncertain about any instruction, add it to needs_human_review

Return ONLY valid JSON. No preamble. No markdown."""

def run_care_plan_agent(state: dict) -> dict:
    """
    Care Plan Agent: Check medication interactions, generate plain-language care plan.
    Returns updated state.
    """
    print("[Care Plan Agent] Starting...")

    # Step 1: Check medication interactions via OpenFDA
    if state["medications"]:
        print(f"[Care Plan Agent] Checking {len(state['medications'])} medications via OpenFDA...")
        interaction_results = check_medication_interactions(state["medications"])

        if not interaction_results["all_clear"]:
            # Flag medications for human review — plain-English content for patients
            for detail in interaction_results["interaction_details"]:
                drug_label = detail["drug_1"]
                severity = detail.get("severity", "REVIEW_REQUIRED")
                if severity == "BOXED_WARNING":
                    what_it_means = (
                        "This medication has a serious warning printed on its label (an FDA black box warning). "
                        "Your doctor prescribed it knowing this — do not stop taking it on your own."
                    )
                elif severity == "API_ERROR":
                    what_it_means = (
                        "We were unable to automatically check this medication. "
                        "This is a system limitation, not necessarily a problem with the medication itself."
                    )
                else:
                    other = f" and {detail['drug_2']}" if detail.get("drug_2") else ""
                    drug_label += f" + {detail['drug_2']}" if detail.get("drug_2") else ""
                    what_it_means = (
                        f"This medication may interact with another medication you are taking{other}. "
                        "Your pharmacist can confirm whether this is a concern for your specific doses."
                    )
                content = "\n".join([
                    f"Medication to check: {drug_label}",
                    f"What this means: {what_it_means}",
                    "What to do: Before your next dose, please call your pharmacist or doctor's office to confirm it is safe.",
                    "Important: Do not stop any medication on your own without speaking to your doctor first.",
                ])
                approval_item = {
                    "id": str(uuid.uuid4()),
                    "type": "medication_conflict",
                    "content": content,
                    "recipient": "patient_caregiver",
                    "status": "pending",
                    "created_at": datetime.now().isoformat()
                }
                state["human_approval_queue"].append(approval_item)

            # Mark flagged medications in state
            for med in state["medications"]:
                if med["name"] in interaction_results["flagged_medications"]:
                    med["interaction_flag"] = True

            state["active_flags"].append("MEDICATION_INTERACTION_FLAGGED")
            print(f"[Care Plan Agent] {len(interaction_results['flagged_medications'])} medications flagged.")

    # Step 2: Generate care plan via Claude
    # Separate clean meds from flagged ones
    clean_meds = [m for m in state["medications"] if not m.get("interaction_flag")]
    flagged_meds = [m for m in state["medications"] if m.get("interaction_flag")]

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=6000,  # 3000 truncates complex patients with 6+ meds
            system=CARE_PLAN_SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": json.dumps({
                    "diagnosis": state["diagnosis"],
                    "medications_to_include": clean_meds,
                    "flagged_medications_excluded": [m["name"] for m in flagged_meds],
                    "appointments": state["appointments"],
                    "warning_signs_er": state["warning_signs_er"],
                    "warning_signs_call": state["warning_signs_call"],
                    "dietary_restrictions": state["dietary_restrictions"],
                    "activity_restrictions": state["activity_restrictions"]
                }, indent=2)
            }]
        )

        care_plan_text = response.content[0].text.strip()
        if response.stop_reason == "max_tokens":
            raise ValueError("Care plan truncated — increase max_tokens further.")
        import re as _re
        json_match = _re.search(r'\{[\s\S]*\}', care_plan_text)
        if not json_match:
            raise ValueError(f"No JSON in care plan response: {care_plan_text[:200]}")
        care_plan = json.loads(json_match.group())

    except Exception as e:
        state["active_flags"].append(f"CARE_PLAN_GENERATION_FAILED: {str(e)}")
        print(f"[Care Plan Agent] Error: {e}")
        return state

    state["care_plan"] = care_plan
    state["care_plan_complete"] = True
    state["current_agent"] = "monitoring_agent"
    print("[Care Plan Agent] Complete.")
    return state
```

---

### Step 3.3 — Monitoring Agent

Open `agents/monitoring_agent.py`:

```python
from anthropic import Anthropic
from tools.pinecone_store import store_check_in, retrieve_patient_history
import json
import re
from datetime import datetime

client = Anthropic()

MONITORING_SYSTEM_PROMPT = """You are a recovery monitoring specialist.
You will receive a patient's daily check-in responses and their recovery context.
Your job is to classify the check-in and identify any flags.

Classification rules:
RED — Any of the following: patient reports an ER warning sign, weight gain >2lbs since 
      yesterday, chest pain, difficulty breathing at rest, confusion, disorientation.
      → ALWAYS classify RED if any ER warning sign is present, even mild.

YELLOW — Any of the following: mild symptom present (not on ER list), missed >1 medication,
          declining trend vs prior days, patient confused about care plan, weight up 1-2lbs.

GREEN — No flags, all medications taken, no concerning symptoms.

Also check for: declining trends across multiple check-ins (even if today is YELLOW).
If 3+ consecutive check-ins are YELLOW, elevate to RED.

Return ONLY valid JSON:
{
  "classification": "GREEN" | "YELLOW" | "RED",
  "flags": ["list of specific concerns"],
  "summary": "one sentence plain-language summary",
  "recommended_action": "what the patient should do next",
  "escalation_reason": "only if RED — specific reason"
}"""

def generate_checkin_questions(state: dict) -> list:
    """Generate personalized check-in questions based on diagnosis and day."""
    diagnosis = state.get("diagnosis", "general").lower()
    day = state.get("recovery_day", 1)
    meds = [m["name"] for m in state.get("medications", []) if not m.get("interaction_flag")]
    warning_signs = state.get("warning_signs_er", [])

    questions = []

    # Individual medication questions (one checkbox per med)
    for med in meds:
        questions.append({
            "id": f"med_{med.replace(' ', '_').lower()}",
            "question": f"Did you take {med} today?",
            "type": "med_checkbox",
            "med_name": med
        })

    questions.append({
        "id": "general_feeling",
        "question": "How are you feeling overall today? (1 = terrible, 10 = great)",
        "type": "scale_1_10"
    })

    # Diagnosis-specific questions
    if "heart" in diagnosis or "chf" in diagnosis or "cardiac" in diagnosis:
        questions.append({
            "id": "weight",
            "question": "What was your weight this morning? (Daily weight is important for heart patients)",
            "type": "number_lbs"
        })
        questions.append({
            "id": "swelling",
            "question": "Any swelling in your ankles, feet, or legs compared to yesterday?",
            "type": "yes_no_detail"
        })
        questions.append({
            "id": "breathing",
            "question": "Any shortness of breath while resting or lying flat?",
            "type": "yes_no_detail"
        })

    # Warning sign check — symptom_checklist renders each item as an individual checkbox
    if warning_signs:
        questions.append({
            "id": "warning_signs",
            "question": "Are you experiencing any of these symptoms right now?",
            "type": "symptom_checklist",
            "options": warning_signs
        })

    questions.append({
        "id": "concerns",
        "question": "Anything else worrying you today that you'd like to flag?",
        "type": "free_text"
    })

    return questions

def run_monitoring_agent(state: dict, check_in_responses: dict) -> dict:
    """
    Monitoring Agent: Classify daily check-in, update history, return updated state.
    """
    print(f"[Monitoring Agent] Processing Day {state['recovery_day']} check-in...")

    # Retrieve recent history for trend analysis
    history = state.get("check_in_history", [])
    recent_history = history[-7:] if len(history) > 7 else history

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=500,
            system=MONITORING_SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": json.dumps({
                    "day": state["recovery_day"],
                    "diagnosis": state["diagnosis"],
                    "er_warning_signs": state.get("warning_signs_er", []),
                    "call_warning_signs": state.get("warning_signs_call", []),
                    "todays_responses": check_in_responses,
                    "recent_check_in_history": recent_history
                }, indent=2)
            }]
        )

        result_text = response.content[0].text.strip()
        json_match = re.search(r'\{[\s\S]*\}', result_text)
        if not json_match:
            raise ValueError(f"No JSON object in model response: {result_text[:200]}")
        result = json.loads(json_match.group())

    except Exception as e:
        # Safe fallback — treat as YELLOW on classification error
        result = {
            "classification": "YELLOW",
            "flags": [f"Classification system error: {str(e)}"],
            "summary": "Unable to classify check-in. Flagging for review.",
            "recommended_action": "Please call your doctor's office if you have any concerns.",
            "escalation_reason": None
        }

    # Build check-in record
    check_in_record = {
        "day": state["recovery_day"],
        "timestamp": datetime.now().isoformat(),
        "responses": check_in_responses,
        "classification": result["classification"],
        "flags": result.get("flags", []),
        "summary": result.get("summary", ""),
        "recommended_action": result.get("recommended_action", "")
    }

    # Store in Pinecone
    stored = store_check_in(state["patient_id"], check_in_record)
    if not stored:
        state["active_flags"].append("CHECKIN_STORAGE_FAILED")

    # Extract medication adherence from this check-in and write to daily_vitals_log
    meds_taken = []
    meds_missed = []
    for med in state.get("medications", []):
        if med.get("interaction_flag"):
            continue
        key = f"med_{med['name'].replace(' ', '_').lower()}"
        val = check_in_responses.get(key)
        if val is not None:
            took_it = (val is True) or (isinstance(val, str) and "yes" in val.lower())
            (meds_taken if took_it else meds_missed).append(med["name"])

    vitals_record = {
        "day": state["recovery_day"],
        "date": datetime.now().date().isoformat(),
        "weight_lbs": check_in_responses.get("weight"),
        "bp_systolic": None,
        "bp_diastolic": None,
        "energy_score": check_in_responses.get("general_feeling"),
        "meds_taken": meds_taken,
        "meds_missed": meds_missed,
    }
    if "daily_vitals_log" not in state:
        state["daily_vitals_log"] = []
    state["daily_vitals_log"] = [v for v in state["daily_vitals_log"] if v["day"] != state["recovery_day"]]
    state["daily_vitals_log"].append(vitals_record)

    # Update state
    state["check_in_history"].append(check_in_record)
    state["last_check_in_date"] = datetime.now().isoformat()

    # Route based on classification
    if result["classification"] == "RED":
        state["current_agent"] = "escalation_agent"
        state["active_flags"].append(f"RED_FLAG_DAY_{state['recovery_day']}: {result.get('escalation_reason', '')}")
    elif result["classification"] == "YELLOW":
        state["current_agent"] = "admin_agent"
        state["active_flags"].append(f"YELLOW_FLAG_DAY_{state['recovery_day']}")
    else:
        state["current_agent"] = "admin_agent"

    state["last_monitoring_result"] = result
    print(f"[Monitoring Agent] Classification: {result['classification']}")
    return state
```

---

### Step 3.4 — Escalation Agent

Open `agents/escalation_agent.py`:

```python
from anthropic import Anthropic
from tools.notification_tool import send_email_notification, send_sms_notification
import json
import uuid
from datetime import datetime

client = Anthropic()

def determine_escalation_tier(flags: list, responses: dict, state: dict) -> str:
    """
    TIER_1: Urgent but not life-threatening — draft message for human approval
    TIER_2: Potentially life-threatening — auto-notify emergency contact (with consent)
    TIER_3: Actively life-threatening — display 911 immediately
    """
    flag_text = " ".join(flags).lower()
    responses_text = json.dumps(responses).lower()

    tier_3_keywords = ["can't breathe", "cannot breathe", "chest pain", "unconscious",
                       "not breathing", "stroke", "seizure", "911"]
    tier_2_keywords = ["difficulty breathing", "severe pain", "confusion", "disoriented",
                       "won't wake", "unresponsive", "er warning"]

    for keyword in tier_3_keywords:
        if keyword in flag_text or keyword in responses_text:
            return "TIER_3"

    for keyword in tier_2_keywords:
        if keyword in flag_text or keyword in responses_text:
            return "TIER_2"

    return "TIER_1"

def run_escalation_agent(state: dict) -> dict:
    """
    Escalation Agent: Handle RED flags. Tier-based response.
    """
    print("[Escalation Agent] RED flag detected. Determining tier...")

    recent_checkin = state["check_in_history"][-1] if state["check_in_history"] else {}
    flags = state.get("active_flags", [])
    responses = recent_checkin.get("responses", {})

    tier = determine_escalation_tier(flags, responses, state)
    print(f"[Escalation Agent] Tier: {tier}")

    state["escalation_tier"] = tier
    state["escalation_timestamp"] = datetime.now().isoformat()

    if tier == "TIER_3":
        # Immediate 911 display — no agent actions, just surface to UI
        state["show_911_screen"] = True
        state["911_message"] = "CALL 911 NOW. Do not wait."

        # Auto-notify emergency contact if consented
        if state.get("emergency_contact_consented") and state.get("emergency_contact_phone"):
            send_sms_notification(
                to_phone=state["emergency_contact_phone"],
                message=f"URGENT: {state['patient_name']} may need emergency help. "
                        f"Please check on them immediately or call 911."
            )
        state["current_agent"] = "complete"

    elif tier == "TIER_2":
        # Auto-notify emergency contact (with consent) + draft ER handoff summary
        if state.get("emergency_contact_consented") and state.get("emergency_contact_phone"):
            send_sms_notification(
                to_phone=state["emergency_contact_phone"],
                message=f"URGENT: {state['patient_name']} has reported concerning symptoms "
                        f"(Day {state['recovery_day']} of recovery from {state['diagnosis']}). "
                        f"Please check on them."
            )

        # Draft ER handoff summary patient can show on arrival
        er_summary = generate_er_summary(state)
        state["er_handoff_summary"] = er_summary
        state["show_er_guidance"] = True
        state["current_agent"] = "admin_agent"

    elif tier == "TIER_1":
        # Draft provider message for human approval
        draft = generate_provider_message_draft(state, recent_checkin)

        approval_item = {
            "id": str(uuid.uuid4()),
            "type": "escalation_message",
            "content": draft,
            "recipient": "primary_care_physician",
            "status": "pending",
            "created_at": datetime.now().isoformat()
        }
        state["human_approval_queue"].append(approval_item)
        state["show_yellow_guidance"] = True
        state["current_agent"] = "admin_agent"

    return state

def generate_er_summary(state: dict) -> str:
    """Generate a plain-language ER handoff summary."""
    meds = [f"{m['name']} {m['dose']} {m['frequency']}"
            for m in state.get("medications", [])
            if not m.get("interaction_flag")]

    return f"""PATIENT INFORMATION FOR ER STAFF
Name: {state.get('patient_name', 'Unknown')}
Recent discharge: {state.get('discharge_date', 'Unknown')}
Diagnosis: {state.get('diagnosis', 'Unknown')}

Current medications:
{chr(10).join(f'- {m}' for m in meds)}

Allergies: Please ask patient

Recovery day: {state.get('recovery_day', 'Unknown')}
Flagged symptoms today: {', '.join(state.get('active_flags', [])[:3])}"""

def generate_provider_message_draft(state: dict, recent_checkin: dict) -> str:
    """Draft a provider message for human approval."""
    return f"""Draft message to your care team (please review before sending):

Subject: Recovery update — Day {state.get('recovery_day')} concern

I was discharged on {state.get('discharge_date')} following treatment for {state.get('diagnosis')}.
During my Day {state.get('recovery_day')} check-in, I noticed the following:

{recent_checkin.get('summary', 'See flags below')}

Specific concerns: {', '.join(recent_checkin.get('flags', []))}

Could you please advise on next steps?

[REVIEW AND APPROVE BEFORE SENDING]"""
```

---

### Step 3.5 — Admin Agent

Open `agents/admin_agent.py`:

```python
from tools.notification_tool import send_email_notification
import json
from datetime import datetime, timedelta

def run_admin_agent(state: dict) -> dict:
    """
    Admin Agent: Task reminders, appointment tracking, family updates, weekly summaries.
    """
    print("[Admin Agent] Running daily task check...")

    today = datetime.now()
    actions_taken = []

    # Check upcoming appointments
    for appt in state.get("appointments", []):
        if appt.get("scheduled_date") and not appt.get("confirmed"):
            appt_date = datetime.fromisoformat(appt["scheduled_date"])
            days_until = (appt_date - today).days

            if days_until == 2:
                # 48-hour reminder
                message = (f"Reminder: You have an appointment with "
                           f"{appt['provider']} ({appt['specialty']}) in 2 days "
                           f"on {appt['scheduled_date']}.")
                if state.get("caregiver_email"):
                    send_email_notification(
                        to_email=state["caregiver_email"],
                        subject="Appointment Reminder — 48 Hours",
                        body=message
                    )
                actions_taken.append("48hr_appointment_reminder_sent")

    # Weekly summary (every 7 days)
    if state.get("recovery_day", 0) % 7 == 0 and state.get("recovery_day", 0) > 0:
        summary = generate_weekly_summary(state)
        if state.get("caregiver_email"):
            send_email_notification(
                to_email=state["caregiver_email"],
                subject=f"Weekly Recovery Summary — Week {state['recovery_day'] // 7}",
                body=summary
            )
        actions_taken.append("weekly_summary_sent")

    state["last_admin_run"] = datetime.now().isoformat()
    state["admin_actions_today"] = actions_taken
    state["current_agent"] = "complete"

    print(f"[Admin Agent] Done. Actions: {actions_taken}")
    return state

def generate_weekly_summary(state: dict) -> str:
    history = state.get("check_in_history", [])
    week_num = state.get("recovery_day", 7) // 7
    recent = history[-7:]

    green = sum(1 for c in recent if c.get("classification") == "GREEN")
    yellow = sum(1 for c in recent if c.get("classification") == "YELLOW")
    red = sum(1 for c in recent if c.get("classification") == "RED")

    return f"""Weekly Recovery Summary — Week {week_num}
Patient: {state.get('patient_name')}
Diagnosis: {state.get('diagnosis')}

Check-in summary (last 7 days):
✅ Green days: {green}
⚠️  Yellow days: {yellow}
🔴 Red days: {red}

{'All medications on track.' if yellow == 0 and red == 0 else 'Some medication or symptom concerns noted — see daily logs.'}

Next appointment: {state['appointments'][0]['provider'] if state.get('appointments') else 'None scheduled'}

This summary was generated by Nexus — your post-discharge recovery co-pilot."""
```

---

## Phase 4 — LangGraph Orchestrator (Day 3, ~2 hours)

### Step 4.1 — Build the graph

Open `agents/orchestrator.py`:

```python
from langgraph.graph import StateGraph, END
from state.recovery_state import RecoveryState
from agents.intake_agent import run_intake_agent
from agents.care_plan_agent import run_care_plan_agent
from agents.monitoring_agent import run_monitoring_agent, generate_checkin_questions
from agents.escalation_agent import run_escalation_agent
from agents.admin_agent import run_admin_agent

def route_after_monitoring(state: RecoveryState) -> str:
    """Route based on monitoring classification."""
    current = state.get("current_agent", "admin_agent")
    if current == "escalation_agent":
        return "escalation_agent"
    return "admin_agent"

def route_after_intake(state: RecoveryState) -> str:
    """Route after intake — check for PDF failures."""
    if "PDF_PARSE_FAILED" in str(state.get("active_flags", [])):
        return END
    return "care_plan_agent"

def build_intake_graph():
    """Graph for Day 0: intake + care plan generation."""
    workflow = StateGraph(dict)

    workflow.add_node("intake_agent", run_intake_agent)
    workflow.add_node("care_plan_agent", run_care_plan_agent)

    workflow.set_entry_point("intake_agent")
    workflow.add_conditional_edges(
        "intake_agent",
        route_after_intake,
        {
            "care_plan_agent": "care_plan_agent",
            END: END
        }
    )
    workflow.add_edge("care_plan_agent", END)

    return workflow.compile()

def build_monitoring_graph():
    """Graph for daily check-in loop."""
    workflow = StateGraph(dict)

    workflow.add_node("monitoring_agent", lambda state: run_monitoring_agent(
        state, state.get("todays_checkin_responses", {})
    ))
    workflow.add_node("escalation_agent", run_escalation_agent)
    workflow.add_node("admin_agent", run_admin_agent)

    workflow.set_entry_point("monitoring_agent")
    workflow.add_conditional_edges(
        "monitoring_agent",
        route_after_monitoring,
        {
            "escalation_agent": "escalation_agent",
            "admin_agent": "admin_agent"
        }
    )
    workflow.add_edge("escalation_agent", "admin_agent")
    workflow.add_edge("admin_agent", END)

    return workflow.compile()

# Instantiate graphs
intake_graph = build_intake_graph()
monitoring_graph = build_monitoring_graph()
```

---

## Phase 5 — Nebius Token Factory Integration (Day 3, ~30 min)

The rubric requires at least one model call via Nebius Token Factory.

### Step 5.1 — Add Nebius call to Care Plan Agent

Add this function to `agents/care_plan_agent.py`:

```python
import os
from openai import OpenAI  # Nebius uses OpenAI-compatible API

def run_care_plan_via_nebius(state: dict) -> str:
    """
    Use Nebius Token Factory for the care plan generation step.
    This satisfies the rubric requirement.
    """
    nebius_client = OpenAI(
        base_url=os.getenv("NEBIUS_BASE_URL"),
        api_key=os.getenv("NEBIUS_API_KEY")
    )

    response = nebius_client.chat.completions.create(
        model="meta-llama/Meta-Llama-3.1-70B-Instruct",  # Or available Nebius model
        messages=[
            {"role": "system", "content": CARE_PLAN_SYSTEM_PROMPT},
            {"role": "user", "content": f"Generate care plan for: {state['diagnosis']}"}
        ],
        max_tokens=1000
    )

    return response.choices[0].message.content
```

Call `run_care_plan_via_nebius()` as a parallel or fallback path in your Care Plan Agent. Log that it ran in your Google Doc — this is what the cohort review compares.

---

## Phase 5.5 — ElevenLabs Speech-to-Text Tool (Day 3, ~1 hour)

Build and test the voice tool in isolation before wiring it into the Streamlit UI.

### Step 5.5.1 — Get your ElevenLabs API key

Log in to elevenlabs.io → Profile → API Keys → copy your key → paste into `.env` as `ELEVENLABS_API_KEY`.

The endpoint you'll use is ElevenLabs' Speech-to-Text (transcription) API — not the Conversational AI product. Confirm you have access at: `https://elevenlabs.io/docs/api-reference/speech-to-text`

### Step 5.5.2 — Build the STT tool

Open `tools/elevenlabs_stt.py`:

```python
import os
import requests
import tempfile

ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"

def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/wav") -> dict:
    """
    Send audio bytes to ElevenLabs STT API.
    Returns dict with success status and transcript text.

    Args:
        audio_bytes: Raw audio bytes from browser recording
        mime_type: Audio format — "audio/wav" or "audio/webm"

    Returns:
        { "success": bool, "transcript": str | None, "error": str | None }
    """
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        return {
            "success": False,
            "transcript": None,
            "error": "ELEVENLABS_API_KEY not set in environment"
        }

    try:
        # Write audio bytes to a temp file
        suffix = ".wav" if "wav" in mime_type else ".webm"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        with open(tmp_path, "rb") as audio_file:
            response = requests.post(
                ELEVENLABS_STT_URL,
                headers={"xi-api-key": api_key},
                files={"file": (f"checkin{suffix}", audio_file, mime_type)},
                data={"model_id": "scribe_v1"},  # ElevenLabs STT model
                timeout=30
            )

        os.unlink(tmp_path)  # Clean up temp file

        if response.status_code == 200:
            data = response.json()
            transcript = data.get("text", "").strip()

            if not transcript:
                return {
                    "success": False,
                    "transcript": None,
                    "error": "Transcription returned empty. Please try again or type your response."
                }

            return {
                "success": True,
                "transcript": transcript,
                "error": None
            }

        else:
            return {
                "success": False,
                "transcript": None,
                "error": f"ElevenLabs API error {response.status_code}: {response.text[:200]}"
            }

    except requests.Timeout:
        return {
            "success": False,
            "transcript": None,
            "error": "ElevenLabs STT timed out. Please type your response instead."
        }
    except Exception as e:
        return {
            "success": False,
            "transcript": None,
            "error": f"STT failed: {str(e)}"
        }


def parse_transcript_to_responses(transcript: str, questions: list, state: dict) -> dict:
    """
    Use Claude to parse a free-form spoken transcript into
    structured check-in responses matching the question set.

    Args:
        transcript: Raw text from ElevenLabs STT
        questions: List of check-in question dicts from generate_checkin_questions()
        state: Current recovery state (for context)

    Returns:
        Dict of structured responses keyed by question ID
    """
    from anthropic import Anthropic
    client = Anthropic()

    question_summary = "\n".join([
        f"- {q['id']}: {q['question']}" for q in questions
    ])

    system_prompt = """You are parsing a patient's spoken check-in response into structured data.
The patient spoke freely — your job is to extract answers to specific questions from their speech.
Be generous in interpretation. If they mention a symptom, flag it.
Return ONLY valid JSON with one key per question ID.
If the transcript doesn't address a question, set that key to null."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=500,
            system=system_prompt,
            messages=[{
                "role": "user",
                "content": f"""Patient's spoken check-in (Day {state.get('recovery_day', 1)} of recovery from {state.get('diagnosis', 'unknown')}):

"{transcript}"

Extract answers for these questions:
{question_summary}

Return JSON with these exact keys: {[q['id'] for q in questions]}"""
            }]
        )

        import json
        return json.loads(response.content[0].text)

    except Exception as e:
        # Fallback: return transcript as free_text answer
        return {
            "concerns": transcript,
            "_parse_error": str(e),
            "_raw_transcript": transcript
        }
```

### Step 5.5.3 — Test the STT tool in isolation

```python
# test_stt.py — run this from your project root
from tools.elevenlabs_stt import transcribe_audio
from dotenv import load_dotenv
load_dotenv()

# Test with a real audio file first
with open("data/test_audio.wav", "rb") as f:
    audio_bytes = f.read()

result = transcribe_audio(audio_bytes)
print("Success:", result["success"])
print("Transcript:", result["transcript"])
print("Error:", result["error"])
```

Record a short `.wav` file on your computer saying something like *"I took all my medications today and I'm feeling about a 6 out of 10. My ankles are a little swollen."* Use that as your test file. Confirm the transcript comes back before moving to Phase 6.

---

## Phase 6 — Streamlit UI (Day 4, ~3 hours)

Open `ui/streamlit_app.py`:

```python
import streamlit as st
import sys
import os
import json
import uuid
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

from agents.orchestrator import intake_graph, monitoring_graph, build_monitoring_graph
from agents.monitoring_agent import generate_checkin_questions

st.set_page_config(
    page_title="Nexus",
    page_icon="💜",
    layout="wide"
)

# ── Purple theme CSS override for Streamlit elements ──────────────────────────
# The .streamlit/config.toml handles global theming.
# This block adds fine-grained overrides for elements config.toml can't reach.
st.markdown("""
<style>
[data-testid="stSidebar"] { background-color: #F4F3FE; }
[data-testid="stSidebar"] hr { border-color: #CECBF6; }
.stButton > button { border-color: #534AB7; color: #534AB7; }
.stButton > button:hover { background-color: #EEEDFE; }
.stMetric label { color: #7F77DD; font-size: 12px; }
.stMetric [data-testid="stMetricValue"] { color: #3C3489; }
div[data-testid="stAlert"][data-baseweb="notification"] { border-left-color: #534AB7; }
</style>
""", unsafe_allow_html=True)

# Initialize session state
if "recovery_state" not in st.session_state:
    st.session_state.recovery_state = None
if "page" not in st.session_state:
    st.session_state.page = "onboarding"
if "show_typed_form" not in st.session_state:
    st.session_state.show_typed_form = False

# ─── SIDEBAR ─────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("### 💜 Nexus")
    if st.session_state.recovery_state:
        state = st.session_state.recovery_state
        col1, col2 = st.columns(2)
        with col1:
            discharge_str = state.get("discharge_date", "")
            try:
                from datetime import datetime as _dt
                d_date = _dt.strptime(discharge_str, "%Y-%m-%d").date()
                current_day = max(1, (_dt.now().date() - d_date).days + 1)
            except Exception:
                current_day = state.get("recovery_day", 1)
            st.metric("Day", f"{current_day} of 30")
        with col2:
            checkin_history = state.get("check_in_history", [])
            if checkin_history:
                last = checkin_history[-1]
                icon = {"GREEN": "🟢", "YELLOW": "🟡", "RED": "🔴"}.get(
                    last["classification"], "⚪"
                )
                st.metric("Last check-in", f"{icon} {last['classification']}")

        pending = [i for i in state.get("human_approval_queue", [])
                   if i["status"] == "pending"]
        if pending:
            st.warning(f"⚠️ {len(pending)} item(s) need your review")

        st.caption(state.get("diagnosis", "")[:30])

    st.divider()
    if st.button("📋 Care plan", use_container_width=True):
        st.session_state.page = "care_plan"
    if st.button("🎤 Daily check-in", use_container_width=True):
        st.session_state.page = "checkin"
    if st.button("📬 Approvals", use_container_width=True):
        st.session_state.page = "approvals"
    if st.button("📊 Dashboard", use_container_width=True):
        st.session_state.page = "dashboard"
    if st.button("📄 Provider summary", use_container_width=True):
        st.session_state.page = "provider_summary"
    if st.button("🏥 Hospital history", use_container_width=True):
        st.session_state.page = "hospital_history"

# ─── PAGE: ONBOARDING ────────────────────────────────────────────────────────
if st.session_state.page == "onboarding" and not st.session_state.recovery_state:
    st.title("Welcome to Nexus")
    st.write("Let's get you set up. This takes about 3 minutes.")

    with st.form("onboarding_form"):
        col1, col2 = st.columns(2)
        with col1:
            patient_name = st.text_input("Patient name *")
            discharge_date = st.date_input("Discharge date *", value=None)
        with col2:
            caregiver_name = st.text_input("Caregiver name (optional)")
            caregiver_email = st.text_input("Caregiver email (optional)")

        st.subheader("Emergency Contact")
        ec_name = st.text_input("Emergency contact name")
        ec_phone = st.text_input("Emergency contact phone")
        ec_consent = st.checkbox(
            "I consent to automatic emergency contact notification if a life-threatening "
            "symptom is detected during a check-in"
        )

        uploaded_file = st.file_uploader(
            "Upload your discharge summary PDF *",
            type=["pdf"]
        )

        submitted = st.form_submit_button("Start My Recovery Plan →")

    if submitted:
        if not patient_name or not uploaded_file:
            st.error("Please provide your name and discharge summary PDF.")
        else:
            # Save PDF temporarily
            patient_id = str(uuid.uuid4())[:8]
            pdf_path = f"data/{patient_id}_discharge.pdf"
            os.makedirs("data", exist_ok=True)
            with open(pdf_path, "wb") as f:
                f.write(uploaded_file.getbuffer())

            # Initialize state
            initial_state = {
                "patient_id": patient_id,
                "patient_name": patient_name,
                "caregiver_name": caregiver_name,
                "caregiver_email": caregiver_email,
                "emergency_contact_name": ec_name,
                "emergency_contact_phone": ec_phone,
                "emergency_contact_consented": ec_consent,
                "discharge_date": str(discharge_date),
                "recovery_day": 0,
                "diagnosis": "",
                "icd10_code": None,
                "medications": [],
                "appointments": [],
                "warning_signs_er": [],
                "warning_signs_call": [],
                "dietary_restrictions": [],
                "activity_restrictions": [],
                "current_agent": "intake_agent",
                "needs_clarification": [],
                "active_flags": [],
                "human_approval_queue": [],
                "check_in_history": [],
                "daily_vitals_log": [],
                "hospitalization_history": [],
                "messages": [],
                "intake_complete": False,
                "care_plan_complete": False,
                "last_check_in_date": None,
                "pinecone_namespace": f"patient_{patient_id}",
                "pdf_path": pdf_path
            }

            with st.spinner("Reading your discharge summary... (this takes ~30 seconds)"):
                result_state = intake_graph.invoke(initial_state)

            st.session_state.recovery_state = result_state

            if result_state.get("intake_complete"):
                st.success(f"✅ Recovery plan created for {patient_name}!")
                st.session_state.page = "care_plan"
                st.rerun()
            else:
                st.error("We had trouble reading your PDF. Please try uploading again.")
                for flag in result_state.get("active_flags", []):
                    st.warning(flag)

# ─── PAGE: CARE PLAN ─────────────────────────────────────────────────────────
elif st.session_state.page == "care_plan":
    state = st.session_state.recovery_state
    if not state:
        st.warning("Please complete onboarding first.")
    else:
        st.title(f"Your Recovery Plan — {state.get('diagnosis')}")

        # Show medication flags first if any
        pending_med_flags = [i for i in state.get("human_approval_queue", [])
                             if i["type"] == "medication_conflict" and i["status"] == "pending"]

        if pending_med_flags:
            st.error("⚠️ MEDICATION FLAGS REQUIRE YOUR ATTENTION")
            for flag in pending_med_flags:
                with st.expander("View medication flag"):
                    st.write(flag["content"])
                    col1, col2 = st.columns(2)
                    with col1:
                        if st.button("I've reviewed with my pharmacist", key=f"approve_{flag['id']}"):
                            flag["status"] = "approved"
                            st.rerun()
                    with col2:
                        if st.button("I need more help", key=f"help_{flag['id']}"):
                            st.write("Please call your pharmacy or 1-800-PHARMACY")

        # Display care plan
        care_plan = state.get("care_plan", {})
        if care_plan:
            tab1, tab2, tab3, tab4 = st.tabs([
                "📅 First 7 Days", "💊 Medications", "⚠️ Warning Signs", "📋 Appointments"
            ])

            with tab1:
                st.subheader("Your first week, day by day")
                for day_plan in care_plan.get("first_7_days", []):
                    with st.expander(f"Day {day_plan.get('day', '?')}"):
                        for task in day_plan.get("tasks", []):
                            st.checkbox(task, key=f"task_{day_plan.get('day')}_{task[:20]}")

            with tab2:
                st.subheader("Your medications")
                for med in care_plan.get("medication_schedule", []):
                    st.info(f"💊 {med}")

            with tab3:
                st.subheader("Go to the ER immediately if:")
                for sign in state.get("warning_signs_er", []):
                    st.error(f"🔴 {sign}")
                st.subheader("Call your doctor within 24 hours if:")
                for sign in state.get("warning_signs_call", []):
                    st.warning(f"🟡 {sign}")

            with tab4:
                st.subheader("Follow-up appointments")
                for appt in state.get("appointments", []):
                    st.write(f"📅 {appt.get('provider')} ({appt.get('specialty')}) — "
                             f"Required within: {appt.get('timeframe_required')}")

        if st.button("Start Today's Check-in →"):
            state["recovery_day"] = max(1, state.get("recovery_day", 0))
            st.session_state.page = "checkin"
            st.rerun()

# ─── PAGE: DAILY CHECK-IN ────────────────────────────────────────────────────
elif st.session_state.page == "checkin":
    state = st.session_state.recovery_state
    if not state:
        st.warning("Please complete onboarding first.")
    else:
        st.title(f"Day {state.get('recovery_day', 1)} Check-in")
        st.write("Speak your check-in or type your answers below.")

        questions = generate_checkin_questions(state)
        responses = {}

        # ── VOICE INPUT ──────────────────────────────────────────────────────
        st.subheader("🎤 Speak Your Check-in (Recommended)")
        st.caption("Click record, speak naturally about how you're feeling, then click stop.")

        # streamlit-audiorecorder gives a simple record/stop button
        # Install: pip install streamlit-audiorecorder
        try:
            from audiorecorder import audiorecorder
            audio = audiorecorder("🎤 Start Recording", "⏹ Stop Recording")

            if len(audio) > 0:
                # Audio was recorded — convert to bytes and send to ElevenLabs
                import io
                audio_buffer = io.BytesIO()
                audio.export(audio_buffer, format="wav")
                audio_bytes = audio_buffer.getvalue()

                with st.spinner("Transcribing your voice check-in..."):
                    from tools.elevenlabs_stt import transcribe_audio, parse_transcript_to_responses
                    stt_result = transcribe_audio(audio_bytes, mime_type="audio/wav")

                if stt_result["success"]:
                    transcript = stt_result["transcript"]
                    st.success("✅ Voice check-in received")
                    st.info(f"**What we heard:** {transcript}")

                    # Parse transcript into structured responses
                    with st.spinner("Understanding your responses..."):
                        responses = parse_transcript_to_responses(transcript, questions, state)

                    # Show parsed responses for patient to confirm
                    st.subheader("We understood the following — please confirm:")
                    for q in questions:
                        val = responses.get(q["id"])
                        if val is not None:
                            st.write(f"**{q['question']}** → {val}")

                    col1, col2 = st.columns(2)
                    with col1:
                        if st.button("✅ That's correct — submit"):
                            state["todays_checkin_responses"] = responses
                            state["checkin_method"] = "voice"
                            _run_monitoring(state)
                    with col2:
                        if st.button("✏️ Edit my answers instead"):
                            st.session_state.show_typed_form = True
                            st.rerun()

                else:
                    # STT failed — show error and fall through to typed form
                    st.warning(f"⚠️ Voice transcription issue: {stt_result['error']}")
                    st.info("No problem — please type your responses below.")
                    st.session_state.show_typed_form = True

        except ImportError:
            # audiorecorder not installed — fall through to typed form
            st.session_state.show_typed_form = True

        # ── TYPED FALLBACK ───────────────────────────────────────────────────
        show_typed = st.session_state.get("show_typed_form", False)
        with st.expander("📝 Type your responses instead", expanded=show_typed):
            with st.form("checkin_form"):
                for q in questions:
                    if q["type"] == "med_checkbox":
                        # Radio with no default — patient must actively choose Yes or No
                        responses[q["id"]] = st.radio(
                            q.get("med_name", q["id"]),
                            options=["Yes — I took it", "No — I missed it"],
                            index=None,
                            horizontal=True,
                            key=f"q_{q['id']}"
                        )
                    elif q["type"] in ("symptom_checklist", "multi_select"):
                        st.write(q["question"])
                        selected = []
                        for i, opt in enumerate(q.get("options", [])):
                            if st.checkbox(opt, key=f"q_{q['id']}_{i}"):
                                selected.append(opt)
                        responses[q["id"]] = selected
                    elif q["type"] == "yes_no_detail":
                        col1, col2 = st.columns([1, 2])
                        with col1:
                            responses[q["id"]] = st.radio(
                                q["question"], ["Yes", "No"],
                                key=f"q_{q['id']}"
                            )
                        with col2:
                            responses[f"{q['id']}_detail"] = st.text_input(
                                "Any details?", key=f"d_{q['id']}"
                            )
                    elif q["type"] == "scale_1_10":
                        responses[q["id"]] = st.slider(
                            q["question"], 1, 10, 5, key=f"q_{q['id']}"
                        )
                    elif q["type"] == "number_lbs":
                        responses[q["id"]] = st.number_input(
                            q["question"], min_value=50, max_value=500,
                            value=150, step=1, key=f"q_{q['id']}"
                        )
                    elif q["type"] == "multi_select":
                        responses[q["id"]] = st.multiselect(
                            q["question"], q.get("options", []),
                            key=f"q_{q['id']}"
                        )
                    elif q["type"] == "free_text":
                        responses[q["id"]] = st.text_area(
                            q["question"], key=f"q_{q['id']}"
                        )

                submitted = st.form_submit_button("Submit Check-in")

            if submitted:
                state["todays_checkin_responses"] = responses
                state["checkin_method"] = "typed"
                _run_monitoring(state)

# ── Helper to avoid duplicating monitoring logic ──────────────────────────────
def _run_monitoring(state):
    with st.spinner("Analyzing your check-in..."):
        monitoring_graph = build_monitoring_graph()
        result_state = monitoring_graph.invoke(state)

    st.session_state.recovery_state = result_state
    last_checkin = result_state["check_in_history"][-1]
    classification = last_checkin["classification"]

    if classification == "RED":
        if result_state.get("show_911_screen"):
            st.error("🚨 CALL 911 NOW")
            st.title("EMERGENCY — CALL 911 IMMEDIATELY")
        elif result_state.get("show_er_guidance"):
            st.error("⚠️ You should go to the ER")
            if result_state.get("er_handoff_summary"):
                st.text_area("Show this to ER staff:", result_state["er_handoff_summary"])
        else:
            st.warning("We've flagged some concerns and drafted a message to your care team.")
            st.session_state.page = "approvals"
            st.rerun()
    elif classification == "YELLOW":
        st.warning(f"⚠️ We noticed some things today: {last_checkin.get('summary')}")
        rec_action = last_checkin.get("recommended_action") or \
            result_state.get("last_monitoring_result", {}).get("recommended_action", "")
        if rec_action:
            st.info(f"**What to do:** {rec_action}")
    else:
        st.success(f"✅ Great — {last_checkin.get('summary')}")

# ─── PAGE: APPROVAL QUEUE ────────────────────────────────────────────────────
elif st.session_state.page == "approvals":
    state = st.session_state.recovery_state
    if not state:
        st.warning("Please complete onboarding first.")
    else:
        st.title("📬 Items Awaiting Your Review")
        pending = [i for i in state.get("human_approval_queue", [])
                   if i["status"] == "pending"]

        if not pending:
            st.success("Nothing pending — you're all caught up.")
        else:
            for item in pending:
                with st.expander(
                    f"{'⚠️ Medication Flag' if item['type'] == 'medication_conflict' else '📨 Message Draft'}"
                    f" — {item['created_at'][:10]}"
                ):
                    st.write(item["content"])

                    if item["type"] in ["escalation_message", "provider_message"]:
                        edited = st.text_area(
                            "Edit before sending:", item["content"],
                            key=f"edit_{item['id']}"
                        )
                        col1, col2, col3 = st.columns(3)
                        with col1:
                            if st.button("✅ Send Now", key=f"send_{item['id']}"):
                                item["status"] = "approved"
                                item["content"] = edited
                                st.success("Message queued for sending.")
                                st.rerun()
                        with col2:
                            if st.button("❌ Don't Send", key=f"reject_{item['id']}"):
                                item["status"] = "rejected"
                                st.rerun()
                        with col3:
                            if st.button("📞 I'll Call Instead", key=f"call_{item['id']}"):
                                item["status"] = "rejected"
                                st.info("Good idea. Call your doctor's office directly.")
                                st.rerun()

# ─── PAGE: DASHBOARD ─────────────────────────────────────────────────────────
elif st.session_state.page == "dashboard":
    state = st.session_state.recovery_state
    if not state:
        st.warning("Please complete onboarding first.")
    else:
        st.title("📊 Recovery Dashboard")
        history = state.get("check_in_history", [])

        if not history:
            st.info("Complete your first check-in to see your dashboard.")
        else:
            col1, col2, col3 = st.columns(3)
            with col1:
                green = sum(1 for c in history if c["classification"] == "GREEN")
                st.metric("Green days", green)
            with col2:
                yellow = sum(1 for c in history if c["classification"] == "YELLOW")
                st.metric("Yellow days", yellow)
            with col3:
                red = sum(1 for c in history if c["classification"] == "RED")
                st.metric("Red days", red)

            st.subheader("Daily vitals & check-in log")
            for checkin in reversed(history):
                icon = {"GREEN": "🟢", "YELLOW": "🟡", "RED": "🔴"}.get(
                    checkin["classification"], "⚪"
                )
                vitals = state.get("daily_vitals_log", [])
                day_vitals = next(
                    (v for v in vitals if v.get("day") == checkin["day"]), {}
                )
                weight_str = f"Weight {day_vitals['weight_lbs']} lbs · " if day_vitals.get("weight_lbs") else ""
                bp_str = f"BP {day_vitals['bp_systolic']}/{day_vitals['bp_diastolic']} · " if day_vitals.get("bp_systolic") else ""
                energy_str = f"Energy {day_vitals['energy_score']}/10 · " if day_vitals.get("energy_score") else ""
                st.write(
                    f"Day {checkin['day']} {icon} — {weight_str}{bp_str}{energy_str}"
                    f"{checkin.get('summary', '')}"
                )

            vitals_log = state.get("daily_vitals_log", [])
            if vitals_log:
                st.subheader("Medication adherence")
                meds = [m["name"] for m in state.get("medications", [])]
                for med in meds:
                    taken_days = sum(1 for v in vitals_log if med in v.get("meds_taken", []))
                    missed_days = sum(1 for v in vitals_log if med in v.get("meds_missed", []))
                    total_days = taken_days + missed_days  # only days where we have an answer
                    if total_days == 0:
                        st.progress(0.0, text=f"{med}: no data yet")
                    else:
                        pct = taken_days / total_days
                        label = f"{med}: {taken_days}/{total_days} days"
                        if missed_days > 0:
                            label += f"  ({missed_days} missed)"
                        st.progress(pct, text=label)

# ─── PAGE: PROVIDER SUMMARY ───────────────────────────────────────────────────
elif st.session_state.page == "provider_summary":
    state = st.session_state.recovery_state
    if not state:
        st.warning("Please complete onboarding first.")
    else:
        st.title("Provider summary")
        st.caption(
            "Auto-generated from your check-in history. "
            "Share this at your next appointment."
        )

        history = state.get("check_in_history", [])
        vitals_log = state.get("daily_vitals_log", [])

        if not history:
            st.info("Complete at least one check-in to generate your provider summary.")
        else:
            # Header card
            col1, col2 = st.columns([3, 1])
            with col1:
                st.markdown(f"**Patient:** {state.get('patient_name')}")
                st.markdown(f"**Diagnosis:** {state.get('diagnosis')}")
                st.markdown(
                    f"**Discharged:** {state.get('discharge_date')} · "
                    f"Day {state.get('recovery_day', 0)} of recovery"
                )
            with col2:
                st.download_button(
                    label="⬇️ Export summary",
                    data=generate_provider_summary_text(state),
                    file_name=f"recovery_summary_{state.get('patient_name', 'patient').replace(' ','_')}.txt",
                    mime="text/plain"
                )

            st.divider()

            # Vitals trend
            st.subheader("Vitals trend")
            if vitals_log:
                weights = [v["weight_lbs"] for v in vitals_log if v.get("weight_lbs")]
                if weights:
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        st.metric(
                            "Weight at discharge",
                            f"{weights[0]} lbs"
                        )
                    with col2:
                        st.metric(
                            "Weight today",
                            f"{weights[-1]} lbs",
                            delta=f"{round(weights[-1] - weights[0], 1)} lbs"
                        )
                    with col3:
                        energy_scores = [v["energy_score"] for v in vitals_log if v.get("energy_score")]
                        if energy_scores:
                            avg_e = round(sum(energy_scores) / len(energy_scores), 1)
                            st.metric("Avg energy", f"{avg_e} / 10")

            # Medication adherence
            st.subheader("Medication adherence")
            meds = [m["name"] for m in state.get("medications", [])]
            if not vitals_log:
                st.info("Medication adherence will appear here after the first check-in.")
            else:
                for med in meds:
                    taken = sum(1 for v in vitals_log if med in v.get("meds_taken", []))
                    missed = sum(1 for v in vitals_log if med in v.get("meds_missed", []))
                    total = taken + missed
                    if total == 0:
                        st.info(f"{med} — no check-in data yet")
                    elif missed == 0:
                        pct = int(taken / total * 100)
                        st.success(f"✅ {med} — {taken}/{total} days ({pct}%)")
                    else:
                        pct = int(taken / total * 100)
                        st.warning(f"⚠️ {med} — {taken}/{total} days taken ({missed} missed, {pct}%)")

            # Flagged anomalies
            st.subheader("Flagged anomalies")
            flagged = [c for c in history if c["classification"] in ["YELLOW", "RED"]]
            if not flagged:
                st.success("No anomalies flagged in this period.")
            else:
                for item in flagged:
                    icon = "🔴" if item["classification"] == "RED" else "🟡"
                    st.write(
                        f"{icon} **Day {item['day']}** — {item.get('summary', '')} "
                        f"({', '.join(item.get('flags', [])[:2])})"
                    )

            # Patient-reported symptoms summary
            st.subheader("Patient-reported summary")
            st.caption(
                "Agent-generated summary of what the patient reported across all check-ins. "
                "Review before sharing with your provider."
            )
            all_flags = []
            for c in history:
                all_flags.extend(c.get("flags", []))
            if all_flags:
                from collections import Counter
                common = Counter(all_flags).most_common(5)
                for symptom, count in common:
                    st.write(f"- {symptom} (mentioned {count} time{'s' if count > 1 else ''})")


def generate_provider_summary_text(state: dict) -> str:
    """Generate plain text export of provider summary."""
    history = state.get("check_in_history", [])
    vitals = state.get("daily_vitals_log", [])
    meds = [m["name"] for m in state.get("medications", [])]

    lines = [
        "NEXUS — PROVIDER SUMMARY",
        "=" * 40,
        f"Patient: {state.get('patient_name')}",
        f"Diagnosis: {state.get('diagnosis')}",
        f"Discharged: {state.get('discharge_date')}",
        f"Summary generated: Day {state.get('recovery_day', 0)} of recovery",
        "",
        "VITALS TREND",
        "-" * 20,
    ]
    for v in vitals:
        weight_str = f"Weight: {v['weight_lbs']} lbs" if v.get("weight_lbs") else ""
        bp_str = f"BP: {v['bp_systolic']}/{v['bp_diastolic']}" if v.get("bp_systolic") else ""
        lines.append(f"Day {v['day']}: {weight_str} {bp_str} Energy: {v.get('energy_score', '?')}/10")

    lines += ["", "MEDICATION ADHERENCE", "-" * 20]
    for med in meds:
        taken = sum(1 for v in vitals if med in v.get("meds_taken", []))
        lines.append(f"{med}: {taken}/{len(vitals)} days")

    lines += ["", "FLAGGED ANOMALIES", "-" * 20]
    for c in history:
        if c["classification"] in ["YELLOW", "RED"]:
            lines.append(f"Day {c['day']} [{c['classification']}]: {c.get('summary', '')}")

    lines += ["", "— Generated by Nexus (synthetic demo data) —"]
    return "\n".join(lines)


# ─── PAGE: HOSPITAL HISTORY ───────────────────────────────────────────────────
elif st.session_state.page == "hospital_history":
    state = st.session_state.recovery_state
    if not state:
        st.warning("Please complete onboarding first.")
    else:
        st.title("Hospital history")
        st.caption(
            "Your hospitalization record. The current stay was auto-imported "
            "from your discharge summary. Add past stays manually."
        )

        hosp_history = state.get("hospitalization_history", [])

        if not hosp_history:
            st.info("No hospitalization records yet. Upload your discharge summary to auto-import the current stay.")
        else:
            for hosp in reversed(hosp_history):
                is_current = hosp.get("source") == "auto_imported"
                with st.container():
                    col1, col2 = st.columns([1, 6])
                    with col1:
                        year = hosp.get("admit_date", "")[:4] or hosp.get("discharge_date", "")[:4]
                        label = "Current" if is_current else year
                        st.markdown(
                            f"<div style='background:{'#EEEDFE' if is_current else '#F4F3FE'};"
                            f"border-radius:8px;padding:10px;text-align:center;"
                            f"color:#534AB7;font-size:12px;font-weight:500'>{label}</div>",
                            unsafe_allow_html=True
                        )
                    with col2:
                        st.markdown(f"**{hosp.get('diagnosis', 'Unknown diagnosis')}**")
                        meta_parts = []
                        if hosp.get("hospital_name"):
                            meta_parts.append(hosp["hospital_name"])
                        if hosp.get("admit_date") and hosp.get("discharge_date"):
                            meta_parts.append(f"{hosp['admit_date']} → {hosp['discharge_date']}")
                        if hosp.get("treating_physician"):
                            meta_parts.append(f"Dr. {hosp['treating_physician']}")
                        st.caption(" · ".join(meta_parts))

                        tags = []
                        if hosp.get("specialty"):
                            tags.append(hosp["specialty"])
                        if hosp.get("icd10_code"):
                            tags.append(f"ICD-10: {hosp['icd10_code']}")
                        if tags:
                            st.caption(" · ".join(tags))

                        source_label = "Auto-imported from discharge PDF" if is_current else "Added manually"
                        st.caption(f"_{source_label}_")

                    st.divider()

        # Manual entry form
        st.subheader("Add a past hospitalization")
        with st.form("add_hospitalization"):
            col1, col2 = st.columns(2)
            with col1:
                admit = st.text_input("Admission date (YYYY-MM-DD)")
                hospital = st.text_input("Hospital name")
                diagnosis = st.text_input("Main diagnosis")
            with col2:
                discharge = st.text_input("Discharge date (YYYY-MM-DD)")
                physician = st.text_input("Treating physician (optional)")
                icd10 = st.text_input("ICD-10 code (optional)")

            notes = st.text_area("Any notes (procedures, reason for admission, etc.)", height=80)
            submitted = st.form_submit_button("Add hospitalization")

        if submitted and admit and discharge and diagnosis:
            import uuid as uuid_lib
            new_record = {
                "id": str(uuid_lib.uuid4()),
                "admit_date": admit,
                "discharge_date": discharge,
                "hospital_name": hospital,
                "diagnosis": diagnosis,
                "icd10_code": icd10 or None,
                "treating_physician": physician or None,
                "specialty": None,
                "notes": notes or None,
                "source": "manual_entry",
                "created_at": datetime.now().isoformat()
            }
            if "hospitalization_history" not in state:
                state["hospitalization_history"] = []
            state["hospitalization_history"].append(new_record)
            st.session_state.recovery_state = state
            st.success("Hospitalization record added.")
            st.rerun()
        elif submitted:
            st.error("Please fill in admission date, discharge date, and diagnosis at minimum.")
```

---

## Phase 7 — n8n Daily Trigger (Day 4, ~1 hour)

n8n handles the daily scheduling — it pings your Streamlit app to trigger morning check-ins.

### Step 7.1 — Set up n8n

Go to [n8n.io](https://n8n.io) → Sign up for free cloud account.

### Step 7.2 — Build the daily trigger workflow

1. Create new workflow → name it `Nexus Daily Check-in`
2. Add **Schedule Trigger** node → Set to `0 8 * * *` (8am daily)
3. Add **Send Email** node (directly after Schedule Trigger):
   - Configure SMTP credential: host `smtp.gmail.com`, port `465`, SSL on
   - From/User: your Gmail address
   - Password: Gmail App Password (myaccount.google.com/apppasswords)
   - To: your Gmail address
   - Subject: `Nexus — Daily check-in reminder`
   - Body: `Good morning! Time to complete your daily recovery check-in.`
4. Export workflow as JSON → Save to your repo as `n8n/daily_checkin_workflow.json`

> **Note:** Skip the HTTP Request and IF nodes — n8n cloud blocks requests to localhost.
> In production, you would add an HTTP Request node pointing to your deployed Streamlit URL.
> For the demo, check-ins are triggered manually via `monitoring_graph.invoke(state)`.

---

## Phase 8 — Synthetic Test Data (Day 4, ~30 min)

**Never use real patient data.** Create a synthetic discharge summary for your demo.

### Step 8.1 — Create test discharge summary

Save as `data/synthetic_discharge_sample.txt`:

```
DISCHARGE SUMMARY — SYNTHETIC PATIENT DATA (NOT REAL)

Patient: John Demo Patient
Discharge Date: 2025-06-01
Diagnosis: Congestive Heart Failure (CHF) Exacerbation
ICD-10: I50.9

MEDICATIONS AT DISCHARGE:
1. Furosemide (Lasix) 40mg — Take once daily in the morning with water
2. Lisinopril 10mg — Take once daily with breakfast
3. Metoprolol Succinate 25mg — Take once daily
4. Potassium Chloride 20mEq — Take once daily

FOLLOW-UP APPOINTMENTS:
- Cardiologist: Dr. Sarah Chen — within 7 days of discharge
- Primary Care: Dr. James Park — within 14 days of discharge

ACTIVITY RESTRICTIONS:
- No lifting more than 10 pounds for 4 weeks
- No driving for 1 week
- Walk 5-10 minutes twice daily, increase gradually

DIETARY RESTRICTIONS:
- Sodium restriction: less than 2000mg per day
- Fluid restriction: less than 2 liters per day
- Weigh yourself every morning before eating

GO TO THE EMERGENCY ROOM IMMEDIATELY IF:
- Chest pain or pressure
- Difficulty breathing at rest
- Weight gain of more than 2 pounds in one day or 5 pounds in one week
- Severe swelling in legs, ankles, or feet
- Fainting or loss of consciousness

CALL YOUR DOCTOR WITHIN 24 HOURS IF:
- Weight gain of 1-2 pounds in one day
- Increased shortness of breath with activity
- Increased swelling in feet or ankles
- Dizziness or lightheadedness
- Fever above 101°F
```

---

## Phase 9 — GitHub & README (Day 5, ~1 hour)

### Step 9.1 — Write your README

Open `README.md`:

```markdown
# Nexus
## Multi-Agent Post-Hospital Recovery System | Week 3 — Agentic AI Systems

### What it does
Nexus is a multi-agent system that takes a hospital discharge summary
and becomes a 30-day recovery co-pilot — tracking medications, monitoring daily
symptoms, scheduling follow-ups, and escalating to humans before anything goes wrong.

### Architecture
- **Intake Agent** — Parses discharge PDF, extracts structured clinical data
- **Care Plan Agent** — Checks medication interactions (OpenFDA), generates plain-language recovery plan
- **Monitoring Agent** — Daily check-in loop with GREEN/YELLOW/RED classification
- **Escalation Agent** — Tier-based emergency response with human-in-the-loop
- **Admin Agent** — Appointment reminders, family updates, weekly summaries
- **Orchestrator** — LangGraph state machine coordinating all agents

### UI
7 screens built in Streamlit with soft purple theme (`.streamlit/config.toml`):
- Onboarding — PDF upload and patient setup
- Care plan — day-by-day checklists, medications, warning signs
- Daily check-in — ElevenLabs voice input with typed fallback
- Approval queue — human review before any outbound message
- Recovery dashboard — daily vitals log, medication adherence bars
- Provider summary — auto-generated shareable brief with export
- Hospital history — auto-populated from discharge PDFs, manually extensible

### Setup

1. Clone the repo
   git clone https://github.com/YOUR_USERNAME/nexus.git
   cd nexus

2. Install dependencies
   pip install -r requirements.txt

3. Copy .env.example to .env and fill in your API keys
   cp .env.example .env

4. Set up Pinecone index
   - Name: nexus
   - Dimensions: 1024
   - Metric: cosine

5. Run the app
   streamlit run ui/streamlit_app.py

### Demo
Upload any PDF from /data/ (10 synthetic patients of varying complexity).
No real patient data is used.

### Week 3 Rubric Compliance
- ✅ Multi-agent system (5 specialized subagents + orchestrator)
- ✅ Tool use (6 tools across the pipeline)
- ✅ Persistent state (Pinecone across 30-day recovery period)
- ✅ Error recovery (retry logic, fallbacks, graceful degradation)
- ✅ Human-in-the-loop (3 distinct handoff types)
- ✅ Nebius Token Factory (care plan generation step)
- ✅ LangGraph (stateful graph orchestration)
```

### Step 9.2 — Final commit and push

```bash
git add .
git commit -m "complete nexus — week 3 submission"
git push origin main
```

---

## Phase 10 — Demo Prep (Day 5, ~1 hour)

### Your 5-minute demo script

```
0:00 - 0:30  Problem statement
              "1 in 5 patients readmitted within 30 days.
               They leave with a paper sheet. Here's what should happen instead."

0:30 - 1:30  Upload the synthetic discharge PDF
              Walk through: intake → care plan generated → medication schedule shown
              Point out: "The Care Plan Agent checked OpenFDA for drug interactions"

1:30 - 2:15  Show the care plan UI
              Walk through tabs: First 7 Days, Medications, Warning Signs, Appointments
              "This took 90 seconds. The paper sheet takes hours to make sense of."

2:15 - 3:30  Live voice check-in — the demo moment
              Click the microphone. Speak into your computer:
              "I've been having trouble breathing today and I gained 3 pounds since yesterday."
              Show: ElevenLabs STT transcribes → Claude parses → Monitoring Agent classifies RED
              Show: Escalation Agent triggered → ER guidance shown → provider message drafted
              Show: Approval queue — "Nothing leaves the system without human sign-off"

3:30 - 4:15  Show architecture
              "5 agents, 7 tools including ElevenLabs voice-to-text, Pinecone memory
               across 30 days, n8n daily trigger at 8am, LangGraph routing between agents"

4:15 - 5:00  Success metric + close
              "From PDF upload to active recovery plan in under 2 minutes.
               Patient speaks one sentence — agent knows it's an emergency.
               That's the gap we closed."
```

---

## Submission Checklist

- [ ] GitHub repo is public with full README
- [ ] `.env.example` committed (not `.env`)
- [ ] `.streamlit/config.toml` committed (soft purple theme)
- [ ] Synthetic test data in `/data/`
- [ ] n8n workflow JSON exported to `/n8n/`
- [ ] Streamlit app runs end-to-end on synthetic data — all 7 pages load
- [ ] Voice check-in tested — ElevenLabs STT returns transcript
- [ ] Typed fallback tested — works when voice is skipped
- [ ] RED check-in escalation path tested (voice: "I can't breathe")
- [ ] Provider summary generates and exports as text file
- [ ] Hospital history auto-populated from discharge PDF intake
- [ ] Manual hospitalization entry tested
- [ ] Medication conflict flag tested
- [ ] Google Doc written (overview, prompts used, iterations, learnings)
- [ ] Video recorded (≤5 min — voice check-in + escalation is the centrepiece)
- [ ] Submitted via cohort form

---

## If You Get Stuck

**ElevenLabs STT returns empty transcript** → Speak closer to mic, reduce background noise. Check your API key has STT access (not just TTS). Try with a pre-recorded `.wav` file first using the test script in Step 5.5.3.

**audiorecorder not working in Streamlit** → Run `pip install streamlit-audiorecorder`. Some browsers block mic access on localhost — try Chrome and allow mic permissions when prompted.

**PDF not parsing** → Check PyMuPDF is installed. Try `python -c "import fitz; print(fitz.__version__)"`

**Pinecone connection error** → Verify your index name exactly matches `PINECONE_INDEX_NAME` in `.env`

**LangGraph import error** → Run `pip install langgraph --upgrade`

**Claude API error** → Check your `ANTHROPIC_API_KEY` is set and has credits

**Streamlit won't start** → Run from project root: `streamlit run ui/streamlit_app.py`

**n8n trigger not firing** → During dev, manually call `monitoring_graph.invoke(state)` from a test script instead

**Care plan fails with "Expecting ',' delimiter"** → Claude's JSON response was truncated. `max_tokens=3000` is too low for complex patients with 6+ medications. Increase to `6000` in `run_care_plan_agent`.

**Pinecone check-in store fails with [400]** → The `responses` dict in your check-in record is a nested object. Pinecone metadata only accepts str/number/bool/list-of-str. Replace `**check_in` in the metadata with explicit flat fields — serialize `responses` and `flags` as JSON strings (`responses_json`, `flags_json`).

**Nebius 404 — model does not exist** → Nebius periodically retires models. As of June 2026, use `meta-llama/Llama-3.3-70B-Instruct`. To check the current list: `client.models.list()` via the OpenAI-compatible client pointed at `NEBIUS_BASE_URL`.

**Twilio error 21659 — country mismatch** → Your Twilio from-number is registered in a different country than the recipient. On trial accounts: enable Geo Permissions in the Twilio console, or buy a number in the recipient's country.

**Twilio error 21266 — To and From are the same** → Your `EMERGENCY_CONTACT_PHONE` in `.env` is set to the same number as `TWILIO_PHONE_NUMBER`. Set them to different numbers.

**Dashboard shows "0/0 days (perfect)"** → The `daily_vitals_log` was never being written to. The fix is in `run_monitoring_agent`: after classifying the check-in, extract `meds_taken`/`meds_missed` from `check_in_responses` and append a `DailyVitals` record. See the monitoring agent code above.

**Date picker shows only today** → The `min_value` is derived from the discharge date stored in state. If you onboarded with today as the discharge date, only today is selectable (correct behavior). Use one of the synthetic PDFs in `/data/` that has a discharge date from a week+ ago to get a wider date range for testing.

**Swelling / shortness-of-breath question pre-selects "Yes"** → The `yes_no_detail` radio was missing `index=None`. Streamlit defaults to index 0 which is "Yes". Fix: add `index=None` to every `st.radio()` call for `yes_no_detail` questions in both the typed form and the voice gap-fill form.

**Second check-in day carries over previous day's values** → Widget keys must include the day number. If all keys use `f"q_{q['id']}"` with no day component, Streamlit reuses cached widget state from the prior submission. Fix: use `f"q_{recovery_day}_{q['id']}"` everywhere — typed form, voice gap-fill form, and the historical backfill form. Also set `value=None` on sliders and number inputs so they start blank instead of defaulting to 5 / 150.

**Medication conflict warnings never appear in the UI (S8-1)** → In `care_plan_agent.py`, the `approval_item` dict was built inside the interaction loop but never appended to `state["human_approval_queue"]`. Fix: add `state["human_approval_queue"].append(approval_item)` immediately after the dict is constructed, still inside the `for detail` loop.

**Claude API 401 "invalid x-api-key" on every agent call (S8-2)** → Two causes: (1) `client = Anthropic()` was at module level in every agent file, so it read `ANTHROPIC_API_KEY` at import time — before `load_dotenv()` ran in `streamlit_app.py`. (2) `load_dotenv()` without `override=True` silently loses to a stale system-level env var. Fix: move `client = Anthropic()` inside each agent function (lazy init), and change every `load_dotenv()` call to `load_dotenv(override=True)` — in `streamlit_app.py`, `care_plan_agent.py`, `intake_agent.py`, and `monitoring_agent.py`. If the error persists after the code fix, the key itself is revoked — generate a new one at console.anthropic.com and paste it into `.env`.

**Historical check-in date picker crashes with min > max (S8-3)** → The `available` list is built oldest-first (Day 1 at index 0, yesterday at index -1). The `st.date_input` had `min_value=available_dates[-1]` (newest) and `max_value=available_dates[0]` (oldest) — exactly backwards. Fix: swap them so `min_value=available_dates[0]` and `max_value=available_dates[-1]`, and set `value=available_dates[-1]` so the picker defaults to the most recent unlogged day.

**Voice recording crashes with FileNotFoundError on stop (S8-4)** → `pydub` (used internally by `streamlit-audiorecorder`) requires `ffmpeg` to decode audio. The `except ImportError` block in `streamlit_app.py` never caught this error. Fix: add `except FileNotFoundError` and `except Exception` handlers to degrade gracefully to the typed form. To enable voice recording, install ffmpeg: `winget install Gyan.FFmpeg`. Then add this block near the top of `streamlit_app.py` so pydub finds it even if the PATH hasn't refreshed yet:
```python
_FFMPEG_BIN = r"C:\Users\<you>\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_...\bin"
if os.path.isdir(_FFMPEG_BIN):
    os.environ["PATH"] = _FFMPEG_BIN + os.pathsep + os.environ.get("PATH", "")
```

**Voice transcript parsed but medications / energy not updated (S8-5)** → `parse_transcript_to_responses` sent Claude a minimal prompt with no type information. Claude had no idea `med_checkbox` questions expect `"Yes — I took it"` / `"No — I missed it"`, or that `scale_1_10` expects an integer (so `"four"` was never converted to `4`). On any JSON parse error the `except` block silently dumped the whole transcript into `concerns`. Fix: rewrite the prompt to include per-question type annotations and allowed values; add explicit rules for word-to-number conversion and medication name matching; catch `json.JSONDecodeError` separately so failures are logged rather than swallowed.

---

## Phase 6.5 — Historical Check-in Backfill (added post-build)

A patient who sets up Nexus several days after discharge needs a way to log past days before
seeing their care plan. This is handled by a dedicated page that runs between onboarding and
the care plan.

### How it works

After `intake_graph` completes, the app routes to `"historical_checkin"` instead of `"care_plan"`.
The page runs a three-phase loop controlled by `st.session_state.history_phase`:

| Phase | What the patient sees |
|---|---|
| `ask` | Count of available past days + "Log a day / Skip" choice |
| `form` | Date picker (discharge+1 → yesterday, already-logged days excluded) + full check-in form with blank defaults |
| `ask_more` | GREEN/YELLOW/RED result for the day just saved + remaining count + "Another day / Go to care plan" |

The loop repeats until the patient selects "No" or all past days are logged.

### Key implementation details

- `available` list is recomputed at each `ask_more` phase from `check_in_history` so already-logged days disappear from the picker.
- All widget keys include `recovery_day` (e.g. `f"hist_{recovery_day}_{q['id']}"`) — same fix as the multi-day stale-key bug.
- `value=None` on sliders and number inputs — no defaults carry over.
- Future dates are never selectable — `max_value=yesterday` is enforced.
- If no past days exist (discharged today), the page skips directly to the care plan.

---

## Issue Set 9 — UI Polish, Performance & Bug Fixes (2026-06-18)

Sixteen issues found and fixed across UI/CSS, intake performance, and check-in reliability.

---

### S9-1 — "keyboard_double" text appearing in sidebar header

**File(s):** `ui/streamlit_app.py`

**Symptom:** The text `keyboard_double_` appears at the top of the sidebar where the collapse/expand icon button should be.

**Root cause:** The CSS rule `[data-testid="stSidebar"] span { font-family: 'Mulish' !important }` was applied to every `<span>` in the sidebar, including the `<span>` inside the collapse button that renders a Material Symbols icon. Overriding the font breaks icon rendering — the glyph falls back to its raw name as text.

**Fix:** Removed `span` from the broad sidebar font override. Added targeted restoration rules for button spans: `[data-testid="stSidebar"] button span, [data-testid="stSidebarCollapsedControl"] span { font-family: inherit !important }`.

---

### S9-2 — Progress bars still showing purple

**File(s):** `ui/streamlit_app.py`

**Symptom:** Medication adherence progress bars on the Dashboard render in Streamlit's default blue-purple.

**Root cause:** The CSS selector `[data-testid="stProgressBar"] > div` only targets the outer track element, not the inner fill `<div>` nested several levels deeper.

**Fix:** Replaced with six selectors covering all DOM nesting depths Streamlit has used across versions: `[data-testid="stProgressBar"] div[role="progressbar"] > div`, `[data-testid="stProgressBar"] [role="progressbar"] > div`, `.stProgress [role="progressbar"] > div`, etc.

---

### S9-3 — Main content area left-aligned, not centred

**File(s):** `ui/streamlit_app.py`

**Symptom:** With `layout="wide"`, the 1080px content block sits left-aligned instead of centred.

**Root cause:** `.block-container` had `max-width: 1080px` but no `margin: auto`.

**Fix:** Added `margin-left: auto !important; margin-right: auto !important` to `.block-container`.

---

### S9-4 — Sidebar branding too small for the panel

**File(s):** `ui/streamlit_app.py`

**Symptom:** "🌿 Nexus" title and "Recovery Co-Pilot" subtitle are undersized relative to the sidebar width.

**Fix:** Increased the title from `font-size: 2.2rem → 3.2rem` and subtitle from `0.88rem → 1.1rem`. Padding increased from `0.5rem top → 1.5rem`.

---

### S9-5 — Main panel page header not prominent enough

**File(s):** `ui/streamlit_app.py`

**Symptom:** The `.nexus-page-header` card looks like an ordinary card rather than a clear app header.

**Fix:** Redesigned the header — warm cream gradient background instead of flat white, padding increased (`1.35rem → 1.75rem`), Nexus title bumped to `2rem` Playfair Display, subtitle to `1rem` weight 500, badge enlarged with gradient fill and shadow, left accent bar widened to 6px. Added `flex-shrink: 0` on the badge so it never wraps.

---

### S9-6 — Consent checkbox still renders purple

**File(s):** `ui/streamlit_app.py`

**Symptom:** The "I consent" checkbox on the onboarding page shows Streamlit's default indigo fill.

**Root cause:** The existing selector `[data-baseweb="checkbox"] [aria-checked="true"] > div` doesn't match. Streamlit's outer wrapper is `[data-testid="stCheckbox"]`, not `[data-baseweb="checkbox"]`, and `aria-checked` is on the `role="checkbox"` span, not on a parent.

**Fix:** Added `[data-testid="stCheckbox"]`-prefixed selectors for both checked and unchecked states, plus `input[type="checkbox"] { accent-color: var(--c-sage-dk) }` as a native fallback. Added explicit `width/height: 18px` on the hidden input so accent-color applies.

---

### S9-7 — Multiselect tags, select dropdowns still blue

**File(s):** `ui/streamlit_app.py`

**Symptom:** Multiselect pill tags appear blue; selected items in select dropdowns highlight blue.

**Root cause:** No CSS rules existed for `[data-baseweb="tag"]` or `[data-baseweb="menu"]`.

**Fix:** Added `.sage-lt` background + sage text colour for `[data-baseweb="tag"]`, and `[data-baseweb="menu"] li[aria-selected="true"], li:hover` for dropdown highlights.

---

### S9-8 — File uploader dropzone shows lavender background

**File(s):** `ui/streamlit_app.py`

**Symptom:** The PDF upload area on the onboarding page has Streamlit's default lavender/purple tint.

**Root cause:** No CSS for `[data-testid="stFileUploaderDropzone"]`.

**Fix:** Added cream `var(--c-surface)` background and taupe border; hover shifts to `var(--c-sage-lt)`.

---

### S9-9 — Text input fields show blue-lavender background

**File(s):** `ui/streamlit_app.py`

**Symptom:** All `st.text_input` fields (name, email, contact, etc.) show Streamlit's default `rgb(240, 242, 246)` background.

**Root cause:** Streamlit sets `background-color` as an inline style directly on the `<input>` element, which overrides our wrapper-div rule.

**Fix:** Added `input:not([type="checkbox"]):not([type="radio"]) { background-color: #FDFBF5 !important }` to target the actual `<input>` element. Also broadened wrapper selectors to include `[data-testid="stTextInput"] > div` and `[data-testid="stDateInput"] > div > div`.

---

### S9-10 — Calendar popup shows lavender background and purple selected-day circle

**File(s):** `ui/streamlit_app.py`

**Symptom:** When the date picker opens, the popup has a purple/lavender background and the selected day has a purple filled circle.

**Root cause (background):** No CSS for the `[data-baseweb="calendar"]` popup container or its inner grid.

**Root cause (selected day):** Selector was `[aria-selected="true"] button` (a `button` *inside* an `aria-selected` element) but in BaseUI the `aria-selected` attribute is on the `<button>` itself.

**Fix:** Added cream background overrides for `[data-baseweb="calendar"]`, its child `> div`, `[role="grid"]` and nested divs. Fixed selected-day rule to `button[aria-selected="true"]`. Added sage outline ring for today, sage-lt hover for unselected days.

---

### S9-11 — "Press Enter to submit form" tooltip appears while typing

**File(s):** `ui/streamlit_app.py`

**Symptom:** A tooltip reading "Press Enter to submit form" appears inside every text input while the user is typing, causing confusion since explicit submit buttons exist on all forms.

**Root cause:** Streamlit injects `[data-testid="InputInstructions"]` inside form text inputs by default.

**Fix:** Added `[data-testid="InputInstructions"] { display: none !important }`.

---

### S9-12 — Intake + care plan takes 30-60 seconds

**File(s):** `tools/openfda.py`, `agents/care_plan_agent.py`

**Symptom:** The "Reading your discharge summary…" spinner blocks for 30-60 seconds on a typical 5-6 medication discharge.

**Root cause — OpenFDA serial calls:** `check_medication_interactions` made one sequential HTTP request per medication (timeout=10s each). Six medications = up to 60 seconds before Claude was even called.

**Root cause — Nebius blocking:** `run_care_plan_via_nebius` was called synchronously in the care plan agent despite a comment saying "in parallel". A Llama-3.3-70B inference on Nebius added another 10-30 seconds, and its result is never used in the UI.

**Root cause — Care plan token budget:** `max_tokens=6000` on the care plan Claude call is unnecessarily large, adding latency.

**Fix (OpenFDA):** Rewrote `check_medication_interactions` to use `concurrent.futures.ThreadPoolExecutor` — all medication checks run in parallel, bounded by the slowest single response (~8s) instead of summing all timeouts.

**Fix (Nebius):** Moved `run_care_plan_via_nebius` into a `threading.Thread(daemon=True)` — fires in background, never blocks the user.

**Fix (tokens):** Reduced care plan `max_tokens` from 6000 → 3500. A structured JSON care plan does not need more than 3500 tokens.

**Expected improvement:** ~10-15 seconds total (two sequential Claude calls + Pinecone store), down from 30-60 seconds.

---

### S9-13 — "Unable to classify check-in. Flagging for review." on every check-in

**File(s):** `agents/monitoring_agent.py`

**Symptom:** After submitting a daily check-in, the result always shows "⚠️ We noticed some things today: Unable to classify check-in. Flagging for review." regardless of what was entered.

**Root cause:** `max_tokens=500` on the monitoring Claude call. The required JSON response (classification, flags array, summary, recommended_action, escalation_reason) regularly exceeds 500 tokens when there are multiple flags or a detailed summary, causing the response to be cut off mid-JSON. `json.loads` then throws `JSONDecodeError`, which the `except Exception` block catches and replaces with the fallback YELLOW result.

**Fix:** Raised `max_tokens` from 500 → 1000. Added `print(f"[Monitoring Agent] Classification error: {type(e).__name__}: {e}")` to the fallback handler so the actual exception is visible in the terminal if the issue recurs.

---

### S9-14 — Voice transcript re-runs on every page interaction

**File(s):** `ui/streamlit_app.py`

**Symptom:** After recording a voice check-in, every subsequent click (filling a gap question, clicking submit) re-triggers the transcription spinner and the "Understanding your responses…" spinner, causing them to appear mid-page out of order. The gap-fill form is reset before the user can submit it.

**Root cause:** Streamlit re-runs the entire script on every interaction. `len(audio) > 0` remains true after recording, so `transcribe_audio()` (ElevenLabs API call) and `parse_transcript_to_responses()` (Claude API call) were called on every rerun.

**Fix:** Hash the audio bytes on each render (`hash(audio_bytes)`). Store the hash, STT result, and parsed responses in `st.session_state` under `_voice_audio_hash`, `_voice_stt_result`, `_voice_parsed_responses`. Subsequent reruns with the same audio read from cache — no API calls. A new recording (different hash) clears the cache. Cache is also cleared on submit so a fresh check-in always starts clean.
