"use client";

import { useState } from "react";

export default function OfficerLogoutButton() {
  const [busy, setBusy] = useState(false);

  async function doLogout() {
    try {
      setBusy(true);
      await fetch("/api/officer/logout", { method: "POST" });
      // Go to a guaranteed-public page; avoids redirect weirdness
      window.location.href = "/sr";
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={doLogout}
      disabled={busy}
      className="btn btn-danger px-2 py-1 text-xs"
      title="Clear officer cookie"
    >
      {busy ? "Logging out…" : "Logout"}
    </button>
  );
}
