import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/", "/login", "/planos"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes cuidam da própria autenticação
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // Callback do OAuth sempre público
  if (pathname.startsWith("/auth/")) return NextResponse.next();

  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return supabaseResponse;

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    // Atualiza sessão e obtém usuário atual
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Redireciona para /login se rota protegida e sem sessão
    if (!user && !PUBLIC_ROUTES.includes(pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } catch {
    // Erros no proxy não devem bloquear a requisição
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
