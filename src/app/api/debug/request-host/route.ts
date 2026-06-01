import { NextResponse } from "next/server";
import {
  getAdminHostnames,
  isAdminHostname,
  resolveRequestHostname,
} from "@/lib/access/hostAccess";

export async function GET(request: Request) {
  const headers = request.headers;
  const adminHostnames = getAdminHostnames(process.env.ADMIN_APP_HOSTNAMES);
  const resolvedHostname = resolveRequestHostname(headers);

  return NextResponse.json({
    host: headers.get("host"),
    xForwardedHost: headers.get("x-forwarded-host"),
    xForwardedServer: headers.get("x-forwarded-server"),
    xForwardedProto: headers.get("x-forwarded-proto"),
    xVercelDeploymentUrl: headers.get("x-vercel-deployment-url"),
    resolvedHostname,
    adminHostnames,
    isAdminHostname: isAdminHostname(resolvedHostname, adminHostnames),
  });
}
