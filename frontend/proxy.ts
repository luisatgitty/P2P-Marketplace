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

  const ADMIN_ROUTES = ["/admin"];

  const AUTH_ROUTES = [
    "/signup",
    "/login",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ];

  const pathname = request.nextUrl.pathname;
  const hasSessionToken = Boolean(request.cookies.get("session_token")?.value);
  const roleCookie = (request.cookies.get("app_role")?.value ?? "").toUpperCase();
  const isAdminRole = roleCookie === "ADMIN" || roleCookie === "SUPERADMIN";

  const matchesRoute = (route: string): boolean => {
    if (route === "/") return pathname === "/";
    return pathname === route || pathname.startsWith(`${route}/`);
  };

  const isPublicRoute = PUBLIC_ROUTES.some(matchesRoute);
  const isAuthRoute = AUTH_ROUTES.some(matchesRoute);
  const isAdminRoute = ADMIN_ROUTES.some(matchesRoute);

  // Guests can only access public routes
  if (!hasSessionToken && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSessionToken) {
    // Auth pages are blocked for authenticated users.
    if (isAuthRoute) {
      return NextResponse.redirect(new URL(isAdminRole ? "/admin" : "/", request.url));
    }

    // Admin users are confined to /admin routes only.
    if (isAdminRole && !isAdminRoute) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    // Non-admin users cannot access /admin routes.
    if (!isAdminRole && isAdminRoute) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
