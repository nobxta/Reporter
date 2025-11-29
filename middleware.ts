import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authCookie = request.cookies.get("auth");

  // Protect /report, /history, and /settings routes
  if (pathname.startsWith("/report") || pathname.startsWith("/history") || pathname.startsWith("/settings")) {
    if (!authCookie || authCookie.value !== "1") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Redirect authenticated users away from login page
  if (pathname === "/login" && authCookie && authCookie.value === "1") {
    return NextResponse.redirect(new URL("/report", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/report/:path*", "/history/:path*", "/settings/:path*", "/login"],
};

