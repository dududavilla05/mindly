import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

const PRICE_TO_PLAN: Record<string, string> = {
  "price_1TGozXHKVKk7mpMh5PZHlrL8": "pro",
  "price_1TGp07HKVKk7mpMh8ORNG6Iq": "max",
};

// Necessário para verificação de assinatura do Stripe
export const config = { api: { bodyParser: false } };

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error("Webhook: assinatura ou segredo ausente");
    return NextResponse.json({ error: "Configuração incompleta" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook: falha na verificação da assinatura:", err);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id ?? session.metadata?.userId;

    if (!userId) {
      console.error("Webhook: userId não encontrado na sessão", session.id);
      return NextResponse.json({ received: true });
    }

    // Descobre o plano a partir do price ID da linha de compra
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
    const priceId = lineItems.data[0]?.price?.id;
    const plan = priceId ? PRICE_TO_PLAN[priceId] : undefined;

    if (!plan) {
      console.error("Webhook: price ID desconhecido:", priceId);
      return NextResponse.json({ received: true });
    }

    // Atualiza o plano no Supabase usando a service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from("profiles")
      .update({ plan })
      .eq("id", userId);

    if (error) {
      console.error("Webhook: erro ao atualizar perfil:", error);
      return NextResponse.json({ error: "Erro ao atualizar plano" }, { status: 500 });
    }

    console.log(`Webhook: plano '${plan}' ativado para usuário ${userId}`);
  }

  return NextResponse.json({ received: true });
}
