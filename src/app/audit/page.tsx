// src/app/audit/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

/* ---------- Types ---------- */
type AuditItem = {
  id: number;
  createdAt: string;
  actorDisplay: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  weekId: number | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
};

type AuditResponse = { items: AuditItem[]; nextCursor: number | null };
type Boss = { id: number; name: string };
type Week = { id: number; label: string; startDate: string };
type Player = { id: number; name: string };

/* ---------- Utils ---------- */
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function getStringField(
  obj: Record<string, unknown> | null,
  key: string,
): string | null {
  if (!obj) return null;
  const v = obj[key];
  return typeof v === "string" ? v : null;
}

/* ---------- Page ---------- */
export default function AuditPage() {
  const [isOfficer, setIsOfficer] = useState<boolean | null>(null);

  // current week
  const [weekId, setWeekId] = useState<number | "">("");
  const [weekLabel, setWeekLabel] = useState<string>("—");

  // weeks list for dropdown + label maps
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [weekMap, setWeekMap] = useState<Record<number, string>>({});

  // filters
  const [limit, setLimit] = useState<number>(50);
  const [action, setAction] = useState<string>("");
  const [actorQ, setActorQ] = useState<string>("");

  // data
  const [items, setItems] = useState<AuditItem[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // label caches
  const [bossMap, setBossMap] = useState<Record<number, string>>({});
  const [lootMap, setLootMap] = useState<Record<number, string>>({});
  const [playerMap, setPlayerMap] = useState<Record<number, string>>({});

  // expanded rows
  const [open, setOpen] = useState<Record<number, boolean>>({});

  // boot: officer probe + set current week + label maps + load logs
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const probe = await fetch(`/api/audit?limit=1`, { cache: "no-store" });
        if (!alive) return;
        if (probe.status === 403) {
          setIsOfficer(false);
          return;
        }
        setIsOfficer(true);

        // pick current week from SR endpoint
        const srRes = await fetch("/api/sr", { cache: "no-store" });
        if (srRes.ok) {
          const sr = await srRes.json();
          if (sr?.weekId) setWeekId(sr.weekId);
          if (sr?.label) setWeekLabel(sr.label);
        }

        // bosses
        const bRes = await fetch("/api/bosses", { cache: "no-store" });
        if (bRes.ok) {
          const bosses: Boss[] = await bRes.json();
          setBossMap(Object.fromEntries(bosses.map((b) => [b.id, b.name])));
        }

        // players
        const pRes = await fetch("/api/players", { cache: "no-store" });
        if (pRes.ok) {
          const players: Player[] = await pRes.json();
          setPlayerMap(Object.fromEntries(players.map((p) => [p.id, p.name])));
        }

        // weeks (Tuesday-labeled) for dropdown
        const wRes = await fetch("/api/weeks?limit=52", { cache: "no-store" });
        if (wRes.ok) {
          const ws: Week[] = await wRes.json();
          setWeeks(ws);
          setWeekMap(Object.fromEntries(ws.map((w) => [w.id, w.label])));
          if (weekId === "" && ws.length) setWeekId(ws[0].id);
        }

        await loadLogs({ reset: true, forceCursor: null });
      } catch {
        setIsOfficer(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // prefetch loot labels we don't know yet
  useEffect(() => {
    const need = collectLootIds(items).filter((id) => lootMap[id] == null);
    if (need.length === 0) return;
    (async () => {
      const res = await fetch(`/api/loot/labels?ids=${need.join(",")}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const map = (await res.json()) as Record<number, string>;
      setLootMap((prev) => ({ ...prev, ...map }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  async function loadLogs(opts?: {
    reset?: boolean;
    forceWeekId?: number | "";
    forceCursor?: number | null;
  }) {
    const useWeek = opts?.forceWeekId !== undefined ? opts.forceWeekId : weekId;
    const useCursor = opts?.reset ? null : opts?.forceCursor ?? cursor;

    setLoading(true);
    setErr(null);
    try {
      const q = new URLSearchParams();
      q.set("limit", String(limit));
      if (useWeek !== "" && useWeek != null) q.set("weekId", String(useWeek));
      if (action) q.set("action", action);
      if (actorQ.trim()) q.set("actor", actorQ.trim());
      if (useCursor != null) q.set("cursor", String(useCursor));

      const res = await fetch(`/api/audit?${q.toString()}`, {
        cache: "no-store",
      });
      if (res.status === 403) {
        setIsOfficer(false);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j: AuditResponse = await res.json();

      setItems(j.items || []);
      setNextCursor(j.nextCursor ?? null);
      setCursor(useCursor ?? null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }

  const title = useMemo(() => `Audit`, []);
  const timeFmt = (ts: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));

  const headerWeekText =
    weekId === "" ? "All weeks" : weekMap[Number(weekId)] || weekLabel;

  if (isOfficer === null) return <div className="badge">Checking access…</div>;
  if (!isOfficer) {
    return (
      <div className="panel max-w-xl">
        <div className="panel-title text-lg">{title}</div>
        <p className="badge mb-2">This page is officer-only.</p>
        <a className="btn" href="/officer">
          Go to Officer Login
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="badge">{headerWeekText}</div>
      </div>

      {/* Filters */}
      <div className="panel">
        <div className="panel-title mb-2">Filters</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="flex flex-col">
            <label className="text-sm text-neutral-400">Week</label>
            <select
              value={weekId === "" ? "" : String(weekId)}
              onChange={(e) => {
                const v = e.target.value;
                setWeekId(v === "" ? "" : Number(v));
              }}
            >
              <option value="">All</option>
              {weeks.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-neutral-400">Limit</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-neutral-400">Action</label>
            <select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">Any</option>
              <option value="SR_CHOICE_SET">SR_CHOICE_SET</option>
              <option value="SR_LOCKED">SR_LOCKED</option>
              <option value="SR_UNLOCKED">SR_UNLOCKED</option>
              <option value="SR_UNLOCKED_EXCEPT_KILLED">
                SR_UNLOCKED_EXCEPT_KILLED
              </option>
              <option value="BOSS_KILL_TOGGLED">BOSS_KILL_TOGGLED</option>
              <option value="WEEK_RESET">WEEK_RESET</option>
            </select>
          </div>

          <div className="flex flex-col md:col-span-2">
            <label className="text-sm text-neutral-400">Raider contains</label>
            <input
              placeholder="e.g. officer:Tay or player:Skullblaster"
              value={actorQ}
              onChange={(e) => setActorQ(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            className="btn"
            onClick={() => loadLogs({ reset: true })}
            disabled={loading}
          >
            {loading ? "Loading…" : "Apply"}
          </button>
          <button
            className="btn"
            onClick={() => {
              setCursor(null);
              loadLogs({ reset: true });
            }}
            disabled={loading}
            title="Reload from newest"
          >
            Reset cursor
          </button>
          <div className="ml-auto text-xs text-neutral-400">* officer</div>
          {err && <div className="text-sm text-red-400 ml-3">{err}</div>}
        </div>
      </div>

      {/* Table */}
      <div className="panel overflow-x-auto">
        <div className="panel-title flex items-center justify-between">
          <span>Events</span>
          <span className="text-xs text-neutral-400">* officer</span>
        </div>
        <table className="min-w-full text-[15px]">
          <thead>
            <tr>
              <th>Time (ET)</th>
              <th>Raider</th>
              <th>Summary</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const expanded = !!open[it.id];
              return (
                <FragmentRow
                  key={it.id}
                  item={it}
                  expanded={expanded}
                  onToggle={() =>
                    setOpen((prev) => ({ ...prev, [it.id]: !expanded }))
                  }
                  timeFmt={timeFmt}
                  bossMap={bossMap}
                  lootMap={lootMap}
                  playerMap={playerMap}
                  weekMap={weekMap}
                />
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-neutral-400 py-8">
                  No logs
                </td>
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
            onClick={() => {
              if (nextCursor != null) loadLogs({ forceCursor: nextCursor });
            }}
            disabled={loading || nextCursor == null}
          >
            Older →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Helpers & subcomponents ---------- */

function collectLootIds(items: AuditItem[]): number[] {
  const out = new Set<number>();
  for (const it of items) {
    const candidates: Array<Record<string, unknown> | null> = [
      it.before,
      it.after,
    ];
    candidates.forEach((obj) => {
      if (isObject(obj) && typeof obj["lootItemId"] === "number") {
        out.add(obj["lootItemId"] as number);
      }
    });
  }
  return [...out];
}

function parseActorDisplay(s: string | null | undefined): {
  name: string;
  isOfficer: boolean;
} {
  if (!s) return { name: "—", isOfficer: false };
  const m = s.match(/^(\w+):\s*(.+)$/i);
  if (m) {
    const kind = m[1].toLowerCase();
    const name = m[2].trim();
    return { name, isOfficer: kind === "officer" };
  }
  return { name: s.trim(), isOfficer: false };
}

function prettyValue(
  key: string,
  val: unknown,
  maps: {
    bossMap: Record<number, string>;
    lootMap: Record<number, string>;
    playerMap?: Record<number, string>;
    weekMap?: Record<number, string>;
  },
) {
  if (val == null) return "—";

  const asId = (v: unknown): number | null => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  if (key === "bossId") {
    const id = asId(val);
    return id != null && maps.bossMap[id]
      ? `${maps.bossMap[id]} (#${id})`
      : `Boss #${id ?? "?"}`;
  }
  if (key === "lootItemId") {
    const id = asId(val);
    return id != null && maps.lootMap[id]
      ? `${maps.lootMap[id]} (#${id})`
      : `Item #${id ?? "?"}`;
  }
  if (key === "playerId" && maps.playerMap) {
    const id = asId(val);
    return id != null && maps.playerMap[id]
      ? `${maps.playerMap[id]} (#${id})`
      : `Player #${id ?? "?"}`;
  }
  if (key === "weekId" && maps.weekMap) {
    const id = asId(val);
    return id != null && maps.weekMap[id]
      ? `${maps.weekMap[id]} (#${id})`
      : `Week #${id ?? "?"}`;
  }
  if (key === "isTier") return Boolean(val) ? "Y" : "N";
  if (key === "locked") return Boolean(val) ? "Locked" : "Unlocked";
  if (Array.isArray(val)) return val.length ? `[${val.join(", ")}]` : "[]";
  if (isObject(val)) return JSON.stringify(val);
  return String(val);
}

function labelForKey(action: string, key: string) {
  const map: Record<string, string> = {
    lootItemId: "Item",
    bossId: "Boss",
    playerId: "Player",
    weekId: "Week",
    notes: "Notes",
    isTier: "Tier",
    locked: "Locked",
    unlocked: "Unlocked",
    killed: "Killed",
    killedBossIds: "Killed Bosses",
    affected: "Affected",
  };
  return map[key] || key;
}

function diffPairs(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  action: string,
  maps: {
    bossMap: Record<number, string>;
    lootMap: Record<number, string>;
    playerMap: Record<number, string>;
    weekMap: Record<number, string>;
  },
) {
  const keys = new Set<string>([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);
  const rows: { label: string; before?: string; after?: string }[] = [];
  keys.forEach((k) => {
    const b = before ? before[k] : undefined;
    const a = after ? after[k] : undefined;
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

function friendlyAction(a: string) {
  const map: Record<string, string> = {
    SR_CHOICE_SET: "SR updated",
    SR_LOCKED: "SRs locked",
    SR_UNLOCKED: "SRs unlocked",
    SR_UNLOCKED_EXCEPT_KILLED: "Unlocked (except killed)",
    BOSS_KILL_TOGGLED: "Boss kill toggled",
    WEEK_RESET: "Week reset",
  };
  return map[a] || a;
}

function parseTarget(
  targetId: string | null,
): Array<{ key: string; id: number | string }> {
  if (!targetId) return [];
  return targetId
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(\w+):(.+)$/);
      if (!m) return { key: "raw", id: part };
      const key = m[1];
      const idStr = m[2];
      const idNum = Number(idStr);
      return { key, id: Number.isFinite(idNum) ? idNum : idStr };
    });
}

function TargetChips({
  targetId,
  maps,
}: {
  targetId: string | null;
  maps: {
    bossMap: Record<number, string>;
    playerMap: Record<number, string>;
    weekMap: Record<number, string>;
  };
}) {
  const parts = parseTarget(targetId);
  if (parts.length === 0) return <span className="badge">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {parts.map((p, i) => {
        let label = `${p.key}:${p.id}`;
        if (p.key === "boss" && typeof p.id === "number" && maps.bossMap[p.id])
          label = `Boss:${maps.bossMap[p.id]}`;
        if (
          p.key === "player" &&
          typeof p.id === "number" &&
          maps.playerMap[p.id]
        )
          label = `Player:${maps.playerMap[p.id]}`;
        if (p.key === "week" && typeof p.id === "number" && maps.weekMap[p.id])
          label = `Week:${maps.weekMap[p.id]}`;
        return (
          <span key={i} className="badge">
            {label}
          </span>
        );
      })}
    </div>
  );
}

function SummaryLine({
  item,
  maps,
}: {
  item: AuditItem;
  maps: {
    bossMap: Record<number, string>;
    lootMap: Record<number, string>;
    playerMap: Record<number, string>;
    weekMap: Record<number, string>;
  };
}) {
  const act = friendlyAction(item.action);
  const disp = getStringField(item.meta, "display") ?? "";
  const diffs = diffPairs(item.before, item.after, item.action, maps);
  const short =
    disp ||
    diffs
      .map((d) => {
        const before = d.before !== undefined ? ` ${d.before} → ` : " ";
        return `${d.label}:${before}${d.after ?? "—"}`;
      })
      .join(" • ");
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="badge">{act}</span>
        <TargetChips
          targetId={item.targetId}
          maps={{
            bossMap: maps.bossMap,
            playerMap: maps.playerMap,
            weekMap: maps.weekMap,
          }}
        />
      </div>
      <div className="text-sm text-neutral-300">{short || "—"}</div>
    </div>
  );
}

function ChangeList({
  item,
  bossMap,
  lootMap,
  playerMap,
  weekMap,
}: {
  item: AuditItem;
  bossMap: Record<number, string>;
  lootMap: Record<number, string>;
  playerMap: Record<number, string>;
  weekMap: Record<number, string>;
}) {
  const rows = diffPairs(item.before, item.after, item.action, {
    bossMap,
    lootMap,
    playerMap,
    weekMap,
  });
  if (!rows.length) return <span className="badge">—</span>;
  return (
    <ul className="space-y-1">
      {rows.map((r, i) => (
        <li key={i}>
          <span className="text-neutral-300">{r.label}:</span>{" "}
          {r.before !== undefined ? (
            <>
              {r.before} <span className="text-neutral-500">→</span>{" "}
            </>
          ) : null}
          <b>{r.after ?? "—"}</b>
        </li>
      ))}
    </ul>
  );
}

function FragmentRow({
  item,
  expanded,
  onToggle,
  timeFmt,
  bossMap,
  lootMap,
  playerMap,
  weekMap,
}: {
  item: AuditItem;
  expanded: boolean;
  onToggle: () => void;
  timeFmt: (s: string) => string;
  bossMap: Record<number, string>;
  lootMap: Record<number, string>;
  playerMap: Record<number, string>;
  weekMap: Record<number, string>;
}) {
  const { name, isOfficer } = parseActorDisplay(item.actorDisplay);
  const badge = isOfficer ? `${name}*` : name;

  // independent toggle for meta
  const [metaOpen, setMetaOpen] = useState(false);

  return (
    <>
      <tr className="border-t border-neutral-800">
        <td className="whitespace-nowrap align-top">
          {timeFmt(item.createdAt)}
        </td>
        <td className="whitespace-nowrap align-top">
          <span className="badge">{badge}</span>
        </td>
        <td className="align-top">
          <SummaryLine
            item={item}
            maps={{ bossMap, lootMap, playerMap, weekMap }}
          />
        </td>
        <td className="whitespace-nowrap align-top">
          <div className="flex gap-2">
            <button className="btn px-2 py-1 text-xs" onClick={onToggle}>
              {expanded ? "Hide details" : "Details"}
            </button>
            <button
              className="btn px-2 py-1 text-xs"
              onClick={() => setMetaOpen((v) => !v)}
              title="Show raw metadata"
            >
              {metaOpen ? "Hide meta" : "Meta"}
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="border-t border-neutral-900">
          <td />
          <td colSpan={3}>
            <div className="mt-2">
              <div className="badge mb-1">Changes</div>
              <ChangeList
                item={item}
                bossMap={bossMap}
                lootMap={lootMap}
                playerMap={playerMap}
                weekMap={weekMap}
              />
            </div>
          </td>
        </tr>
      )}

      {metaOpen && (
        <tr className="border-t border-neutral-900">
          <td />
          <td colSpan={3}>
            <div className="mt-2">
              <div className="badge mb-1">Meta</div>
              <pre className="text-xs bg-neutral-900/60 border border-neutral-800 rounded p-2 overflow-auto max-h-48">
                {JSON.stringify(item.meta ?? {}, null, 2)}
              </pre>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
