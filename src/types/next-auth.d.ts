import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    discordUserId?: string;
    discordUsername?: string;
    user?: DefaultSession["user"] & {
      id?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    discordUserId?: string;
    discordUsername?: string;
    discordGlobalName?: string;
    discordAvatarUrl?: string | null;
  }
}
