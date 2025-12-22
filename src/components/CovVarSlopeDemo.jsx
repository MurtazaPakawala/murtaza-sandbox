import React, { useMemo, useState } from 'react';

/** deterministic rng so Shuffle is stable */
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function randn(rng) {
  let u = 0,
    v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function mean(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
function variance(x) {
  const xb = mean(x);
  let s = 0;
  for (let i = 0; i < x.length; i++) s += (x[i] - xb) ** 2;
  return s / x.length;
}
function cov(x, y) {
  const xb = mean(x);
  const yb = mean(y);
  let s = 0;
  for (let i = 0; i < x.length; i++) s += (x[i] - xb) * (y[i] - yb);
  return s / x.length;
}

export default function CovVarSlopeDemo() {
  // We want Cov(X,Y) ≈ C (constant)
  const COV_TARGET = 1.0;

  const [xSpread, setXSpread] = useState(1.0); // controls Var(X)
  const [seed, setSeed] = useState(7);

  const n = 26;
  const noiseSigma = 0.55; // keep fixed (independent noise)

  const { x, y, xBar, yBar, varX, covXY, bTrue, bHat, aHat, domain, range } =
    useMemo(() => {
      const rng = mulberry32(seed);

      // 1) generate X with controllable spread
      const x = Array.from({ length: n }, () => xSpread * randn(rng));
      const varX = Math.max(variance(x), 1e-9);

      // 2) choose slope so population Cov is (approximately) constant: b = C / Var(X)
      const bTrue = COV_TARGET / varX;

      // 3) generate Y using that slope + independent noise
      const aTrue = 0.25; // just a vertical shift for aesthetics
      const y = x.map((xi) => aTrue + bTrue * xi + noiseSigma * randn(rng));

      // sample stats
      const xBar = mean(x);
      const yBar = mean(y);
      const covXY = cov(x, y);

      // OLS fit from samples
      const bHat = covXY / varX;
      const aHat = yBar - bHat * xBar;

      // padded bounds
      const xMin = Math.min(...x);
      const xMax = Math.max(...x);
      const yMin = Math.min(...y);
      const yMax = Math.max(...y);
      const xPad = 0.2 * (xMax - xMin + 1e-6);
      const yPad = 0.2 * (yMax - yMin + 1e-6);

      return {
        x,
        y,
        xBar,
        yBar,
        varX,
        covXY,
        bTrue,
        bHat,
        aHat,
        domain: [xMin - xPad, xMax + xPad],
        range: [yMin - yPad, yMax + yPad],
      };
    }, [xSpread, seed]);

  // ---- SVG mapping ----
  const W = 760;
  const H = 400;
  const pad = 44;

  const [xLo, xHi] = domain;
  const [yLo, yHi] = range;

  const X = (v) => pad + ((v - xLo) / (xHi - xLo)) * (W - 2 * pad);
  const Y = (v) => H - pad - ((v - yLo) / (yHi - yLo)) * (H - 2 * pad);

  const fittedY = (xVal) => aHat + bHat * xVal;

  const lineSeg = (fn) => ({
    x1: X(xLo),
    y1: Y(fn(xLo)),
    x2: X(xHi),
    y2: Y(fn(xHi)),
  });

  const fitted = lineSeg(fittedY);
  const meanPoint = { cx: X(xBar), cy: Y(yBar) };

  const onShuffle = () => setSeed((s) => (s + 1) % 1_000_000);

  const gridX = 10;
  const gridY = 6;

  const css = `
  .cv-card{
    border-radius: 16px;
    padding: 14px;
    border: 1px solid var(--divider);
    background: rgba(0,0,0,0.10);
    backdrop-filter: blur(10px);
  }
  :root[data-theme="light"] .cv-card{ background: rgba(255,255,255,0.70); }

  .cv-top{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; }
  .cv-title{ font-weight:600; letter-spacing:-0.01em; color:var(--text); margin:0; font-size:0.98rem; }

  .cv-btn{
    border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    color: var(--text);
    padding: 8px 12px;
    border-radius: 12px;
    cursor: pointer;
    font: inherit;
    transition: transform .08s ease, background .15s ease, border-color .15s ease;
  }
  .cv-btn:hover{
    background: color-mix(in srgb, var(--accent) 28%, transparent);
    border-color: color-mix(in srgb, var(--accent) 60%, transparent);
  }
  .cv-btn:active{ transform: translateY(1px); }

  .cv-sliderRow{ display:flex; align-items:center; gap:12px; margin:8px 0 10px; }
  .cv-label{ color:var(--muted); font-size:0.92rem; min-width:140px; }
  .cv-val{ color:var(--text); font-variant-numeric:tabular-nums; font-size:0.92rem; min-width:170px; text-align:right; }
  .cv-range{ width:100%; }

  .cv-svg{
    width:100%;
    border-radius:14px;
    border:1px solid var(--divider);
    background: rgba(0,0,0,0.06);
    display:block;
  }
  :root[data-theme="light"] .cv-svg{ background: rgba(15,23,42,0.03); }

  .cv-metrics{
    display:flex; flex-wrap:wrap; gap:10px 16px;
    margin-top:10px; color:var(--muted); font-size:0.92rem;
  }
  .cv-metrics strong{ color:var(--text); font-weight:600; }
  `;

  return (
    <div className='cv-card'>
      <style>{css}</style>

      <div className='cv-top'>
        <p className='cv-title'>
          Hold Cov(X,Y) ≈ constant, change Var(X) ⇒ slope must change (b =
          Cov/Var)
        </p>
        <button type='button' className='cv-btn' onClick={onShuffle}>
          Shuffle points
        </button>
      </div>

      <div className='cv-sliderRow'>
        <div className='cv-label'>Increase Var(X)</div>
        <input
          className='cv-range'
          type='range'
          min={0.15}
          max={3.0}
          step={0.01}
          value={xSpread}
          onChange={(e) => setXSpread(parseFloat(e.target.value))}
        />
        <div className='cv-val'>
          Var(X)={varX.toFixed(3)} | target Cov={COV_TARGET.toFixed(2)}
        </div>
      </div>

      <svg
        className='cv-svg'
        viewBox={`0 0 ${W} ${H}`}
        role='img'
        aria-label='Cov fixed vs Var demo'
      >
        {/* grid */}
        {Array.from({ length: gridX + 1 }, (_, i) => {
          const gx = pad + (i / gridX) * (W - 2 * pad);
          return (
            <line
              key={`gx-${i}`}
              x1={gx}
              y1={pad}
              x2={gx}
              y2={H - pad}
              stroke='var(--divider)'
              opacity='0.7'
            />
          );
        })}
        {Array.from({ length: gridY + 1 }, (_, i) => {
          const gy = pad + (i / gridY) * (H - 2 * pad);
          return (
            <line
              key={`gy-${i}`}
              x1={pad}
              y1={gy}
              x2={W - pad}
              y2={gy}
              stroke='var(--divider)'
              opacity='0.7'
            />
          );
        })}

        {/* axes */}
        <line
          x1={pad}
          y1={H - pad}
          x2={W - pad}
          y2={H - pad}
          stroke='var(--muted)'
          opacity='0.55'
        />
        <line
          x1={pad}
          y1={pad}
          x2={pad}
          y2={H - pad}
          stroke='var(--muted)'
          opacity='0.55'
        />

        {/* fitted line */}
        <line
          x1={fitted.x1}
          y1={fitted.y1}
          x2={fitted.x2}
          y2={fitted.y2}
          stroke='var(--text)'
          opacity='0.9'
          strokeWidth='3.0'
        />

        {/* points */}
        {x.map((xi, i) => (
          <circle
            key={i}
            cx={X(xi)}
            cy={Y(y[i])}
            r='4.2'
            fill='var(--muted)'
            opacity='0.85'
          />
        ))}

        {/* mean point */}
        <circle
          cx={meanPoint.cx}
          cy={meanPoint.cy}
          r='16'
          fill='var(--accent)'
          opacity='0.18'
        />
        <circle
          cx={meanPoint.cx}
          cy={meanPoint.cy}
          r='6'
          fill='var(--accent)'
          opacity='0.95'
        />
        <text
          x={meanPoint.cx + 10}
          y={meanPoint.cy - 10}
          fontSize='12'
          fill='var(--accent)'
          opacity='0.95'
        >
          (x̄, ȳ)
        </text>
      </svg>

      <div className='cv-metrics'>
        <div>
          <strong>by construction:</strong> b_true = Cov/Var ={' '}
          {bTrue.toFixed(3)}
        </div>
        <div>
          <strong>sample:</strong> Cov(X,Y)={covXY.toFixed(3)}, b̂=
          {bHat.toFixed(3)}, â={aHat.toFixed(3)}
        </div>
        <div>
          <strong>mean:</strong> (x̄, ȳ)=({xBar.toFixed(3)}, {yBar.toFixed(3)})
        </div>
      </div>
    </div>
  );
}
