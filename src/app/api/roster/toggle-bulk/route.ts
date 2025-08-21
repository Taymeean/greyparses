// src/app/api/roster/toggle-bulk/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getActorDisplay, isOfficer } from "@/lib/auth";
import { AuditAction, TargetType } from "@prisma/client";

const Body = z.object({
  ids: z.array(z.number().int().positive()).min(1),
  active: z.boolean(),
});

export async function POST(req: Request) {
  const officer = await isOfficer();
  if (!officer) {
    return NextResponse.json({ error: "Officer only" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { ids, active } = parsed.data;

  const players = await prisma.player.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, active: true },
  });

  if (players.length === 0) {
    return NextResponse.json({
      ok: true,
      changed: 0,
      skipped: 0,
      missing: ids.length,
    });
  }

  // Only modify those that actually change
  const targets = players.filter((p) => p.active !== active);

  // Resolve actor display once to avoid N cookie reads
  const actorDisplay = await getActorDisplay();

  await prisma.$transaction(async (tx) => {
    for (const p of targets) {
      await tx.player.update({ where: { id: p.id }, data: { active } });

      // Optional audit (guarded in case your schema doesn't define these enum members)
      const actionKey = active ? "PLAYER_REACTIVATED" : "PLAYER_DEACTIVATED";
      const action =
        (AuditAction as unknown as Record<string, AuditAction>)[actionKey];
      const targetType =
        (TargetType as unknown as Record<string, TargetType>)["PLAYER"];

      if (action && targetType) {
        await tx.auditLog.create({
          data: {
            action,
            targetType,
            targetId: `player:${p.id}`,
            before: { active: !active },
            after: { active },
            actorDisplay,
            meta: { playerName: p.name },
          },
        });
      }
    }
  });

  return NextResponse.json({
    ok: true,
    requested: ids.length,
    changed: targets.length,
    skipped: players.length - targets.length,
    missing: ids.length - players.length,
  });
}
