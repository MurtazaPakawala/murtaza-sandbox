import React, { useState, useCallback } from 'react';

const COLORS = [
  '#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#fb923c',
];

const GAMMA = 0.99;
const TRUE_V_S = 5.33;
const S_NORM_Y = 0.5;

const TRAJECTORIES = [
  { startY: 0.88, sPrevY: 0.62, endY: 0.85, reward: 2, returnFromS: 14 },
  { startY: 0.12, sPrevY: 0.38, endY: 0.05, reward: -1, returnFromS: -6 },
  { startY: 0.68, sPrevY: 0.56, endY: 0.70, reward: 3, returnFromS: 8 },
  { startY: 0.28, sPrevY: 0.42, endY: 0.35, reward: 0, returnFromS: 2 },
  { startY: 0.92, sPrevY: 0.64, endY: 0.18, reward: 1, returnFromS: -4 },
  { startY: 0.40, sPrevY: 0.46, endY: 0.98, reward: 2, returnFromS: 18 },
];

function computeVHat(initialGuess, observedReturns) {
  if (observedReturns.length === 0) return initialGuess;
  const sum = observedReturns.reduce((a, b) => a + b, 0);
  return (initialGuess + sum) / (1 + observedReturns.length);
}

export default function TDBiasDemo() {
  const [initialGuess, setInitialGuess] = useState(10.0);
  const [sampledData, setSampledData] = useState([]);

  const observedReturns = sampledData.map((d) => d.returnFromS);
  const currentVHat = computeVHat(initialGuess, observedReturns);
  const hasStarted = sampledData.length > 0;

  const sample = useCallback(() => {
    const idx = Math.floor(Math.random() * TRAJECTORIES.length);
    const traj = TRAJECTORIES[idx];
    setSampledData((prev) => {
      const prevReturns = prev.map((d) => d.returnFromS);
      const vHat = computeVHat(initialGuess, prevReturns);
      return [
        ...prev,
        {
          trajIdx: idx,
          vHatAtTime: vHat,
          tdTarget: traj.reward + GAMMA * vHat,
          returnFromS: traj.returnFromS,
        },
      ];
    });
  }, [initialGuess]);

  const reset = useCallback(() => setSampledData([]), []);

  const tdTargets = sampledData.map((d) => d.tdTarget);
  const tdMean =
    tdTargets.length > 0
      ? tdTargets.reduce((a, b) => a + b, 0) / tdTargets.length
      : null;
  const trueTargets = sampledData.map(
    (d) => TRAJECTORIES[d.trajIdx].reward + GAMMA * TRUE_V_S,
  );
  const trueMean =
    trueTargets.length > 0
      ? trueTargets.reduce((a, b) => a + b, 0) / trueTargets.length
      : null;
  const bias = tdMean !== null && trueMean !== null ? tdMean - trueMean : null;

  const W = 760;
  const H_PATHS = 300;
  const H_LINE = 110;
  const TOTAL_H = H_PATHS + H_LINE + 10;
  const padX = 70;
  const padTop = 36;
  const padBot = 16;
  const plotW = W - 2 * padX;
  const plotH = H_PATHS - padTop - padBot;

  const toX = (t) => padX + t * plotW;
  const toY = (ny) => padTop + (1 - ny) * plotH;

  const sPrevX = toX(0.32);
  const sX = toX(0.5);
  const sY = toY(S_NORM_Y);

  const getFullPathD = (traj) => {
    const x0 = toX(0),
      y0 = toY(traj.startY);
    const spY = toY(traj.sPrevY);
    const x4 = toX(1),
      y4 = toY(traj.endY);
    return [
      `M ${x0} ${y0}`,
      `C ${toX(0.15)} ${y0}, ${toX(0.25)} ${spY}, ${sPrevX} ${spY}`,
      `L ${sX} ${sY}`,
      `C ${toX(0.65)} ${sY}, ${toX(0.8)} ${y4}, ${x4} ${y4}`,
    ].join(' ');
  };

  const getStepD = (traj) =>
    `M ${sPrevX} ${toY(traj.sPrevY)} L ${sX} ${sY}`;

  const retMin = -4;
  const retMax = 16;
  const lineY = H_PATHS + 55;
  const retToX = (r) =>
    padX + ((r - retMin) / (retMax - retMin)) * plotW;

  const stacks = {};
  const dotPositions = sampledData.map((d, i) => {
    const key = d.tdTarget.toFixed(1);
    stacks[key] = (stacks[key] || 0) + 1;
    return {
      value: d.tdTarget,
      stack: stacks[key] - 1,
      color: COLORS[d.trajIdx % COLORS.length],
    };
  });

  const maxStack = Math.max(0, ...Object.values(stacks));
  const sampledTrajSet = new Set(sampledData.map((d) => d.trajIdx));
  const latestData =
    sampledData.length > 0 ? sampledData[sampledData.length - 1] : null;
  const latestTrajIdx = latestData ? latestData.trajIdx : null;

  const css = `
  .tdb-card{
    border-radius:16px; padding:14px;
    border:1px solid var(--divider);
    background:rgba(0,0,0,0.10);
    backdrop-filter:blur(10px);
  }
  :root[data-theme="light"] .tdb-card{ background:rgba(255,255,255,0.70); }

  .tdb-top{
    display:flex; align-items:center; justify-content:space-between;
    gap:12px; margin-bottom:10px; flex-wrap:wrap;
  }
  .tdb-title{ font-weight:600; color:var(--text); margin:0; font-size:0.98rem; }
  .tdb-actions{ display:flex; gap:8px; }

  .tdb-btn{
    border:1px solid color-mix(in srgb, var(--accent) 45%, transparent);
    background:color-mix(in srgb, var(--accent) 18%, transparent);
    color:var(--text); padding:8px 14px; border-radius:999px;
    cursor:pointer; font:inherit; white-space:nowrap;
    transition:transform .08s ease, background .15s ease;
  }
  .tdb-btn:hover{
    background:color-mix(in srgb, var(--accent) 28%, transparent);
    border-color:color-mix(in srgb, var(--accent) 60%, transparent);
  }
  .tdb-btn:active{ transform:translateY(1px); }

  .tdb-svg{
    width:100%; border-radius:14px;
    border:1px solid var(--divider);
    background:rgba(0,0,0,0.06);
    display:block;
  }
  :root[data-theme="light"] .tdb-svg{ background:rgba(15,23,42,0.03); }

  .tdb-sliderRow{
    display:flex; align-items:center; gap:12px;
    margin:0 0 10px; flex-wrap:wrap;
  }
  .tdb-sliderLabel{ color:var(--muted); font-size:0.92rem; min-width:120px; }
  .tdb-sliderVal{
    color:var(--text); font-variant-numeric:tabular-nums;
    font-size:0.92rem; min-width:200px; text-align:right;
  }
  .tdb-range{ flex:1; min-width:120px; }
  .tdb-range:disabled{ opacity:0.4; cursor:not-allowed; }

  .tdb-stats{
    display:flex; flex-wrap:wrap; gap:10px 18px;
    margin-top:10px; color:var(--muted); font-size:0.92rem;
  }
  .tdb-stats strong{ color:var(--text); font-weight:600; }
  .tdb-mono{ font-variant-numeric:tabular-nums; }

  .tdb-formula{
    margin-top:8px; padding:8px 12px;
    border-radius:10px;
    background:rgba(0,0,0,0.06);
    font-size:0.9rem; color:var(--text);
    font-variant-numeric:tabular-nums;
    line-height:1.6;
  }
  :root[data-theme="light"] .tdb-formula{ background:rgba(0,0,0,0.04); }
  `;

  return (
    <div className='tdb-card'>
      <style>{css}</style>

      <div className='tdb-top'>
        <p className='tdb-title'>
          TD bootstrap — V̂(S) learns from trajectories passing through S
        </p>
        <div className='tdb-actions'>
          <button type='button' className='tdb-btn' onClick={sample}>
            Sample trajectory
          </button>
          <button type='button' className='tdb-btn' onClick={reset}>
            Reset
          </button>
        </div>
      </div>

      <div className='tdb-sliderRow'>
        <div className='tdb-sliderLabel'>Initial V̂(S) guess</div>
        <input
          className='tdb-range'
          type='range'
          min={0}
          max={15}
          step={0.1}
          value={initialGuess}
          disabled={hasStarted}
          onChange={(e) => setInitialGuess(parseFloat(e.target.value))}
        />
        <div className='tdb-sliderVal'>
          guess = {initialGuess.toFixed(1)}
          {hasStarted && (
            <span style={{ color: 'var(--accent)' }}>
              {' '}→ current V̂(S) = {currentVHat.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      <svg
        className='tdb-svg'
        viewBox={`0 0 ${W} ${TOTAL_H}`}
        role='img'
        aria-label='TD bias visualization'
      >
        {/* Background trajectory paths (all 6, faded) */}
        {TRAJECTORIES.map((traj, i) => (
          <path
            key={`bg-${i}`}
            d={getFullPathD(traj)}
            fill='none'
            stroke={COLORS[i]}
            strokeWidth='1.5'
            opacity='0.10'
            strokeDasharray='5 5'
          />
        ))}

        {/* Sampled full trajectories (highlighted) */}
        {sampledData.map((d, sIdx) => {
          const isLatest = sIdx === sampledData.length - 1;
          return (
            <path
              key={`full-s-${sIdx}`}
              d={getFullPathD(TRAJECTORIES[d.trajIdx])}
              fill='none'
              stroke={COLORS[d.trajIdx]}
              strokeWidth={isLatest ? 2.8 : 1.8}
              opacity={isLatest ? 0.75 : 0.25}
              strokeLinecap='round'
            />
          );
        })}

        {/* Sampled s_prev → S segments (extra thick to emphasise the one step) */}
        {sampledData.map((d, sIdx) => {
          const isLatest = sIdx === sampledData.length - 1;
          return (
            <path
              key={`step-${sIdx}`}
              d={getStepD(TRAJECTORIES[d.trajIdx])}
              fill='none'
              stroke={COLORS[d.trajIdx]}
              strokeWidth={isLatest ? 4 : 2.5}
              opacity={isLatest ? 0.95 : 0.35}
              strokeLinecap='round'
            />
          );
        })}

        {/* s_prev dots */}
        {TRAJECTORIES.map((traj, i) => {
          const isSampled = sampledTrajSet.has(i);
          return (
            <circle
              key={`sp-${i}`}
              cx={sPrevX}
              cy={toY(traj.sPrevY)}
              r={isSampled ? 5 : 3.5}
              fill={COLORS[i]}
              opacity={isSampled ? 0.75 : 0.12}
            />
          );
        })}

        {/* End dots */}
        {TRAJECTORIES.map((traj, i) => {
          const isSampled = sampledTrajSet.has(i);
          return (
            <circle
              key={`end-${i}`}
              cx={toX(1)}
              cy={toY(traj.endY)}
              r='4'
              fill={COLORS[i]}
              opacity={isSampled ? 0.75 : 0.12}
            />
          );
        })}

        {/* Reward labels on s_prev → S */}
        {TRAJECTORIES.map((traj, i) => {
          const isSampled = sampledTrajSet.has(i);
          const spY = toY(traj.sPrevY);
          const midX = (sPrevX + sX) / 2;
          const midY = (spY + sY) / 2 - 10;
          return (
            <text
              key={`rew-${i}`}
              x={midX}
              y={midY}
              textAnchor='middle'
              fontSize='10'
              fill={COLORS[i]}
              opacity={isSampled ? 0.8 : 0.1}
              fontWeight={latestTrajIdx === i ? 600 : 400}
            >
              r={traj.reward > 0 ? '+' : ''}
              {traj.reward}
            </text>
          );
        })}

        {/* Return-from-S labels at endpoints */}
        {TRAJECTORIES.map((traj, i) => {
          const isSampled = sampledTrajSet.has(i);
          return (
            <text
              key={`ret-${i}`}
              x={toX(1) + 10}
              y={toY(traj.endY) + 4}
              fontSize='11'
              fill={COLORS[i]}
              opacity={isSampled ? 0.85 : 0.12}
              fontWeight={latestTrajIdx === i ? 700 : 400}
            >
              G={traj.returnFromS > 0 ? '+' : ''}
              {traj.returnFromS}
            </text>
          );
        })}

        {/* State S node */}
        <circle cx={sX} cy={sY} r='24' fill='var(--accent)' opacity='0.10' />
        <circle cx={sX} cy={sY} r='11' fill='var(--accent)' opacity='0.85' />
        <text
          x={sX}
          y={sY - 32}
          textAnchor='middle'
          fontSize='14'
          fontWeight='600'
          fill='var(--text)'
        >
          State S
        </text>
        <text
          x={sX}
          y={sY + 36}
          textAnchor='middle'
          fontSize='11'
          fontWeight='600'
          fill='var(--accent)'
        >
          V̂(S) = {currentVHat.toFixed(1)}
        </text>

        {/* Column labels */}
        <text
          x={sPrevX}
          y={padTop - 14}
          textAnchor='middle'
          fontSize='11'
          fill='var(--muted)'
          opacity='0.5'
        >
          s_prev
        </text>
        <text
          x={sX}
          y={padTop - 14}
          textAnchor='middle'
          fontSize='11'
          fill='var(--accent)'
          opacity='0.7'
          fontWeight='600'
        >
          S
        </text>
        <text
          x={toX(1)}
          y={padTop - 14}
          textAnchor='middle'
          fontSize='11'
          fill='var(--muted)'
          opacity='0.5'
        >
          terminal
        </text>

        {/* Separator */}
        <line
          x1={padX}
          y1={H_PATHS + 2}
          x2={W - padX}
          y2={H_PATHS + 2}
          stroke='var(--divider)'
          opacity='0.5'
        />

        {/* Number line */}
        <text
          x={padX / 2 + 5}
          y={lineY + 4}
          textAnchor='middle'
          fontSize='10'
          fill='var(--muted)'
        >
          TD target
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

        {/* True target center reference */}
        {trueMean !== null && (
          <>
            <line
              x1={retToX(trueMean)}
              y1={lineY - 28}
              x2={retToX(trueMean)}
              y2={lineY + 5}
              stroke='#fb923c'
              strokeWidth='2'
              opacity='0.5'
              strokeDasharray='3 3'
            />
            <text
              x={retToX(trueMean)}
              y={lineY - 32}
              textAnchor='middle'
              fontSize='10'
              fontWeight='600'
              fill='#fb923c'
              opacity='0.7'
            >
              true target center
            </text>
          </>
        )}

        {/* TD target dots — each locked at the V̂(S) used when sampled */}
        {dotPositions.map((dp, i) => (
          <circle
            key={`dot-${i}`}
            cx={retToX(dp.value)}
            cy={lineY - 10 - dp.stack * 13}
            r='5.5'
            fill={dp.color}
            opacity={i === dotPositions.length - 1 ? 0.95 : 0.6}
          />
        ))}

        {/* TD mean line */}
        {tdMean !== null && (
          <>
            <line
              x1={retToX(tdMean)}
              y1={lineY - 8 - maxStack * 13}
              x2={retToX(tdMean)}
              y2={lineY + 5}
              stroke='var(--accent)'
              strokeWidth='2.5'
              opacity='0.85'
              strokeDasharray='4 3'
            />
            <text
              x={retToX(tdMean)}
              y={lineY + 32}
              textAnchor='middle'
              fontSize='11'
              fontWeight='600'
              fill='var(--accent)'
            >
              TD mean = {tdMean.toFixed(1)}
            </text>

            {bias !== null &&
              Math.abs(retToX(tdMean) - retToX(trueMean)) > 12 && (
                <>
                  <line
                    x1={retToX(trueMean)}
                    y1={lineY + 42}
                    x2={retToX(tdMean)}
                    y2={lineY + 42}
                    stroke='#f87171'
                    strokeWidth='1.5'
                    opacity='0.6'
                  />
                  <text
                    x={(retToX(trueMean) + retToX(tdMean)) / 2}
                    y={lineY + 56}
                    textAnchor='middle'
                    fontSize='10'
                    fontWeight='600'
                    fill='#f87171'
                    opacity='0.8'
                  >
                    bias ≈ {bias.toFixed(1)}
                  </text>
                </>
              )}
          </>
        )}
      </svg>

      {latestData && (
        <div className='tdb-formula'>
          <div>
            Trajectory return from S: G ={' '}
            {TRAJECTORIES[latestData.trajIdx].returnFromS > 0 ? '+' : ''}
            {TRAJECTORIES[latestData.trajIdx].returnFromS}
            &nbsp; → &nbsp;V̂(S) updated to{' '}
            <strong>{currentVHat.toFixed(2)}</strong>
            <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
              {' '}(true: {TRUE_V_S})
            </span>
          </div>
          <div>
            TD target: V̂(s_prev) = r + γV̂(S) = {TRAJECTORIES[latestData.trajIdx].reward} +{' '}
            {GAMMA} × {latestData.vHatAtTime.toFixed(1)} ={' '}
            <strong>{latestData.tdTarget.toFixed(2)}</strong>
          </div>
        </div>
      )}

      <div className='tdb-stats'>
        <div>
          <strong>Samples:</strong>{' '}
          <span className='tdb-mono'>{sampledData.length}</span>
        </div>
        <div>
          <strong>V̂(S):</strong>{' '}
          <span
            className='tdb-mono'
            style={{
              color:
                Math.abs(currentVHat - TRUE_V_S) < 1
                  ? 'var(--accent)'
                  : '#f87171',
            }}
          >
            {currentVHat.toFixed(2)}
          </span>
          <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
            {' '}(true: {TRUE_V_S})
          </span>
        </div>
        {bias !== null && (
          <div>
            <strong>Bias:</strong>{' '}
            <span
              className='tdb-mono'
              style={{
                color: Math.abs(bias) < 0.5 ? 'var(--accent)' : '#f87171',
              }}
            >
              {bias > 0 ? '+' : ''}
              {bias.toFixed(2)}
            </span>
          </div>
        )}
        {sampledData.length === 0 && (
          <div>
            Set the initial V̂(S) guess, then sample trajectories — watch V̂(S)
            improve and bias shrink
          </div>
        )}
      </div>
    </div>
  );
}
