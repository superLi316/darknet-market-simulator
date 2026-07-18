import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/",
  "/api/auth",
  "/api/register",
  "/_next",
  "/favicon.ico",
];

const ADMIN_PATHS = ["/admin", "/api/admin"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = await auth();

  if (!session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session.user.status === "BANNED") {
    return NextResponse.redirect(new URL("/login?banned=1", request.url));
  }

  if (isAdminPath(pathname) && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
