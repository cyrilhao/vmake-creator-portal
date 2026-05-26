type AccessDecision = {
  redirectTo?: string;
  rewriteTo?: string;
};

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
