// src/app/officer/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

type BossRow = { id: number; name: string; killed: boolean };

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-2px]"
      aria-hidden="true"
    />
  );
}

/* ---------- type guards for /api/kills ---------- */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function isBossRowArray(v: unknown): v is BossRow[] {
  return (
    Array.isArray(v) &&
    v.every(
      (o) =>
        isRecord(o) &&
        typeof o.id === "number" &&
        typeof o.name === "string" &&
        typeof o.killed === "boolean",
    )
  );
}
function hasBossesArray(
  v: unknown,
): v is { bosses: BossRow[]; label?: string; weekId?: number } {
  return isRecord(v) && Array.isArray(v.bosses) && isBossRowArray(v.bosses);
}
function hasItemsArray(
  v: unknown,
): v is {
  items: { bossId: number; name: string; killed: boolean }[];
  label?: string;
  weekId?: number;
} {
  return (
    isRecord(v) &&
    Array.isArray(v.items) &&
    v.items.every(
      (o) =>
        isRecord(o) &&
        typeof o.bossId === "number" &&
        typeof o.name === "string" &&
        typeof o.killed === "boolean",
    )
  );
}
function normalizeBosses(payload: unknown): BossRow[] {
  if (isBossRowArray(payload)) return payload;
  if (hasBossesArray(payload)) return payload.bosses;
  if (hasItemsArray(payload))
    return payload.items.map((x) => ({
      id: x.bossId,
      name: x.name,
      killed: x.killed,
    }));
  return [];
}
function extractLabel(payload: unknown): string | null {
  if (isRecord(payload) && typeof payload.label === "string") return payload.label;
  if (isRecord(payload) && isRecord(payload.week) && typeof payload.week.label === "string")
    return payload.week.label as string;
  return null;
}
/* ----------------------------------------------- */

