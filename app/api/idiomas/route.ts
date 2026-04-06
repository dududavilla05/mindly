import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

interface LanguageMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    if (profile?.plan !== "max") {
      return NextResponse.json({ error: "Disponível apenas no plano Max." }, { status: 403 });
    }

    const { messages, userMessage, language, level }: {
      messages: LanguageMessage[];
      userMessage: string;
      language: string;
      level: string;
    } = await request.json();

    if (!userMessage?.trim()) {
      return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });

    const systemPrompt = `Você é um professor de ${language} nativo, gentil e experiente. O aluno é de nível ${level}.

IDIOMA: Responda primariamente em ${language}. Para nível Iniciante, inclua tradução em português entre parênteses logo após a palavra ou frase. Para Intermediário e Avançado, use português apenas quando realmente necessário para esclarecer algo.

CORREÇÃO: Ao perceber um erro do aluno, integre a forma correta naturalmente na sua resposta — jamais destaque o erro de forma embaraçosa. Seja encorajador.

FORMATAÇÃO — siga estas regras rigorosamente:
- Use no máximo 1 emoji por resposta, somente quando for completamente natural. Nunca use emojis como decoração.
- Negrito apenas para palavras ou termos no idioma que mereçam destaque. Evite negrito em frases completas ou títulos.
- Para vocabulário: liste no formato "**palavra** — significado (pronúncia se relevante)" em linhas separadas. Sem tabelas.
- Para frases de exemplo: use hífens simples (-) como bullet point. Sem numeração nem ícones.
- Para gramática: escreva em parágrafos curtos e diretos, com exemplos integrados no texto.
- Use cabeçalhos (###) somente em respostas longas e estruturadas — nunca em conversas simples.
- Seja conciso e natural, como uma conversa real com um professor. Não produza paredes de texto nem listas intermináveis.

PEDAGOGIA: Adapte vocabulário e gramática ao nível ${level}. Proponha exercícios práticos apenas quando o contexto pedir explicitamente.`;


    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("Resposta inválida da IA");
    }

    return NextResponse.json({ reply: textContent.text });
  } catch (error) {
    console.error("[idiomas error]", error);
    if (error instanceof Anthropic.APIConnectionTimeoutError) {
      return NextResponse.json({ error: "A requisição demorou demais. Tente novamente." }, { status: 504 });
    }
    return NextResponse.json({ error: "Erro ao contatar o assistente. Tente novamente." }, { status: 500 });
  }
}
