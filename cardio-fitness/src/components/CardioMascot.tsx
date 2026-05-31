import React from 'react';
import { CardioMood } from '../types';

interface Props {
  mood?: CardioMood;
  size?: number;
  animate?: boolean;
}

export default function CardioMascot({ mood = 'okay', size = 180, animate = true }: Props) {
  const isGreat    = mood === 'great';
  const isNotGreat = mood === 'notgreat';

  const wingRotL = isNotGreat ? -6  : isGreat ? 24  : 15;
  const wingRotR = isNotGreat ? 6   : isGreat ? -24 : -15;

  return (
    <svg
      viewBox="0 0 200 262"
      width={size}
      height={size * 1.31}
      xmlns="http://www.w3.org/2000/svg"
      style={animate ? { filter: 'drop-shadow(0 10px 22px rgba(150,20,10,0.30))' } : undefined}
    >
      <defs>
        {/* 3-D sphere gradient — body & head */}
        <radialGradient id="gBody" cx="36%" cy="26%" r="68%" fx="36%" fy="26%">
          <stop offset="0%"   stopColor="#FF6655" />
          <stop offset="28%"  stopColor="#E03020" />
          <stop offset="65%"  stopColor="#C02010" />
          <stop offset="100%" stopColor="#7A0A0A" />
        </radialGradient>

        {/* Wing gradient — slightly darker / cooler */}
        <radialGradient id="gWing" cx="38%" cy="22%" r="72%" fx="38%" fy="22%">
          <stop offset="0%"   stopColor="#E84040" />
          <stop offset="45%"  stopColor="#C01818" />
          <stop offset="100%" stopColor="#680808" />
        </radialGradient>

        {/* Hat cylinder — subtle left-face catch-light */}
        <linearGradient id="gHat" x1="18%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#484848" />
          <stop offset="35%"  stopColor="#262626" />
          <stop offset="100%" stopColor="#0A0A0A" />
        </linearGradient>

        {/* Hat brim */}
        <radialGradient id="gBrim" cx="35%" cy="35%" r="70%">
          <stop offset="0%"   stopColor="#3A3A3A" />
          <stop offset="100%" stopColor="#101010" />
        </radialGradient>

        {/* Beak — warm orange, dark at tip */}
        <linearGradient id="gBeakU" x1="0%" y1="0%" x2="60%" y2="100%">
          <stop offset="0%"   stopColor="#FFBB22" />
          <stop offset="100%" stopColor="#DD6600" />
        </linearGradient>
        <linearGradient id="gBeakL" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#DD7700" />
          <stop offset="100%" stopColor="#993300" />
        </linearGradient>

        {/* Vest fabric */}
        <radialGradient id="gVest" cx="50%" cy="35%" r="65%">
          <stop offset="0%"   stopColor="#2E2E2E" />
          <stop offset="100%" stopColor="#0C0C0C" />
        </radialGradient>

        {/* Shoe upper */}
        <radialGradient id="gShoe" cx="30%" cy="28%" r="72%">
          <stop offset="0%"   stopColor="#404040" />
          <stop offset="100%" stopColor="#080808" />
        </radialGradient>

        {/* Eye-white — slightly off-white at edge */}
        <radialGradient id="gEye" cx="38%" cy="36%" r="68%">
          <stop offset="0%"   stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E4E4E4" />
        </radialGradient>

        {/* Soft halo for Great mood */}
        <radialGradient id="gHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#FFD700" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
        </radialGradient>

        {/* Drop-shadow filter for body depth */}
        <filter id="fBodyShadow" x="-25%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="3" dy="5" stdDeviation="6" floodColor="#6A0808" floodOpacity="0.40" />
        </filter>

        {/* Soft inner feather detail */}
        <filter id="fFeather" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="1" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      {/* ── Ground shadow ── */}
      <ellipse cx="100" cy="257" rx="52" ry="9" fill="rgba(0,0,0,0.18)" />

      {/* ── Gold halo (GREAT) ── */}
      {isGreat && (
        <ellipse cx="100" cy="120" rx="95" ry="110" fill="url(#gHalo)" />
      )}

      {/* ── Sparkles ── */}
      {isGreat && (
        <>
          <text x="4"   y="65"  fontSize="22" fill="#FFD700" opacity="0.95">✦</text>
          <text x="164" y="52"  fontSize="17" fill="#22C55E" opacity="0.95">✦</text>
          <text x="174" y="88"  fontSize="13" fill="#FFD700">★</text>
          <text x="1"   y="100" fontSize="13" fill="#22C55E">★</text>
          <text x="158" y="118" fontSize="10" fill="#FFD700">✦</text>
        </>
      )}

      {/* ── WINGS (drawn BEHIND body) ── */}
      {/* Left wing — main body */}
      <ellipse cx="26" cy="166" rx="25" ry="58" fill="url(#gWing)"
        transform={`rotate(${wingRotL} 26 166)`} filter="url(#fBodyShadow)" />
      {/* Left feather tip overlays for texture */}
      <path d="M8 208 Q2 222 14 228 Q10 210 28 204 Z" fill="#8B0E0E" opacity="0.55"
        transform={`rotate(${wingRotL} 26 166)`} />
      <path d="M5 190 Q-2 205 10 210 Q7 192 25 188 Z" fill="#9B1010" opacity="0.35"
        transform={`rotate(${wingRotL} 26 166)`} />
      {/* Left wing highlight edge */}
      <ellipse cx="22" cy="142" rx="10" ry="20" fill="white" opacity="0.10"
        transform={`rotate(${wingRotL} 26 166)`} />

      {/* Right wing */}
      <ellipse cx="174" cy="166" rx="25" ry="58" fill="url(#gWing)"
        transform={`rotate(${wingRotR} 174 166)`} filter="url(#fBodyShadow)" />
      <path d="M192 208 Q198 222 186 228 Q190 210 172 204 Z" fill="#8B0E0E" opacity="0.55"
        transform={`rotate(${wingRotR} 174 166)`} />
      <path d="M195 190 Q202 205 190 210 Q193 192 175 188 Z" fill="#9B1010" opacity="0.35"
        transform={`rotate(${wingRotR} 174 166)`} />
      <ellipse cx="178" cy="142" rx="10" ry="20" fill="white" opacity="0.10"
        transform={`rotate(${wingRotR} 174 166)`} />

      {/* ── BODY ── */}
      <ellipse cx="100" cy="170" rx="66" ry="69" fill="url(#gBody)" filter="url(#fBodyShadow)" />
      {/* Primary specular highlight — makes it look like a shiny 3-D ball */}
      <ellipse cx="74"  cy="142" rx="30" ry="24" fill="white" opacity="0.22" />
      <ellipse cx="70"  cy="138" rx="14" ry="10" fill="white" opacity="0.16" />
      {/* Lower shadow gradient overlay */}
      <ellipse cx="108" cy="202" rx="54" ry="34" fill="#5A0808" opacity="0.20" />

      {/* ── VEST / HOODIE ── */}
      <path
        d="M65 134 Q71 116 100 112 Q129 116 135 134 L142 204 Q133 226 100 228 Q67 226 58 204 Z"
        fill="url(#gVest)"
      />
      {/* Vest centre seam */}
      <line x1="100" y1="114" x2="100" y2="226"
        stroke="rgba(255,255,255,0.055)" strokeWidth="2" />
      {/* Subtle vest pocket outline */}
      <rect x="88" y="192" width="24" height="16" rx="4"
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
      {/* Vest top fabric fold shadow */}
      <path d="M65 134 Q71 116 100 112 Q129 116 135 134"
        fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="3" />

      {/* ── HEART ── */}
      <path
        d="M100 154 C100 148,91 145,89 153 C87 160,94 168,100 174 C106 168,113 160,111 153 C109 145,100 148,100 154 Z"
        fill="#D62B1F"
      />
      {/* Heart inner highlight */}
      <path d="M96 153 C96 149,91 148,91 153"
        fill="none" stroke="rgba(255,180,180,0.55)" strokeWidth="1.8" strokeLinecap="round" />

      {/* ── NECK ── */}
      <ellipse cx="100" cy="116" rx="27" ry="19" fill="url(#gBody)" />

      {/* ── HEAD ── */}
      <circle cx="100" cy="82" r="45" fill="url(#gBody)" filter="url(#fBodyShadow)" />
      {/* Head primary specular */}
      <ellipse cx="80"  cy="62" rx="22" ry="17" fill="white" opacity="0.22" />
      <ellipse cx="76"  cy="58" rx="10" ry="8"  fill="white" opacity="0.15" />
      {/* Head lower-edge shadow */}
      <ellipse cx="106" cy="106" rx="38" ry="14" fill="#5A0808" opacity="0.18" />

      {/* ── CREST FEATHERS (behind hat, above brim) ── */}
      {/* Give each feather its own 3-D gradient via the body gradient */}
      <ellipse cx="86"  cy="12" rx="7.5" ry="17" fill="url(#gBody)" transform="rotate(-22 86 12)" />
      <ellipse cx="100" cy="6"  rx="8.5" ry="19" fill="url(#gBody)" />
      <ellipse cx="114" cy="12" rx="7.5" ry="17" fill="url(#gBody)" transform="rotate(22 114 12)" />
      {/* Crest tip specular */}
      <ellipse cx="86"  cy="9"  rx="3"   ry="7"  fill="white" opacity="0.15" transform="rotate(-22 86 9)" />
      <ellipse cx="100" cy="4"  rx="3.5" ry="8"  fill="white" opacity="0.15" />
      <ellipse cx="114" cy="9"  rx="3"   ry="7"  fill="white" opacity="0.15" transform="rotate(22 114 9)" />

      {/* ── TOP HAT ── */}
      {/* Cylinder body */}
      <rect x="57" y="5" width="86" height="54" rx="7" fill="url(#gHat)" />
      {/* Left-face catch-light strip */}
      <rect x="57" y="5" width="17" height="54" rx="7" fill="white" opacity="0.07" />
      {/* Top specular highlight */}
      <ellipse cx="76" cy="11" rx="20" ry="5.5" fill="white" opacity="0.13" />
      {/* Hat band */}
      <rect x="57" y="51" width="86" height="8"  fill="#1C1C1C" />
      {/* Band centre buckle */}
      <rect x="93" y="52" width="14" height="6" rx="2"
        fill="#2A2A2A" stroke="rgba(255,255,255,0.10)" strokeWidth="0.8" />
      {/* Brim */}
      <ellipse cx="100" cy="59" rx="50" ry="11" fill="url(#gBrim)" />
      {/* Brim top highlight */}
      <ellipse cx="80"  cy="56" rx="26" ry="4.5" fill="white" opacity="0.11" />
      {/* Brim bottom shadow */}
      <ellipse cx="104" cy="63" rx="42" ry="5"   fill="#080808" opacity="0.30" />

      {/* ── TROPHY (GREAT) ── */}
      {isGreat && (
        <g transform="translate(151 112) scale(0.70)">
          <path d="M5 0h30v28Q35 46,20 52Q5 46,5 28Z" fill="#FFD700" />
          <path d="M9 4 Q18 2 22 7" fill="none" stroke="white"
            strokeWidth="1.8" strokeLinecap="round" opacity="0.75" />
          <path d="M5 7  Q-7 14,-5 27 Q-1 35,5 31"  fill="#FFD700" />
          <path d="M35 7 Q47 14,45 27 Q41 35,35 31"  fill="#FFD700" />
          <rect x="14" y="52" width="12" height="14" fill="#FFD700" />
          <rect x="8"  y="66" width="24" height="5"  fill="#FFD700" />
          <circle cx="20" cy="23" r="10" fill="#FFCC00" />
          <text x="15" y="28" fontSize="12" fill="#9A6800">★</text>
        </g>
      )}

      {/* ── EYES ── */}
      {/* Left eye */}
      <circle cx="82"  cy="77" r="15" fill="url(#gEye)" />
      {/* Rim shadow */}
      <circle cx="82"  cy="77" r="15" fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="1.8" />
      {/* Pupil */}
      <circle cx="81"  cy="78" r="9.5" fill="#151515" />
      {/* Warm iris ring */}
      <circle cx="81"  cy="78" r="9.5" fill="none" stroke="#3E2800" strokeWidth="2.2" opacity="0.55" />
      {/* Primary shine */}
      <circle cx="75"  cy="71" r="4"   fill="white" />
      {/* Secondary shine */}
      <circle cx="86"  cy="71" r="1.8" fill="white" opacity="0.75" />

      {/* Right eye */}
      <circle cx="118" cy="77" r="15" fill="url(#gEye)" />
      <circle cx="118" cy="77" r="15" fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="1.8" />
      <circle cx="119" cy="78" r="9.5" fill="#151515" />
      <circle cx="119" cy="78" r="9.5" fill="none" stroke="#3E2800" strokeWidth="2.2" opacity="0.55" />
      <circle cx="113" cy="71" r="4"   fill="white" />
      <circle cx="124" cy="71" r="1.8" fill="white" opacity="0.75" />

      {/* ── EYEBROWS ── */}
      {!isNotGreat ? (
        <>
          {/* Left brow arched high → mischievous raised look */}
          <path d="M71 59 Q82 53 93 59"
            stroke="#8B1010" strokeWidth="3.2" fill="none"
            strokeLinecap="round" />
          {/* Right brow slightly lower / tilted → playful asymmetry */}
          <path d="M107 62 Q118 58 129 62"
            stroke="#8B1010" strokeWidth="3.2" fill="none"
            strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* Both brows angled inward at the top → sad */}
          <path d="M71 62 Q82 57 93 62"
            stroke="#8B1010" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path d="M107 62 Q118 57 129 62"
            stroke="#8B1010" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* ── ROSY CHEEKS ── */}
      <circle cx="68"  cy="93" r="14"
        fill="#FF8080"
        opacity={isNotGreat ? 0.10 : 0.26}
      />
      <circle cx="132" cy="93" r="14"
        fill="#FF8080"
        opacity={isNotGreat ? 0.10 : 0.26}
      />

      {/* ── BEAK ── */}
      {/* Upper beak */}
      <path d="M89 87 L115 82 L114 92 Z" fill="url(#gBeakU)" />
      {/* Beak edge highlight */}
      <path d="M91 86 L111 83"
        fill="none" stroke="rgba(255,220,100,0.55)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Lower beak */}
      <path d="M89 92 L114 92 L111 100 Z" fill="url(#gBeakL)" />

      {/* ── MOUTH / EXPRESSION ── */}
      {isGreat ? (
        /* Big elated smile */
        <path d="M83 107 Q100 120 117 107"
          stroke="#8B1010" strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : !isNotGreat ? (
        /* Mischievous smirk — asymmetric, left side higher */
        <path d="M83 109 Q91 116 100 113 Q109 115 117 108"
          stroke="#8B1010" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      ) : (
        /* Sad frown */
        <path d="M83 116 Q100 107 117 116"
          stroke="#8B1010" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      )}

      {/* ── TEAR (NOT GREAT) ── */}
      {isNotGreat && (
        <path d="M123 88 Q127 98 123 102 Q119 98 123 88 Z"
          fill="#60A5FA" opacity="0.90"
        />
      )}

      {/* ── LEGS ── */}
      <line x1="82"  y1="232" x2="74"  y2="248"
        stroke="#FF8800" strokeWidth="8.5" strokeLinecap="round" />
      <line x1="118" y1="232" x2="126" y2="248"
        stroke="#FF8800" strokeWidth="8.5" strokeLinecap="round" />

      {/* ── SNEAKERS ── */}
      {/* LEFT shoe */}
      {/* White rubber sole */}
      <rect x="56" y="247" width="34" height="7"  rx="3.5" fill="#DCDCDC" />
      {/* Sole side stripe */}
      <rect x="56" y="248" width="34" height="2"  rx="1"   fill="#BBBBBB" />
      {/* Shoe upper body */}
      <rect x="58" y="235" width="30" height="16" rx="8"   fill="url(#gShoe)" />
      {/* Shoe tongue tab */}
      <rect x="68" y="232" width="10" height="9"  rx="3"   fill="#2E2E2E" />
      {/* Toe-cap sheen */}
      <ellipse cx="63" cy="247" rx="9" ry="4" fill="white" opacity="0.14" />
      {/* Lace row 1 */}
      <line x1="62" y1="239" x2="84" y2="239" stroke="#555" strokeWidth="1.4" />
      {/* Lace row 2 */}
      <line x1="62" y1="243" x2="84" y2="243" stroke="#555" strokeWidth="0.9" />

      {/* RIGHT shoe */}
      <rect x="110" y="247" width="34" height="7"  rx="3.5" fill="#DCDCDC" />
      <rect x="110" y="248" width="34" height="2"  rx="1"   fill="#BBBBBB" />
      <rect x="112" y="235" width="30" height="16" rx="8"   fill="url(#gShoe)" />
      <rect x="122" y="232" width="10" height="9"  rx="3"   fill="#2E2E2E" />
      <ellipse cx="137" cy="247" rx="9" ry="4" fill="white" opacity="0.14" />
      <line x1="116" y1="239" x2="138" y2="239" stroke="#555" strokeWidth="1.4" />
      <line x1="116" y1="243" x2="138" y2="243" stroke="#555" strokeWidth="0.9" />
    </svg>
  );
}

