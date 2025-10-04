'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

export type TimeseriesPoint = { timestamp: string; value: number };

export function ChartTimeseries({ data, color = '#38bdf8' }: { data: TimeseriesPoint[]; color?: string }) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, left: 0, right: 0, bottom: 0 }}>
          <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 12 }} hide={data.length > 12} />
          <YAxis stroke="#64748b" tick={{ fontSize: 12 }} width={50} />
          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} labelStyle={{ color: '#e2e8f0' }} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
