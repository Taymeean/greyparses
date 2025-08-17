// src/app/roster/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type ClassRow = { id: number; name: string };
type PlayerRow = {
  id: number;
  name: string;
  role: "TANK" | "HEALER" | "MDPS" | "RDPS";
  active: boolean;
  class: {
    id: number;
    name: string;
    armorType: string;
    tierPrefix: string;
  } | null;
};

type StatusFilter = "" | "active" | "inactive";
const ROLES: PlayerRow["role"][] = ["TANK", "HEALER", "MDPS", "RDPS"];

export default function RosterPage() {
  const [isOfficer, setIsOfficer] = useState<boolean | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string>("");
  const [classId, setClassId] = useState<string>("");
  const [status, setStatus] = useState<StatusFilter>("");

  // data
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [rows, setRows] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(false);

  // selection + busy
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [busyId, setBusyId] = useState<number | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // boot: officer probe + classes + initial load
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const probe = await fetch("/api/audit?limit=1", { cache: "no-store" });
        if (probe.status === 403) {
          setIsOfficer(false);
          return;
        }
        setIsOfficer(true);

        const c = await fetch("/api/classes", { cache: "no-store" });
        if (c.ok) {
          const j = (await c.json()) as Array<{ id: number; name: string }>;
          if (!alive) return;
          setClasses(j.map((x) => ({ id: x.id, name: x.name })));
        }

        await loadRoster();
      } catch {
        setIsOfficer(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRoster() {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set("q", q.trim());
      if (role) qs.set("role", role);
      if (classId) qs.set("classId", classId);
      if (status === "active") qs.set("active", "true");
      if (status === "inactive") qs.set("active", "false");

      const r = await fetch(`/api/roster?${qs.toString()}`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as PlayerRow[];
      setRows(j);

      // prune selection to visible rows
      setSelectedIds((prev) => {
        if (prev.size === 0) return prev;
        const visible = new Set(j.map((p) => p.id));
        const next = new Set<number>();
        prev.forEach((id) => {
          if (visible.has(id)) next.add(id);
        });
        return next;
      });
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(m || "Failed to load roster");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(p: PlayerRow, nextActive: boolean) {
    if (nextActive === false) {
      const ok =
        typeof window !== "undefined" &&
        window.confirm(
          `Deactivate ${p.name}? They’ll be hidden from SR until reactivated.`,
        );
      if (!ok) return;
    }
    setBusyId(p.id);
    setErr(null);
    setMsg(null);
    try {
      const r = await fetch("/api/roster/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: p.id, active: nextActive }),
      });
      const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      if (!r.ok)
        throw new Error(
          (typeof j.error === "string" && j.error) || `HTTP ${r.status}`,
        );
      setMsg(`${p.name} ${nextActive ? "re" : "de"}activated.`);
      await loadRoster();
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(m || "Update failed");
    } finally {
      setBusyId(null);
      setTimeout(() => setMsg(null), 1500);
    }
  }

  async function updateInline(
    p: PlayerRow,
    patch: { role?: PlayerRow["role"]; classId?: number },
  ) {
    setBusyId(p.id);
    setErr(null);
    setMsg(null);
    try {
      const r = await fetch("/api/roster/player", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: p.id, ...patch }),
      });
      const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      if (!r.ok)
        throw new Error(
          (typeof j.error === "string" && j.error) || `HTTP ${r.status}`,
        );
      await loadRoster();
      setMsg("Saved.");
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(m || "Save failed");
    } finally {
      setBusyId(null);
      setTimeout(() => setMsg(null), 1200);
    }
  }

  async function bulkToggle(nextActive: boolean) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (nextActive === false) {
      const ok =
        typeof window !== "undefined" &&
        window.confirm(`Deactivate ${ids.length} selected player(s)?`);
      if (!ok) return;
    }
    setBulkBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await fetch("/api/roster/toggle-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, active: nextActive }),
      });
      const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      if (!r.ok)
        throw new Error(
          (typeof j.error === "string" && j.error) || `HTTP ${r.status}`,
        );
      const changed =
        typeof j.changed === "number" ? j.changed : ids.length;
      setMsg(
        `${nextActive ? "Reactivated" : "Deactivated"} ${changed} player(s).`,
      );
      await loadRoster();
      setSelectedIds(new Set());
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(m || "Bulk update failed");
    } finally {
      setBulkBusy(false);
      setTimeout(() => setMsg(null), 1500);
    }
  }

  const counts = useMemo(() => {
    const total = rows.length;
    const inactive = rows.filter((r) => !r.active).length;
    return { total, inactive, active: total - inactive };
  }, [rows]);

  const allVisibleSelected =
    rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0;

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  }

  if (isOfficer === null) return <div className="badge">Checking access…</div>;
  if (!isOfficer) {
    return (
      <div className="panel max-w-xl">
        <div className="panel-title text-lg">Roster</div>
        <p className="badge mb-2">This page is officer-only.</p>
        <a className="btn" href="/officer">
          Go to Officer Login
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Roster</h1>
        <div className="badge">
          {counts.active}/{counts.total} active
        </div>
      </div>

      {/* Filters */}
      <div className="panel">
        <div className="panel-title">Filters</div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="flex flex-col md:col-span-2">
            <label className="text-sm text-neutral-400">Search</label>
            <input
              placeholder="Name contains…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-neutral-400">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">Any</option>
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
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">Any</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-neutral-400">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
            >
              <option value="">Any</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </div>

          <div className="flex gap-2 md:justify-end">
            <button className="btn" onClick={loadRoster} disabled={loading}>
              {loading ? "Loading…" : "Apply"}
            </button>
            <button
              className="btn"
              onClick={() => {
                setQ("");
                setRole("");
                setClassId("");
                setStatus("");
                loadRoster();
              }}
              disabled={loading}
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <button
            className="btn btn-danger"
            disabled={!someSelected || bulkBusy}
            onClick={() => bulkToggle(false)}
            title="Hide selected players from SR"
          >
            {bulkBusy
              ? "Working…"
              : `Deactivate Selected (${selectedIds.size})`}
          </button>
          <button
            className="btn btn-primary"
            disabled={!someSelected || bulkBusy}
            onClick={() => bulkToggle(true)}
            title="Make selected players visible on SR"
          >
            {bulkBusy
              ? "Working…"
              : `Reactivate Selected (${selectedIds.size})`}
          </button>
          {err && <div className="text-sm text-red-400 ml-3">{err}</div>}
          {msg && <div className="text-sm text-green-400 ml-3">{msg}</div>}
        </div>
      </div>

      {/* Table */}
      <div className="panel overflow-x-auto">
        <div className="panel-title">Players</div>
        <table className="min-w-full text-[15px]">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 w-8">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all visible"
                />
              </th>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-left px-3 py-2">Class</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2 w-44"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const selected = selectedIds.has(p.id);
              return (
                <tr key={p.id} style={{ opacity: p.active ? 1 : 0.8 }}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(e) => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(p.id);
                          else next.delete(p.id);
                          return next;
                        });
                      }}
                      aria-label={`Select ${p.name}`}
                    />
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap">{p.name}</td>

                  {/* Inline Role select */}
                  <td className="px-3 py-2">
                    <select
                      value={p.role}
                      onChange={(e) =>
                        updateInline(p, {
                          role: e.target.value as PlayerRow["role"],
                        })
                      }
                      disabled={busyId === p.id}
                      title="Change role"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Inline Class select */}
                  <td className="px-3 py-2">
                    <select
                      value={p.class?.id ?? ""}
                      onChange={(e) =>
                        updateInline(p, {
                          classId: Number(e.target.value) || undefined,
                        })
                      }
                      disabled={busyId === p.id}
                      title="Change class"
                    >
                      <option value="" disabled>
                        Choose…
                      </option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-3 py-2">
                    {p.active ? (
                      <span className="badge">Active</span>
                    ) : (
                      <span className="badge" style={{ opacity: 0.7 }}>
                        Inactive
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    {p.active ? (
                      <button
                        className="btn btn-danger"
                        onClick={() => toggleActive(p, false)}
                        disabled={busyId === p.id}
                        title="Hide from SR table"
                      >
                        {busyId === p.id ? "Working…" : "Deactivate"}
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary"
                        onClick={() => toggleActive(p, true)}
                        disabled={busyId === p.id}
                        title="Make visible on SR table"
                      >
                        {busyId === p.id ? "Working…" : "Reactivate"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="text-center text-neutral-400 py-8">
                  No players match
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-neutral-400">
        Inline edits save instantly. Deactivated characters are hidden on the SR
        page, but history remains intact.
      </div>
    </div>
  );
}
