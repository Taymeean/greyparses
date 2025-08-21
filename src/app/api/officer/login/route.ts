// src/app/api/officer/login/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z
  .object({
    key: z.string().min(4).optional(),
    token: z.string().min(4).optional(),
  })
  .refine((d) => (d.key ?? d.token)?.trim().length, { message: "Missing key" });

const OFFICER_COOKIE = "gp_officer";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const provided = (parsed.data.key ?? parsed.data.token)!.trim();
  const expected = process.env.OFFICER_KEY?.trim();

  if (!expected) {
    return NextResponse.json(
      { error: "Server missing OFFICER_KEY" },
      { status: 500 },
    );
  }
  if (provided !== expected) {
    return NextResponse.json({ error: "Invalid officer key" }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true });
  // Set both names for back-compat
  res.cookies.set(OFFICER_COOKIE, "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  res.cookies.set("officer", "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  return res;
}
