import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface LanguageMessage {
  role: "user" | "assistant";
  content: string;
}

async function getAuthUser(request: NextRequest) {
  const auth = request.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(token);
    return user ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
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

CORREÇÃO DE ERROS — regra obrigatória:
Sempre que o aluno cometer um erro gramatical, ortográfico ou de vocabulário no idioma que está aprendendo, siga EXATAMENTE este formato ao final da sua resposta (após uma linha em branco separadora):

---
💡 **Correção:** "[frase/palavra errada do aluno]" → "**[forma correta]**"
_[Explicação curta e didática do motivo, em português. Ex: 'go' é um verbo irregular — o passado é 'went', não 'goed'.]_

Regras da correção:
- Apenas UMA correção por resposta (a mais importante se houver vários erros).
- A linha "---" e o bloco de correção aparecem somente quando há erro. Se a frase do aluno estiver correta, NÃO adicione o bloco.
- Nunca corrija no meio da resposta — sempre ao final, neste formato específico.
- Seja encorajador: a correção é um aprendizado, não uma crítica.

FORMATAÇÃO — siga estas regras rigorosamente:
- Use no máximo 1 emoji por resposta (exceto o 💡 da correção). Nunca use emojis como decoração.
- Negrito apenas para palavras ou termos no idioma que mereçam destaque. Evite negrito em frases completas.
- Para vocabulário: formato "**palavra** — significado (pronúncia se relevante)" em linhas separadas. Sem tabelas.
- Para frases de exemplo: hífens simples (-) como bullet point. Sem numeração nem ícones extras.
- Para gramática: parágrafos curtos com exemplos integrados no texto.
- Use cabeçalhos (###) somente em respostas longas e estruturadas — nunca em conversas simples.
- Seja conciso e natural como uma conversa real. Sem paredes de texto nem listas intermináveis.

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
