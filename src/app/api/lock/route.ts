// src/app/api/lock/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWeekStartNY, formatWeekLabelNY } from "@/lib/week";
import { Prisma, AuditAction } from "@prisma/client";
import { getActorDisplay, isOfficer } from "@/lib/auth";

export async function POST(req: Request) {
  const officer = await isOfficer();
  if (!officer) {
    return NextResponse.json({ error: "Officer only" }, { status: 403 });
  }

  // Body is optional; default to lock=true unless explicitly false
  let lock = true;
  try {
    const json = await req.json();
    if (json && typeof json.lock === "boolean") lock = json.lock;
  } catch {
    // empty or non-JSON body: fine, we keep lock=true
  }

  const label = formatWeekLabelNY(getCurrentWeekStartNY());
  const week = await prisma.week.findUnique({ where: { label } });
  if (!week) {
    return NextResponse.json(
      { error: "current_week_missing" },
      { status: 404 },
    );
  }

  const { count } = await prisma.sRChoice.updateMany({
    where: { weekId: week.id },
    data: { locked: lock },
  });

  await prisma.auditLog.create({
    data: {
      action: lock ? AuditAction.SR_LOCKED : AuditAction.SR_UNLOCKED,
      targetType: "WEEK",
      targetId: `week:${week.id}`,
      weekId: week.id,
      // JSON columns: use Prisma.DbNull instead of raw null
      before: Prisma.DbNull,
      after: { locked: lock, affected: count },
      actorDisplay: await getActorDisplay(),
      meta: { affected: count },
    },
  });

  return NextResponse.json({ ok: true, affected: count });
}
