"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { TimeRangeSelector } from "./TimeRangeSelector";
import { useAdminEstimatesChart } from "../../lib/react-query/hooks/admin";

const EstimatesChart = dynamic(
  () => import("./EstimatesChart").then((m) => m.EstimatesChart),
  { ssr: false }
);

/**
 * Estimate activity chart for the admin Overview page only.
 */
export function AdminEstimatesOverviewChart() {
  const [chartRange, setChartRange] = useState("30d");
  const { data: chartData, isLoading: chartLoading, error: chartError } = useAdminEstimatesChart({
    range: chartRange,
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Estimate activity</h2>
          <p className="text-sm text-muted-foreground">Track quotes created over time</p>
        </div>
        <TimeRangeSelector value={chartRange} onChange={setChartRange} />
      </div>
      <EstimatesChart
        data={chartData?.data}
        isLoading={chartLoading}
        error={chartError}
        range={chartRange}
      />
    </section>
  );
}
