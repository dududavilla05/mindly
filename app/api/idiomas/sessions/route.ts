import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Verifica o Bearer token enviado pelo cliente ──────────────────────────────
// Não usa cookies — funciona sem middleware e é mais confiável em App Router.
async function getAuthUser(request: NextRequest) {
  const auth = request.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    console.warn("[idiomas/sessions] Authorization header ausente ou inválido");
    return null;
  }
  const token = auth.slice(7);
  try {
    const admin = createAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error) {
      console.error("[idiomas/sessions] auth.getUser error:", error.message);
      return null;
    }
    return user ?? null;
  } catch (err) {
    console.error("[idiomas/sessions] getAuthUser exception:", err);
    return null;
  }
}

// ── GET: lista sessões do usuário ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    console.log("[idiomas/sessions GET] user:", user.id);

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("language_sessions")
      .select("id, language, level, messages, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("[idiomas/sessions GET] DB error:", JSON.stringify(error));
      return NextResponse.json(
        { error: `Erro ao buscar sessões: ${error.message}` },
        { status: 500 }
      );
    }

    console.log("[idiomas/sessions GET] found:", data?.length ?? 0, "sessions");
    return NextResponse.json({ sessions: data ?? [] });
  } catch (err) {
    console.error("[idiomas/sessions GET] unexpected:", err);
    return NextResponse.json({ error: "Erro inesperado ao buscar sessões." }, { status: 500 });
  }
}

// ── POST: cria ou atualiza uma sessão ─────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const body = await request.json();
    const { id, language, level, messages } = body;

    console.log("[idiomas/sessions POST] user:", user.id, "| sessionId:", id ?? "NEW", "| msgs:", messages?.length);

    if (!language || !level || !Array.isArray(messages)) {
      console.error("[idiomas/sessions POST] payload inválido:", { language, level, messagesIsArray: Array.isArray(messages) });
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const admin = createAdminClient();

    if (id) {
      // ── UPDATE sessão existente ──
      const { error } = await admin
        .from("language_sessions")
        .update({ language, level, messages })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("[idiomas/sessions POST] UPDATE error:", JSON.stringify(error));
        return NextResponse.json(
          { error: `Erro ao atualizar sessão: ${error.message}` },
          { status: 500 }
        );
      }

      console.log("[idiomas/sessions POST] updated ok:", id);
      return NextResponse.json({ id });
    } else {
      // ── INSERT nova sessão ──
      const { data, error } = await admin
        .from("language_sessions")
        .insert({ user_id: user.id, language, level, messages })
        .select("id")
        .single();

      if (error) {
        console.error("[idiomas/sessions POST] INSERT error:", JSON.stringify(error));
        return NextResponse.json(
          { error: `Erro ao criar sessão: ${error.message}` },
          { status: 500 }
        );
      }

      console.log("[idiomas/sessions POST] inserted ok, new id:", data.id);
      return NextResponse.json({ id: data.id });
    }
  } catch (err) {
    console.error("[idiomas/sessions POST] unexpected:", err);
    return NextResponse.json({ error: "Erro inesperado ao salvar sessão." }, { status: 500 });
  }
}

// ── DELETE: exclui uma sessão ─────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID ausente." }, { status: 400 });

    console.log("[idiomas/sessions DELETE] user:", user.id, "| id:", id);

    const admin = createAdminClient();
    const { error } = await admin
      .from("language_sessions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[idiomas/sessions DELETE] error:", JSON.stringify(error));
      return NextResponse.json(
        { error: `Erro ao excluir sessão: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[idiomas/sessions DELETE] unexpected:", err);
    return NextResponse.json({ error: "Erro inesperado ao excluir sessão." }, { status: 500 });
  }
}
