import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    console.log("[idiomas/sessions GET] user:", user.id);

    const { data, error } = await adminClient()
      .from("language_sessions")
      .select("id, language, level, messages, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("[idiomas/sessions GET] DB error:", error);
      throw error;
    }

    console.log("[idiomas/sessions GET] found:", data?.length ?? 0, "sessions");
    return NextResponse.json({ sessions: data ?? [] });
  } catch (err) {
    console.error("[idiomas/sessions GET] unexpected error:", err);
    return NextResponse.json({ error: "Erro ao buscar sessões." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const body = await request.json();
    const { id, language, level, messages } = body;

    console.log("[idiomas/sessions POST] user:", user.id, "| sessionId:", id ?? "NEW", "| msgs:", messages?.length);

    if (!language || !level || !Array.isArray(messages)) {
      console.error("[idiomas/sessions POST] payload inválido:", { language, level, messagesIsArray: Array.isArray(messages) });
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const db = adminClient();

    if (id) {
      // ── UPDATE sessão existente ──
      console.log("[idiomas/sessions POST] updating session:", id);
      const { error } = await db
        .from("language_sessions")
        .update({ language, level, messages })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("[idiomas/sessions POST] UPDATE error:", error);
        throw error;
      }

      console.log("[idiomas/sessions POST] updated ok");
      return NextResponse.json({ id });
    } else {
      // ── INSERT nova sessão ──
      console.log("[idiomas/sessions POST] inserting new session for user:", user.id);
      const { data, error } = await db
        .from("language_sessions")
        .insert({ user_id: user.id, language, level, messages })
        .select("id")
        .single();

      if (error) {
        console.error("[idiomas/sessions POST] INSERT error:", error);
        throw error;
      }

      console.log("[idiomas/sessions POST] inserted ok, new id:", data.id);
      return NextResponse.json({ id: data.id });
    }
  } catch (err) {
    console.error("[idiomas/sessions POST] unexpected error:", err);
    return NextResponse.json({ error: "Erro ao salvar sessão." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID ausente." }, { status: 400 });

    console.log("[idiomas/sessions DELETE] user:", user.id, "| id:", id);

    const { error } = await adminClient()
      .from("language_sessions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[idiomas/sessions DELETE] error:", error);
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[idiomas/sessions DELETE] unexpected error:", err);
    return NextResponse.json({ error: "Erro ao excluir sessão." }, { status: 500 });
  }
}
