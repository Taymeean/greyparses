// src/app/api/me/route.ts
import { NextResponse } from "next/server";
import { readSession, isOfficer, getActorDisplay } from "@/lib/auth";

export const dynamic = "force-dynamic"; // never statically optimize this route
export const revalidate = 0;

export async function GET() {
  const [session, officer, actorDisplay] = await Promise.all([
    readSession(),
    isOfficer(),
    getActorDisplay(),
  ]);

  const res = NextResponse.json({
    authenticated: !!session,
    session: session ?? null,
    officer,
    actorDisplay,
  });

  // hard no-cache to avoid stale headers in any environment
  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");

  return res;
}
