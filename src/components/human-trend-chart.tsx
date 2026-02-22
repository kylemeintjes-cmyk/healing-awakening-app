"use client";

import React from "react";
import type { HumanAnalytics, HumanCheckinRecord } from "@/lib/human-engine";

type HumanTrendChartProps = {
  entries: HumanCheckinRecord[];
  analytics: HumanAnalytics;
};

const WIDTH = 640;
const HEIGHT = 230;
const PADDING_X = 24;
const PADDING_Y = 20;
const INNER_WIDTH = WIDTH - PADDING_X * 2;
const INNER_HEIGHT = HEIGHT - PADDING_Y * 2;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function linePath(points: number[]) {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const y = PADDING_Y + ((10 - points[0]) / 10) * INNER_HEIGHT;
    return `M ${PADDING_X} ${y} L ${WIDTH - PADDING_X} ${y}`;
  }

  const stepX = INNER_WIDTH / (points.length - 1);
  return points
    .map((value, index) => {
      const x = PADDING_X + stepX * index;
      const y = PADDING_Y + ((10 - value) / 10) * INNER_HEIGHT;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function axisLabelY(value: number) {
  return PADDING_Y + ((10 - value) / 10) * INNER_HEIGHT;
}

function deltaBarWidth(value: number) {
  return `${Math.min(100, Math.abs(value) * 18)}%`;
}

function deltaTone(value: number) {
  if (value > 0) return "#1d6b33";
  if (value < 0) return "#8a2f2f";
  return "#5f606a";
}

export function HumanTrendChart({ entries, analytics }: HumanTrendChartProps) {
  const points = React.useMemo(
    () =>
      [...entries]
        .slice(0, 21)
        .reverse()
        .map((item) => ({
          clarity: clamp(item.clarityScore, 0, 10),
          execution: clamp(item.executionScore, 0, 10),
          stability: clamp(item.stabilityScore, 0, 10),
          operating: clamp(item.operatingScore, 0, 10),
        })),
    [entries],
  );

  const clarityPath = React.useMemo(() => linePath(points.map((item) => item.clarity)), [points]);
  const executionPath = React.useMemo(() => linePath(points.map((item) => item.execution)), [points]);
  const stabilityPath = React.useMemo(() => linePath(points.map((item) => item.stability)), [points]);
  const operatingPath = React.useMemo(() => linePath(points.map((item) => item.operating)), [points]);

  if (points.length === 0) {
    return (
      <div className="list-item">
        <p className="subtle text-sm">No trend chart yet. Add at least one Human OS check-in.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="list-item human-chart-shell">
        <p className="text-sm"><strong>Operating trends</strong></p>
        <div className="human-chart-frame">
          <svg className="human-chart-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Human OS trends">
            {[0, 2, 4, 6, 8, 10].map((value) => (
              <g key={value}>
                <line
                  x1={PADDING_X}
                  x2={WIDTH - PADDING_X}
                  y1={axisLabelY(value)}
                  y2={axisLabelY(value)}
                  stroke="rgba(18, 18, 26, 0.12)"
                  strokeWidth={1}
                />
                <text x={4} y={axisLabelY(value) + 4} fontSize={10} fill="#5f606a">
                  {value}
                </text>
              </g>
            ))}
            <path d={clarityPath} fill="none" stroke="#2f3a59" strokeWidth={3} strokeLinecap="round" />
            <path d={executionPath} fill="none" stroke="#1d6b33" strokeWidth={3} strokeLinecap="round" />
            <path d={stabilityPath} fill="none" stroke="#c46d16" strokeWidth={3} strokeLinecap="round" />
            <path d={operatingPath} fill="none" stroke="#7e5bef" strokeWidth={3} strokeLinecap="round" />
          </svg>
        </div>
        <div className="human-chart-legend">
          <span className="human-legend-item"><span className="human-legend-swatch" />Clarity</span>
          <span className="human-legend-item"><span className="human-legend-swatch human-legend-swatch-execution" />Execution</span>
          <span className="human-legend-item"><span className="human-legend-swatch human-legend-swatch-stability" />Stability</span>
          <span className="human-legend-item"><span className="human-legend-swatch human-legend-swatch-operating" />Operating</span>
        </div>
      </div>

      <div className="list-item">
        <p className="text-sm"><strong>Delta bars</strong></p>
        <div className="human-delta-grid">
          {analytics.deltas.map((delta) => (
            <div key={delta.period} className="human-delta-card">
              <p className="subtle text-xs">{delta.period.toUpperCase()}</p>
              <div>
                <p className="text-xs">Operating {delta.operatingDelta >= 0 ? "+" : ""}{delta.operatingDelta}</p>
                <div className="human-delta-track">
                  <div className="human-delta-fill" style={{ width: deltaBarWidth(delta.operatingDelta), background: deltaTone(delta.operatingDelta) }} />
                </div>
              </div>
              <div>
                <p className="text-xs">Execution {delta.executionDelta >= 0 ? "+" : ""}{delta.executionDelta}</p>
                <div className="human-delta-track">
                  <div className="human-delta-fill" style={{ width: deltaBarWidth(delta.executionDelta), background: deltaTone(delta.executionDelta) }} />
                </div>
              </div>
              <div>
                <p className="text-xs">Stability {delta.stabilityDelta >= 0 ? "+" : ""}{delta.stabilityDelta}</p>
                <div className="human-delta-track">
                  <div className="human-delta-fill" style={{ width: deltaBarWidth(delta.stabilityDelta), background: deltaTone(delta.stabilityDelta) }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
