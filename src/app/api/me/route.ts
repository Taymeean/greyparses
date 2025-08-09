// src/app/api/me/route.ts
import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth';

export async function GET() {
  const s = readSession();
  return NextResponse.json({ authenticated: !!s, session: s });
}
