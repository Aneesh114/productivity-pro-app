import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard";

export default async function Home() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/auth/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { subscriptions: true },
  });

  if (!user) {
    redirect("/auth/sign-up");
  }

  return (
    <Dashboard
      userName={user.name ?? user.email}
      subscriptions={user.subscriptions}
    />
  );
}
