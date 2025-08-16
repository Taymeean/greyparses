import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readSession, getActorDisplay, COOKIE_NAME } from "@/lib/auth";
import { AuditAction } from "@prisma/client";

const Body = z.object({
  confirmName: z.string().min(2).max(24),
});

export async function POST(req: Request) {
  const session = readSession();
  if (!session)
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success)
    return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { confirmName } = parsed.data;

  // require exact name confirmation (case-insensitive)
  if (confirmName.trim().toLowerCase() !== session.name.toLowerCase()) {
    return NextResponse.json(
      { error: "Confirmation name does not match your character" },
      { status: 400 },
    );
  }

  const player = await prisma.player.findUnique({
    where: { id: session.playerId },
    select: { id: true, active: true },
  });
  if (!player)
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  if (!player.active) {
    // already inactive — still clear cookie for good measure
    const res = NextResponse.json({ ok: true, deactivated: false });
    res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return res;
  }

  const updated = await prisma.player.update({
    where: { id: session.playerId },
    data: { active: false },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.PLAYER_DEACTIVATED,
      targetType: "PLAYER",
      targetId: `player:${updated.id}`,
      weekId: null,
      before: { active: true },
      after: { active: false },
      actorDisplay: getActorDisplay(), // should be player:<name>
    },
  });

  // clear member cookie
  const res = NextResponse.json({ ok: true, deactivated: true });
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
