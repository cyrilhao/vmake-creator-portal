type AccessDecision = {
  redirectTo?: string;
  rewriteTo?: string;
};

type AccessInput = {
  pathname: string;
  hostname: string;
  adminHostnames: string[];
};

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/:\d+$/, "");
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
  const normalizedHostname = normalizeHostname(hostname);
  const normalizedAdminHosts = adminHostnames.map(normalizeHostname);
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminHost = normalizedAdminHosts.includes(normalizedHostname);

  if (isAdminHost && pathname === "/") {
    return { rewriteTo: "/admin" };
  }

  if (isAdminPath && normalizedAdminHosts.length > 0 && !isAdminHost) {
    return { redirectTo: "/" };
  }

  return {};
}
