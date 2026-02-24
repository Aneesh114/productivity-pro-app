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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

type Props = {
  userName: string;
  subscriptions: Subscription[];
};

export function Dashboard({ userName, subscriptions }: Props) {
  const [trialReminderMessage, setTrialReminderMessage] = useState<string | null>(null);

  const totalMonthly = useMemo(() => {
    return subscriptions
      .filter((s) => s.isActive)
      .reduce((sum, s) => {
        if (s.billingPeriod === "yearly") {
          return sum + s.amountCents / 12;
        }
        if (s.billingPeriod === "weekly") {
          return sum + (s.amountCents * 52) / 12;
        }
        return sum + s.amountCents;
      }, 0);
  }, [subscriptions]);

  const chartData = useMemo(() => {
    const byCategory = new Map<string, number>();

    for (const sub of subscriptions) {
      if (!sub.isActive) continue;
      const key = sub.category || "Uncategorized";
      const existing = byCategory.get(key) ?? 0;
      byCategory.set(key, existing + sub.amountCents);
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
  }, [subscriptions]);

  const upcomingTrials = useMemo(() => {
    const now = new Date();
    const threeDaysFromNow = new Date(
      now.getTime() + 3 * 24 * 60 * 60 * 1000,
    );
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
              {subscriptions.length} subscription{subscriptions.length !== 1 ? "s" : ""}
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
              Subscriptions
            </h2>
            <SubscriptionForm />
            <CsvUpload />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Overview
            </h2>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              {chartData.labels.length ? (
                <Line
                  data={chartData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: true },
                    },
                    scales: {
                      y: {
                        ticks: {
                          callback: (value) => `$${value}`,
                        },
                      },
                    },
                  }}
                />
              ) : (
                <p className="text-sm text-zinc-500">
                  Add a few subscriptions to see your monthly spend by category.
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

