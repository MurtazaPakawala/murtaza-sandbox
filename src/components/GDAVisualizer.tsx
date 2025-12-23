import React, { useMemo, useState } from "react";

/**
 * GDA Generative Visualizer (clean)
 */

type Vec2 = [number, number];
type Mat2 = [[number, number], [number, number]];
type Point = { x: number; y: number; label: 0 | 1 };

// ---------- RNG ----------
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function randn(rng: () => number) {
  let u = 0,
    v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ---------- Math helpers ----------
function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}
function add(a: Vec2, b: Vec2): Vec2 {
  return [a[0] + b[0], a[1] + b[1]];
}
function covarianceFrom(sx: number, sy: number, rho: number): Mat2 {
  const r = clamp(rho, -0.95, 0.95);
  const s11 = sx * sx;
  const s22 = sy * sy;
  const s12 = r * sx * sy;
  return [
    [s11, s12],
    [s12, s22],
  ];
}
function chol2(S: Mat2): Mat2 {
  const a = S[0][0];
  const b = S[0][1];
  const c = S[1][1];
  const L00 = Math.sqrt(Math.max(a, 1e-12));
  const L10 = b / L00;
  const L11 = Math.sqrt(Math.max(c - L10 * L10, 1e-12));
  return [
    [L00, 0],
    [L10, L11],
  ];
}
function matVecMul(L: Mat2, v: Vec2): Vec2 {
  return [L[0][0] * v[0] + L[0][1] * v[1], L[1][0] * v[0] + L[1][1] * v[1]];
}
function sampleGaussian2(rng: () => number, mu: Vec2, Sigma: Mat2): Vec2 {
  const L = chol2(Sigma);
  const z: Vec2 = [randn(rng), randn(rng)];
  return add(mu, matVecMul(L, z));
}
function eigenSym2(S: Mat2) {
  const a = S[0][0];
  const b = S[0][1];
  const c = S[1][1];

  const tr = a + c;
  const det = a * c - b * b;
  const disc = Math.sqrt(Math.max(tr * tr - 4 * det, 0));
  const l1 = (tr + disc) / 2;
  const l2 = (tr - disc) / 2;

  let v1: Vec2;
  if (Math.abs(b) > 1e-9) v1 = [l1 - c, b];
  else v1 = a >= c ? [1, 0] : [0, 1];

  const norm = Math.hypot(v1[0], v1[1]) || 1;
  v1 = [v1[0] / norm, v1[1] / norm];
  const angle = Math.atan2(v1[1], v1[0]);
  return { l1, l2, angle };
}
function corrFromSigma(S: Mat2) {
  const sx = Math.sqrt(Math.max(S[0][0], 1e-12));
  const sy = Math.sqrt(Math.max(S[1][1], 1e-12));
  return S[0][1] / (sx * sy);
}
function fmt(n: number) {
  if (!Number.isFinite(n)) return "—";
  return Math.abs(n) >= 100 ? n.toFixed(1) : n.toFixed(3);
}

