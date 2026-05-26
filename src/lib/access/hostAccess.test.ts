import { describe, expect, it } from "vitest";
import {
  isAdminHostname,
  parseHostnameList,
  resolveAccessDecision,
} from "./hostAccess";

describe("parseHostnameList", () => {
  it("normalizes hostname lists from env values", () => {
    expect(
      parseHostnameList(" admin.vmake.ai,admin-vmake.vercel.app:443 , "),
    ).toEqual(["admin.vmake.ai", "admin-vmake.vercel.app"]);
  });

  it("returns an empty list when the env value is missing", () => {
    expect(parseHostnameList(undefined)).toEqual([]);
  });
});

describe("resolveAccessDecision", () => {
  it("matches admin hosts regardless of port casing", () => {
    expect(isAdminHostname("Admin.Vmake.AI:443", ["admin.vmake.ai"])).toBe(true);
  });

  it("rewrites the admin hostname root path into the admin dashboard", () => {
    expect(
      resolveAccessDecision({
        pathname: "/",
        hostname: "admin.vmake.ai",
        adminHostnames: ["admin.vmake.ai"],
      }),
    ).toEqual({ rewriteTo: "/admin" });
  });

  it("redirects public-host admin path requests back to the creator homepage", () => {
    expect(
      resolveAccessDecision({
        pathname: "/admin",
        hostname: "vmake.ai",
        adminHostnames: ["admin.vmake.ai"],
      }),
    ).toEqual({ redirectTo: "/" });
  });

  it("allows admin routes when no admin hostnames are configured yet", () => {
    expect(
      resolveAccessDecision({
        pathname: "/admin",
        hostname: "localhost:3000",
        adminHostnames: [],
      }),
    ).toEqual({});
  });

  it("allows direct admin-path access from the configured admin hostname", () => {
    expect(
      resolveAccessDecision({
        pathname: "/admin",
        hostname: "admin.vmake.ai",
        adminHostnames: ["admin.vmake.ai"],
      }),
    ).toEqual({});
  });
});
