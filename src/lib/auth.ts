import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: "identify",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "discord") {
        return false;
      }

      const discordUserId = String(account.providerAccountId ?? "");
      const discordProfile = asRecord(profile);
      const discordUsername = resolveDiscordUsername(discordProfile);
      const discordAvatarUrl = buildDiscordAvatarUrl(discordUserId, discordProfile.avatar);

      if (!discordUserId || !discordUsername) {
        return false;
      }

      await prisma.creator.upsert({
        where: {
          discordUserId,
        },
        update: {
          discordUsername,
          discordAvatarUrl,
          handle: `@${discordUsername}`,
          name: discordProfile.global_name ?? discordUsername,
        },
        create: {
          discordUserId,
          externalCreatorId: discordUserId,
          discordUsername,
          discordAvatarUrl,
          handle: `@${discordUsername}`,
          name: discordProfile.global_name ?? discordUsername,
        },
      });

      return true;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === "discord") {
        const discordProfile = asRecord(profile);
        token.discordUserId = String(account.providerAccountId ?? "");
        token.discordUsername = resolveDiscordUsername(discordProfile);
        token.discordGlobalName = discordProfile.global_name;
        token.discordAvatarUrl = buildDiscordAvatarUrl(
          String(account.providerAccountId ?? ""),
          discordProfile.avatar,
        );
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.discordUserId ?? "");
        session.user.name =
          String(token.discordGlobalName ?? "") || String(token.discordUsername ?? "") || null;
        session.user.image =
          typeof token.discordAvatarUrl === "string" ? token.discordAvatarUrl : null;
      }

      session.discordUserId = String(token.discordUserId ?? "");
      session.discordUsername = String(token.discordUsername ?? "");

      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};

export function getServerAuthSession() {
  return getServerSession(authOptions);
}

export function getSessionCreator(session: Awaited<ReturnType<typeof getServerAuthSession>>) {
  const discordUserId = session?.discordUserId ?? session?.user?.id ?? "";
  const discordUsername = session?.discordUsername ?? session?.user?.name ?? "";

  if (!discordUserId) {
    return null;
  }

  return {
    discordUserId,
    discordUsername,
    displayName: session?.user?.name ?? discordUsername,
    avatarUrl: session?.user?.image ?? null,
  };
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object") {
    return {} as Record<string, string>;
  }

  return value as Record<string, string>;
}

function resolveDiscordUsername(profile: Record<string, string>) {
  return profile.username ?? profile.global_name ?? "";
}

function buildDiscordAvatarUrl(discordUserId: string, avatarHash: string | undefined) {
  if (!discordUserId || !avatarHash) {
    return null;
  }

  return `https://cdn.discordapp.com/avatars/${discordUserId}/${avatarHash}.png`;
}
