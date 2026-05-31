import React from 'react';

interface Props {
  value: number;
  max: number;
  color: string;
  trackColor?: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

export default function ActivityRing({
  value, max, color, trackColor = '#e5e7eb',
  size = 80, strokeWidth = 10, label, sublabel,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const offset = circumference * (1 - progress);
  const cx = size / 2;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={cx} cy={cx} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
          <circle
            cx={cx} cy={cx} r={radius}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        {label && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-gray-800">{label}</span>
            {sublabel && <span className="text-[10px] text-gray-400">{sublabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
