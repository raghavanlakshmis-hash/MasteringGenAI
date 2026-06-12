"""
Rare Disease Workup Assistant
A Streamlit frontend for the n8n RAG backend.
"""

import streamlit as st
import requests

# ============================================================
# Page configuration
# ============================================================
st.set_page_config(
    page_title="Rare Disease Workup",
    page_icon="🧬",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ============================================================
# Custom styles
# ============================================================
st.markdown(
    """
    <style>
    .phenotype-chip {
        display: inline-block;
        background-color: #eff6ff;
        color: #2563eb;
        padding: 4px 12px;
        margin: 4px 4px 4px 0;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 500;
    }
    .citation-card {
        background: #fafafa;
        border-left: 3px solid #2563eb;
        padding: 12px 16px;
        margin: 8px 0;
        font-size: 13px;
        border-radius: 4px;
    }
    .citation-id {
        font-family: ui-monospace, "SF Mono", monospace;
        background: #f3f4f6;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
        margin-right: 8px;
    }
    .small-muted {
        color: #6b7280;
        font-size: 13px;
    }
    .stButton button {
        font-weight: 500;
    }
    .stApp {
        background-color: #f5f8ff !important;
    }
    [data-testid="stSidebar"] {
        background-color: #dce8ff !important;
    }
    .block-container {
        padding-top: 1rem !important;
    }
    .page-header {
        background-color: #c7dcff;
        border: 1.5px solid #93b8f5;
        border-radius: 8px;
        padding: 28px 36px 22px 36px;
        margin-bottom: 24px;
    }
    .page-header h1 {
        font-size: 3.2rem !important;
        font-weight: 800 !important;
        letter-spacing: -0.02em;
        color: #1e3a8a !important;
        margin: 0 0 6px 0;
        padding: 0;
    }
    .page-header p {
        color: #2d5299;
        font-size: 15px;
        margin: 0;
        font-style: italic;
    }
    .sidebar-stat {
        font-size: 28px;
        font-weight: 700;
        color: #2563eb;
        line-height: 1.1;
    }
    .sidebar-stat-label {
        font-size: 12px;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 16px;
    }
    .stack-row {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 6px 0;
        border-bottom: 1px solid #f3f4f6;
        font-size: 13px;
    }
    .stack-role {
        color: #6b7280;
        min-width: 72px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding-top: 1px;
    }
    .stack-tool {
        color: #111827;
        font-weight: 500;
    }
    .disclaimer-box {
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 6px;
        padding: 12px 14px;
        margin-top: 8px;
    }
    .disclaimer-box p {
        color: #1e40af;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.5;
        margin: 0;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# ============================================================
# Example cases
# ============================================================
EXAMPLES = {
    "Pediatric growth": (
        "6-year-old boy with intellectual disability, distinctive facial "
        "features (high forehead, broad nasal bridge), tall stature with "
        "accelerated growth, large head circumference, and history of fragile "
        "bones with multiple fractures. Mother reports the boy was always "
        "larger than peers from infancy. Mild learning difficulties noted in "
        "school."
    ),
    "Adult neurological": (
        "42-year-old woman with progressive cerebellar ataxia over 5 years, "
        "dysarthria, intention tremor, and worsening balance. Family history "
        "of similar symptoms in mother (onset age 38) and maternal "
        "grandfather. MRI shows cerebellar atrophy. No metabolic "
        "abnormalities on routine labs."
    ),
    "Pediatric neuromuscular": (
        "A 4-year-old boy is referred for evaluation of difficulty climbing "
        "stairs and frequent falls. His parents report that he was late to "
        "walk (18 months) and seems clumsier than his peers. On examination, "
        "he uses his hands to push himself up from the floor by climbing up "
        "his thighs. He has pseudohypertrophy of the calves bilaterally and "
        "a waddling gait. Deep tendon reflexes are diminished. Laboratory "
        "studies show a serum creatine kinase of 18,500 U/L (normal <200). "
        "His maternal uncle died at age 22 of a similar progressive weakness; "
        "his mother has no symptoms."
    ),
    "Common (negative control)": (
        "58-year-old man with worsening exertional shortness of breath over "
        "3 months, productive cough, 10-pack-year smoking history. Wheezing "
        "on exam. No family history of genetic disease."
    ),
}

# ============================================================
# Sidebar
# ============================================================
with st.sidebar:
    st.markdown("## Rare Disease Workup")
    st.caption("AI-assisted differential diagnosis for primary care")

    st.divider()

    # Key stats
    st.markdown(
        """
        <div>
            <div class="sidebar-stat">4–5 yrs</div>
            <div class="sidebar-stat-label">average time to diagnosis — often up to 20+ years in primary immunodeficiency</div>
            <div class="sidebar-stat">7,000+</div>
            <div class="sidebar-stat-label">known rare diseases — most with no approved treatment</div>
            <div class="sidebar-stat">300M+</div>
            <div class="sidebar-stat-label">people affected globally</div>
            <div class="sidebar-stat">1 GP + 3</div>
            <div class="sidebar-stat-label">specialists consulted before diagnosis (median)</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.divider()

    # Stack
    st.markdown("**How it works**")
    st.markdown(
        """
        <div>
            <div class="stack-row">
                <span class="stack-role">Corpus</span>
                <span class="stack-tool">MedlinePlus Genetics (NIH)</span>
            </div>
            <div class="stack-row">
                <span class="stack-role">Embed</span>
                <span class="stack-tool">Qwen3-Embedding-8B · Nebius</span>
            </div>
            <div class="stack-row">
                <span class="stack-role">Retrieve</span>
                <span class="stack-tool">Qdrant hybrid (BM25 + dense, RRF)</span>
            </div>
            <div class="stack-row">
                <span class="stack-role">Rerank</span>
                <span class="stack-tool">Cohere rerank-v3.5</span>
            </div>
            <div class="stack-row">
                <span class="stack-role">Extract</span>
                <span class="stack-tool">Llama-3.3-70B HPO expansion</span>
            </div>
            <div class="stack-row">
                <span class="stack-role">Synthesize</span>
                <span class="stack-tool">Claude Sonnet 4.6</span>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


# ============================================================
# Header
# ============================================================
st.markdown(
    """
    <div class="page-header">
        <h1>🧬 Rare Disease Workup</h1>
        <p>Evidence-graded differential diagnosis for primary care &nbsp;&middot;&nbsp; Cited from MedlinePlus Genetics</p>
    </div>
    """,
    unsafe_allow_html=True,
)
st.markdown(
    """
    <div class="disclaimer-box">
        <p>⚠️ <strong style="font-size:15px; color:#dc2626; text-decoration:underline;">Disclaimer:</strong>
        This is <strong>decision support, not diagnosis.</strong>
        All recommendations require clinician judgment.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

# ============================================================
# Input area
# ============================================================
# Example picker — writes directly into the widget key so the text area updates
st.markdown("**Try an example case:**")
ex_cols = st.columns(len(EXAMPLES))
for col, (label, text) in zip(ex_cols, EXAMPLES.items()):
    with col:
        if st.button(label, use_container_width=True):
            st.session_state["case_input"] = text

case_text = st.text_area(
    "Patient case description",
    height=180,
    placeholder=(
        "Describe the patient: age, sex, presenting symptoms, family "
        "history, course..."
    ),
    key="case_input",
)

submit = st.button(
    "🔍 Analyze Case",
    type="primary",
    disabled=not case_text.strip(),
)

# ============================================================
# Backend call
# ============================================================
if submit:
    webhook_url = st.secrets.get("WEBHOOK_URL", "")
    if not webhook_url:
        st.error(
            "WEBHOOK_URL is not configured. Set it in "
            "`.streamlit/secrets.toml` for local dev, or under "
            "Settings → Secrets in Streamlit Cloud."
        )
        st.stop()

    with st.spinner(
        "Running pipeline: phenotype extraction → hybrid retrieval → "
        "reranking → synthesis. This takes 20–60 seconds..."
    ):
        try:
            resp = requests.post(
                webhook_url,
                json={"patient_description": case_text},
                timeout=180,
            )
            resp.raise_for_status()
            data = resp.json()
        except requests.exceptions.Timeout:
            st.error(
                "⏱ Request timed out after 180 seconds. "
                "Check that the n8n workflow completed in the execution log."
            )
            st.stop()
        except requests.exceptions.ConnectionError as e:
            st.error(f"🔌 Could not connect to the n8n webhook: `{e}`")
            st.stop()
        except requests.exceptions.HTTPError as e:
            st.error(
                f"❌ n8n returned an error: HTTP {resp.status_code} — `{resp.text[:300]}`"
            )
            st.stop()
        except requests.exceptions.RequestException as e:
            st.error(f"❌ Request failed ({type(e).__name__}): `{e}`")
            st.stop()
        except ValueError:
            st.error(
                f"⚠️ Backend did not return valid JSON. "
                f"Raw response (first 300 chars): `{resp.text[:300]}`"
            )
            st.stop()

    # ----- Phenotypes -----
    phenotypes = data.get("phenotypes", [])
    if phenotypes:
        st.markdown("### Extracted phenotypes")
        chips = "".join(
            f'<span class="phenotype-chip">{p}</span>' for p in phenotypes
        )
        st.markdown(chips, unsafe_allow_html=True)

    # ----- HPO expanded terms -----
    expanded = data.get("expanded_terms", [])
    phenos = data.get("phenotypes", [])
    if expanded and len(expanded) > len(phenos):
        extras = [t for t in expanded if t not in phenos]
        with st.expander(f"+ {len(extras)} related terms used in retrieval"):
            st.markdown(", ".join(extras))

    # ----- Differential -----
    differential = data.get("differential", "")
    if differential:
        st.markdown("### Differential & recommendations")
        st.markdown(differential)
    else:
        st.warning("No differential returned. Check the n8n workflow logs.")

    # ----- Citations -----
    citations = data.get("citations", [])
    if citations:
        st.markdown("### Citations")
        for c in citations:
            st.markdown(
                f'<div class="citation-card">'
                f'<span class="citation-id">{c.get("id", "")}</span>'
                f'<strong>{c.get("disease", "")}</strong> :: '
                f'{c.get("section", "")} · '
                f'<a href="{c.get("source_url", "#")}" target="_blank">'
                f"view source</a>"
                f"</div>",
                unsafe_allow_html=True,
            )

# ============================================================
# How it works
# ============================================================
with st.expander("How it works (architecture)"):
    st.markdown(
        """
        **Ingestion pipeline** (one-time, n8n)
        1. Scrape MedlinePlus Genetics condition pages
        2. Parse into section-aware chunks with metadata headers
           (`{disease} :: {section}`)
        3. Embed each chunk with Qwen3-Embedding-8B (4096-dim)
        4. Upsert into Qdrant

        **Query pipeline** (per request, n8n)
        1. Extract structured phenotypes from free-text case
        2. Embed the phenotype query
        3. Hybrid retrieval from Qdrant (top-20)
        4. Cohere reranking (top-8)
        5. Claude synthesizes ranked differential with inline citations

        **Evaluation**: Tested on 30 cases — 10 published case reports from
        [PubMed Central](https://pmc.ncbi.nlm.nih.gov), 15 synthetic but
        clinically grounded cases, and 5 negative controls using common
        diseases to verify the system does not over-diagnose rare conditions.
        Metrics include Recall@5, MRR, faithfulness, and answer relevance,
        across four retrieval configurations: dense-only, dense with rerank,
        hybrid, and hybrid with rerank.

        See the GitHub repo for the full spec, eval results, and failure
        analysis.
        """
    )

# Footer
st.markdown("---")
st.markdown(
    '<p class="small-muted">'
    'Source on <a href="https://github.com/YOUR-USERNAME/rare-disease-rag" '
    'target="_blank">GitHub</a>.</p>',
    unsafe_allow_html=True,
)
