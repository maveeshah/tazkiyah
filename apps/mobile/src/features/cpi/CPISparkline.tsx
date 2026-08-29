import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';

interface Point {
  unit_price: number | string;
  recorded_at: string;
}

interface Props {
  history: Point[];
  width?: number;
  height?: number;
  trend?: 'up' | 'down' | 'flat';
}

const COLORS = {
  up: '#f87171',
  down: '#4ade80',
  flat: '#818cf8',
} as const;

export function CPISparkline({ history, width = 120, height = 40, trend = 'flat' }: Props) {
  const pts = [...history]
    .map((h) => ({ v: typeof h.unit_price === 'string' ? parseFloat(h.unit_price) : Number(h.unit_price), t: new Date(h.recorded_at).getTime() }))
    .filter((p) => !isNaN(p.v) && !isNaN(p.t))
    .sort((a, b) => a.t - b.t);

  if (pts.length < 2) {
    return <View style={{ width, height }} />;
  }

  const values = pts.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 3;

  const coords = pts.map((p, i) => {
    const x = pad + (i / (pts.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (p.v - min) / span) * (height - pad * 2);
    return { x, y };
  });

  const color = COLORS[trend];
  const last = coords[coords.length - 1];

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={last.x} cy={last.y} r={3} fill={color} />
    </Svg>
  );
}
