import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";

interface GoTrueIdentity {
  provider: string;
}

interface GoTrueUser {
  email?: string;
  identities?: GoTrueIdentity[];
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  // Strict limit to prevent email enumeration abuse
  if (!checkRateLimit(`check-provider:${ip}`, 10, 5 * 60 * 1000)) {
    return NextResponse.json({ provider: null }, { status: 429 });
  }

  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ provider: null }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ provider: null }, { status: 500 });
    }

    // Call GoTrue admin API with email filter
    const url = new URL(`${supabaseUrl}/auth/v1/admin/users`);
    url.searchParams.set("email", normalizedEmail);
    url.searchParams.set("per_page", "1");

    const res = await fetch(url.toString(), {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ provider: null });
    }

    const json = await res.json();
    const users: GoTrueUser[] = Array.isArray(json) ? json : (json.users ?? []);
    const user = users.find((u) => u.email?.toLowerCase() === normalizedEmail);

    if (!user) {
      return NextResponse.json({ provider: null });
    }

    const identities = user.identities ?? [];
    const oauthIdentity = identities.find((id) => id.provider !== "email");

    if (!oauthIdentity) {
      return NextResponse.json({ provider: null });
    }

    const providerMap: Record<string, string> = {
      google: "google",
      azure: "azure",
      github: "github",
    };

    return NextResponse.json({
      provider: providerMap[oauthIdentity.provider] ?? oauthIdentity.provider,
    });
  } catch {
    return NextResponse.json({ provider: null }, { status: 500 });
  }
}
