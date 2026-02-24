'use client';

import Papa from "papaparse";
import { useState } from "react";

type CsvRow = {
  name: string;
  provider?: string;
  category?: string;
  amount: string;
  billingPeriod?: string;
  nextChargeDate: string;
  isTrial?: string;
  trialEndDate?: string;
};

export function CsvUpload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    try {
      const text = await file.text();

      const parsed = Papa.parse<CsvRow>(text, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length) {
        console.error(parsed.errors);
        throw new Error("Failed to parse CSV");
      }

      const rows = parsed.data;

      const res = await fetch("/api/subscriptions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Bulk upload failed");
      }

      e.target.value = "";
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong with upload",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl bg-white dark:bg-zinc-800 p-4 shadow-sm transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            CSV upload (power user)
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Columns: name, provider, category, amount, billingPeriod, nextChargeDate, isTrial, trialEndDate
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center rounded-full bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition-colors">
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
            disabled={loading}
          />
          {loading ? "Uploading..." : "Upload CSV"}
        </label>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

