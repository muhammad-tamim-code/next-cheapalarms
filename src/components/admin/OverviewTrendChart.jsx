"use client";

import { useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useAdminEstimatesChart } from "../../lib/react-query/hooks/admin";

/* Neutral estimates-trend chart for the admin Overview.
   Real data: /api/admin/estimates/chart → { data: [{ date, count, total }] }.
   Loaded with next/dynamic { ssr: false } so recharts never runs server-side. */

const RANGES = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
];

export default function OverviewTrendChart() {
  const [range, setRange] = useState("30d");
  const { data, isLoading, error } = useAdminEstimatesChart({ range });

  const points = (data?.data ?? []).map((p) => ({
    label: fmtDay(p.date),
    count: Number(p.count ?? 0),
    total: Number(p.total ?? 0),
  }));

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Estimates trend</h2>
          <p className="text-xs text-neutral-500">Estimates &amp; total value (AUD)</p>
        </div>
        <div className="flex rounded-lg border border-neutral-200 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={[
                "rounded-md px-3 py-1 text-sm font-medium transition",
                range === r.key ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-900",
              ].join(" ")}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[280px]">
        {error ? (
          <CenterNote>Could not load chart data</CenterNote>
        ) : isLoading ? (
          <CenterNote>Loading…</CenterNote>
        ) : points.length === 0 ? (
          <CenterNote>No estimate activity in this range</CenterNote>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a3a3a3" }} tickLine={false} axisLine={{ stroke: "#e5e5e5" }} minTickGap={24} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#a3a3a3" }} tickLine={false} axisLine={false} width={32} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#a3a3a3" }} tickLine={false} axisLine={false} width={48} tickFormatter={fmtMoneyShort} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #e5e5e5", fontSize: 12 }}
                formatter={(v, name) => (name === "total" ? [fmtMoney(v), "Total value"] : [v, "Estimates"])}
              />
              <Bar yAxisId="right" dataKey="total" fill="#e5e5e5" radius={[3, 3, 0, 0]} maxBarSize={26} />
              <Line yAxisId="left" type="monotone" dataKey="count" stroke="#171717" strokeWidth={2} dot={{ r: 2.5, fill: "#171717" }} activeDot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function CenterNote({ children }) {
  return <div className="grid h-full place-items-center text-sm text-neutral-400">{children}</div>;
}
function fmtDay(d) {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
}
function fmtMoney(v) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(Number(v) || 0);
}
function fmtMoneyShort(v) {
  const n = Number(v) || 0;
  return n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`;
}
