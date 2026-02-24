import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export async function POST() {
  if (!SENDGRID_API_KEY || !EMAIL_FROM) {
    return NextResponse.json(
      { message: "Email not configured" },
      { status: 500 },
    );
  }

  const now = new Date();
  const threeDaysFromNow = new Date(
    now.getTime() + 3 * 24 * 60 * 60 * 1000,
  );

  const subscriptions = await prisma.subscription.findMany({
    where: {
      isTrial: true,
      isActive: true,
      trialEndDate: {
        gte: now,
        lte: threeDaysFromNow,
      },
    },
    include: {
      user: true,
    },
  });

  if (!subscriptions.length) {
    return NextResponse.json(
      { message: "No expiring trials" },
      { status: 200 },
    );
  }

  const messages = subscriptions.map((sub) => ({
    to: sub.user.email,
    from: EMAIL_FROM,
    subject: `Trial ending soon: ${sub.name}`,
    text: `Heads up! Your trial for ${sub.name} ends on ${sub.trialEndDate?.toDateString()}. Decide whether to cancel before you get charged.`,
  }));

  try {
    await sgMail.send(messages);
  } catch (err: unknown) {
    const msg = err && typeof err === "object" && "response" in err
      ? (err as { response?: { body?: { errors?: unknown } } }).response?.body?.errors
      : null;
    const detail = msg ? JSON.stringify(msg) : err instanceof Error ? err.message : "Unknown error";
    console.error("[check-trials] SendGrid error:", detail);
    return NextResponse.json(
      {
        message: "Failed to send emails. Check that SENDGRID_API_KEY is valid and EMAIL_FROM is a verified sender in SendGrid.",
        error: detail,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { message: `Trial reminders sent to ${subscriptions.length} recipient(s). Check inbox and spam.`, count: subscriptions.length },
    { status: 200 },
  );
}

