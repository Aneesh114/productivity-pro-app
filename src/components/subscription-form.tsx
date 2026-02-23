'use client';

import { useState } from "react";

export function SubscriptionForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());

    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Failed to save subscription");
      return;
    }

    e.currentTarget?.reset();
    window.location.reload();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-xl bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-zinc-600">
            Name
          </label>
          <input
            name="name"
            required
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-zinc-600">
            Provider
          </label>
          <input
            name="provider"
            placeholder="Netflix, Spotify..."
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          />
        </div>
        <div className="w-28">
          <label className="block text-xs font-medium text-zinc-600">
            Amount
          </label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          />
        </div>
        <div className="w-28">
          <label className="block text-xs font-medium text-zinc-600">
            Billing
          </label>
          <select
            name="billingPeriod"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-zinc-600">
            Category
          </label>
          <input
            name="category"
            placeholder="Entertainment, Utilities..."
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-zinc-600">
            Next charge date
          </label>
          <input
            name="nextChargeDate"
            type="date"
            required
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-zinc-600">
            Trial ends (optional)
          </label>
          <input
            name="trialEndDate"
            type="date"
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-zinc-700">
          <input
            type="checkbox"
            name="isTrial"
            className="h-3 w-3 rounded border-zinc-300"
          />
          This is a trial I might cancel
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Add subscription"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

