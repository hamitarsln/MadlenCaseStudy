"use client";
import React from 'react';

interface RadialMeterProps {
  value: number; // 0-1 normalized
  size?: number;
  stroke?: number;
  label?: string;
  colorFrom?: string;
  colorTo?: string;
  suffix?: string; // e.g. '%', 'pt'
  precision?: number; // displayed precision for inner numeric value (default 0 = percent integer)
  showPercent?: boolean; // if false, show raw value*100 with precision or treat as already normalized metric
  children?: React.ReactNode;
  className?: string;
  idHint?: string; // to help build unique gradient id when SSR multiple
}

let meterSeq = 0;
export function RadialMeter({
  value,
  size=88,
  stroke=9,
  label,
  colorFrom='#FFC300',
  colorTo='#FFED88',
  suffix='%',
  precision=0,
  showPercent=true,
  children,
  className,
  idHint
}: RadialMeterProps){
  const [uid] = React.useState(()=> `radial-meter-grad-${idHint || ''}-${++meterSeq}`);
  const clamped = Math.max(0, Math.min(1, value||0));
  const r = (size/2) - stroke;
  const c = 2*Math.PI*r;
  const offset = c - clamped * c;
  const display = showPercent ? (clamped*100).toFixed(precision) : clamped.toFixed(precision);
  return (
    <div className={`relative inline-flex items-center justify-center ${className||''}`} style={{ width: size, height: size }} aria-label={`${label||'değer'} ${display}${suffix}`}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <defs>
          <linearGradient id={uid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorFrom} />
            <stop offset="100%" stopColor={colorTo} />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size/2}
          cy={size/2}
          r={r}
          stroke={`url(#${uid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
          fill="none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label && <span className="text-[10px] font-medium tracking-wide text-white/60 leading-none mb-0.5">{label}</span>}
        <span className="text-sm font-bold bg-gradient-to-br from-primary to-primary/60 text-transparent bg-clip-text leading-none">{display}{suffix}</span>
        {children}
      </div>
    </div>
  );
}
