import React, { useMemo, useRef, useState } from 'react';

export default function RegressionDistances({
  width = 820,
  height = 420,
  pointCount = 18,
}) {
  // Generate a deterministic dataset (so your blog doesn't change every refresh)
  const points = useMemo(() => {
    // simple seeded-ish generator
    let seed = 1337;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const xs = [];
    for (let i = 0; i < pointCount; i++) {
      xs.push(0.08 + (0.84 * i) / (pointCount - 1));
    }

    // underlying line + noise
    const a = 0.18; // intercept in normalized coords
    const b = 0.68; // slope in normalized coords

    return xs.map((x) => {
      const noise = (rand() - 0.5) * 0.18;
      const y = a + b * x + noise;
      return { x, y: clamp(y, 0.06, 0.94) };
    });
  }, [pointCount]);

  const [metric, setMetric] = useState('vertical'); // vertical | orthogonal | absolute
  const [showProjections, setShowProjections] = useState(true);

  // Represent the line by two draggable points in normalized coords
  const [line, setLine] = useState({
    p1: { x: 0.12, y: 0.2 },
    p2: { x: 0.88, y: 0.82 },
  });

  const svgRef = useRef(null);
  const dragRef = useRef(null);

  const padding = 40;
  const plot = {
    x0: padding,
    y0: padding,
    w: width - 2 * padding,
    h: height - 2 * padding,
  };

  const toPx = (p) => ({
    x: plot.x0 + p.x * plot.w,
    y: plot.y0 + (1 - p.y) * plot.h,
  });

  const toNorm = (px) => ({
    x: clamp((px.x - plot.x0) / plot.w, 0, 1),
    y: clamp(1 - (px.y - plot.y0) / plot.h, 0, 1),
  });

  const lineParams = useMemo(() => {
    // line through p1 and p2 in normalized coords
    const { p1, p2 } = line;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    // handle near-vertical; we’ll still draw but distances use robust form
    const isVertical = Math.abs(dx) < 1e-6;

    // slope/intercept in normalized coordinates y = m x + c
    const m = isVertical ? Infinity : dy / dx;
    const c = isVertical ? null : p1.y - m * p1.x;

    // line in Ax + By + C = 0 form for orthogonal projections
    // Through (x1,y1), (x2,y2): A = y1-y2, B = x2-x1, C = x1y2-x2y1
    const A = p1.y - p2.y;
    const B = p2.x - p1.x;
    const C = p1.x * p2.y - p2.x * p1.y;

    const norm = Math.hypot(A, B) || 1;

    return { isVertical, m, c, A, B, C, norm };
  }, [line]);

  const distances = useMemo(() => {
    if (!showProjections) return [];

    return points.map((pt) => {
      const { A, B, C, norm, isVertical, m, c } = lineParams;

      // compute projection point on the line depending on metric
      let proj = null;

      if (metric === 'vertical' || metric === 'absolute') {
        // vertical: keep x fixed, find y on line at that x
        if (isVertical) {
          // if vertical line, vertical residual doesn't make sense (infinite slope).
          // fallback: use orthogonal projection
          proj = orthogonalProjection(pt, { A, B, C });
        } else {
          proj = { x: pt.x, y: m * pt.x + c };
        }
      } else if (metric === 'orthogonal') {
        proj = orthogonalProjection(pt, { A, B, C });
      }

      // distance value
      let d = 0;
      if (metric === 'orthogonal') {
        d = Math.abs(A * pt.x + B * pt.y + C) / norm;
      } else if (metric === 'absolute') {
        d = Math.abs(pt.y - proj.y);
      } else {
        // vertical squared residual uses same geometry but you square it later
        d = pt.y - proj.y; // signed
      }

      return { pt, proj, d };
    });
  }, [points, lineParams, metric, showProjections]);

  const summary = useMemo(() => {
    if (!showProjections) return { label: '—', value: 0 };

    if (metric === 'vertical') {
      const sse = distances.reduce((acc, r) => acc + r.d * r.d, 0);
      return { label: 'Sum of squared vertical residuals (SSE)', value: sse };
    }
    if (metric === 'absolute') {
      const l1 = distances.reduce((acc, r) => acc + Math.abs(r.d), 0);
      return { label: 'Sum of absolute vertical residuals (L1)', value: l1 };
    }
    const ortho = distances.reduce((acc, r) => acc + r.d * r.d, 0);
    return { label: 'Sum of squared orthogonal distances', value: ortho };
  }, [distances, metric, showProjections]);

  const onPointerDown = (e, handle) => {
    const pt = getSvgPoint(e, svgRef.current);
    dragRef.current = { handle, start: pt };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const pt = getSvgPoint(e, svgRef.current);
    const n = toNorm(pt);

    setLine((prev) => {
      if (dragRef.current.handle === 'p1') return { ...prev, p1: n };
      return { ...prev, p2: n };
    });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  // Draw line segment across plot area: compute intersections with box in normalized coords
  const lineSegment = useMemo(() => {
    const { p1, p2 } = line;
    // If points are identical, just return them
    if (Math.hypot(p2.x - p1.x, p2.y - p1.y) < 1e-6) {
      return [p1, p2];
    }
    return clipLineToUnitSquare(p1, p2);
  }, [line]);

  const segPx = lineSegment.map(toPx);
  const p1Px = toPx(line.p1);
  const p2Px = toPx(line.p2);

  return (
    <div style={{ width: '100%' }}>
      <div style={styles.toolbar}>
        <div style={styles.group}>
          <span style={styles.label}>Distance:</span>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            style={styles.select}
          >
            <option value='vertical'>Vertical (OLS)</option>
            <option value='orthogonal'>Orthogonal</option>
            <option value='absolute'>Absolute vertical (L1)</option>
          </select>
        </div>

        <label style={styles.checkbox}>
          <input
            type='checkbox'
            checked={showProjections}
            onChange={(e) => setShowProjections(e.target.checked)}
          />
          <span>Show distances</span>
        </label>

        <div style={styles.summary}>
          <span style={styles.summaryLabel}>{summary.label}</span>
          <span style={styles.summaryValue}>{formatNum(summary.value)}</span>
        </div>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={styles.svg}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Plot background */}
        <rect
          x={plot.x0}
          y={plot.y0}
          width={plot.w}
          height={plot.h}
          rx='14'
          style={{
            fill: 'rgba(255,255,255,0.04)',
            stroke: 'rgba(255,255,255,0.10)',
          }}
        />

        {/* Grid */}
        {Array.from({ length: 9 }).map((_, i) => {
          const t = i / 8;
          const x = plot.x0 + t * plot.w;
          const y = plot.y0 + t * plot.h;
          return (
            <g key={i}>
              <line
                x1={x}
                y1={plot.y0}
                x2={x}
                y2={plot.y0 + plot.h}
                stroke='rgba(255,255,255,0.06)'
              />
              <line
                x1={plot.x0}
                y1={y}
                x2={plot.x0 + plot.w}
                y2={y}
                stroke='rgba(255,255,255,0.06)'
              />
            </g>
          );
        })}

        {/* Distances */}
        {showProjections &&
          distances.map((r, idx) => {
            const a = toPx(r.pt);
            const b = toPx(r.proj);
            const isAbs = metric === 'absolute';
            const isOrtho = metric === 'orthogonal';
            const strong = isAbs || isOrtho;
            return (
              <g key={idx}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={
                    strong ? 'rgba(45,227,141,0.55)' : 'rgba(45,227,141,0.40)'
                  }
                  strokeWidth={strong ? 2.2 : 2}
                />
                {/* projection point */}
                <circle
                  cx={b.x}
                  cy={b.y}
                  r='3.3'
                  fill='rgba(255,255,255,0.75)'
                />
              </g>
            );
          })}

        {/* Regression line */}
        <line
          x1={segPx[0].x}
          y1={segPx[0].y}
          x2={segPx[1].x}
          y2={segPx[1].y}
          stroke='rgba(255,255,255,0.90)'
          strokeWidth='3.2'
          strokeLinecap='round'
        />

        {/* Points */}
        {points.map((p, i) => {
          const q = toPx(p);
          return (
            <circle
              key={i}
              cx={q.x}
              cy={q.y}
              r='6'
              fill='rgba(255,165,0,0.95)'
            />
          );
        })}

        {/* Draggable handles */}
        <Handle
          x={p1Px.x}
          y={p1Px.y}
          label='A'
          onPointerDown={(e) => onPointerDown(e, 'p1')}
        />
        <Handle
          x={p2Px.x}
          y={p2Px.y}
          label='B'
          onPointerDown={(e) => onPointerDown(e, 'p2')}
        />

        {/* Axis labels (minimal) */}
        <text
          x={plot.x0 + plot.w / 2}
          y={height - 8}
          textAnchor='middle'
          fontSize='12'
          fill='rgba(255,255,255,0.55)'
        >
          x
        </text>
        <text
          x={10}
          y={plot.y0 + plot.h / 2}
          textAnchor='middle'
          fontSize='12'
          fill='rgba(255,255,255,0.55)'
          transform={`rotate(-90 10 ${plot.y0 + plot.h / 2})`}
        >
          y
        </text>
      </svg>

      <div style={styles.caption}>
        Drag the endpoints <b>A</b> and <b>B</b> to change the line. Switch the
        distance to see how “best fit” depends on the error measure.
      </div>
    </div>
  );
}

