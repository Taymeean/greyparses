// src/app/sr/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

const NOTES_MAX = 128;

type ClassInfo = {
  id: number;
  name: string;
  armorType: string;
  tierPrefix: string;
};
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
type Row = {
  playerId: number;
  playerName: string;
  role: string;
  class: ClassInfo;
  choice: Choice | null;
  active?: boolean; // hidden if false
};

type WeekSR = { weekId: number; label: string; rows: Row[] };
type Me = {
  authenticated: boolean;
  session?: { playerId: number; name: string; role: string };
};

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

export default function SRPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [week, setWeek] = useState<WeekSR | null>(null);

  // bosses: full list + filtered-by-item list
  const [allBosses, setAllBosses] = useState<Boss[]>([]);
  const [bossOptions, setBossOptions] = useState<Boss[]>([]);

  const [lootOptions, setLootOptions] = useState<LootItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // local edit state (for my row only)
  const [editItemId, setEditItemId] = useState<number | "">("");
  const [editBossId, setEditBossId] = useState<number | "">("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [tierOnly, setTierOnly] = useState(false);

  // load me + week + bosses
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [meRes, srRes, bossRes] = await Promise.all([
          fetch("/api/me", { cache: "no-store" }),
          fetch("/api/sr", { cache: "no-store" }),
          fetch("/api/bosses", { cache: "no-store" }),
        ]);
        const meJ: Me = await meRes.json();
        const srJ: WeekSR = await srRes.json();
        const bosses: Boss[] = await bossRes.json();
        if (!alive) return;

        setMe(meJ);
        setWeek(srJ);
        setAllBosses(bosses);
        setBossOptions(bosses); // default: all until an item is chosen

        // prime my edit fields if I have a row
        if (meJ.authenticated && srJ.rows) {
          const mine = srJ.rows.find(
            (r) => r.playerId === meJ.session?.playerId,
          );
          if (mine) {
            setEditItemId(mine.choice?.lootItem?.id ?? "");
            setEditBossId(mine.choice?.boss?.id ?? "");
            setEditNotes((mine.choice?.notes ?? "").slice(0, NOTES_MAX));
            // load class-filtered loot
            fetch(`/api/loot?classId=${mine.class.id}`, { cache: "no-store" })
              .then((r) => (r.ok ? r.json() : Promise.reject()))
              .then((items: LootItem[]) => setLootOptions(items))
              .catch(() => setLootOptions([]));
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const myRow = useMemo(() => {
    if (!me?.authenticated || !week) return null;
    return week.rows.find((r) => r.playerId === me.session!.playerId) || null;
  }, [me, week]);

  const locked = !!myRow?.choice?.locked;

  // rows to render (hide inactive) + optional Tier-only filter
  const rowsForRender = useMemo(() => {
    if (!week) return [];
    return week.rows.filter(
      (r) => r.active !== false && (!tierOnly || !!r.choice?.isTier),
    );
  }, [week, tierOnly]);

  // When the item changes, fetch bosses that drop it and auto-select if needed
  useEffect(() => {
    let alive = true;
    async function refreshBossOptions() {
      if (editItemId === "") {
        setBossOptions(allBosses);
        return;
      }
      try {
        const res = await fetch(`/api/loot/${editItemId}/bosses`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load item drops");
        const drops: Boss[] = await res.json();
        if (!alive) return;

        setBossOptions(drops.length ? drops : allBosses);

        // auto-fix boss selection if invalid for this item
        const validIds = new Set(drops.map((b) => b.id));
        if (editBossId && !validIds.has(Number(editBossId))) {
          setEditBossId(drops[0]?.id ?? "");
        }
        // if none selected and exactly one drop, auto-select it
        if ((editBossId === "" || editBossId == null) && drops.length === 1) {
          setEditBossId(drops[0].id);
        }
      } catch {
        setBossOptions(allBosses); // fail open
      }
    }
    refreshBossOptions();
    return () => {
      alive = false;
    };
  }, [editItemId, allBosses, editBossId]);

  async function save() {
    if (!me?.authenticated || !myRow) return;
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/sr-choice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: myRow.playerId,
          lootItemId: editItemId === "" ? undefined : Number(editItemId),
          bossId: editBossId === "" ? undefined : Number(editBossId),
          notes: editNotes ? editNotes.slice(0, NOTES_MAX) : undefined,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!res.ok) {
        const msg = typeof j.error === "string" ? j.error : `HTTP ${res.status}`;
        throw new Error(msg);
      }

      setOkMsg("Saved.");

      // refresh the table
      const srRes = await fetch("/api/sr", { cache: "no-store" });
      const srJ: WeekSR = await srRes.json();
      setWeek(srJ);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Save failed");
    } finally {
      setSaving(false);
      setTimeout(() => setOkMsg(null), 1500);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">SR — Current Week</h1>
        <div className="text-sm text-neutral-400">
          {week ? week.label : "—"}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            className="accent-indigo-600"
            checked={tierOnly}
            onChange={(e) => setTierOnly(e.target.checked)}
          />
          Tier only
        </label>
      </div>

      {!me?.authenticated && (
        <div className="p-3 border rounded border-neutral-800 bg-amber-50/10 text-amber-200 text-sm">
          You’re not signed in as a player. Go to{" "}
          <a className="underline" href="/claim">
            /claim
          </a>{" "}
          to claim your character.
        </div>
      )}

      {myRow && locked && (
        <div className="p-3 border rounded border-neutral-800 bg-neutral-900 text-neutral-200 text-sm">
          Your SR is currently <b>locked</b>. You can’t change it until officers
          unlock your row (or the boss dies and they unlock others).
        </div>
      )}

      {error && <div className="text-sm text-red-400">{error}</div>}
      {okMsg && <div className="text-sm text-green-400">{okMsg}</div>}

      {loading ? (
        <div className="text-sm text-neutral-400">Loading…</div>
      ) : (
        <div className="sr-wrap">
          <table className="min-w-full text-[15px]">
            <thead>
              <tr>
                <th>Player</th>
                <th>Role</th>
                <th>Class</th>
                <th>SR Item</th>
                <th>Boss</th>
                <th>Tier</th>
                <th>Locked</th>
                <th>Notes</th>
                <th>Updated</th>
                {myRow && <th />}
              </tr>
            </thead>
            <tbody>
              {rowsForRender.map((r) => {
                const isMe = myRow && r.playerId === myRow.playerId;
                const c = r.choice;

                return (
                  <tr key={r.playerId}>
                    <td className="whitespace-nowrap">{r.playerName}</td>
                    <td>{r.role}</td>
                    <td>{r.class.name}</td>

                    {/* SR Item */}
                    <td>
                      {isMe ? (
                        <select
                          className="border rounded px-2 py-1 max-w-[22rem]"
                          value={editItemId}
                          onChange={(e) =>
                            setEditItemId(
                              e.target.value ? Number(e.target.value) : "",
                            )
                          }
                          disabled={locked}
                        >
                          <option value="">— no selection —</option>
                          {lootOptions.map((li) => (
                            <option key={li.id} value={li.id}>
                              {li.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        (c?.lootItem?.name ?? "—")
                      )}
                    </td>

                    {/* Boss (filtered by selected item) */}
                    <td>
                      {isMe ? (
                        <select
                          className="border rounded px-2 py-1"
                          value={editBossId}
                          onChange={(e) =>
                            setEditBossId(
                              e.target.value ? Number(e.target.value) : "",
                            )
                          }
                          disabled={locked}
                        >
                          <option value="">— none —</option>
                          {bossOptions.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        (c?.boss?.name ?? "—")
                      )}
                    </td>

                    {/* Tier badge */}
                    <td>
                      {c?.isTier ? (
                        <span className="inline-block px-2 py-0.5 rounded bg-emerald-600 text-white text-xs">
                          Tier
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Locked */}
                    <td>{c ? (c.locked ? "Locked" : "Unlocked") : "—"}</td>

                    {/* Notes */}
                    <td className="align-top">
                      {isMe ? (
                        <div className="flex flex-col gap-1">
                          <input
                            className="border rounded px-2 py-1 w-64"
                            value={editNotes}
                            onChange={(e) =>
                              setEditNotes(e.target.value.slice(0, NOTES_MAX))
                            }
                            disabled={locked}
                            placeholder="optional"
                            maxLength={NOTES_MAX}
                          />
                          <span className="text-[11px] text-neutral-400">
                            {editNotes.length}/{NOTES_MAX}
                          </span>
                        </div>
                      ) : (
                        <span className="block max-w-[40ch] whitespace-normal break-words">
                          {c?.notes ?? ""}
                        </span>
                      )}
                    </td>

                    {/* Updated */}
                    <td className="whitespace-nowrap">
                      {formatNY(c?.updatedAt)}
                    </td>

                    {/* Save */}
                    {isMe && (
                      <td>
                        <button
                          onClick={save}
                          disabled={saving || locked}
                          className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                          title={locked ? "Locked by officers" : "Save SR"}
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}

              {rowsForRender.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center text-neutral-400 py-8">
                    No players
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-neutral-400">
        Boss list filters to only bosses that drop the selected item. If there’s
        exactly one, it auto-selects.
      </p>
    </div>
  );
}