export default function OfficerPage() {
  const [isOfficer, setIsOfficer] = useState<boolean | null>(null);
  const [officerName, setOfficerName] = useState("");
  const [keyInput, setKeyInput] = useState("");

  const [busy, setBusy] = useState(false); // global action busy (lock/unlock)
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [weekLabel, setWeekLabel] = useState<string>("—");
  const [bosses, setBosses] = useState<BossRow[]>([]);
  const [loadingKills, setLoadingKills] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // reset week
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);

  const loadKills = useCallback(async () => {
    setLoadingKills(true);
    setErr(null);
    try {
      const r = await fetch("/api/kills", { cache: "no-store" });
      const j: unknown = await r.json();
      const rows = normalizeBosses(j);
      setBosses(rows);
      setWeekLabel(extractLabel(j) ?? "Current Week");
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(m || "Failed to load boss kills");
    } finally {
      setLoadingKills(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/audit?limit=1", { cache: "no-store" });
        const ok = r.status !== 403;
        setIsOfficer(ok);
        if (ok) void loadKills();
      } catch {
        setIsOfficer(false);
      }
    })();
  }, [loadKills]);

  async function loginOfficer(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const r = await fetch("/api/officer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyInput.trim() }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
        throw new Error((typeof j.error === "string" && j.error) || `HTTP ${r.status}`);
      }
      setIsOfficer(true);
      setMsg("Officer mode enabled.");
      setKeyInput("");
      await loadKills();
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(m || "Login failed");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 1500);
    }
  }

  async function toggleKill(bossId: number) {
    setTogglingId(bossId);
    setErr(null);
    try {
      const r = await fetch("/api/kills/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bossId }),
      });
      const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      if (!r.ok) throw new Error((typeof j.error === "string" && j.error) || `HTTP ${r.status}`);
      await loadKills();
      setMsg(`Updated ${bossId}.`);
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(m || "Toggle failed");
    } finally {
      setTogglingId(null);
      setTimeout(() => setMsg(null), 1200);
    }
  }

  async function lockAll() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await fetch("/api/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lock: true }),
      });
      const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      if (!r.ok) throw new Error((typeof j.error === "string" && j.error) || `HTTP ${r.status}`);
      const affected =
        typeof j.affected === "number" ? j.affected : (j as { affected?: number }).affected ?? "—";
      setMsg(`Locked (affected: ${affected})`);
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(m || "Lock failed");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 1500);
    }
  }

  async function unlockExceptKilled() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await fetch("/api/lock/except-killed", { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      if (!r.ok) throw new Error((typeof j.error === "string" && j.error) || `HTTP ${r.status}`);
      const unlocked =
        typeof j.unlocked === "number"
          ? j.unlocked
          : (j as { unlocked?: number }).unlocked ?? 0;
      setMsg(`Unlocked: ${unlocked}`);
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(m || "Unlock failed");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 1500);
    }
  }

  async function resetWeek() {
    if (resetConfirm !== "RESET") {
      setErr("Type RESET to confirm");
      return;
    }
    setErr(null);
    setMsg(null);
    setResetting(true);
    try {
      let r = await fetch("/api/reset-week", { method: "POST" });
      if (r.status === 404) r = await fetch("/api/week/reset", { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      if (!r.ok) throw new Error((typeof j.error === "string" && j.error) || `HTTP ${r.status}`);
      const newLabel =
        (typeof j.label === "string" && j.label) ||
        (isRecord(j.week) && typeof j.week.label === "string" && j.week.label) ||
        "New week started";
      setMsg(`Week reset: ${newLabel}`);
      setResetConfirm("");
      await loadKills();
      if (newLabel) setWeekLabel(newLabel);
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(m || "Reset failed");
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
      <div className="panel panel-center max-w-md">
        <h1 className="text-2xl font-semibold mb-2">Officer access</h1>
        <p className="badge mb-3">Enter the officer key to unlock controls.</p>
        <form onSubmit={loginOfficer} className="space-y-3">
          <input
            className="w-full"
            placeholder="OFFICER_KEY"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={!keyInput.trim() || busy}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            {busy && <Spinner />} {busy ? "Checking…" : "Unlock"}
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

      {/* Officer identity */}
      <div className="panel panel-center max-w-xl">
        <div className="panel-title">Officer identity</div>
        <p className="badge mb-2">
          Audits will show <code>officer:&lt;name&gt;</code>. If you’ve claimed a character, we use
          that. Otherwise set an alias:
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
              await fetch("/api/officer/alias", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: officerName.trim() }),
              });
            }}
          >
            Save alias
          </button>
          <button
            className="btn"
            onClick={async () => {
              await fetch("/api/officer/alias", { method: "DELETE" });
              setOfficerName("");
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* SR Controls */}
      <div className="panel panel-center space-y-3">
        <div className="panel-title">SR Controls</div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={lockAll} disabled={busy} className="btn inline-flex items-center gap-2">
            {busy ? (
              <>
                <Spinner /> Working…
              </>
            ) : (
              "Lock all SRs"
            )}
          </button>
          <button
            onClick={unlockExceptKilled}
            disabled={busy}
            className="btn inline-flex items-center gap-2"
            title="Unlock everyone except rows targeting bosses already marked killed"
          >
            {busy ? (
              <>
                <Spinner /> Working…
              </>
            ) : (
              "Unlock except killed"
            )}
          </button>
          <button
            onClick={loadKills}
            disabled={loadingKills}
            className="btn inline-flex items-center gap-2"
          >
            {loadingKills ? (
              <>
                <Spinner /> Refreshing…
              </>
            ) : (
              "Refresh"
            )}
          </button>
        </div>
        {msg && <div className="text-sm text-green-400">{msg}</div>}
        {err && <div className="text-sm text-red-400">{err}</div>}
      </div>

      {/* Boss kills */}
      <div className="panel panel-center">
        <div className="flex items-center justify-between">
          <div className="panel-title">Boss kills</div>
          <div className="badge">
            {killedCount}/{bosses.length} killed
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {bosses.map((b) => (
            <label key={b.id} className="checkbox-row">
              <input
                type="checkbox"
                checked={b.killed}
                onChange={() => toggleKill(b.id)}
                disabled={togglingId === b.id || loadingKills}
              />
              <span className="inline-flex items-center gap-2">
                {togglingId === b.id && <Spinner />}
                {b.name}
              </span>
            </label>
          ))}
          {bosses.length === 0 && (
            <div className="text-sm text-neutral-400">No bosses found.</div>
          )}
        </div>
      </div>

      {/* Danger zone — Reset Week */}
      <div
        className="panel panel-center max-w-xl mx-auto text-center"
        style={{
          borderColor: "#7f1d1d",
          background: "color-mix(in oklab, var(--bg-2) 85%, #7f1d1d 15%)",
        }}
      >
        <div className="panel-title text-red-200 text-xl mb-1">Danger zone</div>
        <p className="text-[0.95rem] text-red-200/90 mb-3">
          Reset Week archives the current SRs (via audit), starts a new week, clears SR choices/notes,
          and resets boss kills.
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
            disabled={resetConfirm !== "RESET" || resetting || busy}
            className="btn btn-danger text-base px-4 py-2 inline-flex items-center gap-2"
            title="Archives and clears the current week"
          >
            {resetting && <Spinner />}
            {resetting ? "Resetting…" : "Reset Week"}
          </button>
        </div>
      </div>

      {/* Links */}
      <div className="badge">
        Need detail? See <a className="underline" href="/audit">Audit</a> or{" "}
        <a className="underline" href="/sr">SR table</a>.
      </div>
    </div>
  );
}
