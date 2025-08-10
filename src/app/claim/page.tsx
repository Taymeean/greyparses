'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type ClassRow = { id: number; name: string };
const ROLES = ['TANK', 'HEALER', 'MDPS', 'RDPS'] as const;

export default function ClaimPage() {
  const router = useRouter();
  const qs = useSearchParams();

  const [me, setMe] = useState<{ authenticated: boolean; session?: any } | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<{ name: string } | null>(null);

  const [token, setToken] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<typeof ROLES[number]>('MDPS');
  const [classId, setClassId] = useState<number | ''>('');

  // deactivate UI
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deactMsg, setDeactMsg] = useState<string | null>(null);
  const [deactErr, setDeactErr] = useState<string | null>(null);

  useEffect(() => {
    const t = qs.get('token');
    if (t) setToken(t);
  }, [qs]);

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' }).then(r => r.json()).then(setMe).catch(() => setMe({ authenticated: false }));
    fetch('/api/classes', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((rows: any[]) => setClasses(rows.map(r => ({ id: r.id, name: r.name }))))
      .catch(() => setClasses([]));
  }, []);

  const canSubmit = useMemo(() => {
    return token.trim().length >= 8 && name.trim().length >= 2 && classId !== '' && ROLES.includes(role);
  }, [token, name, classId, role]);

  async function claim(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true); setErr(null); setOk(null);
    try {
      const res = await fetch('/api/invite/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), name: name.trim(), role, classId: Number(classId) }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setOk({ name: j.player?.name || name.trim() });
      setMe({ authenticated: true, session: j.player });
    } catch (e: any) {
      setErr(e.message || 'Claim failed');
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    try { await fetch('/api/logout', { method: 'POST' }); }
    finally {
      setLoading(false);
      setMe({ authenticated: false });
      setOk(null);
    }
  }

  async function deactivate() {
    setDeactErr(null); setDeactMsg(null);
    try {
      const res = await fetch('/api/player/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmName }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setDeactMsg('Character deactivated. You are signed out.');
      setConfirmName('');
      setMe({ authenticated: false });
      // optional: route away
      // router.replace('/claim');
    } catch (e: any) {
      setDeactErr(e.message || 'Deactivate failed');
    }
  }

  if (me?.authenticated && !ok) {
    const currentName = me.session?.name as string | undefined;
    return (
      <div className="p-6 max-w-lg mx-auto space-y-5">
        <h1 className="text-2xl font-semibold">Claim character</h1>

        <div className="p-4 border rounded">
          <div className="text-sm text-gray-600">You’re signed in as:</div>
          <div className="mt-1 font-medium">{currentName} ({me.session?.role})</div>
          <div className="mt-4 flex gap-3">
            <a href="/sr" className="px-3 py-2 rounded bg-black text-white">Go to SR</a>
            <button onClick={logout} className="px-3 py-2 rounded border">Log out</button>
          </div>
        </div>

        <div className="p-4 border rounded bg-red-50">
          <div className="font-medium text-red-800">Danger zone</div>
          <p className="text-sm text-red-800 mt-1">
            Deactivating hides your character from the SR table going forward (history stays intact).
            Officers can reactivate later.
          </p>

          <button
            onClick={() => setShowDeactivate(v => !v)}
            className="mt-3 px-3 py-2 rounded border"
          >
            {showDeactivate ? 'Cancel' : 'Deactivate this character'}
          </button>

          {showDeactivate && (
            <div className="mt-3 space-y-2">
              <label className="text-sm text-gray-700">
                Type your character name to confirm:
              </label>
              <input
                className="border rounded px-3 py-2 w-full"
                placeholder={currentName || 'Character name'}
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
              />
              {deactErr && <div className="text-sm text-red-600">{deactErr}</div>}
              {deactMsg && <div className="text-sm text-green-600">{deactMsg}</div>}
              <button
                onClick={deactivate}
                disabled={!confirmName.trim()}
                className="px-3 py-2 rounded bg-red-600 text-white disabled:opacity-50"
                title="Are you sure?"
              >
                Yes, deactivate
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500">
          You can rejoin later; ask an officer to reactivate your character.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Claim your character</h1>
      <p className="text-sm text-gray-600">
        Enter the shared invite token from Discord, then your character details. Class & role are locked after claim.
      </p>

      <form onSubmit={claim} className="space-y-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Invite token</label>
          <input className="border rounded px-3 py-2" placeholder="paste token" value={token} onChange={(e) => setToken(e.target.value)} />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Character name</label>
          <input className="border rounded px-3 py-2" placeholder="e.g. Skullblaster" value={name} onChange={(e) => setName(e.target.value)} />
          <span className="text-xs text-gray-500 mt-1">2–24 characters. One character per human.</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="text-sm text-gray-600">Role</label>
            <select className="border rounded px-3 py-2" value={role} onChange={(e) => setRole(e.target.value as any)}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-gray-600">Class</label>
            <select className="border rounded px-3 py-2" value={classId} onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Select class…</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {err && <div className="text-sm text-red-600">{err}</div>}
        {ok && (
          <div className="p-3 rounded bg-green-50 border border-green-200 text-green-700 text-sm">
            Claimed <b>{ok.name}</b>. You’re signed in — go to <a href="/sr" className="underline">SR</a>.
          </div>
        )}

        <button type="submit" disabled={!canSubmit || loading} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">
          {loading ? 'Claiming…' : 'Claim character'}
        </button>
      </form>
    </div>
  );
}
