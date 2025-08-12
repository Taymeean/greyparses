'use client';

import { useEffect, useMemo, useState } from 'react';

type AuditItem = {
  id: number;
  createdAt: string;
  actorDisplay: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  weekId: number | null;
  before: any | null;
  after: any | null;
  meta: any | null;
};

type AuditResponse = { items: AuditItem[]; nextCursor: number | null };
type Boss = { id: number; name: string };

export default function AuditPage() {
  const [isOfficer, setIsOfficer] = useState<boolean | null>(null);

  // current week
  const [weekId, setWeekId] = useState<number | ''>('');
  const [weekLabel, setWeekLabel] = useState<string>('—');

  // filters
  const [limit, setLimit] = useState<number>(50);
  const [action, setAction] = useState<string>('');

  // data
  const [items, setItems] = useState<AuditItem[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // label caches
  const [bossMap, setBossMap] = useState<Record<number, string>>({});
  const [lootMap, setLootMap] = useState<Record<number, string>>({});

  // boot: officer probe + set current week from SR + load logs
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const probe = await fetch(`/api/audit?limit=1`, { cache: 'no-store' });
        if (!alive) return;
        if (probe.status === 403) { setIsOfficer(false); return; }
        setIsOfficer(true);

        // week label/id
        const srRes = await fetch('/api/sr', { cache: 'no-store' });
        if (srRes.ok) {
          const sr = await srRes.json();
          if (sr?.weekId) setWeekId(sr.weekId);
          if (sr?.label) setWeekLabel(sr.label);
        }

        // bosses
        const bRes = await fetch('/api/bosses', { cache: 'no-store' });
        if (bRes.ok) {
          const bosses: Boss[] = await bRes.json();
          setBossMap(Object.fromEntries(bosses.map(b => [b.id, b.name])));
        }

        await loadLogs({ reset: true, forceCursor: null });
      } catch {
        setIsOfficer(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // whenever items change, prefetch loot labels we don't know yet
  useEffect(() => {
    const need = collectLootIds(items).filter(id => lootMap[id] == null);
    if (need.length === 0) return;
    (async () => {
      const res = await fetch(`/api/loot/labels?ids=${need.join(',')}`, { cache: 'no-store' });
      if (!res.ok) return;
      const map = await res.json();
      setLootMap(prev => ({ ...prev, ...map }));
    })();
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadLogs(opts?: { reset?: boolean; forceWeekId?: number | ''; forceCursor?: number | null }) {
    const useWeek = opts?.forceWeekId !== undefined ? opts.forceWeekId : weekId;
    const useCursor = opts?.reset ? null : (opts?.forceCursor ?? cursor);

    setLoading(true);
    setErr(null);
    try {
      const q = new URLSearchParams();
      q.set('limit', String(limit));
      if (useWeek !== '' && useWeek != null) q.set('weekId', String(useWeek));
      if (action) q.set('action', action);
      if (useCursor != null) q.set('cursor', String(useCursor));

      const res = await fetch(`/api/audit?${q.toString()}`, { cache: 'no-store' });
      if (res.status === 403) { setIsOfficer(false); setLoading(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j: AuditResponse = await res.json();

      setItems(j.items || []);
      setNextCursor(j.nextCursor ?? null);
      setCursor(useCursor ?? null);
    } catch (e: any) {
      setErr(e.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  const title = useMemo(() => `Audit`, []);
  const timeFmt = (ts: string) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(ts));

  if (isOfficer === null) return <div className="badge">Checking access…</div>;
  if (!isOfficer) {
    return (
      <div className="panel max-w-xl">
        <div className="panel-title text-lg">{title}</div>
        <p className="badge mb-2">This page is officer-only.</p>
        <a className="btn" href="/officer">Go to Officer Login</a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="badge">{weekLabel}</div>
      </div>

      {/* Filters */}
      <div className="panel">
        <div className="panel-title mb-2">Filters</div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="badge mb-1">Week ID</div>
            <input
              className="w-28"
              type="number"
              placeholder="(current)"
              value={weekId}
              onChange={(e) => setWeekId(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>

          <div>
            <div className="badge mb-1">Limit</div>
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>

          <div>
            <div className="badge mb-1">Action</div>
            <select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">Any</option>
              <option value="SR_CHOICE_SET">SR_CHOICE_SET</option>
              <option value="SR_LOCKED">SR_LOCKED</option>
              <option value="SR_UNLOCKED_EXCEPT_KILLED">SR_UNLOCKED_EXCEPT_KILLED</option>
              <option value="BOSS_KILL_TOGGLED">BOSS_KILL_TOGGLED</option>
              <option value="WEEK_RESET">WEEK_RESET</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button className="btn" onClick={() => loadLogs({ reset: true })} disabled={loading}>
              {loading ? 'Loading…' : 'Apply'}
            </button>
            <button
              className="btn"
              onClick={() => { setCursor(null); loadLogs({ reset: true }); }}
              disabled={loading}
              title="Reload from newest"
            >
              Reset cursor
            </button>
          </div>

          {err && <div className="text-sm text-red-400">{err}</div>}
        </div>
      </div>

      {/* Table */}
      <div className="sr-wrap">
        <table className="min-w-full text-[15px]">
          <thead>
            <tr>
              <th>Time (ET)</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
              <th>Changes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="whitespace-nowrap">{timeFmt(it.createdAt)}</td>
                <td className="whitespace-nowrap">{it.actorDisplay ?? '—'}</td>
                <td className="whitespace-nowrap">{it.action}</td>
                <td className="whitespace-nowrap">{it.targetId ?? '—'}</td>
                <td>
                  <ChangeList
                    item={it}
                    bossMap={bossMap}
                    lootMap={lootMap}
                  />
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-neutral-400 py-8">No logs</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pager */}
      <div className="flex items-center justify-between">
        <div className="badge">{items.length} rows</div>
        <div className="flex gap-2">
          <button
            className="btn"
            onClick={() => loadLogs({ reset: true, forceCursor: null })}
            disabled={loading}
          >
            Newest
          </button>
          <button
            className="btn"
            onClick={() => { if (nextCursor != null) loadLogs({ forceCursor: nextCursor }); }}
            disabled={loading || nextCursor == null}
          >
            Older →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function collectLootIds(items: AuditItem[]): number[] {
  const out = new Set<number>();
  for (const it of items) {
    [it.before, it.after].forEach(obj => {
      if (obj && typeof obj === 'object' && 'lootItemId' in obj) {
        const v = (obj as any).lootItemId;
        if (typeof v === 'number' && Number.isFinite(v)) out.add(v);
      }
    });
  }
  return [...out];
}

function prettyValue(key: string, val: any, maps: { bossMap: Record<number, string>, lootMap: Record<number, string> }) {
  if (val == null) return '—';
  if (key === 'bossId') {
    const id = Number(val);
    return maps.bossMap[id] ? `${maps.bossMap[id]} (#${id})` : `Boss #${id}`;
  }
  if (key === 'lootItemId') {
    const id = Number(val);
    return maps.lootMap[id] ? `${maps.lootMap[id]} (#${id})` : `Item #${id}`;
  }
  if (key === 'isTier') return val ? 'Y' : 'N';
  if (key === 'locked') return val ? 'Locked' : 'Unlocked';
  if (Array.isArray(val)) return val.length ? `[${val.join(', ')}]` : '[]';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function labelForKey(action: string, key: string) {
  // Friendly labels per action/key
  const map: Record<string, string> = {
    lootItemId: 'Item',
    bossId: 'Boss',
    notes: 'Notes',
    isTier: 'Tier',
    locked: 'Locked',
    unlocked: 'Unlocked',
    killed: 'Killed',
    killedBossIds: 'Killed Bosses',
    affected: 'Affected',
  };
  return map[key] || key;
}

function diffPairs(before: any, after: any, action: string, maps: { bossMap: Record<number, string>, lootMap: Record<number, string> }) {
  const keys = new Set<string>([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);
  const rows: { label: string; before?: string; after?: string }[] = [];
  keys.forEach((k) => {
    const b = before?.[k];
    const a = after?.[k];
    const same = JSON.stringify(b) === JSON.stringify(a);
    if (same) return;
    rows.push({
      label: labelForKey(action, k),
      before: b === undefined ? undefined : prettyValue(k, b, maps),
      after: a === undefined ? undefined : prettyValue(k, a, maps),
    });
  });
  return rows;
}

function ChangeList({ item, bossMap, lootMap }: { item: AuditItem; bossMap: Record<number, string>; lootMap: Record<number, string> }) {
  // Prefer meta.display if you later add it to logs; fallback to diff
  const rows = diffPairs(item.before, item.after, item.action, { bossMap, lootMap });
  if (!rows.length) return <span className="badge">—</span>;
  return (
    <ul className="space-y-1">
      {rows.map((r, i) => (
        <li key={i}>
          <span className="text-neutral-300">{r.label}:</span>{' '}
          {r.before !== undefined ? <>{r.before} <span className="text-neutral-500">→</span> </> : null}
          <b>{r.after ?? '—'}</b>
        </li>
      ))}
    </ul>
  );
}