function Handle({ x, y, label, onPointerDown }) {
  return (
    <g style={{ cursor: 'grab' }} onPointerDown={onPointerDown}>
      <circle cx={x} cy={y} r='10' fill='rgba(45,227,141,0.95)' />
      <circle cx={x} cy={y} r='16' fill='rgba(45,227,141,0.12)' />
      <text
        x={x}
        y={y + 4}
        textAnchor='middle'
        fontSize='12'
        fontWeight='700'
        fill='rgba(0,0,0,0.70)'
      >
        {label}
      </text>
    </g>
  );
}

/** Orthogonal projection of pt onto line Ax + By + C = 0 */
function orthogonalProjection(pt, { A, B, C }) {
  const denom = A * A + B * B || 1;
  const t = (A * pt.x + B * pt.y + C) / denom;
  return {
    x: pt.x - A * t,
    y: pt.y - B * t,
  };
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function formatNum(x) {
  // show small values nicely
  if (!isFinite(x)) return '—';
  if (Math.abs(x) < 0.01) return x.toExponential(2);
  return x.toFixed(3);
}

/** Get pointer position in SVG coordinates */
function getSvgPoint(e, svgEl) {
  const rect = svgEl.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * svgEl.viewBox.baseVal.width,
    y: ((e.clientY - rect.top) / rect.height) * svgEl.viewBox.baseVal.height,
  };
}

