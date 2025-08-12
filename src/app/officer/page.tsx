'use client';

import { useEffect, useState } from 'react';

type BossRow = { id: number; name: string; killed: boolean };
type KillsPayload =
  | BossRow[]
  | { weekId?: number; label?: string; bosses?: BossRow[] }
  | { items?: { bossId: number; name: string; killed: boolean }[] };

export default function OfficerPage() {
  const [isOfficer, setIsOfficer] = useState<boolean | null>(null);
  const [officerName, setOfficerName] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [weekLabel, setWeekLabel] = useState<string>('—');
  const [bosses, setBosses] = useState<BossRow[]>([]);
  const [loadingKills, setLoadingKills] = useState(false);

  useEffect(() => {
    checkOfficer().then((ok) => {
      setIsOfficer(ok);
      if (ok) void loadKills();
    });
  }, []);

  async function checkOfficer(): Promise<boolean> {
    try {
      const r = await fetch('/api/audit?limit=1', { cache: 'no-store' });
      return r.status !== 403;
    } catch {
      return false;
    }
  }

  async function loginOfficer(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    try {
      const r = await fetch('/api/officer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyInput.trim() }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      setIsOfficer(true);
      setMsg('Officer mode enabled.');
      setKeyInput('');
      await loadKills();
    } catch (e: any) {
      setErr(e.message || 'Login failed');
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 1500);
    }
  }

  function normalizeBosses(j: KillsPayload): BossRow[] {
    if (Array.isArray(j)) return j;
    if ('bosses' in (j as any) && Array.isArray((j as any).bosses)) return (j as any).bosses;
    if ('items' in (j as any) && Array.isArray((j as any).items)) {
      return (j as any).items.map((x: any) => ({ id: x.bossId, name: x.name, killed: x.killed }));
    }
    return [];
  }

  async function loadKills() {
    setLoadingKills(true); setErr(null);
    try {
      const r = await fetch('/api/kills', { cache: 'no-store' });
      const j = await r.json();
      const rows = normalizeBosses(j);
      setBosses(rows);
      setWeekLabel((j as any)?.label ?? 'Current Week');
    } catch (e: any) {
      setErr(e.message || 'Failed to load boss kills');
    } finally {
      setLoadingKills(false);
    }
  }

  async function toggleKill(bossId: number) {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/kills/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bossId }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      await loadKills();
      setMsg('Updated.');
    } catch (e: any) {
      setErr(e.message || 'Toggle failed');
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 1200);
    }
  }

  async function lockAll() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/lock', { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setMsg(`Locked (affected: ${j?.affected ?? '—'})`);
    } catch (e: any) {
      setErr(e.message || 'Lock failed');
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 1500);
    }
  }

  async function unlockExceptKilled() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/lock/except-killed', { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setMsg(`Unlocked: ${j?.unlocked ?? 0}`);
    } catch (e: any) {
      setErr(e.message || 'Unlock failed');
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 1500);
    }
  }

      // state
    const [resetConfirm, setResetConfirm] = useState('');
    const [resetting, setResetting] = useState(false);

    // action
    async function resetWeek() {
      if (resetConfirm !== 'RESET') {
        setErr('Type RESET to confirm');
        return;
      }
      setErr(null);
      setMsg(null);
      setResetting(true);
      try {
        // call your reset route; change the path if your route differs
        let r = await fetch('/api/reset-week', { method: 'POST' });
        if (r.status === 404) r = await fetch('/api/week/reset', { method: 'POST' }); // fallback if you used a different path
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);

        const newLabel = j?.label || j?.week?.label || 'New week started';
        setMsg(`Week reset: ${newLabel}`);
        setResetConfirm('');

        // refresh panel data
        await loadKills();
        if (newLabel) setWeekLabel(newLabel);
      } catch (e: any) {
        setErr(e.message || 'Reset failed');
      } finally {
        setResetting(false);
        setTimeout(() => setMsg(null), 2000);
      }
    }

  if (isOfficer === null) {
    return <div className="text-sm text-neutral-400">Checking access…</div>;
  }

  if (!isOfficer) {
    return (
      <div className="max-w-md panel">
        <h1 className="text-2xl font-semibold mb-2">Officer access</h1>
        <p className="badge mb-3">Enter the officer key to unlock controls.</p>
        <form onSubmit={loginOfficer} className="space-y-3">
          <input
            className="w-full"
            placeholder="OFFICER_KEY"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
          />
          <button type="submit" disabled={!keyInput.trim() || busy} className="btn btn-primary">
            {busy ? 'Checking…' : 'Unlock'}
          </button>
          {err && <div className="text-sm text-red-400">{err}</div>}
          {msg && <div className="text-sm text-green-400">{msg}</div>}
        </form>
      </div>
    );
  }

  const killedCount = bosses.filter((b) => b.killed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Officer Panel</h1>
        <div className="badge">{weekLabel}</div>
      </div>
          {/* Officer identity (used in audit actorDisplay) */}
          <div className="panel max-w-xl">
            <div className="panel-title">Officer identity</div>
            <p className="badge mb-2">
              Audits will show <code>officer:&lt;name&gt;</code>. If you’ve claimed a character, we use that.
              Otherwise set an alias:
            </p>
            <div className="flex gap-2">
              <input
                className="w-56"
                placeholder="e.g. Tayvok"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
              />
              <button
                className="btn"
                disabled={!officerName.trim()}
                onClick={async () => {
                  await fetch('/api/officer/alias', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: officerName.trim() }),
                  });
                  // optional: feedback
                }}
              >
                Save alias
              </button>
              <button
                className="btn"
                onClick={async () => {
                  await fetch('/api/officer/alias', { method: 'DELETE' });
                  setOfficerName('');
                }}
              >
                Clear
              </button>
            </div>
          </div>

      {/* SR Controls */}
      <div className="panel space-y-3">
        <div className="panel-title">SR Controls</div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={lockAll} disabled={busy} className="btn">
            {busy ? 'Working…' : 'Lock all SRs'}
          </button>
          <button
            onClick={unlockExceptKilled}
            disabled={busy}
            className="btn"
            title="Unlock everyone except rows targeting bosses already marked killed"
          >
            {busy ? 'Working…' : 'Unlock except killed'}
          </button>
          <button onClick={loadKills} disabled={loadingKills} className="btn">
            {loadingKills ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {msg && <div className="text-sm text-green-400">{msg}</div>}
        {err && <div className="text-sm text-red-400">{err}</div>}
      </div>

      {/* Boss kills */}
      <div className="panel">
        <div className="flex items-center justify-between">
          <div className="panel-title">Boss kills</div>
          <div className="badge">{killedCount}/{bosses.length} killed</div>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {bosses.map((b) => (
            <label key={b.id} className="checkbox-row">
              <input type="checkbox" checked={b.killed} onChange={() => toggleKill(b.id)} />
              <span>{b.name}</span>
            </label>
          ))}
          {bosses.length === 0 && (
            <div className="text-sm text-neutral-400">No bosses found.</div>
          )}
        </div>
      </div>

    {/* Danger zone — Reset Week */}
    <div
      className="panel max-w-xl mx-auto text-center"
      style={{ borderColor: '#7f1d1d', background: 'color-mix(in oklab, var(--bg-2) 85%, #7f1d1d 15%)' }}
    >
      <div className="panel-title text-red-200 text-xl mb-1">Danger zone</div>
      <p className="text-[0.95rem] text-red-200/90 mb-3">
        Reset Week archives the current SRs (via audit), starts a new week, clears SR choices/notes, and resets boss kills.
      </p>

      <div className="flex items-center justify-center gap-3">
        <input
          className="w-56"
          placeholder='Type "RESET" to confirm'
          value={resetConfirm}
          onChange={(e) => setResetConfirm(e.target.value)}
        />
        <button
          onClick={resetWeek}
          disabled={resetConfirm !== 'RESET' || resetting || busy}
          className="btn btn-danger text-base px-4 py-2"
          title="Archives and clears the current week"
        >
          {resetting ? 'Resetting…' : 'Reset Week'}
        </button>
      </div>
    </div>

      {/* Links */}
      <div className="badge">
        Need detail? See <a className="underline" href="/audit">Audit</a> or <a className="underline" href="/sr">SR table</a>.
      </div>
    </div>
  );
}
