'use client';

import type { Subscription } from "@prisma/client";
import { signOut } from "next-auth/react";
import { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { SubscriptionForm } from "./subscription-form";
import { CsvUpload } from "./csv-upload";
import { SubscriptionsList } from "./subscriptions-list";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

type Sub = Subscription & { trialEndDate?: Date | string | null };

type Props = {
  userName: string;
  subscriptions: Sub[];
};

type StatusFilter = "all" | "active" | "trials" | "inactive";

export function Dashboard({ userName, subscriptions }: Props) {
  const [trialReminderMessage, setTrialReminderMessage] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of subscriptions) {
      set.add(s.category || "Uncategorized");
    }
    return Array.from(set).sort();
  }, [subscriptions]);

  const filtered = useMemo(() => {
    let list = subscriptions;
    if (categoryFilter !== "all") {
      list = list.filter((s) => (s.category || "Uncategorized") === categoryFilter);
    }
    if (statusFilter === "active") list = list.filter((s) => s.isActive);
    else if (statusFilter === "trials") list = list.filter((s) => s.isActive && s.isTrial);
    else if (statusFilter === "inactive") list = list.filter((s) => !s.isActive);
    return list;
  }, [subscriptions, categoryFilter, statusFilter]);

  const totalMonthly = useMemo(() => {
    return filtered
      .filter((s) => s.isActive)
      .reduce((sum, s) => {
        if (s.billingPeriod === "yearly") return sum + s.amountCents / 12;
        if (s.billingPeriod === "weekly") return sum + (s.amountCents * 52) / 12;
        return sum + s.amountCents;
      }, 0);
  }, [filtered]);

  const chartData = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const sub of filtered) {
      if (!sub.isActive) continue;
      const key = sub.category || "Uncategorized";
      byCategory.set(key, (byCategory.get(key) ?? 0) + sub.amountCents);
    }
    const labels = Array.from(byCategory.keys());
    const data = labels.map((label) => (byCategory.get(label) ?? 0) / 100);
    return {
      labels,
      datasets: [
        {
          label: "Monthly spend by category ($)",
          data,
          borderColor: "rgb(37, 99, 235)",
          backgroundColor: "rgba(37, 99, 235, 0.2)",
          tension: 0.3,
        },
      ],
    };
  }, [filtered]);

  const monthlyOverTimeData = useMemo(() => {
    const now = new Date();
    const monthLabels: string[] = [];
    const amounts: number[] = [];
    const activeSubs = subscriptions.filter((s) => s.isActive);

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthLabels.push(d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }));
      let totalCents = 0;

      for (const sub of activeSubs) {
        const next = typeof sub.nextChargeDate === "string" ? new Date(sub.nextChargeDate) : sub.nextChargeDate;
        if (sub.billingPeriod === "monthly") {
          for (let k = 0; k <= 11; k++) {
            const charge = new Date(next.getFullYear(), next.getMonth() - k, next.getDate());
            if (charge.getFullYear() === d.getFullYear() && charge.getMonth() === d.getMonth()) {
              totalCents += sub.amountCents;
              break;
            }
          }
        } else if (sub.billingPeriod === "yearly") {
          for (let k = 0; k <= 2; k++) {
            const charge = new Date(next.getFullYear() - k, next.getMonth(), next.getDate());
            if (charge.getFullYear() === d.getFullYear() && charge.getMonth() === d.getMonth()) {
              totalCents += sub.amountCents;
              break;
            }
          }
        } else if (sub.billingPeriod === "weekly") {
          const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
          const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
          let count = 0;
          let t = new Date(next);
          while (t > monthEnd) t.setDate(t.getDate() - 7);
          while (t >= monthStart) {
            count++;
            t.setDate(t.getDate() - 7);
          }
          totalCents += count * sub.amountCents;
        }
      }
      amounts.push(totalCents / 100);
    }
    return {
      labels: monthLabels,
      datasets: [
        {
          label: "Spend that month ($)",
          data: amounts,
          borderColor: "rgb(16, 185, 129)",
          backgroundColor: "rgba(16, 185, 129, 0.2)",
          tension: 0.3,
        },
      ],
    };
  }, [subscriptions]);

  const upcomingTrials = useMemo(() => {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return subscriptions.filter((s) => {
      if (!s.isTrial || !s.trialEndDate) return false;
      const end = typeof s.trialEndDate === "string" ? new Date(s.trialEndDate) : s.trialEndDate;
      return end >= now && end <= threeDaysFromNow;
    });
  }, [subscriptions]);

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              Productivity Pro – Subscription Killer
            </h1>
            <p className="text-sm text-zinc-600">
              Welcome back, {userName}. Track and kill wasteful subscriptions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700">
              {filtered.length} of {subscriptions.length} subscription{subscriptions.length !== 1 ? "s" : ""}
            </span>
            <span className="rounded-full bg-zinc-900 px-4 py-1 text-xs font-medium text-white">
              Total monthly: ${(totalMonthly / 100).toFixed(2)}
            </span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/auth/sign-in" })}
              className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Log out
            </button>
          </div>
        </header>

        <main className="grid gap-6 md:grid-cols-[2fr,1.5fr]">
          <section className="space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Add subscription
            </h2>
            <SubscriptionForm />
            <CsvUpload />

            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 pt-2">
              Your subscriptions
            </h2>
            <div className="flex flex-wrap gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900"
              >
                <option value="all">All</option>
                <option value="active">Active only</option>
                <option value="trials">Trials only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </div>
            <SubscriptionsList subscriptions={filtered} />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Overview
            </h2>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-zinc-900">Spend by category</h3>
              {chartData.labels.length ? (
                <Line
                  data={chartData}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: true } },
                    scales: {
                      y: { ticks: { callback: (value) => `$${value}` } },
                    },
                  }}
                />
              ) : (
                <p className="text-sm text-zinc-500">
                  Add subscriptions to see spend by category.
                </p>
              )}
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-zinc-900">Monthly spending over time</h3>
              {monthlyOverTimeData.datasets[0].data.some((v) => v > 0) ? (
                <Line
                  data={monthlyOverTimeData}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: true } },
                    scales: {
                      y: { ticks: { callback: (value) => `$${value}` } },
                    },
                  }}
                />
              ) : (
                <p className="text-sm text-zinc-500">
                  Add active subscriptions with next charge dates to see spending over the last 12 months.
                </p>
              )}
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-zinc-900">
                Trials ending in the next 3 days
              </h3>
              {upcomingTrials.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No trials expiring soon. Add a subscription, check &quot;This is a trial&quot;, set Trial ends within 3 days, then use the button below to send yourself a reminder email.
                </p>
              ) : (
                <ul className="space-y-1 text-sm text-zinc-800">
                  {upcomingTrials.map((t) => (
                    <li key={t.id} className="flex justify-between">
                      <span>{t.name}</span>
                      <span className="text-zinc-500">
                        {t.trialEndDate?.toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={async () => {
                    setTrialReminderMessage(null);
                    try {
                      const res = await fetch("/api/check-trials", { method: "POST" });
                      const data = await res.json().catch(() => ({}));
                      if (res.ok) {
                        setTrialReminderMessage(data.message ?? (data.count ? `Sent ${data.count} reminder(s).` : "Done."));
                      } else {
                        const errMsg = [data.message, data.error].filter(Boolean).join(" — ");
                        setTrialReminderMessage(errMsg || "Failed to send reminders.");
                      }
                    } catch {
                      setTrialReminderMessage("Request failed.");
                    }
                  }}
                  className="rounded-full bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
                >
                  Send trial reminders now
                </button>
                {trialReminderMessage && (
                  <p className="mt-2 text-xs text-zinc-600">{trialReminderMessage}</p>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

