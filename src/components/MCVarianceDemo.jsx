import React, { useState, useCallback } from 'react';

const COLORS = [
  '#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#fb923c',
];

const TRAJECTORIES = [
  { startY: 0.88, endY: 0.85, returnFromS: 14 },
  { startY: 0.12, endY: 0.05, returnFromS: -6 },
  { startY: 0.68, endY: 0.70, returnFromS: 8 },
  { startY: 0.28, endY: 0.35, returnFromS: 2 },
  { startY: 0.92, endY: 0.18, returnFromS: -4 },
  { startY: 0.40, endY: 0.98, returnFromS: 18 },
];

const S_NORM_Y = 0.5;

export default function MCVarianceDemo() {
  const [sampledIndices, setSampledIndices] = useState([]);

  const W = 760;
  const H_PATHS = 280;
  const H_LINE = 100;
  const TOTAL_H = H_PATHS + H_LINE + 10;
  const padX = 70;
  const padTop = 36;
  const padBot = 16;

  const plotW = W - 2 * padX;
  const plotH = H_PATHS - padTop - padBot;

  const toX = (t) => padX + t * plotW;
  const toY = (ny) => padTop + (1 - ny) * plotH;

  const sX = toX(0.5);
  const sY = toY(S_NORM_Y);

  const getPathD = (traj) => {
    const x0 = toX(0), y0 = toY(traj.startY);
    const x4 = toX(1), y4 = toY(traj.endY);
    return [
      `M ${x0} ${y0}`,
      `C ${toX(0.2)} ${y0}, ${toX(0.35)} ${sY}, ${sX} ${sY}`,
      `C ${toX(0.65)} ${sY}, ${toX(0.8)} ${y4}, ${x4} ${y4}`,
    ].join(' ');
  };

  const sample = useCallback(() => {
    const idx = Math.floor(Math.random() * TRAJECTORIES.length);
    setSampledIndices((prev) => [...prev, idx]);
  }, []);

  const reset = useCallback(() => setSampledIndices([]), []);

  const returns = sampledIndices.map((i) => TRAJECTORIES[i].returnFromS);
  const vEst =
    returns.length > 0
      ? returns.reduce((a, b) => a + b, 0) / returns.length
      : null;
  const stdDev =
    returns.length > 1
      ? Math.sqrt(
          returns.reduce((s, r) => s + (r - vEst) ** 2, 0) / returns.length,
        )
      : 0;

  const retMin = -12;
  const retMax = 24;
  const lineY = H_PATHS + 50;
  const retToX = (r) => padX + ((r - retMin) / (retMax - retMin)) * plotW;

  const stacks = {};
  const dotPositions = returns.map((r, i) => {
    const key = r.toString();
    stacks[key] = (stacks[key] || 0) + 1;
    return {
      value: r,
      stack: stacks[key] - 1,
      color: COLORS[sampledIndices[i] % COLORS.length],
    };
  });

  const maxStack = Math.max(0, ...Object.values(stacks));
  const latest =
    sampledIndices.length > 0
      ? sampledIndices[sampledIndices.length - 1]
      : null;

  const css = `
  .mcv-card{
    border-radius:16px; padding:14px;
    border:1px solid var(--divider);
    background:rgba(0,0,0,0.10);
    backdrop-filter:blur(10px);
  }
  :root[data-theme="light"] .mcv-card{ background:rgba(255,255,255,0.70); }

  .mcv-top{
    display:flex; align-items:center; justify-content:space-between;
    gap:12px; margin-bottom:10px; flex-wrap:wrap;
  }
  .mcv-title{ font-weight:600; color:var(--text); margin:0; font-size:0.98rem; }
  .mcv-actions{ display:flex; gap:8px; }

  .mcv-btn{
    border:1px solid color-mix(in srgb, var(--accent) 45%, transparent);
    background:color-mix(in srgb, var(--accent) 18%, transparent);
    color:var(--text); padding:8px 14px; border-radius:999px;
    cursor:pointer; font:inherit; white-space:nowrap;
    transition:transform .08s ease, background .15s ease;
  }
  .mcv-btn:hover{
    background:color-mix(in srgb, var(--accent) 28%, transparent);
    border-color:color-mix(in srgb, var(--accent) 60%, transparent);
  }
  .mcv-btn:active{ transform:translateY(1px); }

  .mcv-svg{
    width:100%; border-radius:14px;
    border:1px solid var(--divider);
    background:rgba(0,0,0,0.06);
    display:block;
  }
  :root[data-theme="light"] .mcv-svg{ background:rgba(15,23,42,0.03); }

  .mcv-stats{
    display:flex; flex-wrap:wrap; gap:10px 18px;
    margin-top:10px; color:var(--muted); font-size:0.92rem;
  }
  .mcv-stats strong{ color:var(--text); font-weight:600; }
  .mcv-mono{ font-variant-numeric:tabular-nums; }
  `;

  return (
    <div className='mcv-card'>
      <style>{css}</style>

      <div className='mcv-top'>
        <p className='mcv-title'>
          MC returns from state S — same state, different outcomes
        </p>
        <div className='mcv-actions'>
          <button type='button' className='mcv-btn' onClick={sample}>
            Sample trajectory
          </button>
          <button type='button' className='mcv-btn' onClick={reset}>
            Reset
          </button>
        </div>
      </div>

      <svg
        className='mcv-svg'
        viewBox={`0 0 ${W} ${TOTAL_H}`}
        role='img'
        aria-label='Monte Carlo variance visualization'
      >
        {/* Background trajectory paths (always visible, faded) */}
        {TRAJECTORIES.map((traj, i) => (
          <path
            key={`bg-${i}`}
            d={getPathD(traj)}
            fill='none'
            stroke={COLORS[i]}
            strokeWidth='2'
            opacity='0.12'
            strokeDasharray='6 4'
          />
        ))}

        {/* Sampled trajectories (highlighted) */}
        {sampledIndices.map((trajIdx, sIdx) => {
          const isLatest = sIdx === sampledIndices.length - 1;
          return (
            <path
              key={`sampled-${sIdx}`}
              d={getPathD(TRAJECTORIES[trajIdx])}
              fill='none'
              stroke={COLORS[trajIdx]}
              strokeWidth={isLatest ? 3.5 : 2.2}
              opacity={isLatest ? 0.92 : 0.4}
              strokeLinecap='round'
            />
          );
        })}

        {/* Start dots */}
        {TRAJECTORIES.map((traj, i) => {
          const isSampled = sampledIndices.includes(i);
          return (
            <circle
              key={`start-${i}`}
              cx={toX(0)}
              cy={toY(traj.startY)}
              r='4'
              fill={COLORS[i]}
              opacity={isSampled ? 0.8 : 0.2}
            />
          );
        })}

        {/* End dots */}
        {TRAJECTORIES.map((traj, i) => {
          const isSampled = sampledIndices.includes(i);
          return (
            <circle
              key={`end-${i}`}
              cx={toX(1)}
              cy={toY(traj.endY)}
              r='4'
              fill={COLORS[i]}
              opacity={isSampled ? 0.8 : 0.2}
            />
          );
        })}

        {/* Return labels at trajectory endpoints */}
        {TRAJECTORIES.map((traj, i) => {
          const x = toX(1) + 10;
          const y = toY(traj.endY) + 4;
          const isSampled = sampledIndices.includes(i);
          return (
            <text
              key={`lbl-${i}`}
              x={x}
              y={y}
              fontSize='12'
              fill={COLORS[i]}
              opacity={isSampled ? 0.9 : 0.22}
              fontWeight={latest === i ? 700 : 400}
            >
              G={traj.returnFromS > 0 ? '+' : ''}
              {traj.returnFromS}
            </text>
          );
        })}

        {/* State S glow + node */}
        <circle cx={sX} cy={sY} r='22' fill='var(--accent)' opacity='0.10' />
        <circle cx={sX} cy={sY} r='10' fill='var(--accent)' opacity='0.85' />
        <text
          x={sX}
          y={sY - 28}
          textAnchor='middle'
          fontSize='14'
          fontWeight='600'
          fill='var(--text)'
        >
          State S
        </text>

        {/* Labels */}
        <text
          x={toX(0)}
          y={padTop - 14}
          textAnchor='middle'
          fontSize='11'
          fill='var(--muted)'
          opacity='0.6'
        >
          start
        </text>
        <text
          x={toX(1)}
          y={padTop - 14}
          textAnchor='middle'
          fontSize='11'
          fill='var(--muted)'
          opacity='0.6'
        >
          terminal
        </text>

        {/* Separator */}
        <line
          x1={padX}
          y1={H_PATHS}
          x2={W - padX}
          y2={H_PATHS}
          stroke='var(--divider)'
          opacity='0.5'
        />

        {/* Number line axis */}
        <text
          x={padX / 2}
          y={lineY + 4}
          textAnchor='middle'
          fontSize='11'
          fill='var(--muted)'
        >
          G(S)
        </text>
        <line
          x1={padX}
          y1={lineY}
          x2={W - padX}
          y2={lineY}
          stroke='var(--muted)'
          opacity='0.35'
          strokeWidth='1.5'
        />

        {/* Tick marks */}
        {Array.from(
          { length: Math.floor((retMax - retMin) / 2) + 1 },
          (_, i) => {
            const val = retMin + i * 2;
            const x = retToX(val);
            return (
              <g key={`tick-${i}`}>
                <line
                  x1={x}
                  y1={lineY - 4}
                  x2={x}
                  y2={lineY + 4}
                  stroke='var(--muted)'
                  opacity='0.35'
                />
                {val % 4 === 0 && (
                  <text
                    x={x}
                    y={lineY + 18}
                    textAnchor='middle'
                    fontSize='10'
                    fill='var(--muted)'
                    opacity='0.5'
                  >
                    {val}
                  </text>
                )}
              </g>
            );
          },
        )}

        {/* Sampled return dots (stacked) */}
        {dotPositions.map((dp, i) => (
          <circle
            key={`dot-${i}`}
            cx={retToX(dp.value)}
            cy={lineY - 10 - dp.stack * 13}
            r='5.5'
            fill={dp.color}
            opacity={i === dotPositions.length - 1 ? 0.95 : 0.65}
          />
        ))}

        {/* V(s) estimate line */}
        {vEst !== null && (
          <>
            <line
              x1={retToX(vEst)}
              y1={lineY - 8 - maxStack * 13}
              x2={retToX(vEst)}
              y2={lineY + 5}
              stroke='var(--accent)'
              strokeWidth='2.5'
              opacity='0.85'
              strokeDasharray='4 3'
            />
            <text
              x={retToX(vEst)}
              y={lineY + 32}
              textAnchor='middle'
              fontSize='12'
              fontWeight='600'
              fill='var(--accent)'
            >
              V̂(S) = {vEst.toFixed(1)}
            </text>
          </>
        )}
      </svg>

      <div className='mcv-stats'>
        <div>
          <strong>Samples:</strong>{' '}
          <span className='mcv-mono'>{returns.length}</span>
        </div>
        {vEst !== null && (
          <>
            <div>
              <strong>V̂(S):</strong>{' '}
              <span className='mcv-mono'>{vEst.toFixed(2)}</span>
            </div>
            <div>
              <strong>Std dev:</strong>{' '}
              <span className='mcv-mono'>{stdDev.toFixed(2)}</span>
            </div>
          </>
        )}
        {returns.length === 0 && (
          <div>Click &ldquo;Sample trajectory&rdquo; to see how returns vary</div>
        )}
      </div>
    </div>
  );
}
