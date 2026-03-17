import { NextResponse, NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const PUBLIC_ROUTES = [
    "/",
    "/signup",
    "/login",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/listing",
  ];

  const AUTH_ROUTES = [
    "/signup",
    "/login",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ];

  const pathname = request.nextUrl.pathname;
  const hasSessionToken = Boolean(request.cookies.get("session_token")?.value);

  const matchesRoute = (route: string): boolean => {
    if (route === "/") return pathname === "/";
    return pathname === route || pathname.startsWith(`${route}/`);
  };

  const isPublicRoute = PUBLIC_ROUTES.some(matchesRoute);
  const isAuthRoute = AUTH_ROUTES.some(matchesRoute);

  // Already logged in users should not open auth pages
  if (hasSessionToken && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Guests can only access public routes
  if (!hasSessionToken && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
