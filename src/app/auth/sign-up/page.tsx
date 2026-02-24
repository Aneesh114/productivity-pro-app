import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

const signUpSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

async function createUser(formData: FormData) {
  "use server";

  const raw = {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim().toLowerCase(),
    password: String(formData.get("password") || ""),
  };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat().join(". ") || "Invalid input.";
    redirect(`/auth/sign-up?error=${encodeURIComponent(msg)}`);
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existing) {
      redirect("/auth/sign-up?error=" + encodeURIComponent("An account with this email already exists."));
    }

    const passwordHash = await hash(parsed.data.password, 10);

    await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash,
      },
    });
  } catch (err) {
    console.error("Sign-up error:", err);
    redirect("/auth/sign-up?error=" + encodeURIComponent("Sign-up failed. Check the server terminal for details."));
  }

  redirect("/auth/sign-in");
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const params = await searchParams;
  const errorMsg = typeof params.error === "string" ? params.error : params.error?.[0];

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-zinc-800 p-8 shadow-sm transition-colors">
        <h1 className="mb-6 text-center text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Create your account
        </h1>
        {errorMsg && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900 px-3 py-2 text-sm text-red-800 dark:text-red-200" role="alert">
            {decodeURIComponent(errorMsg)}
          </div>
        )}
        <form action={createUser} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
            />
          </div>

          <button
            type="submit"
            className="mt-4 w-full rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            Sign up
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{" "}
          <a
            href="/auth/sign-in"
            className="font-medium text-zinc-900 dark:text-zinc-100 underline"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}

