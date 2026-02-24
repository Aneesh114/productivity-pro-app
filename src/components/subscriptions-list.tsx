"use client";

import type { Subscription } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Sub = Subscription & { trialEndDate?: Date | string | null };

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString();
}

function monthlyAmount(s: Sub) {
  if (s.billingPeriod === "yearly") return s.amountCents / 12;
  if (s.billingPeriod === "weekly") return (s.amountCents * 52) / 12;
  return s.amountCents;
}

export function SubscriptionsList({ subscriptions }: { subscriptions: Sub[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Sub | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel(sub: Sub) {
    if (!confirm(`Mark "${sub.name}" as cancelled (inactive)?`)) return;
    setError(null);
    const res = await fetch(`/api/subscriptions/${sub.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Failed to update");
      return;
    }
    router.refresh();
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    if (!editing) return;
    e.preventDefault();
    setError(null);
    setSaving(true);
    const form = e.currentTarget;
    const body = {
      name: (form.querySelector('[name="name"]') as HTMLInputElement).value,
      provider: (form.querySelector('[name="provider"]') as HTMLInputElement).value || undefined,
      category: (form.querySelector('[name="category"]') as HTMLInputElement).value || undefined,
      amount: (form.querySelector('[name="amount"]') as HTMLInputElement).value,
      billingPeriod: (form.querySelector('[name="billingPeriod"]') as HTMLSelectElement).value,
      nextChargeDate: (form.querySelector('[name="nextChargeDate"]') as HTMLInputElement).value,
      trialEndDate: (form.querySelector('[name="trialEndDate"]') as HTMLInputElement).value || null,
      isTrial: (form.querySelector('[name="isTrial"]') as HTMLInputElement).checked,
    };
    const res = await fetch(`/api/subscriptions/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Failed to update");
      return;
    }
    setEditing(null);
    router.refresh();
  }

  if (subscriptions.length === 0) {
    return (
      <p className="rounded-xl bg-white p-4 text-sm text-zinc-500 shadow-sm">
        No subscriptions match the current filters. Add one above or change filters.
      </p>
    );
  }

  return (
    <div className="rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3 hidden sm:table-cell">Provider</th>
              <th className="px-4 py-3 hidden md:table-cell">Category</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 hidden lg:table-cell">Billing</th>
              <th className="px-4 py-3 hidden lg:table-cell">Next charge</th>
              <th className="px-4 py-3 hidden lg:table-cell">Trial ends</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {subscriptions.map((sub) => (
              <tr
                key={sub.id}
                className={!sub.isActive ? "bg-zinc-50 text-zinc-500" : ""}
              >
                <td className="px-4 py-2 font-medium text-zinc-900">{sub.name}</td>
                <td className="px-4 py-2 hidden sm:table-cell text-zinc-600">{sub.provider ?? "—"}</td>
                <td className="px-4 py-2 hidden md:table-cell text-zinc-600">{sub.category ?? "—"}</td>
                <td className="px-4 py-2 text-right text-zinc-900">
                  ${(monthlyAmount(sub) / 100).toFixed(2)}
                  <span className="text-zinc-400">/mo</span>
                </td>
                <td className="px-4 py-2 hidden lg:table-cell text-zinc-600">{sub.billingPeriod}</td>
                <td className="px-4 py-2 hidden lg:table-cell text-zinc-600">{formatDate(sub.nextChargeDate)}</td>
                <td className="px-4 py-2 hidden lg:table-cell text-zinc-600">{formatDate(sub.trialEndDate)}</td>
                <td className="px-4 py-2">
                  {sub.isActive ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Active</span>
                  ) : (
                    <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {sub.isActive && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(sub)}
                        className="text-zinc-600 hover:text-zinc-900 underline text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancel(sub)}
                        className="text-red-600 hover:text-red-800 underline text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <p className="px-4 py-2 text-xs text-red-600 bg-red-50" role="alert">{error}</p>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Edit subscription</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600">Name</label>
                <input
                  name="name"
                  defaultValue={editing.name}
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600">Provider</label>
                <input
                  name="provider"
                  defaultValue={editing.provider ?? ""}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600">Category</label>
                <input
                  name="category"
                  defaultValue={editing.category ?? ""}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-600">Amount ($)</label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={(editing.amountCents / 100).toFixed(2)}
                    required
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600">Billing</label>
                  <select
                    name="billingPeriod"
                    defaultValue={editing.billingPeriod}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-600">Next charge</label>
                  <input
                    name="nextChargeDate"
                    type="date"
                    defaultValue={typeof editing.nextChargeDate === "string" ? editing.nextChargeDate.slice(0, 10) : editing.nextChargeDate?.toISOString().slice(0, 10)}
                    required
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600">Trial ends</label>
                  <input
                    name="trialEndDate"
                    type="date"
                    defaultValue={editing.trialEndDate ? (typeof editing.trialEndDate === "string" ? editing.trialEndDate.slice(0, 10) : editing.trialEndDate.toISOString().slice(0, 10)) : ""}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input type="checkbox" name="isTrial" defaultChecked={editing.isTrial} className="rounded border-zinc-300" />
                This is a trial
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditing(null); setError(null); }}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
