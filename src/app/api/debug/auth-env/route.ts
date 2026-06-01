import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV ?? null,
    host: process.env.VERCEL_URL ?? null,
    hasDiscordClientId: Boolean(process.env.DISCORD_CLIENT_ID),
    hasDiscordClientSecret: Boolean(process.env.DISCORD_CLIENT_SECRET),
    hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
    hasNextAuthUrl: Boolean(process.env.NEXTAUTH_URL),
    nextAuthUrlValuePreview: process.env.NEXTAUTH_URL
      ? maskUrl(process.env.NEXTAUTH_URL)
      : null,
  });
}

function maskUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "invalid-url";
  }
}
