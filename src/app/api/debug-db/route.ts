import { NextResponse } from "next/server";

/**
 * Dev only: returns the database host the app is using so you can verify
 * you're checking the same DB in your client (pgAdmin, DBeaver, prisma studio, etc.).
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  const url = process.env.DATABASE_URL ?? "";
  // Strip user:password and path, leave host:port only
  const host = url.replace(/^[^@]+@/, "").split("/")[0] ?? "not set";
  return NextResponse.json({ databaseHost: host });
}
