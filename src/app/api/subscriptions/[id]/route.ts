import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  provider: z.string().optional(),
  category: z.string().optional(),
  amount: z.string().optional(),
  billingPeriod: z.string().optional(),
  nextChargeDate: z.string().optional(),
  trialEndDate: z.string().nullable().optional(),
  isTrial: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
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
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const existing = await prisma.subscription.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ message: "Subscription not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name != null) data.name = parsed.data.name;
  if (parsed.data.provider != null) data.provider = parsed.data.provider;
  if (parsed.data.category != null) data.category = parsed.data.category;
  if (parsed.data.billingPeriod != null) data.billingPeriod = parsed.data.billingPeriod;
  if (parsed.data.nextChargeDate != null) data.nextChargeDate = new Date(parsed.data.nextChargeDate);
  if (parsed.data.trialEndDate !== undefined) data.trialEndDate = parsed.data.trialEndDate ? new Date(parsed.data.trialEndDate) : null;
  if (parsed.data.isTrial != null) data.isTrial = parsed.data.isTrial;
  if (parsed.data.isActive != null) data.isActive = parsed.data.isActive;
  if (parsed.data.amount != null) {
    const n = Number(parsed.data.amount);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ message: "Invalid amount" }, { status: 400 });
    }
    data.amountCents = Math.round(n * 100);
  }

  const updated = await prisma.subscription.update({
    where: { id },
    data,
  });
  return NextResponse.json(updated);
}
