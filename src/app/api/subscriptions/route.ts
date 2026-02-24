import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const subscriptionSchema = z.object({
  name: z.string().min(1),
  provider: z.string().optional(),
  category: z.string().optional(),
  amount: z.string(),
  billingPeriod: z
    .string()
    .optional()
    .transform((v) => v || "monthly"),
  nextChargeDate: z.string(),
  trialEndDate: z.string().optional(),
  isTrial: z.union([z.string(), z.boolean()]).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    console.warn("[Subscription] POST rejected: no session");
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = subscriptionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid data", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    console.warn("[Subscription] User not found for email:", session.user.email);
    return NextResponse.json(
      { message: "User not found" },
      { status: 404 },
    );
  }

  const amountNumber = Number(parsed.data.amount);
  if (!Number.isFinite(amountNumber) || amountNumber < 0) {
    return NextResponse.json(
      { message: "Amount must be a positive number" },
      { status: 400 },
    );
  }

  const amountCents = Math.round(amountNumber * 100);

  const isTrial =
    typeof parsed.data.isTrial === "string"
      ? parsed.data.isTrial === "on"
      : Boolean(parsed.data.isTrial);

  const subscription = await prisma.subscription.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      provider: parsed.data.provider || null,
      category: parsed.data.category || null,
      amountCents,
      billingPeriod: parsed.data.billingPeriod,
      nextChargeDate: new Date(parsed.data.nextChargeDate),
      isTrial,
      trialEndDate: parsed.data.trialEndDate
        ? new Date(parsed.data.trialEndDate)
        : null,
    },
  });

  // Log so you can verify writes in the terminal and which DB is used
  const dbUrl = process.env.DATABASE_URL ?? "";
  const dbHost = dbUrl.replace(/^[^@]+@/, "").split("/")[0] || "unknown";
  console.log("[Subscription] Created id=%s for user=%s (DB host: %s)", subscription.id, user.id, dbHost);

  return NextResponse.json(subscription, { status: 201 });
}

