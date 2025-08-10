import { NextResponse } from 'next/server';
import { z } from 'zod';
import { OFFICER_COOKIE, signedOfficerCookieValue } from '@/lib/auth';

const Body = z.object({ token: z.string().min(8) });

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const { token } = parsed.data;
  if (token !== process.env.OFFICER_TOKEN) {
    return NextResponse.json({ error: 'Invalid officer token' }, { status: 403 });
    }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(OFFICER_COOKIE, signedOfficerCookieValue(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}
