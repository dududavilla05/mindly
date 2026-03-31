import { NextRequest, NextResponse } from "next/server";

const BOT_USER_AGENTS = [
  "python-requests",
  "scrapy",
  "curl/",
  "wget/",
  "libwww-perl",
  "java/",
  "go-http-client",
  "okhttp",
  "axios/",
  "node-fetch",
  "postman",
  "insomnia",
  "httpie",
];

export function proxy(request: NextRequest) {
  // Aplica apenas nas rotas de API
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const userAgent = (request.headers.get("user-agent") ?? "").toLowerCase();

  // Bloqueia bots/scrapers conhecidos
  const isBot = BOT_USER_AGENTS.some((bot) => userAgent.includes(bot));
  if (isBot) {
    return NextResponse.json({ error: "Acesso não permitido." }, { status: 403 });
  }

  // Exige header Accept — browsers sempre enviam, scripts crus geralmente não
  const accept = request.headers.get("accept") ?? "";
  if (!accept) {
    return NextResponse.json({ error: "Acesso não permitido." }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
