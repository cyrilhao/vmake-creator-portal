"use client";

import { signOut } from "next-auth/react";

export function DiscordSignOutButton() {
  return (
    <button
      className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.05]"
      onClick={() => signOut({ callbackUrl: "/" })}
      type="button"
    >
      Sign out
    </button>
  );
}