// ---------- Component ----------
export default function GDAVisualizer() {
  // TRUE params (fixed)
  const N = 240;
  const phi = 0.5;
  const mu0: Vec2 = [-1.4, -0.5];
  const mu1: Vec2 = [1.4, 0.8];
  const sigmaX = 1.0;
  const sigmaY = 0.75;
  const rhoTrue = 0.25;

  const SigmaTrue = useMemo(() => covarianceFrom(sigmaX, sigmaY, rhoTrue), []);
  const rhoLabel = useMemo(() => corrFromSigma(SigmaTrue), [SigmaTrue]);

  // seed + stable RNG for interactive sampling
  const [seed, setSeed] = useState(7);

  // store points as state so we can append
  const [points, setPoints] = useState<Point[]>(() => {
    const rng = mulberry32(seed);
    const pts: Point[] = [];
    for (let i = 0; i < N; i++) {
      const y: 0 | 1 = rng() < phi ? 1 : 0;
      const mu = y === 0 ? mu0 : mu1;
      const v = sampleGaussian2(rng, mu, SigmaTrue);
      pts.push({ x: v[0], y: v[1], label: y });
    }
    return pts;
  });

  // Re-sample a fresh dataset
  const onShuffle = () => {
    setSeed((s) => (s + 1) % 1_000_000);
    setPoints(() => {
      const rng = mulberry32((seed + 1) % 1_000_000);
      const pts: Point[] = [];
      for (let i = 0; i < N; i++) {
        const y: 0 | 1 = rng() < phi ? 1 : 0;
        const mu = y === 0 ? mu0 : mu1;
        const v = sampleGaussian2(rng, mu, SigmaTrue);
        pts.push({ x: v[0], y: v[1], label: y });
      }
      return pts;
    });
  };

  // Add one point from a chosen class (x ~ N(mu_y, Sigma), y fixed)
  const addPoint = (label: 0 | 1) => {
    // use a derived seed so "Add point" is stable & deterministic
    const nextSeed = (seed * 1664525 + 1013904223) % 1_000_000;
    const rng = mulberry32(nextSeed);
    const mu = label === 0 ? mu0 : mu1;
    const v = sampleGaussian2(rng, mu, SigmaTrue);
    setSeed(nextSeed);
    setPoints((prev) => [...prev, { x: v[0], y: v[1], label }]);
  };

  // Bounds
  const bounds = useMemo(() => {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    for (const p of points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    // include true means
    const extras: Vec2[] = [mu0, mu1];
    for (const v of extras) {
      minX = Math.min(minX, v[0]);
      maxX = Math.max(maxX, v[0]);
      minY = Math.min(minY, v[1]);
      maxY = Math.max(maxY, v[1]);
    }

    const dx = maxX - minX || 1;
    const dy = maxY - minY || 1;
    return {
      xLo: minX - 0.25 * dx,
      xHi: maxX + 0.25 * dx,
      yLo: minY - 0.25 * dy,
      yHi: maxY + 0.25 * dy,
    };
  }, [points]);

  // SVG
  const W = 860;
  const H = 460;
  const pad = 54;

  const X = (v: number) => pad + ((v - bounds.xLo) / (bounds.xHi - bounds.xLo)) * (W - 2 * pad);
  const Y = (v: number) => H - pad - ((v - bounds.yLo) / (bounds.yHi - bounds.yLo)) * (H - 2 * pad);

  // True ellipse (2σ) from SigmaTrue
  const ellTrue = useMemo(() => {
    const { l1, l2, angle } = eigenSym2(SigmaTrue);
    return { rx: 2 * Math.sqrt(Math.max(l1, 1e-12)), ry: 2 * Math.sqrt(Math.max(l2, 1e-12)), angle };
  }, [SigmaTrue]);

  const pxPerX = (W - 2 * pad) / (bounds.xHi - bounds.xLo);
  const pxPerY = (H - 2 * pad) / (bounds.yHi - bounds.yLo);
  const trueRxPx = ellTrue.rx * pxPerX;
  const trueRyPx = ellTrue.ry * pxPerY;

  // Grid
  const gridX = 10;
  const gridY = 6;

  // Colors
  const C0 = "#60a5fa";
  const C1 = "#fb923c";

  const css = `
  .gda-card{
    border-radius: 16px;
    padding: 14px;
    border: 1px solid var(--divider);
    background: rgba(0,0,0,0.10);
    backdrop-filter: blur(10px);
  }
  :root[data-theme="light"] .gda-card{ background: rgba(255,255,255,0.70); }

  .gda-top{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    margin-bottom:10px;
  }

  .gda-actions{
    display:flex;
    gap:10px;
    flex-wrap:wrap;
    justify-content:flex-end;
  }

  .gda-btn{
    border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    color: var(--text);
    padding: 9px 14px;
    border-radius: 999px;
    cursor: pointer;
    font: inherit;
    transition: transform .08s ease, background .15s ease, border-color .15s ease;
    white-space:nowrap;
  }
  .gda-btn:hover{
    background: color-mix(in srgb, var(--accent) 28%, transparent);
    border-color: color-mix(in srgb, var(--accent) 60%, transparent);
  }
  .gda-btn:active{ transform: translateY(1px); }

  .gda-btn0{
    border-color: color-mix(in srgb, ${C0} 55%, transparent);
    background: color-mix(in srgb, ${C0} 14%, transparent);
  }
  .gda-btn0:hover{
    background: color-mix(in srgb, ${C0} 20%, transparent);
    border-color: color-mix(in srgb, ${C0} 70%, transparent);
  }

  .gda-btn1{
    border-color: color-mix(in srgb, ${C1} 55%, transparent);
    background: color-mix(in srgb, ${C1} 14%, transparent);
  }
  .gda-btn1:hover{
    background: color-mix(in srgb, ${C1} 20%, transparent);
    border-color: color-mix(in srgb, ${C1} 70%, transparent);
  }

  .gda-plotCard{
    border-radius: 16px;
    padding: 12px;
    border: 1px solid var(--divider);
    background: rgba(0,0,0,0.06);
  }
  :root[data-theme="light"] .gda-plotCard{ background: rgba(15,23,42,0.03); }

  .gda-svg{
    width:100%;
    border-radius:14px;
    border:1px solid var(--divider);
    background: rgba(0,0,0,0.04);
    display:block;
  }
  :root[data-theme="light"] .gda-svg{ background: rgba(15,23,42,0.02); }

  .gda-footer{
    margin-top:12px;
    color:var(--muted);
    font-size:0.95rem;
    display:flex;
    flex-wrap:wrap;
    gap:12px 18px;
    align-items:center;
  }
  .gda-footer strong{ color:var(--text); font-weight:600; }
  .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric: tabular-nums; }
  .c0{ color:${C0}; }
  .c1{ color:${C1}; }
  `;

  return (
    <div className="gda-card">
      <style>{css}</style>

      {/* no title/details — only buttons */}
      <div className="gda-top">
        <div />
        <div className="gda-actions">
          <button type="button" className="gda-btn" onClick={onShuffle}>
            Shuffle points
          </button>
          <button type="button" className="gda-btn gda-btn0" onClick={() => addPoint(0)}>
            Add class 0 point
          </button>
          <button type="button" className="gda-btn gda-btn1" onClick={() => addPoint(1)}>
            Add class 1 point
          </button>
        </div>
      </div>

      <div className="gda-plotCard">
        <svg className="gda-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="GDA generative sampler">
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
                stroke="var(--divider)"
                opacity="0.7"
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
                stroke="var(--divider)"
                opacity="0.7"
              />
            );
          })}

          {/* axes */}
          <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--muted)" opacity="0.55" />
          <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="var(--muted)" opacity="0.55" />

          {/* plot boundary */}
          <rect
            x={pad}
            y={pad}
            width={W - 2 * pad}
            height={H - 2 * pad}
            fill="transparent"
            stroke="var(--divider)"
            opacity="0.8"
          />

          {/* true ellipses (dashed) + true means */}
          {[{ mu: mu0, col: C0 }, { mu: mu1, col: C1 }].map((obj, idx) => {
            const cx = X(obj.mu[0]);
            const cy = Y(obj.mu[1]);
            const deg = (ellTrue.angle * 180) / Math.PI;
            return (
              <g key={`true-${idx}`}>
                <ellipse
                  cx={cx}
                  cy={cy}
                  rx={trueRxPx}
                  ry={trueRyPx}
                  fill="none"
                  stroke="var(--muted)"
                  opacity="0.70"
                  strokeDasharray="7 6"
                  strokeWidth="2"
                  transform={`rotate(${deg} ${cx} ${cy})`}
                />
                <circle cx={cx} cy={cy} r="6" fill={obj.col} opacity="0.95" />
                <circle cx={cx} cy={cy} r="14" fill={obj.col} opacity="0.14" />
              </g>
            );
          })}

          {/* points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={X(p.x)}
              cy={Y(p.y)}
              r="4.0"
              fill={p.label === 0 ? C0 : C1}
              opacity="0.85"
            />
          ))}
        </svg>
      </div>

      {/* bottom: TRUE params only */}
      <div className="gda-footer">
        <div>
          <strong>φ:</strong> <span className="mono">{fmt(phi)}</span>
        </div>
        <div>
          <strong>μ₀:</strong>{" "}
          <span className="mono c0">
            ({fmt(mu0[0])}, {fmt(mu0[1])})
          </span>
        </div>
        <div>
          <strong>μ₁:</strong>{" "}
          <span className="mono c1">
            ({fmt(mu1[0])}, {fmt(mu1[1])})
          </span>
        </div>
        <div>
          <strong>σx, σy:</strong> <span className="mono">{fmt(sigmaX)}, {fmt(sigmaY)}</span>
        </div>
        <div>
          <strong>ρ:</strong> <span className="mono">{fmt(rhoLabel)}</span>
        </div>
      </div>
    </div>
  );
}
