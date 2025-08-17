// src/app/claim/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ClassRow = { id: number; name: string };
const ROLES = ["TANK", "HEALER", "MDPS", "RDPS"] as const;
type Role = (typeof ROLES)[number];

type MeSession = { playerId: number; name: string; role: Role };
type Me = { authenticated: boolean; session?: MeSession };

type ClaimResponse = {
  player?: { id?: number; name?: string; role?: Role };
  error?: string;
};

const NAME_MAX = 24;

export default function ClaimPage() {
  const router = useRouter();
  const qs = useSearchParams();

  const [me, setMe] = useState<Me | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<{ name: string } | null>(null);

  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("MDPS");
  const [classId, setClassId] = useState<number | "">("");

  // deactivate UI
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deactMsg, setDeactMsg] = useState<string | null>(null);
  const [deactErr, setDeactErr] = useState<string | null>(null);

  useEffect(() => {
    const t = qs.get("token");
    if (t) setToken(t);
  }, [qs]);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json() as Promise<Me>)
      .then(setMe)
      .catch(() => setMe({ authenticated: false }));

    fetch("/api/classes", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((rows: Array<{ id: number; name: string }>) =>
        setClasses(rows.map((r) => ({ id: r.id, name: r.name }))),
      )
      .catch(() => setClasses([]));
  }, []);

  // validation
  const tokenErr =
    token.trim().length >= 8
      ? null
      : "Invite token must be at least 8 characters.";
  const nameLen = name.trim().length;
  const nameErr =
    nameLen === 0
      ? null
      : nameLen < 2
        ? "Name is too short."
        : nameLen > NAME_MAX
          ? `Max ${NAME_MAX} chars.`
          : null;
  const classErr = classId === "" ? "Pick a class." : null;
  const canSubmit = !tokenErr && !nameErr && !classErr && ROLES.includes(role);

  // redirect after successful claim (keeps deactivate flow intact)
  useEffect(() => {
    if (ok) router.replace("/sr");
  }, [ok, router]);

  async function claim(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setErr(null);
    setOk(null);
    try {
      const res = await fetch("/api/invite/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          name: name.trim().slice(0, NAME_MAX),
          role,
          classId: Number(classId),
        }),
      });
      const j = (await res.json().catch(() => ({}))) as ClaimResponse;
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      const claimedName = (j.player && j.player.name) || name.trim();
      setOk({ name: claimedName });
      setMe({
        authenticated: true,
        session: j.player
          ? {
              playerId: j.player.id ?? 0,
              name: j.player.name ?? claimedName,
              role: (j.player.role as Role) || role,
            }
          : undefined,
      });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Claim failed");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      setLoading(false);
      setMe({ authenticated: false });
      setOk(null);
    }
  }

  async function deactivate() {
    setDeactErr(null);
    setDeactMsg(null);
    try {
      const res = await fetch("/api/player/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setDeactMsg("Character deactivated. You are signed out.");
      setConfirmName("");
      setMe({ authenticated: false });
    } catch (e: unknown) {
      setDeactErr(e instanceof Error ? e.message : "Deactivate failed");
    }
  }

  if (me?.authenticated && !ok) {
    const currentName = me.session?.name;
    return (
      <div className="max-w-3xl mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Claim character</h1>
          <div className="badge">Signed in</div>
        </div>

        <div className="panel panel-center">
          <div className="panel-title">Current user</div>
          <div className="text-sm text-neutral-300">You’re signed in as:</div>
          <div className="mt-1 font-medium">
            {currentName} ({me.session?.role})
          </div>
          <div className="mt-4 flex gap-3">
            <a href="/sr" className="btn btn-primary">
              Go to SR
            </a>
            <button onClick={logout} className="btn">
              Log out
            </button>
          </div>
        </div>

        <div
          className="panel"
          style={{
            maxWidth: "36rem",
            marginLeft: "auto",
            marginRight: "auto",
            borderColor: "#7f1d1d",
            background: "color-mix(in oklab, var(--bg-2) 85%, #7f1d1d 15%)",
          }}
        >
          <div className="panel-title text-red-200">Danger zone</div>
          <p className="badge mb-2">
            Deactivating hides your character from the SR table going forward
            (history stays intact). Officers can reactivate later.
          </p>

          <button onClick={() => setShowDeactivate((v) => !v)} className="btn">
            {showDeactivate ? "Cancel" : "Deactivate this character"}
          </button>

          {showDeactivate && (
            <div className="mt-3 space-y-2">
              <label className="text-sm text-neutral-300">
                Type your character name to confirm:
              </label>
              <input
                className="w-full"
                placeholder={currentName || "Character name"}
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
              />
              {deactErr && (
                <div className="text-sm text-red-400">{deactErr}</div>
              )}
              {deactMsg && (
                <div className="text-sm text-green-400">{deactMsg}</div>
              )}
              <button
                onClick={deactivate}
                disabled={!confirmName.trim()}
                className="btn btn-danger"
                title="Are you sure?"
              >
                Yes, deactivate
              </button>
            </div>
          )}
        </div>

        <p className="badge text-center">
          Need the table? <a className="underline" href="/sr">SR</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Claim your character</h1>
        <div className="badge">One-time setup</div>
      </div>

      <div
        className="panel"
        style={{ maxWidth: "36rem", marginLeft: "auto", marginRight: "auto" }}
      >
        <div className="panel-title">Invite & details</div>
        <form onSubmit={claim} className="space-y-4">
          <div className="flex flex-col">
            <label className="text-sm text-neutral-300">Invite token</label>
            <input
              className="w-full"
              placeholder="paste token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
            {tokenErr && (
              <span className="text-xs text-red-400 mt-1">{tokenErr}</span>
            )}
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-neutral-300">Character name</label>
            <input
              className="w-full"
              placeholder="e.g. Skullblaster"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
              maxLength={NAME_MAX}
              autoCapitalize="none"
              autoComplete="off"
            />
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-neutral-400">
                2–{NAME_MAX} characters. One character per human.
              </span>
              <span className="text-neutral-500">
                {nameLen}/{NAME_MAX}
              </span>
            </div>
            {nameErr && (
              <span className="text-xs text-red-400 mt-1">{nameErr}</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-sm text-neutral-300">Role</label>
              <div className="grid grid-cols-4 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={["btn", role === r ? "btn-primary" : ""]
                      .join(" ")
                      .trim()}
                    aria-pressed={role === r}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-neutral-300">Class</label>
              <select
                className="w-full"
                value={classId}
                onChange={(e) =>
                  setClassId(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">Select class…</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {classErr && (
                <span className="text-xs text-red-400 mt-1">{classErr}</span>
              )}
            </div>
          </div>

          {err && <div className="text-sm text-red-400">{err}</div>}
          {ok && (
            <div className="badge">
              Claimed <b>{ok.name}</b>. Redirecting to{" "}
              <a href="/sr" className="underline">
                SR
              </a>
              …
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            {loading && (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
            )}
            {loading ? "Claiming…" : "Claim character"}
          </button>
        </form>
      </div>

      <p className="badge text-center">
        Already claimed? Go to{" "}
        <a className="underline" href="/sr">
          SR
        </a>
        . Need officer tools?{" "}
        <a className="underline" href="/officer">
          Officer panel
        </a>
        .
      </p>
    </div>
  );
}
