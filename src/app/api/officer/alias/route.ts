import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({ name: z.string().trim().min(2).max(32) });

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const p = Body.safeParse(json);
  if (!p.success)
    return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const res = NextResponse.json({ ok: true, alias: p.data.name });
  res.cookies.set("gp_officer_name", p.data.name, {
    path: "/",
    httpOnly: true,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("gp_officer_name", "", { path: "/", maxAge: 0 });
  return res;
}
