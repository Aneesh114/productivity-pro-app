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

  await sgMail.send(messages);

  return NextResponse.json(
    { message: "Trial reminders sent", count: subscriptions.length },
    { status: 200 },
  );
}

