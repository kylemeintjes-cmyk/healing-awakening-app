"use client";

import React from "react";
import type { JoyAnalytics, JoyCheckinRecord } from "@/lib/joy-engine";

type JoyTrendChartProps = {
  entries: JoyCheckinRecord[];
  analytics: JoyAnalytics;
};

type TrendPoint = {
  label: string;
  joy: number;
  confidence: number;
  stability: number;
};

const WIDTH = 640;
const HEIGHT = 220;
const PADDING_X = 24;
const PADDING_Y = 20;
const INNER_WIDTH = WIDTH - PADDING_X * 2;
const INNER_HEIGHT = HEIGHT - PADDING_Y * 2;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toTrendPoints(entries: JoyCheckinRecord[]): TrendPoint[] {
  return [...entries]
    .slice(0, 21)
    .reverse()
    .map((entry) => ({
      label: new Date(entry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      joy: clamp(entry.joyScore, 0, 10),
      confidence: clamp(entry.financialConfidence, 0, 10),
      stability: clamp(entry.lifeStabilityScore, 0, 10),
    }));
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

function deltaBarWidth(value: number) {
  return `${Math.min(100, Math.abs(value) * 20)}%`;
}

function deltaTone(value: number) {
  if (value > 0) return "#1d6b33";
  if (value < 0) return "#8a2f2f";
  return "#5f606a";
}

function axisLabelY(value: number) {
  return PADDING_Y + ((10 - value) / 10) * INNER_HEIGHT;
}

export function JoyTrendChart({ entries, analytics }: JoyTrendChartProps) {
  const points = React.useMemo(() => toTrendPoints(entries), [entries]);
  const joyPath = React.useMemo(() => linePath(points.map((point) => point.joy)), [points]);
  const confidencePath = React.useMemo(() => linePath(points.map((point) => point.confidence)), [points]);
  const stabilityPath = React.useMemo(() => linePath(points.map((point) => point.stability)), [points]);

  if (points.length === 0) {
    return (
      <div className="list-item">
        <p className="subtle text-sm">No trend chart yet. Add at least one joy check-in.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="list-item joy-chart-shell">
        <p className="text-sm"><strong>Score trends</strong></p>
        <div className="joy-chart-frame">
          <svg className="joy-chart-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Joy score trends">
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
            <path d={joyPath} fill="none" stroke="#2f3a59" strokeWidth={3} strokeLinecap="round" />
            <path d={confidencePath} fill="none" stroke="#1d6b33" strokeWidth={3} strokeLinecap="round" />
            <path d={stabilityPath} fill="none" stroke="#c46d16" strokeWidth={3} strokeLinecap="round" />
          </svg>
        </div>
        <div className="joy-chart-legend">
          <span className="joy-legend-item">
            <span className="joy-legend-swatch" />
            Joy
          </span>
          <span className="joy-legend-item">
            <span className="joy-legend-swatch joy-legend-swatch-money" />
            Money confidence
          </span>
          <span className="joy-legend-item">
            <span className="joy-legend-swatch joy-legend-swatch-stability" />
            Life stability
          </span>
        </div>
        <p className="subtle text-xs">
          Showing last {points.length} check-ins ({points[0]?.label} to {points[points.length - 1]?.label}).
        </p>
      </div>

      <div className="list-item">
        <p className="text-sm"><strong>Delta bars</strong></p>
        <div className="joy-delta-grid">
          {analytics.deltas.map((delta) => (
            <div key={delta.period} className="joy-delta-card">
              <p className="subtle text-xs">{delta.period.toUpperCase()}</p>
              <div>
                <p className="text-xs">Joy {delta.joyDelta >= 0 ? "+" : ""}{delta.joyDelta}</p>
                <div className="joy-delta-track">
                  <div
                    style={{
                      width: deltaBarWidth(delta.joyDelta),
                      background: deltaTone(delta.joyDelta),
                    }}
                    className="joy-delta-fill"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs">Stability {delta.stabilityDelta >= 0 ? "+" : ""}{delta.stabilityDelta}</p>
                <div className="joy-delta-track">
                  <div
                    style={{
                      width: deltaBarWidth(delta.stabilityDelta),
                      background: deltaTone(delta.stabilityDelta),
                    }}
                    className="joy-delta-fill"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs">Confidence {delta.confidenceDelta >= 0 ? "+" : ""}{delta.confidenceDelta}</p>
                <div className="joy-delta-track">
                  <div
                    style={{
                      width: deltaBarWidth(delta.confidenceDelta),
                      background: deltaTone(delta.confidenceDelta),
                    }}
                    className="joy-delta-fill"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
