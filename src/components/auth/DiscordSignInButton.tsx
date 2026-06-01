"use client";

import { signIn } from "next-auth/react";

export function DiscordSignInButton() {
  return (
    <button
      className="inline-flex items-center rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
      onClick={() => signIn("discord")}
      type="button"
    >
      Sign in with Discord
    </button>
  );
}
