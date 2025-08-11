import { NextResponse } from 'next/server';
const OFFICER_COOKIE = 'gp_officer';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OFFICER_COOKIE, '', { path: '/', maxAge: 0 });
  res.cookies.set('officer', '', { path: '/', maxAge: 0 });
  return res;
}
