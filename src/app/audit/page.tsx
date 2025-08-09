'use client';

import { useEffect, useMemo, useState } from 'react';

type AuditItem = {
  id: number; createdAt: string; actorDisplay: string | null;
  action: string; targetType: string; targetId: string; weekId: number | null;
  before: any; after: any;
};
type ApiPage = { items: AuditItem[]; nextCursor: number | null };
type Week = { id: number; label: string; startDate: string };

function formatNY(ts: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date(ts));
  } catch { return ts; }
}

export default function AuditPage() {
  const [rows, setRows] = useState<AuditItem[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [weekId, setWeekId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // load weeks once
  useEffect(() => {
    fetch('/api/weeks?limit=24', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((ws: Week[]) => {
        setWeeks(ws);
        if (ws.length && weekId === null) setWeekId(ws[0].id); // default to latest week
      })
      .catch(() => {}); // ignore
  }, []); // eslint-disable-line

  const baseUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('limit', String(pageSize));
    if (weekId != null) params.set('weekId', String(weekId));
    if (actor.trim()) params.set('actor', actor.trim());
    if (action.trim()) params.set('action', action.trim());
    return `/api/audit?${params.toString()}`;
  }, [pageSize, weekId, actor, action]);

  async function loadFirstPage() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(baseUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApiPage = await res.json();
      setRows(data.items);
      setNextCursor(data.nextCursor);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextCursor) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${baseUrl}&cursor=${nextCursor}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApiPage = await res.json();
      setRows(prev => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch (e: any) {
      setError(e.message || 'Failed to load more');
    } finally {
      setLoading(false);
    }
  }

  // load page 1 when filters change
  useEffect(() => { loadFirstPage(); }, [baseUrl]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Audit Viewer (MVP)</h1>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col">
          <label className="text-sm text-gray-500">Week</label>
          <select
            className="border rounded px-3 py-1"
            value={weekId ?? ''}
            onChange={(e) => setWeekId(e.target.value ? Number(e.target.value) : null)}
          >
            {weeks.length === 0 && <option value="">(loading…)</option>}
            {weeks.map(w => (
              <option key={w.id} value={w.id}>{w.label}</option>
            ))}
            <option value="">All weeks</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-500">Actor contains</label>
          <input
            className="border rounded px-3 py-1"
            placeholder="anonymous"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-500">Action (exact)</label>
          <input
            className="border rounded px-3 py-1"
            placeholder="SR_CHOICE_SET"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-500">Page size</label>
          <select
            className="border rounded px-3 py-1"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <button
          onClick={loadFirstPage}
          disabled={loading}
          className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Apply'}
        </button>
      </div>

      {error && <div className="text-red-600">Error: {error}</div>}

      <div className="border rounded overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2">Time (NY)</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Week</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">{formatNY(r.createdAt)}</td>
                <td className="px-3 py-2">{r.actorDisplay ?? '—'}</td>
                <td className="px-3 py-2">{r.action}</td>
                <td className="px-3 py-2">{r.targetType}: {r.targetId}</td>
                <td className="px-3 py-2">{r.weekId ?? '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-500">No results</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={loadMore}
          disabled={loading || !nextCursor}
          className="px-3 py-2 rounded border"
        >
          {nextCursor ? (loading ? 'Loading…' : 'Load older') : 'No more'}
        </button>
        <span className="text-xs text-gray-500">Showing {rows.length} logs</span>
      </div>
    </div>
  );
}
