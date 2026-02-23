import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const rowSchema = z.object({
  name: z.string(),
  provider: z.string().optional(),
  category: z.string().optional(),
  amount: z.string(),
  billingPeriod: z.string().optional(),
  nextChargeDate: z.string(),
  isTrial: z.string().optional(),
  trialEndDate: z.string().optional(),
});

const bulkSchema = z.object({
  rows: z.array(rowSchema),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = bulkSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid CSV payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json(
      { message: "User not found" },
      { status: 404 },
    );
  }

  const data = parsed.data.rows
    .filter((row) => row.name && row.amount && row.nextChargeDate)
    .map((row) => {
      const amountNumber = Number(row.amount);
      const amountCents = Math.round((amountNumber || 0) * 100);
      const isTrial =
        row.isTrial?.toLowerCase() === "true" || row.isTrial === "1";

      return {
        userId: user.id,
        name: row.name,
        provider: row.provider || null,
        category: row.category || null,
        amountCents,
        billingPeriod: row.billingPeriod || "monthly",
        nextChargeDate: new Date(row.nextChargeDate),
        isTrial,
        trialEndDate: row.trialEndDate ? new Date(row.trialEndDate) : null,
      };
    });

  if (!data.length) {
    return NextResponse.json(
      { message: "No valid rows in CSV" },
      { status: 400 },
    );
  }

  const created = await prisma.subscription.createMany({
    data,
  });

  return NextResponse.json(
    { message: "Subscriptions imported", count: created.count },
    { status: 201 },
  );
}

