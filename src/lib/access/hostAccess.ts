type AccessDecision = {
  redirectTo?: string;
  rewriteTo?: string;
};

const defaultAdminHostnames = [
  "vmake-creator-manager.vercel.app",
];

type AccessInput = {
  pathname: string;
  hostname: string;
  adminHostnames: string[];
};

export function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/:\d+$/, "");
}

export function isAdminHostname(hostname: string, adminHostnames: string[]) {
  const normalizedHostname = normalizeHostname(hostname);
  return adminHostnames.map(normalizeHostname).includes(normalizedHostname);
}

export function parseHostnameList(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((hostname) => normalizeHostname(hostname))
    .filter(Boolean);
}

export function getAdminHostnames(value: string | undefined) {
  return Array.from(
    new Set([
      ...defaultAdminHostnames.map(normalizeHostname),
      ...parseHostnameList(value),
    ]),
  );
}

export function resolveRequestHostname(
  headerSource:
    | Headers
    | {
        get(name: string): string | null | undefined;
      },
) {
  const forwardedHost = headerSource.get("x-forwarded-host");
  const host = headerSource.get("host");
  const vercelDeploymentUrl = headerSource.get("x-vercel-deployment-url");

  return normalizeHostname(forwardedHost || host || vercelDeploymentUrl || "");
}

export function resolveAccessDecision({
  pathname,
  hostname,
  adminHostnames,
}: AccessInput): AccessDecision {
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminHost = isAdminHostname(hostname, adminHostnames);

  if (isAdminHost && pathname === "/") {
    return { rewriteTo: "/admin" };
  }

  if (isAdminPath && adminHostnames.length > 0 && !isAdminHost) {
    return { redirectTo: "/" };
  }

  return {};
}
