import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// This codebase is deployed to two separate Vercel projects/domains that
// share the exact same code: the instructor-facing site (default) and a
// student-only site (SITE_ROLE=student in that deployment's environment
// variables). On the student site, the root URL goes straight to the
// combined passkey + name/course/section intake form instead of the
// instructor marketing homepage.
export async function proxy(request: NextRequest) {
  if (process.env.SITE_ROLE === "student" && request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/join";
    return NextResponse.rewrite(url);
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
