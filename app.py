"""
Cardio – AI-Powered Fitness Tracker
Python / Streamlit version
"""

import json
import math
import os
import random
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import Optional

import pandas as pd
import plotly.graph_objects as go
import streamlit as st
import streamlit.components.v1 as stc
from anthropic import Anthropic
from dotenv import load_dotenv

# Use explicit path so the key loads correctly regardless of working directory
load_dotenv(Path(__file__).resolve().parent / ".env")

# ─────────────────────────────────────────────────────────────────────────────
# Page config
# ─────────────────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Cardio · Fitness Companion",
    page_icon="🐦",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ─────────────────────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────────────────────
BASE       = Path(__file__).parent
DATA_DIR   = BASE / "data"
DATA_FILE  = DATA_DIR / "fitness_data.csv"
GOALS_FILE = DATA_DIR / "goals.json"

# ─────────────────────────────────────────────────────────────────────────────
# CSS
# ─────────────────────────────────────────────────────────────────────────────
def inject_css():
    st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    html, body, [class*="css"]  { font-family: 'Inter', sans-serif !important; }
    .stApp                       { background: #F0F4FF !important; }
    .main .block-container       { padding-top: 1rem !important;
                                   padding-left: 2rem !important;
                                   padding-right: 2rem !important;
                                   max-width: 100% !important; }
    [data-testid="stHeader"]     { background: transparent !important; }
    #MainMenu, footer            { visibility: hidden; }
    .stDeployButton              { display: none !important; }
    [data-testid="stSidebar"]    { display: none !important; }
    [data-testid="collapsedControl"] { display: none !important; }

    .card {
        background: white;
        border-radius: 20px;
        padding: 18px 22px;
        margin-bottom: 14px;
        box-shadow: 0 2px 14px rgba(79,117,255,0.07);
    }
    .card-blue {
        background: linear-gradient(135deg, #4F75FF 0%, #3B5FE0 100%);
        border-radius: 20px;
        padding: 18px 22px;
        margin-bottom: 14px;
        color: white;
    }
    .metric-hero  { font-size: 2.4rem; font-weight: 700; color: #1E293B; line-height: 1; }
    .metric-label {
        font-size: 0.70rem; font-weight: 600; color: #94A3B8;
        text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px;
    }
    .badge         { display:inline-block; padding:3px 10px; border-radius:99px;
                     font-size:0.70rem; font-weight:600; }
    .badge-green   { background:#DCFCE7; color:#16A34A; }
    .badge-blue    { background:#DBEAFE; color:#2563EB; }
    .badge-yellow  { background:#FEF9C3; color:#CA8A04; }
    .badge-gray    { background:#F1F5F9; color:#64748B; }
    .badge-red     { background:#FEE2E2; color:#DC2626; }

    /* Tab strip */
    .stTabs [data-baseweb="tab-list"] { gap:6px; background:transparent; }
    .stTabs [data-baseweb="tab"]      {
        background:white; border-radius:14px; border:none;
        color:#64748B; font-weight:600; font-size:0.78rem; padding:8px 14px;
    }
    .stTabs [aria-selected="true"]    { background:#4F75FF !important; color:white !important; }
    .stTabs [data-baseweb="tab-border"] { display:none; }

    /* Form submit button */
    div[data-testid="stFormSubmitButton"] > button {
        background:#4F75FF; color:white; border-radius:14px;
        border:none; font-weight:600; width:100%; padding:12px;
        font-size:0.9rem;
    }
    div[data-testid="stFormSubmitButton"] > button:hover { background:#3B5FE0; }

    /* Streamlit metric tweak */
    [data-testid="stMetric"] { background:white; border-radius:14px; padding:12px 16px; }

    /* Progress bar color */
    .stProgress > div > div > div > div { background-color: #4F75FF; }
    </style>
    """, unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# Data helpers
# ─────────────────────────────────────────────────────────────────────────────
def load_data() -> pd.DataFrame:
    if DATA_FILE.exists():
        df = pd.read_csv(DATA_FILE)
        df["date"] = pd.to_datetime(df["date"])
        return df.sort_values("date").reset_index(drop=True)
    return pd.DataFrame(columns=["date", "weight", "move", "exercise", "stand", "sleep"])


def save_data(df: pd.DataFrame):
    DATA_DIR.mkdir(exist_ok=True)
    df.to_csv(DATA_FILE, index=False)


def load_goals() -> Optional[dict]:
    if GOALS_FILE.exists():
        with open(GOALS_FILE) as f:
            return json.load(f)
    return None


def save_goals(goals: dict):
    DATA_DIR.mkdir(exist_ok=True)
    with open(GOALS_FILE, "w") as f:
        json.dump(goals, f)


def upsert_entry(df: pd.DataFrame, entry: dict) -> pd.DataFrame:
    entry_date = pd.to_datetime(entry["date"])
    df = df[df["date"] != entry_date].copy()
    df = pd.concat([df, pd.DataFrame([{**entry, "date": entry_date}])], ignore_index=True)
    return df.sort_values("date").reset_index(drop=True)


# ─────────────────────────────────────────────────────────────────────────────
# Mood engine
# ─────────────────────────────────────────────────────────────────────────────
def calc_mood(df: pd.DataFrame, goals: dict) -> str:
    """
    Count days in the last 7 where BOTH Move AND Exercise goals were met.
    Averages are misleading — one great day can mask 6 lazy ones.
    great   : 5+ / 7 days hit both goals
    okay    : 3-4 / 7 days
    notgreat: 0-2 / 7 days
    """
    if df.empty:
        return "okay"
    r = df.tail(7)
    hit = sum(
        1 for _, row in r.iterrows()
        if row["move"] >= goals["moveGoal"] and row["exercise"] >= goals["exerciseGoal"]
    )
    ratio = hit / len(r)
    if ratio >= 5 / 7:   # 5 or more days
        return "great"
    if ratio >= 3 / 7:   # 3 or 4 days
        return "okay"
    return "notgreat"


def mood_message(mood: str, name: str) -> str:
    first = name.split()[0]
    pool = {
        "great": [
            f"You're CRUSHING it, {first}! 🔥 5+ goal days this week — keep it up!",
            f"On FIRE, {first}! You hit your Move & Exercise goals most days this week!",
        ],
        "okay": [
            f"Decent week, {first} — but there's room to push harder. Let's go! 💪",
            f"You're showing up, {first}! A few more goal days and we're in the zone.",
        ],
        "notgreat": [
            f"I see you slacking, {first} 😅 — less than 3 goal days this week. Time to get moving!",
            f"Rough week, {first}? No worries. One good workout today changes the whole vibe.",
        ],
    }
    return random.choice(pool[mood])


def health_score(df: pd.DataFrame, goals: dict) -> int:
    if df.empty:
        return 0
    r = df.tail(30)
    # Move (30 pts) + Exercise (30 pts) — stand is bonus, capped at 20 pts total for activity
    move_score = min(r["move"].mean()     / goals["moveGoal"], 1) * 30
    ex_score   = min(r["exercise"].mean() / goals["exerciseGoal"], 1) * 30
    # Sleep: 20 pts, best when 7-9 hrs
    slp_score  = max(0, 1 - abs(r["sleep"].mean() - 8) / 4) * 20
    # Weight trend: 20 pts — reward moving toward goal, penalise moving away
    wt_now   = df["weight"].iloc[-1]
    wt_start = df["weight"].iloc[0]
    wt_goal  = goals["goalWeight"]
    if abs(wt_start - wt_goal) < 0.5:          # already at goal
        wt_score = 20.0
    else:
        progress = (wt_start - wt_now) / (wt_start - wt_goal)  # 1.0 = reached goal
        wt_score = max(0, min(progress, 1)) * 20
    return round(move_score + ex_score + slp_score + wt_score)


# ─────────────────────────────────────────────────────────────────────────────
# Cardio SVG mascot
# ─────────────────────────────────────────────────────────────────────────────
def cardio_svg(mood: str = "okay", size: int = 160) -> str:
    g = mood == "great"
    n = mood == "notgreat"

    wl = -6 if n else (24 if g else 15)
    wr =  6 if n else (-24 if g else -15)

    sparkles = (
        '<text x="4"   y="65"  font-size="22" fill="#FFD700" opacity="0.95">✦</text>'
        '<text x="164" y="52"  font-size="17" fill="#22C55E" opacity="0.95">✦</text>'
        '<text x="174" y="88"  font-size="13" fill="#FFD700">★</text>'
        '<text x="1"   y="100" font-size="13" fill="#22C55E">★</text>'
    ) if g else ""

    trophy = """
    <g transform="translate(151 112) scale(0.70)">
      <path d="M5 0h30v28Q35 46,20 52Q5 46,5 28Z" fill="#FFD700"/>
      <path d="M9 4 Q18 2 22 7" fill="none" stroke="white" stroke-width="1.8"
            stroke-linecap="round" opacity="0.75"/>
      <path d="M5 7 Q-7 14,-5 27 Q-1 35,5 31"  fill="#FFD700"/>
      <path d="M35 7 Q47 14,45 27 Q41 35,35 31" fill="#FFD700"/>
      <rect x="14" y="52" width="12" height="14" fill="#FFD700"/>
      <rect x="8"  y="66" width="24" height="5"  fill="#FFD700"/>
      <circle cx="20" cy="23" r="10" fill="#FFCC00"/>
      <text x="15" y="28" font-size="12" fill="#9A6800">★</text>
    </g>""" if g else ""

    brows = (
        '<path d="M71 62 Q82 57 93 62" stroke="#8B1010" stroke-width="3.2" fill="none" stroke-linecap="round"/>'
        '<path d="M107 62 Q118 57 129 62" stroke="#8B1010" stroke-width="3.2" fill="none" stroke-linecap="round"/>'
    ) if n else (
        '<path d="M71 59 Q82 53 93 59" stroke="#8B1010" stroke-width="3.2" fill="none" stroke-linecap="round"/>'
        '<path d="M107 62 Q118 58 129 62" stroke="#8B1010" stroke-width="3.2" fill="none" stroke-linecap="round"/>'
    )

    if n:
        mouth = '<path d="M83 116 Q100 107 117 116" stroke="#8B1010" stroke-width="2.8" fill="none" stroke-linecap="round"/>'
        tear  = '<path d="M123 88 Q127 98 123 102 Q119 98 123 88 Z" fill="#60A5FA" opacity="0.90"/>'
    elif g:
        mouth = '<path d="M83 107 Q100 120 117 107" stroke="#8B1010" stroke-width="3" fill="none" stroke-linecap="round"/>'
        tear  = ""
    else:
        mouth = '<path d="M83 109 Q91 116 100 113 Q109 115 117 108" stroke="#8B1010" stroke-width="2.8" fill="none" stroke-linecap="round"/>'
        tear  = ""

    halo = '<ellipse cx="100" cy="120" rx="95" ry="110" fill="url(#gHalo)"/>' if g else ""
    ck   = 0.10 if n else 0.26

    svg = f"""<svg viewBox="0 0 200 262" width="{size}" height="{int(size*1.31)}"
     xmlns="http://www.w3.org/2000/svg"
     style="filter:drop-shadow(0 10px 22px rgba(150,20,10,0.30))">
  <defs>
    <radialGradient id="gBody" cx="36%" cy="26%" r="68%" fx="36%" fy="26%">
      <stop offset="0%"   stop-color="#FF6655"/><stop offset="28%" stop-color="#E03020"/>
      <stop offset="65%"  stop-color="#C02010"/><stop offset="100%" stop-color="#7A0A0A"/>
    </radialGradient>
    <radialGradient id="gWing" cx="38%" cy="22%" r="72%" fx="38%" fy="22%">
      <stop offset="0%"   stop-color="#E84040"/><stop offset="45%" stop-color="#C01818"/>
      <stop offset="100%" stop-color="#680808"/>
    </radialGradient>
    <linearGradient id="gHat" x1="18%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#484848"/><stop offset="35%" stop-color="#262626"/>
      <stop offset="100%" stop-color="#0A0A0A"/>
    </linearGradient>
    <radialGradient id="gBrim" cx="35%" cy="35%" r="70%">
      <stop offset="0%"   stop-color="#3A3A3A"/><stop offset="100%" stop-color="#101010"/>
    </radialGradient>
    <linearGradient id="gBeakU" x1="0%" y1="0%" x2="60%" y2="100%">
      <stop offset="0%"   stop-color="#FFBB22"/><stop offset="100%" stop-color="#DD6600"/>
    </linearGradient>
    <linearGradient id="gBeakL" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="#DD7700"/><stop offset="100%" stop-color="#993300"/>
    </linearGradient>
    <radialGradient id="gVest" cx="50%" cy="35%" r="65%">
      <stop offset="0%"   stop-color="#2E2E2E"/><stop offset="100%" stop-color="#0C0C0C"/>
    </radialGradient>
    <radialGradient id="gShoe" cx="30%" cy="28%" r="72%">
      <stop offset="0%"   stop-color="#404040"/><stop offset="100%" stop-color="#080808"/>
    </radialGradient>
    <radialGradient id="gEye" cx="38%" cy="36%" r="68%">
      <stop offset="0%"   stop-color="#FFFFFF"/><stop offset="100%" stop-color="#E4E4E4"/>
    </radialGradient>
    <radialGradient id="gHalo" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#FFD700" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#FFD700" stop-opacity="0"/>
    </radialGradient>
    <filter id="fShadow" x="-25%" y="-20%" width="150%" height="150%">
      <feDropShadow dx="3" dy="5" stdDeviation="6" flood-color="#6A0808" flood-opacity="0.40"/>
    </filter>
  </defs>

  <ellipse cx="100" cy="257" rx="52" ry="9" fill="rgba(0,0,0,0.18)"/>
  {halo}{sparkles}

  <!-- Wings -->
  <ellipse cx="26"  cy="166" rx="25" ry="58" fill="url(#gWing)" transform="rotate({wl} 26 166)"  filter="url(#fShadow)"/>
  <path d="M8 208 Q2 222 14 228 Q10 210 28 204 Z" fill="#8B0E0E" opacity="0.55" transform="rotate({wl} 26 166)"/>
  <ellipse cx="22"  cy="142" rx="10" ry="20" fill="white" opacity="0.10" transform="rotate({wl} 26 166)"/>
  <ellipse cx="174" cy="166" rx="25" ry="58" fill="url(#gWing)" transform="rotate({wr} 174 166)" filter="url(#fShadow)"/>
  <path d="M192 208 Q198 222 186 228 Q190 210 172 204 Z" fill="#8B0E0E" opacity="0.55" transform="rotate({wr} 174 166)"/>
  <ellipse cx="178" cy="142" rx="10" ry="20" fill="white" opacity="0.10" transform="rotate({wr} 174 166)"/>

  <!-- Body -->
  <ellipse cx="100" cy="170" rx="66" ry="69" fill="url(#gBody)" filter="url(#fShadow)"/>
  <ellipse cx="74"  cy="142" rx="30" ry="24" fill="white" opacity="0.22"/>
  <ellipse cx="70"  cy="138" rx="14" ry="10" fill="white" opacity="0.16"/>
  <ellipse cx="108" cy="202" rx="54" ry="34" fill="#5A0808" opacity="0.20"/>

  <!-- Vest -->
  <path d="M65 134 Q71 116 100 112 Q129 116 135 134 L142 204 Q133 226 100 228 Q67 226 58 204 Z" fill="url(#gVest)"/>
  <line x1="100" y1="114" x2="100" y2="226" stroke="rgba(255,255,255,0.055)" stroke-width="2"/>
  <rect x="88" y="192" width="24" height="16" rx="4" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="1.5"/>
  <path d="M65 134 Q71 116 100 112 Q129 116 135 134" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="3"/>

  <!-- Heart -->
  <path d="M100 154 C100 148,91 145,89 153 C87 160,94 168,100 174 C106 168,113 160,111 153 C109 145,100 148,100 154 Z" fill="#D62B1F"/>
  <path d="M96 153 C96 149,91 148,91 153" fill="none" stroke="rgba(255,180,180,0.55)" stroke-width="1.8" stroke-linecap="round"/>

  <!-- Neck + Head -->
  <ellipse cx="100" cy="116" rx="27" ry="19" fill="url(#gBody)"/>
  <circle  cx="100" cy="82"  r="45"          fill="url(#gBody)" filter="url(#fShadow)"/>
  <ellipse cx="80"  cy="62"  rx="22" ry="17" fill="white" opacity="0.22"/>
  <ellipse cx="76"  cy="58"  rx="10" ry="8"  fill="white" opacity="0.15"/>
  <ellipse cx="106" cy="106" rx="38" ry="14" fill="#5A0808" opacity="0.18"/>

  <!-- Crest -->
  <ellipse cx="86"  cy="12" rx="7.5" ry="17" fill="url(#gBody)" transform="rotate(-22 86 12)"/>
  <ellipse cx="100" cy="6"  rx="8.5" ry="19" fill="url(#gBody)"/>
  <ellipse cx="114" cy="12" rx="7.5" ry="17" fill="url(#gBody)" transform="rotate(22 114 12)"/>
  <ellipse cx="86"  cy="9"  rx="3"   ry="7"  fill="white" opacity="0.15" transform="rotate(-22 86 9)"/>
  <ellipse cx="100" cy="4"  rx="3.5" ry="8"  fill="white" opacity="0.15"/>
  <ellipse cx="114" cy="9"  rx="3"   ry="7"  fill="white" opacity="0.15" transform="rotate(22 114 9)"/>

  <!-- Hat -->
  <rect x="57" y="5" width="86" height="54" rx="7" fill="url(#gHat)"/>
  <rect x="57" y="5" width="17" height="54" rx="7" fill="white" opacity="0.07"/>
  <ellipse cx="76" cy="11" rx="20" ry="5.5" fill="white" opacity="0.13"/>
  <rect x="57" y="51" width="86" height="8" fill="#1C1C1C"/>
  <rect x="93" y="52" width="14" height="6" rx="2" fill="#2A2A2A" stroke="rgba(255,255,255,0.10)" stroke-width="0.8"/>
  <ellipse cx="100" cy="59" rx="50" ry="11" fill="url(#gBrim)"/>
  <ellipse cx="80"  cy="56" rx="26" ry="4.5" fill="white" opacity="0.11"/>
  <ellipse cx="104" cy="63" rx="42" ry="5"   fill="#080808" opacity="0.30"/>

  {trophy}

  <!-- Eyes -->
  <circle cx="82"  cy="77" r="15" fill="url(#gEye)"/>
  <circle cx="82"  cy="77" r="15" fill="none" stroke="rgba(0,0,0,0.10)" stroke-width="1.8"/>
  <circle cx="81"  cy="78" r="9.5" fill="#151515"/>
  <circle cx="81"  cy="78" r="9.5" fill="none" stroke="#3E2800" stroke-width="2.2" opacity="0.55"/>
  <circle cx="75"  cy="71" r="4"   fill="white"/>
  <circle cx="86"  cy="71" r="1.8" fill="white" opacity="0.75"/>

  <circle cx="118" cy="77" r="15" fill="url(#gEye)"/>
  <circle cx="118" cy="77" r="15" fill="none" stroke="rgba(0,0,0,0.10)" stroke-width="1.8"/>
  <circle cx="119" cy="78" r="9.5" fill="#151515"/>
  <circle cx="119" cy="78" r="9.5" fill="none" stroke="#3E2800" stroke-width="2.2" opacity="0.55"/>
  <circle cx="113" cy="71" r="4"   fill="white"/>
  <circle cx="124" cy="71" r="1.8" fill="white" opacity="0.75"/>

  {brows}

  <!-- Cheeks -->
  <circle cx="68"  cy="93" r="14" fill="#FF8080" opacity="{ck}"/>
  <circle cx="132" cy="93" r="14" fill="#FF8080" opacity="{ck}"/>

  <!-- Beak -->
  <path d="M89 87 L115 82 L114 92 Z" fill="url(#gBeakU)"/>
  <path d="M91 86 L111 83" fill="none" stroke="rgba(255,220,100,0.55)" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M89 92 L114 92 L111 100 Z" fill="url(#gBeakL)"/>

  {mouth}{tear}

  <!-- Legs -->
  <line x1="82"  y1="232" x2="74"  y2="248" stroke="#FF8800" stroke-width="8.5" stroke-linecap="round"/>
  <line x1="118" y1="232" x2="126" y2="248" stroke="#FF8800" stroke-width="8.5" stroke-linecap="round"/>

  <!-- Shoes -->
  <rect x="56"  y="247" width="34" height="7"  rx="3.5" fill="#DCDCDC"/>
  <rect x="56"  y="248" width="34" height="2"  rx="1"   fill="#BBBBBB"/>
  <rect x="58"  y="235" width="30" height="16" rx="8"   fill="url(#gShoe)"/>
  <rect x="68"  y="232" width="10" height="9"  rx="3"   fill="#2E2E2E"/>
  <ellipse cx="63"  cy="247" rx="9" ry="4" fill="white" opacity="0.14"/>
  <line x1="62"  y1="239" x2="84"  y2="239" stroke="#555" stroke-width="1.4"/>
  <line x1="62"  y1="243" x2="84"  y2="243" stroke="#555" stroke-width="0.9"/>

  <rect x="110" y="247" width="34" height="7"  rx="3.5" fill="#DCDCDC"/>
  <rect x="110" y="248" width="34" height="2"  rx="1"   fill="#BBBBBB"/>
  <rect x="112" y="235" width="30" height="16" rx="8"   fill="url(#gShoe)"/>
  <rect x="122" y="232" width="10" height="9"  rx="3"   fill="#2E2E2E"/>
  <ellipse cx="137" cy="247" rx="9" ry="4" fill="white" opacity="0.14"/>
  <line x1="116" y1="239" x2="138" y2="239" stroke="#555" stroke-width="1.4"/>
  <line x1="116" y1="243" x2="138" y2="243" stroke="#555" stroke-width="0.9"/>
</svg>"""
    # Make every gradient / filter ID unique so multiple SVGs on the same
    # page don't share IDs (which breaks Chrome's gradient resolution).
    p = uuid.uuid4().hex[:8]
    for _id in ["gBody","gWing","gHat","gBrim","gBeakU","gBeakL",
                "gVest","gShoe","gEye","gHalo","fShadow"]:
        svg = svg.replace(f'id="{_id}"',   f'id="{_id}{p}"')
        svg = svg.replace(f'url(#{_id})', f'url(#{_id}{p})')
    return f'<div style="display:flex;justify-content:center">{svg}</div>'


# ─────────────────────────────────────────────────────────────────────────────
# Activity rings (SVG)
# ─────────────────────────────────────────────────────────────────────────────
def show_mascot(mood: str = "okay", size: int = 160):
    """Render Cardio via an isolated iframe so SVG gradients are never stripped."""
    html = cardio_svg(mood, size)
    height = int(size * 1.35) + 12
    stc.html(html, height=height, scrolling=False)


def activity_rings_html(move, move_goal, ex, ex_goal, stand, stand_goal, size=170):
    def ring(cx, cy, r, pct, color, sw=13):
        c   = 2 * math.pi * r
        off = c * (1 - min(pct, 1))
        return (
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#EEF2FF" stroke-width="{sw}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{color}" stroke-width="{sw}"'
            f' stroke-linecap="round" stroke-dasharray="{c:.1f}" stroke-dashoffset="{off:.1f}"'
            f' transform="rotate(-90 {cx} {cy})"/>'
        )
    c = size // 2
    return (
        f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}">'
        + ring(c, c, int(c * 0.72), move / move_goal,   "#EF4444")
        + ring(c, c, int(c * 0.52), ex   / ex_goal,     "#22C55E")
        + ring(c, c, int(c * 0.33), stand / stand_goal, "#3B82F6")
        + f'</svg>'
        + f'<div style="display:flex;gap:14px;justify-content:center;font-size:11px;font-family:Inter;margin-top:6px">'
        + f'<span><span style="color:#EF4444">●</span> Move {int(move)}/{move_goal} cal</span>'
        + f'<span><span style="color:#22C55E">●</span> Exercise {int(ex)}/{ex_goal} min</span>'
        + f'<span><span style="color:#3B82F6">●</span> Stand {stand:.1f}/{stand_goal} hrs</span>'
        + '</div>'
    )


# ─────────────────────────────────────────────────────────────────────────────
# Chart helpers
# ─────────────────────────────────────────────────────────────────────────────
_LAYOUT = dict(
    paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
    margin=dict(l=0, r=0, t=10, b=0),
    font=dict(family="Inter", size=11, color="#64748B"),
)


def weight_chart(df, goal_weight, days=30):
    d = df.tail(days)
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=d["date"], y=d["weight"], mode="lines+markers",
        line=dict(color="#4F75FF", width=2.5), marker=dict(size=5), name="Weight"))
    fig.add_hline(y=goal_weight, line=dict(color="#EF4444", dash="dash", width=1.5),
                  annotation_text=f"Goal {goal_weight} lbs", annotation_font_size=10)
    fig.update_layout(**_LAYOUT, height=220,
        yaxis=dict(gridcolor="#EEF2FF"), xaxis=dict(gridcolor="rgba(0,0,0,0)"))
    return fig


def activity_chart(df, days=30, kind="line"):
    d = df.tail(days)
    fig = go.Figure()
    cfg = [("move","#EF4444","Move"), ("exercise","#22C55E","Exercise"), ("stand","#3B82F6","Stand")]
    for col, color, name in cfg:
        if kind == "line":
            fig.add_trace(go.Scatter(x=d["date"], y=d[col], mode="lines",
                line=dict(color=color, width=2), name=name, showlegend=True))
        else:
            fig.add_trace(go.Bar(x=d["date"], y=d[col], name=name,
                marker_color=color, marker_line_width=0, showlegend=True))
    fig.update_layout(**_LAYOUT, height=210, showlegend=True, barmode="group",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, font=dict(size=10)),
        yaxis=dict(gridcolor="#EEF2FF"))
    return fig


def _hex_rgba(hex_color: str, alpha: float = 0.13) -> str:
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return f"rgba({r},{g},{b},{alpha})"


def sparkline(values, color):
    fig = go.Figure(go.Scatter(
        x=list(range(len(values))), y=values, mode="lines", fill="tozeroy",
        line=dict(color=color, width=1.5), fillcolor=_hex_rgba(color, 0.15)))
    fig.update_layout(**_LAYOUT, height=55,
        xaxis=dict(visible=False), yaxis=dict(visible=False))
    return fig


# ─────────────────────────────────────────────────────────────────────────────
# Claude API
# ─────────────────────────────────────────────────────────────────────────────
def ask_claude(messages: list, system: str) -> str:
    client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    r = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=512,
        system=system, messages=messages)
    return r.content[0].text


def chat_system(df, goals) -> str:
    entries = df.to_dict("records") if not df.empty else []
    return f"""You are Cardio, a friendly upbeat fitness coach. Answer questions about the user's fitness data.

User: {goals['name']} | Goal weight: {goals['goalWeight']} lbs
Daily goals: Move {goals['moveGoal']} cal · Exercise {goals['exerciseGoal']} min · Stand {goals['standGoal']} hrs
Fitness history ({len(entries)} entries): {json.dumps(entries, default=str)}

RESPONSE RULES — follow strictly:
1. Keep total response under 100 words.
2. Use bullet points (• ) for any list of stats, tips, or comparisons.
3. Each paragraph: max 2 sentences.
4. Lead with the key number or takeaway first.
5. Be specific — use actual numbers from the data.
6. Be encouraging but concise. No filler phrases."""


def ai_insights(df, goals):
    if df.empty:
        return [], []
    entries = df.tail(14).to_dict("records")
    system = ('You are Cardio, a fitness coach. Provide exactly 3 key insights and 3 recommendations. '
              'Respond ONLY with valid JSON: {"insights":["...","...","..."],"recommendations":["...","...","..."]} '
              'Each item under 55 words. Be specific and data-driven.')
    try:
        text = ask_claude(
            [{"role": "user", "content": f"Data: {json.dumps(entries, default=str)} Goals: {json.dumps(goals)}"}],
            system)
        parsed = json.loads(text.strip())
        return parsed.get("insights", []), parsed.get("recommendations", [])
    except Exception:
        return [], []


# ─────────────────────────────────────────────────────────────────────────────
# Onboarding
# ─────────────────────────────────────────────────────────────────────────────
def show_onboarding():
    show_mascot("great", 170)
    st.markdown("<h1 style='text-align:center;color:#1E293B'>Hi, I'm Cardio! 👋</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align:center;color:#64748B;margin-bottom:20px'>"
                "Your personal fitness companion — let's set up your goals!</p>", unsafe_allow_html=True)

    with st.form("onboard"):
        name = st.text_input("Your name", placeholder="First name")
        st.markdown("---")
        st.markdown("**🎯 Your Daily Goals**")
        gw = st.slider("Goal weight (lbs)", 100, 300, 150)
        mg = st.slider("Daily Move goal (cal)",      200, 1500, 600,  50)
        eg = st.slider("Daily Exercise goal (min)",   10,  180,  60,   5)
        sg = st.slider("Daily Stand goal (hrs)",       4,   16,  12)
        ok = st.form_submit_button("🚀 Start Tracking!")
        if ok:
            if not name.strip():
                st.error("Please enter your name!")
            else:
                save_goals({"name": name.strip(), "goalWeight": gw,
                            "moveGoal": mg, "exerciseGoal": eg, "standGoal": sg})
                st.session_state.goals = load_goals()
                st.rerun()


# ─────────────────────────────────────────────────────────────────────────────
# Tab 1 – Log Data
# ─────────────────────────────────────────────────────────────────────────────
def tab_log(df, goals):
    st.markdown("### 📊 Log Your Activity")
    col1, col2 = st.columns([1.1, 0.9])

    with col1:
        st.markdown("**✏️ Enter Today's Data**")
        last_wt = float(df["weight"].iloc[-1]) if not df.empty else 150.0
        with st.form("manual"):
            d   = st.date_input("Date", value=date.today())
            wt  = st.slider("⚖️ Weight (lbs)",   100.0, 350.0, last_wt,              0.5)
            mv  = st.slider("🔥 Move (cal)",      0,     1500,  goals["moveGoal"]//2,  10)
            ex  = st.slider("⚡ Exercise (min)",  0,     180,   goals["exerciseGoal"]//2, 5)
            st_ = st.slider("🧍 Stand (hrs)",     0,     18,    int(goals["standGoal"] // 2), 1)
            sl  = st.slider("😴 Sleep (hrs)",     0,     12,    7,                    1)
            if st.form_submit_button("💾 Save Today's Data", use_container_width=True):
                new_df = upsert_entry(df, {"date": d.isoformat(), "weight": wt,
                                           "move": mv, "exercise": ex, "stand": st_, "sleep": sl})
                save_data(new_df)
                st.session_state["df"] = new_df
                st.success("✅ Saved!")
                st.rerun()

    with col2:
        st.markdown("**📁 Upload CSV**")
        st.markdown("""<div style="background:#EEF2FF;border-radius:12px;padding:10px 14px;
            font-size:12px;margin-bottom:10px">
            <strong>Required columns:</strong><br>
            Date · weight in LB · Move · Exercise · Stand · Sleep hours
        </div>""", unsafe_allow_html=True)
        uploaded = st.file_uploader("Drop CSV here", type=["csv"], label_visibility="collapsed")
        if uploaded:
            try:
                new = pd.read_csv(uploaded)
                new.columns = [c.strip() for c in new.columns]
                renames = {"Date":"date","weight in LB":"weight","Weight":"weight",
                           "Move":"move","Exercise":"exercise","Stand":"stand",
                           "Sleep hours":"sleep","Sleep":"sleep"}
                new = new.rename(columns={k:v for k,v in renames.items() if k in new.columns})
                new["date"] = pd.to_datetime(new["date"])
                merged = pd.concat([df, new]).drop_duplicates("date", keep="last")
                merged = merged.sort_values("date").reset_index(drop=True)
                save_data(merged)
                st.session_state["df"] = merged
                st.success(f"✅ Imported {len(new)} entries!")
                st.rerun()
            except Exception as e:
                st.error(f"❌ {e}")

    if not st.session_state["df"].empty:
        st.markdown("---")
        st.markdown("**📋 Recent Entries**")
        show = st.session_state["df"].tail(7).copy()
        show["date"] = show["date"].dt.strftime("%b %d, %Y")
        show.columns = ["Date","Weight (lbs)","Move (cal)","Exercise (min)","Stand (hrs)","Sleep (hrs)"]
        st.dataframe(show.iloc[::-1], hide_index=True, use_container_width=True)


# ─────────────────────────────────────────────────────────────────────────────
# Tab 2 – Dashboard
# ─────────────────────────────────────────────────────────────────────────────
def tab_dashboard(df, goals):
    p = st.tabs(["🏠 Home","⚖️ Weight","⚡ Activity","🎯 Goals","💡 Insights"])
    with p[0]: dash_home(df, goals)
    with p[1]: dash_weight(df, goals)
    with p[2]: dash_activity(df, goals)
    with p[3]: dash_goals(df, goals)
    with p[4]: dash_insights(df, goals)


def dash_home(df, goals):
    mood = calc_mood(df, goals)
    latest = df.iloc[-1] if not df.empty else None
    hour = datetime.now().hour
    greeting = "Good morning" if hour < 12 else ("Good afternoon" if hour < 17 else "Good evening")
    first = goals["name"].split()[0]

    c1, c2 = st.columns([1.1, 0.9])
    with c1:
        st.markdown(f"""<div class="card-blue">
            <p style="opacity:.8;font-size:13px;margin:0">{greeting},</p>
            <h2 style="margin:4px 0;font-size:1.8rem">{first}! 👋</h2>
            <p style="opacity:.85;font-size:12px;margin-top:8px;line-height:1.5">
                {mood_message(mood, goals['name'])}</p>
        </div>""", unsafe_allow_html=True)
    with c2:
        show_mascot(mood, 120)

    if latest is not None:
        prev = df.iloc[-2] if len(df) >= 2 else None
        chg  = latest["weight"] - prev["weight"] if prev is not None else 0
        arrow = "↓" if chg < 0 else ("↑" if chg > 0 else "→")
        cc    = "#22C55E" if chg < 0 else ("#EF4444" if chg > 0 else "#94A3B8")
        st.markdown(f"""<div class="card">
            <p class="metric-label">Current Weight</p>
            <div style="display:flex;align-items:baseline;gap:12px">
                <span class="metric-hero">{latest['weight']:.1f}</span>
                <span style="color:#94A3B8">lbs</span>
                <span style="color:{cc};font-weight:600;font-size:14px;margin-left:auto">
                    {arrow} {abs(chg):.1f} lbs</span>
            </div>
            <p style="font-size:11px;color:#94A3B8;margin-top:6px">
                Goal: {goals['goalWeight']} lbs</p>
        </div>""", unsafe_allow_html=True)

        st.markdown("**Today at a Glance**")
        st.markdown(activity_rings_html(
            latest["move"],     goals["moveGoal"],
            latest["exercise"], goals["exerciseGoal"],
            latest["stand"],    goals["standGoal"]), unsafe_allow_html=True)

    if not df.empty:
        last7 = df.tail(7)
        hit = sum(1 for _, r in last7.iterrows()
                  if r["move"] >= goals["moveGoal"] and r["exercise"] >= goals["exerciseGoal"])
        c1, c2, c3 = st.columns(3)
        c1.metric("Goal Days (7d)", f"{hit}/7")
        c2.metric("Avg Sleep", f"{last7['sleep'].mean():.1f} hrs")
        c3.metric("Total Entries", len(df))


def dash_weight(df, goals):
    if df.empty:
        st.info("No data yet — log some entries!")
        return
    days = st.radio("Range", [7, 14, 30], index=2, horizontal=True)
    d = df.tail(days)
    c1, c2, c3 = st.columns(3)
    c1.metric("Current",  f"{df['weight'].iloc[-1]:.1f} lbs")
    chg = df["weight"].iloc[-1] - d["weight"].iloc[0]
    c2.metric("Change",   f"{chg:+.1f} lbs")
    c3.metric("Average",  f"{d['weight'].mean():.1f} lbs")
    st.plotly_chart(weight_chart(df, goals["goalWeight"], days),
                    use_container_width=True, config={"displayModeBar": False})
    hist = df.tail(7)[["date","weight"]].copy()
    hist["date"] = hist["date"].dt.strftime("%b %d")
    hist["Δ"] = df.tail(7)["weight"].diff().map(lambda x: f"{x:+.1f}" if pd.notna(x) else "—")
    hist.columns = ["Date","Weight","Δ"]
    st.dataframe(hist.iloc[::-1], hide_index=True, use_container_width=True)


def dash_activity(df, goals):
    if df.empty:
        st.info("No activity data yet!")
        return
    latest = df.iloc[-1]
    st.markdown("**Today's Activity**")
    st.markdown(activity_rings_html(
        latest["move"],     goals["moveGoal"],
        latest["exercise"], goals["exerciseGoal"],
        latest["stand"],    goals["standGoal"], 170), unsafe_allow_html=True)

    kind = st.radio("Chart", ["Line", "Bar"], horizontal=True)
    st.plotly_chart(activity_chart(df, 30, kind.lower()),
                    use_container_width=True, config={"displayModeBar": False})

    st.markdown("**7-Day Averages vs Goals**")
    last7 = df.tail(7)
    for col, gk, label in [("move","moveGoal","🔥 Move"),
                            ("exercise","exerciseGoal","⚡ Exercise"),
                            ("stand","standGoal","🧍 Stand")]:
        avg = last7[col].mean()
        pct = min(avg / goals[gk], 1.0)
        st.markdown(f"**{label}** — {avg:.0f} / {goals[gk]}")
        st.progress(pct)


def dash_goals(df, goals):
    sw  = df["weight"].iloc[0]  if not df.empty else goals["goalWeight"]
    cw  = df["weight"].iloc[-1] if not df.empty else goals["goalWeight"]
    ttl = abs(sw - goals["goalWeight"])
    pct = min(int(abs(sw - cw) / ttl * 100), 100) if ttl > 0 else 100

    fig = go.Figure(go.Indicator(
        mode="gauge+number",
        value=pct,
        number=dict(suffix="%", font=dict(size=34, color="#1E293B")),
        gauge=dict(
            axis=dict(range=[0, 100]),
            bar=dict(color="#4F75FF", thickness=0.7),
            bgcolor="#EEF2FF", borderwidth=0,
            steps=[dict(range=[0, 100], color="#EEF2FF")]),
        title=dict(text="Progress to Goal Weight", font=dict(size=14, color="#64748B")),
    ))
    fig.update_layout(**_LAYOUT, height=220)
    st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

    c1, c2, c3 = st.columns(3)
    c1.metric("Start",  f"{sw:.1f} lbs")
    c2.metric("Now",    f"{cw:.1f} lbs", delta=f"{cw-sw:+.1f}")
    c3.metric("Goal",   f"{goals['goalWeight']} lbs")

    lost = abs(sw - cw)
    st.markdown("**Milestones**")
    for label, done in [("5 lbs down", lost>=5), ("10 lbs down", lost>=10),
                        ("15 lbs down", lost>=15), ("Halfway there!", pct>=50),
                        ("Goal achieved! 🎉", pct>=100)]:
        color = "#16A34A" if done else "#94A3B8"
        st.markdown(f'<p style="color:{color};margin:3px 0">{"✅" if done else "⬜"} {label}</p>',
                    unsafe_allow_html=True)

    if not df.empty:
        st.markdown("**This Week's Targets**")
        last7 = df.tail(7)
        checks = [
            ("Hit Move goal 5+ days",     sum(r["move"]>=goals["moveGoal"]     for _, r in last7.iterrows())>=5),
            ("Hit Exercise goal 5+ days", sum(r["exercise"]>=goals["exerciseGoal"] for _, r in last7.iterrows())>=5),
            ("Sleep 7+ hrs every night",  all(r["sleep"]>=7 for _, r in last7.iterrows())),
        ]
        for label, done in checks:
            color = "#4F75FF" if done else "#94A3B8"
            st.markdown(f'<p style="color:{color};margin:3px 0">{"✅" if done else "☐"} {label}</p>',
                        unsafe_allow_html=True)


def dash_insights(df, goals):
    mood  = calc_mood(df, goals)
    score = health_score(df, goals)
    label = "Excellent 🏆" if score >= 75 else ("Good 💪" if score >= 50 else "Needs Work 🌱")
    badge = "badge-green"  if score >= 75 else ("badge-blue"  if score >= 50 else "badge-red")
    color = "#22C55E"      if score >= 75 else ("#F59E0B"      if score >= 50 else "#EF4444")

    c1, c2 = st.columns(2)
    with c1:
        st.markdown(f"""<div class="card" style="text-align:center">
            <p class="metric-label">Health Score</p>
            <p class="metric-hero" style="color:{color}">{score}</p>
            <p style="color:#94A3B8;font-size:12px">/ 100</p>
            <span class="badge {badge}">{label}</span>
        </div>""", unsafe_allow_html=True)
    with c2:
        show_mascot(mood, 110)

    if not df.empty:
        if st.button("✨ Generate AI Insights", use_container_width=True):
            with st.spinner("Cardio is analyzing your data..."):
                ins, recs = ai_insights(df, goals)
                st.session_state.insights = ins
                st.session_state.recs = recs

        if st.session_state.get("insights"):
            st.markdown("**💡 Key Insights**")
            for i in st.session_state.insights:
                st.markdown(f'<div class="card" style="padding:10px 16px">💡 {i}</div>',
                            unsafe_allow_html=True)
            st.markdown("**🚀 Recommendations**")
            for r in st.session_state.recs:
                st.markdown(f'<div class="card" style="padding:10px 16px">🏃 {r}</div>',
                            unsafe_allow_html=True)
    else:
        st.info("Log some data to get AI-powered insights!")


# ─────────────────────────────────────────────────────────────────────────────
# Tab 3 – 30-Day Summary
# ─────────────────────────────────────────────────────────────────────────────
def tab_summary(df, goals):
    st.markdown("### 📈 30-Day Summary")
    last30 = df.tail(30)

    if last30.empty:
        show_mascot("okay", 130)
        st.info("No data yet — start logging to see your 30-day summary!")
        return

    total_ex  = int(last30["exercise"].sum())
    total_slp = round(last30["sleep"].sum(), 1)
    avg_slp   = round(last30["sleep"].mean(), 1)
    sw, ew    = last30["weight"].iloc[0], last30["weight"].iloc[-1]
    wchg      = round(ew - sw, 1)

    days_hit = sum(1 for _, r in last30.iterrows() if r["exercise"] >= goals["exerciseGoal"])
    pct_hit  = days_hit / len(last30)
    badge_t  = "Strong Month! 🏆" if pct_hit >= 0.8 else ("Keep Going! 💪" if pct_hit >= 0.5 else "Room to Grow 🌱")
    badge_c  = "badge-green"      if pct_hit >= 0.8 else ("badge-blue"      if pct_hit >= 0.5 else "badge-gray")

    st.markdown(f"""<div class="card" style="display:flex;justify-content:space-between;align-items:center">
        <div>
            <p class="metric-label">30-Day Period</p>
            <p style="color:#64748B;font-size:13px;margin:0">
                {last30['date'].iloc[0].strftime('%b %d')} → {last30['date'].iloc[-1].strftime('%b %d, %Y')}
            </p>
        </div>
        <span class="badge {badge_c}">{badge_t}</span>
    </div>""", unsafe_allow_html=True)

    c1, c2, c3 = st.columns(3)
    chg_col = "#22C55E" if wchg < 0 else ("#EF4444" if wchg > 0 else "#94A3B8")

    with c1:
        st.markdown(f"""<div class="card">
            <p class="metric-label">⚡ Total Exercise</p>
            <p class="metric-hero" style="color:#22C55E">{total_ex:,}</p>
            <p style="font-size:11px;color:#94A3B8;margin:0">minutes · {days_hit}d hit goal</p>
        </div>""", unsafe_allow_html=True)
        st.plotly_chart(sparkline(last30["exercise"].tolist(), "#22C55E"),
                        use_container_width=True, config={"displayModeBar": False})

    with c2:
        st.markdown(f"""<div class="card">
            <p class="metric-label">😴 Total Sleep</p>
            <p class="metric-hero" style="color:#8B5CF6">{total_slp}</p>
            <p style="font-size:11px;color:#94A3B8;margin:0">hours · avg {avg_slp}/night</p>
        </div>""", unsafe_allow_html=True)
        st.plotly_chart(sparkline(last30["sleep"].tolist(), "#8B5CF6"),
                        use_container_width=True, config={"displayModeBar": False})

    with c3:
        arrow = "↓" if wchg < 0 else ("↑" if wchg > 0 else "→")
        st.markdown(f"""<div class="card">
            <p class="metric-label">⚖️ Weight Change</p>
            <p class="metric-hero" style="color:{chg_col}">{arrow}{abs(wchg)}</p>
            <p style="font-size:11px;color:#94A3B8;margin:0">lbs · {sw:.1f}→{ew:.1f}</p>
        </div>""", unsafe_allow_html=True)
        st.plotly_chart(sparkline(last30["weight"].tolist(), chg_col),
                        use_container_width=True, config={"displayModeBar": False})

    mood = calc_mood(df, goals)
    ca, cb = st.columns([1, 3])
    with ca:
        show_mascot(mood, 90)
    with cb:
        st.markdown(f"""
        <p style="font-size:11px;font-weight:600;color:#94A3B8;text-transform:uppercase;
                  letter-spacing:.06em;margin-bottom:4px">Cardio's Verdict</p>
        <p style="font-size:14px;color:#1E293B;font-weight:500">
            {mood_message(mood, goals['name'])}</p>
        """, unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# Tab 4 – AI Chat
# ─────────────────────────────────────────────────────────────────────────────
def tab_chat(df, goals):
    if "chat" not in st.session_state:
        st.session_state.chat = []

    mood = calc_mood(df, goals)
    mood_emoji = {"great": "🔥", "okay": "💪", "notgreat": "💙"}.get(mood, "💪")
    first = goals["name"].split()[0]

    # ── Header card ──────────────────────────────────────────────────────────
    st.markdown(f"""
    <div class="card-blue" style="display:flex;align-items:center;gap:14px;padding:16px 20px">
        <span style="font-size:3rem">🐦</span>
        <div>
            <p style="margin:0;font-size:1rem;font-weight:700">Hey {first}! {mood_emoji}</p>
            <p style="margin:0;opacity:.85;font-size:12px;margin-top:4px">
                Ask me anything about your fitness journey</p>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # ── Starter chips (only when no conversation yet) ────────────────────────
    if not st.session_state.chat:
        st.markdown("**Try asking:**")
        starters = [
            "How did I do last week vs the week before?",
            "Am I sleeping enough?",
            "What was my best week this month?",
            "How close am I to my goal weight?",
            "What should I focus on to improve?",
        ]
        cols = st.columns(2)
        for i, s in enumerate(starters):
            with cols[i % 2]:
                if st.button(s, key=f"starter_{i}", use_container_width=True):
                    _send(s, df, goals)
                    st.rerun()

    # ── Conversation history ─────────────────────────────────────────────────
    for msg in st.session_state.chat:
        with st.chat_message(msg["role"],
                             avatar="🐦" if msg["role"] == "assistant" else None):
            st.write(msg["content"])

    # ── Input ────────────────────────────────────────────────────────────────
    if prompt := st.chat_input("Ask Cardio about your fitness..."):
        _send(prompt, df, goals)
        st.rerun()

    # ── Clear button ─────────────────────────────────────────────────────────
    if st.session_state.chat:
        if st.button("🔄 Clear conversation", use_container_width=False):
            st.session_state.chat = []
            st.rerun()


def _send(prompt: str, df, goals):
    st.session_state.chat.append({"role": "user", "content": prompt})
    try:
        with st.spinner("Cardio is thinking..."):
            reply = ask_claude(
                [{"role": m["role"], "content": m["content"]}
                 for m in st.session_state.chat],
                chat_system(df, goals),
            )
        st.session_state.chat.append({"role": "assistant", "content": reply})
    except Exception as e:
        # Roll back the user message so the UI stays clean
        st.session_state.chat.pop()
        st.error(f"❌ Cardio couldn't respond: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
def reset_profile():
    """Clear goals + session state so onboarding runs again."""
    if GOALS_FILE.exists():
        GOALS_FILE.unlink()
    # Explicitly set to None rather than pop so the None-check in main() fires
    st.session_state["goals"] = None
    for key in ["df", "chat", "insights", "recs"]:
        st.session_state.pop(key, None)
    st.rerun()


def main():
    inject_css()

    # Load from disk only on first visit; reset_profile() sets goals to None explicitly
    if "goals" not in st.session_state:
        st.session_state["goals"] = load_goals()
    if "df" not in st.session_state:
        st.session_state["df"] = load_data()

    goals = st.session_state["goals"]
    df    = st.session_state["df"]

    # Force re-onboarding if name is missing
    if goals is None or not goals.get("name", "").strip():
        show_onboarding()
        return

    # ── Header ──────────────────────────────────────────────────────────────
    hcol1, hcol2 = st.columns([5, 1])
    with hcol1:
        st.markdown("""
        <div style="display:flex;align-items:center;gap:10px;padding:6px 0 10px">
            <span style="font-size:26px">🐦</span>
            <div>
                <h3 style="margin:0;color:#1E293B;font-size:1.15rem">Cardio</h3>
                <p style="margin:0;color:#94A3B8;font-size:11px">Your Fitness Companion</p>
            </div>
        </div>
        """, unsafe_allow_html=True)
    with hcol2:
        if st.button("⚙️ Reset", help="Reset profile & goals"):
            reset_profile()

    t1, t2, t3, t4 = st.tabs(["📊 Log Data", "🏠 Dashboard", "📈 Summary", "🤖 AI Chat"])
    with t1: tab_log(df, goals)
    with t2: tab_dashboard(df, goals)
    with t3: tab_summary(df, goals)
    with t4: tab_chat(df, goals)


if __name__ == "__main__":
    main()
