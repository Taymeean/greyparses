"use client";

import { useEffect, useMemo, useState } from "react";

type Week = { id: number; label: string; startDate: string };
type LootItem = { id: number; name: string; type: string; slot: string | null };
type Boss = { id: number; name: string };
type Choice = {
  id: number;
  lootItem: LootItem | null;
  boss: Boss | null;
  isTier: boolean;
  locked: boolean;
  notes: string;
  updatedAt: string;
};
type ClassInfo = {
  id: number;
  name: string;
  armorType: string;
  tierPrefix: string;
};
type Row = {
  playerId: number;
  playerName: string;
  role: "TANK" | "HEALER" | "MDPS" | "RDPS" | string;
  class: ClassInfo;
  choice: Choice | null;
  active?: boolean;
};

const ROLES = ["TANK", "HEALER", "MDPS", "RDPS"] as const;

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-2px]"
      aria-hidden="true"
    />
  );
}

function formatNY(ts?: string) {
  if (!ts) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));
  } catch {
    return ts;
  }
}

export default function HistoryPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [weekId, setWeekId] = useState<number | null>(null);
  const [label, setLabel] = useState<string>("—");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // filters
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [classFilter, setClassFilter] = useState<number | "ALL">("ALL");
  const [tierOnly, setTierOnly] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [q, setQ] = useState("");

  // load recent weeks
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/weeks?limit=24", { cache: "no-store" });
        if (!r.ok) throw new Error("weeks");
        const ws: Week[] = await r.json();
        if (!alive) return;
        setWeeks(ws);
        if (ws.length && weekId === null) setWeekId(ws[0].id);
      } catch {
        setErr("Failed to load weeks");
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const srUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (weekId != null) params.set("weekId", String(weekId));
    return `/api/sr?${params.toString()}`;
  }, [weekId]);

  // load SR table for selected week
  async function loadSR() {
    if (weekId == null) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(srUrl, { cache: "no-store" });
      if (!r.ok) throw new Error("sr");
      const data: { weekId: number; label: string; rows: Row[] } =
        await r.json();
      setLabel(data.label);
      setRows(data.rows || []);
    } catch {
      setErr("Failed to load SR data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSR();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srUrl]);

  // class options derived from the current rows
  const classOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of rows) map.set(r.class.id, r.class.name);
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => ({ id, name }));
  }, [rows]);

  // apply filters
  const filteredRows = useMemo(() => {
    let list = rows.slice();

    if (!includeInactive) {
      list = list.filter((r) => r.active !== false);
    }

    if (roleFilter !== "ALL") {
      list = list.filter((r) => r.role === roleFilter);
    }

    if (classFilter !== "ALL") {
      list = list.filter((r) => r.class.id === classFilter);
    }

    if (tierOnly) {
      list = list.filter((r) => r.choice?.isTier);
    }

    const qq = q.trim().toLowerCase();
    if (qq) {
      list = list.filter((r) => {
        const item = r.choice?.lootItem?.name || "";
        const boss = r.choice?.boss?.name || "";
        const notes = r.choice?.notes || "";
        return (
          r.playerName.toLowerCase().includes(qq) ||
          item.toLowerCase().includes(qq) ||
          boss.toLowerCase().includes(qq) ||
          notes.toLowerCase().includes(qq)
        );
      });
    }

    // group by role then name for readability
    const order = new Map([
      ["TANK", 0],
      ["HEALER", 1],
      ["MDPS", 2],
      ["RDPS", 3],
    ]);
    list.sort((a, b) => {
      const ra = order.get(a.role) ?? 9;
      const rb = order.get(b.role) ?? 9;
      if (ra !== rb) return ra - rb;
      return a.playerName.localeCompare(b.playerName);
    });

    return list;
  }, [rows, includeInactive, roleFilter, classFilter, tierOnly, q]);

  const tierCount = useMemo(
    () => filteredRows.reduce((n, r) => n + (r.choice?.isTier ? 1 : 0), 0),
    [filteredRows],
  );

  function toCSV() {
    const headers = [
      "Player",
      "Role",
      "Class",
      "Item",
      "Boss",
      "Tier",
      "Locked",
      "Notes",
      "Updated (NY)",
    ];
    const lines = [headers.join(",")];
    for (const r of filteredRows) {
      const c = r.choice;
      const vals = [
        r.playerName,
        r.role,
        r.class.name,
        c?.lootItem?.name ?? "",
        c?.boss?.name ?? "",
        c ? (c.isTier ? "Y" : "N") : "",
        c ? (c.locked ? "Locked" : "Unlocked") : "",
        (c?.notes ?? "").replace(/"/g, '""'),
        c ? formatNY(c.updatedAt) : "",
      ];
      // csv escape
      const escaped = vals.map((v) => {
        if (v == null) return "";
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s}"` : s;
      });
      lines.push(escaped.join(","));
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `history_${label.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">History</h1>
        <div className="badge">{label || "—"}</div>
      </div>

      {/* Controls */}
      <div className="panel panel-center">
        <div className="panel-title">Filters</div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="flex flex-col">
            <label className="text-sm text-neutral-400">Week</label>
            <select
              className="border rounded px-3 py-2"
              value={weekId ?? ""}
              onChange={(e) =>
                setWeekId(e.target.value ? Number(e.target.value) : null)
              }
            >
              {weeks.length === 0 && <option value="">(loading…)</option>}
              {weeks.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-neutral-400">Role</label>
            <select
              className="border rounded px-3 py-2"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">All</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-neutral-400">Class</label>
            <select
              className="border rounded px-3 py-2"
              value={classFilter}
              onChange={(e) =>
                setClassFilter(
                  e.target.value
                    ? e.target.value === "ALL"
                      ? "ALL"
                      : Number(e.target.value)
                    : "ALL",
                )
              }
            >
              <option value="ALL">All</option>
              {classOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-neutral-400">Search</label>
            <input
              className="border rounded px-3 py-2"
              placeholder="player, item, boss, notes…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={tierOnly}
              onChange={(e) => setTierOnly(e.target.checked)}
            />
            <span>Tier only</span>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            <span>Include inactive</span>
          </label>

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={loadSR}
              disabled={loading}
              className="btn inline-flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner /> Refresh
                </>
              ) : (
                "Refresh"
              )}
            </button>
            <button
              onClick={toCSV}
              disabled={filteredRows.length === 0}
              className="btn"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-2 text-sm text-neutral-400">
          Showing <b>{filteredRows.length}</b> of {rows.length} rows
          {tierOnly ? (
            <>
              {" "}
              • Tier requests: <b>{tierCount}</b>
            </>
          ) : null}
        </div>

        {err && <div className="mt-2 text-sm text-red-400">{err}</div>}
      </div>

      {/* Table */}
      <div className="panel panel-center panel-wide overflow-x-auto">
        <div className="panel-title">SR snapshot</div>
        <table className="min-w-full w-full text-[15px]">
          <thead className="sticky top-0 bg-neutral-900 z-10">
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
            {filteredRows.map((r) => {
              const c = r.choice;
              return (
                <tr key={r.playerId} className="border-t border-neutral-800">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.playerName}
                  </td>
                  <td className="px-3 py-2">{r.role}</td>
                  <td className="px-3 py-2">{r.class.name}</td>
                  <td className="px-3 py-2">{c?.lootItem?.name ?? "—"}</td>
                  <td className="px-3 py-2">{c?.boss?.name ?? "—"}</td>
                  <td className="px-3 py-2">
                    {c ? (c.isTier ? "Y" : "N") : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {c ? (c.locked ? "Locked" : "Unlocked") : "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-normal break-words max-w-[60ch]">
                    {c?.notes ?? ""}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {c ? formatNY(c.updatedAt) : "—"}
                  </td>
                </tr>
              );
            })}
            {filteredRows.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-8 text-center text-neutral-400"
                >
                  No SRs match the current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
