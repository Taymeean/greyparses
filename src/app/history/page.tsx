'use client';

import { useEffect, useMemo, useState } from 'react';

type Week = { id: number; label: string; startDate: string };
type Row = {
  playerId: number;
  playerName: string;
  role: string;
  class: { id: number; name: string; armorType: string; tierPrefix: string };
  choice: null | {
    id: number;
    lootItem: { id: number; name: string; type: string; slot: string | null };
    boss: { id: number; name: string } | null;
    isTier: boolean;
    locked: boolean;
    notes: string;
    updatedAt: string;
  };
};

function formatNY(ts: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(ts));
  } catch { return ts; }
}

export default function HistoryPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [weekId, setWeekId] = useState<number | null>(null);
  const [label, setLabel] = useState<string>('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // load recent weeks
  useEffect(() => {
    fetch('/api/weeks?limit=24', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((ws: Week[]) => {
        setWeeks(ws);
        if (ws.length && weekId === null) setWeekId(ws[0].id);
      })
      .catch(() => setErr('Failed to load weeks'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const srUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (weekId != null) params.set('weekId', String(weekId));
    return `/api/sr?${params.toString()}`;
  }, [weekId]);

  // load SR table for selected week
  useEffect(() => {
    if (weekId == null) return;
    setLoading(true); setErr(null);
    fetch(srUrl, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((data: { weekId: number; label: string; rows: Row[] }) => {
        setLabel(data.label);
        setRows(data.rows);
      })
      .catch(() => setErr('Failed to load SR data'))
      .finally(() => setLoading(false));
  }, [srUrl, weekId]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">History (Read-only)</h1>

      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex flex-col">
          <label className="text-sm text-gray-500">Week</label>
          <select
            className="border rounded px-3 py-1"
            value={weekId ?? ''}
            onChange={(e) => setWeekId(e.target.value ? Number(e.target.value) : null)}
          >
            {weeks.length === 0 && <option value="">(loading…)</option>}
            {weeks.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
          </select>
        </div>
        <div className="text-gray-600 text-sm">Viewing: <span className="font-medium">{label || '—'}</span></div>
      </div>

      {err && <div className="text-red-600">{err}</div>}

      <div className="border rounded overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Class</th>
              <th className="px-3 py-2">SR Item</th>
              <th className="px-3 py-2">Boss</th>
              <th className="px-3 py-2">Tier?</th>
              <th className="px-3 py-2">Locked</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const c = r.choice;
              return (
                <tr key={r.playerId} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">{r.playerName}</td>
                  <td className="px-3 py-2">{r.role}</td>
                  <td className="px-3 py-2">{r.class.name}</td>
                  <td className="px-3 py-2">{c?.lootItem?.name ?? '—'}</td>
                  <td className="px-3 py-2">{c?.boss?.name ?? '—'}</td>
                  <td className="px-3 py-2">{c ? (c.isTier ? 'Y' : 'N') : '—'}</td>
                  <td className="px-3 py-2">{c ? (c.locked ? 'Locked' : 'Unlocked') : '—'}</td>
                  <td className="px-3 py-2">{c?.notes ?? ''}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{c ? formatNY(c.updatedAt) : '—'}</td>
                </tr>
              );
            })}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-500">No SRs for this week</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