/**
 * Clip infinite line through p1->p2 to unit square [0,1]x[0,1].
 * Returns two points.
 */
function clipLineToUnitSquare(p1, p2) {
  // Parametric line: p(t) = p1 + t*(p2-p1)
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  const candidates = [];

  // Intersections with x=0 and x=1
  if (Math.abs(dx) > 1e-12) {
    let t = (0 - p1.x) / dx;
    let y = p1.y + t * dy;
    if (y >= 0 && y <= 1) candidates.push({ x: 0, y, t });

    t = (1 - p1.x) / dx;
    y = p1.y + t * dy;
    if (y >= 0 && y <= 1) candidates.push({ x: 1, y, t });
  }

  // Intersections with y=0 and y=1
  if (Math.abs(dy) > 1e-12) {
    let t = (0 - p1.y) / dy;
    let x = p1.x + t * dx;
    if (x >= 0 && x <= 1) candidates.push({ x, y: 0, t });

    t = (1 - p1.y) / dy;
    x = p1.x + t * dx;
    if (x >= 0 && x <= 1) candidates.push({ x, y: 1, t });
  }

  // If for some reason we didn't get enough, fallback to endpoints clamped
  if (candidates.length < 2) {
    return [p1, p2].map((p) => ({ x: clamp(p.x, 0, 1), y: clamp(p.y, 0, 1) }));
  }

  // Choose two farthest apart by t (smallest and largest t)
  candidates.sort((a, b) => a.t - b.t);
  const a = candidates[0];
  const b = candidates[candidates.length - 1];
  return [
    { x: a.x, y: a.y },
    { x: b.x, y: b.y },
  ];
}

const styles = {
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: '10px 0 12px',
  },
  group: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    opacity: 0.75,
  },
  select: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    padding: '8px 10px',
    outline: 'none',
  },
  checkbox: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    fontSize: 13,
    opacity: 0.9,
  },
  summary: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 240,
    textAlign: 'right',
  },
  summaryLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: 600,
  },
  svg: {
    width: '100%',
    height: 'auto',
    borderRadius: 16,
    display: 'block',
    background: 'rgba(255,255,255,0.02)',
    boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
  },
  caption: {
    marginTop: 10,
    fontSize: 13,
    opacity: 0.75,
    lineHeight: 1.5,
  },
};
