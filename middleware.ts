import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAdminHostnames, resolveAccessDecision } from "@/lib/access/hostAccess";

export function middleware(request: NextRequest) {
  const adminHostnames = getAdminHostnames(process.env.ADMIN_APP_HOSTNAMES);
  const hostname = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;
  const decision = resolveAccessDecision({
    pathname,
    hostname,
    adminHostnames,
  });

  if (decision.rewriteTo) {
    const url = request.nextUrl.clone();
    url.pathname = decision.rewriteTo;
    return NextResponse.rewrite(url);
  }

  if (decision.redirectTo) {
    const url = request.nextUrl.clone();
    url.pathname = decision.redirectTo;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
