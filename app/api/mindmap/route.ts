import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: profile } = await adminSupabase
      .from("profiles").select("plan").eq("id", user.id).single();
    if (profile?.plan !== "max") {
      return NextResponse.json({ error: "Disponível apenas no plano Max." }, { status: 403 });
    }

    const { topic, nodeId, nodeLabel, nodeLevel, explain } = await request.json();
    if (!topic?.trim()) return NextResponse.json({ error: "Tema obrigatório." }, { status: 400 });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });

    let prompt: string;
    if (explain && nodeId) {
      prompt = `No mapa mental sobre "${topic}", explique o conceito "${nodeLabel}" em 2 frases diretas, didáticas e objetivas em português. Retorne APENAS JSON: {"explanation":"..."}`;
    } else if (!nodeId) {
      prompt = `Gere um mapa mental completo sobre: "${topic}"

Retorne APENAS JSON puro (sem markdown):
{
  "nodes": [
    {"id":"root","label":"${topic}","level":0,"parentId":null},
    {"id":"n1","label":"Ramo 1","level":1,"parentId":"root"},
    {"id":"n2","label":"Ramo 2","level":1,"parentId":"root"},
    {"id":"n3","label":"Ramo 3","level":1,"parentId":"root"},
    {"id":"n4","label":"Ramo 4","level":1,"parentId":"root"},
    {"id":"n5","label":"Ramo 5","level":1,"parentId":"root"},
    {"id":"n1_1","label":"Sub 1.1","level":2,"parentId":"n1"},
    {"id":"n1_2","label":"Sub 1.2","level":2,"parentId":"n1"},
    ... (2 sub-nós para cada ramo, total 16 nós)
  ],
  "edges": [
    {"source":"root","target":"n1"},
    ...
  ]
}

Regras: labels concisos (2-4 palavras), em português, conteúdo relevante ao tema. IDs exatamente como no exemplo: root, n1-n5, n1_1, n1_2, n2_1, n2_2, etc.`;
    } else {
      const newLevel = (nodeLevel ?? 2) + 1;
      prompt = `No mapa mental sobre "${topic}", o usuário quer expandir o nó "${nodeLabel}" (id: "${nodeId}").

Gere 3 sub-tópicos detalhados para "${nodeLabel}". Retorne APENAS JSON puro:
{
  "nodes": [
    {"id":"${nodeId}_e1","label":"Sub-tópico 1","level":${newLevel},"parentId":"${nodeId}"},
    {"id":"${nodeId}_e2","label":"Sub-tópico 2","level":${newLevel},"parentId":"${nodeId}"},
    {"id":"${nodeId}_e3","label":"Sub-tópico 3","level":${newLevel},"parentId":"${nodeId}"}
  ],
  "edges": [
    {"source":"${nodeId}","target":"${nodeId}_e1"},
    {"source":"${nodeId}","target":"${nodeId}_e2"},
    {"source":"${nodeId}","target":"${nodeId}_e3"}
  ]
}

Labels concisos (2-4 palavras), em português, específicos e relevantes.`;
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content.find(c => c.type === "text");
    if (!text || text.type !== "text") throw new Error("Resposta inválida");

    const jsonMatch = text.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON não encontrado");

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[mindmap error]", error);
    if (error instanceof Anthropic.APIConnectionTimeoutError) {
      return NextResponse.json({ error: "Tempo esgotado. Tente novamente." }, { status: 504 });
    }
    return NextResponse.json({ error: "Erro ao gerar mapa mental." }, { status: 500 });
  }
}
