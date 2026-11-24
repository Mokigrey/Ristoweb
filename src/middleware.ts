
import { NextResponse, type NextRequest } from "next/server";
import { publicMediaPrefix } from "@/lib/public-media";
import { matchShowcaseHost, showcasePath } from "@/lib/showcase-address";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const showcase = matchShowcaseHost(request.headers.get("host") ?? request.nextUrl.host);
  if (showcase) {
    const canRead = request.method === "GET" || request.method === "HEAD";
    if (showcase.slug && canRead) {
      if (pathname.startsWith(publicMediaPrefix)) return NextResponse.next();
      if (pathname === "/") {
        const destination = request.nextUrl.clone();
        destination.pathname = showcasePath(showcase.slug);
        return NextResponse.rewrite(destination);
      }
    }
    return new NextResponse("Vetrina non disponibile.", {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex",
      },
    });
  }

  if (pathname.startsWith("/vetrine/") || pathname.startsWith(publicMediaPrefix) || pathname === "/api/pagamenti/stripe-test") return;
  if (/\.(?:svg|png|jpg|jpeg|gif|webp)$/.test(pathname)) return;
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico$).*)",
  ],
};
