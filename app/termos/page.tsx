import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso — Mindly",
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-[#0f0a1e] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-[#a78bfa] text-sm hover:underline mb-8 inline-block">
          ← Voltar
        </Link>

        <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-[#7a6a9a] text-sm mb-10">Última atualização: março de 2025</p>

        <div className="space-y-10 text-[#c4b5fd]/90 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. O que é o Mindly</h2>
            <p>
              O Mindly é uma plataforma de aprendizado que utiliza inteligência artificial para gerar
              lições curtas e práticas sobre qualquer assunto. Ao usar o Mindly, você concorda com
              estes Termos de Uso. Se não concordar, não utilize o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Conta de usuário</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Você deve fornecer um e-mail válido para criar uma conta.</li>
              <li>Você é responsável pela segurança da sua senha e por toda atividade realizada na sua conta.</li>
              <li>É proibido criar contas automatizadas, compartilhar acesso ou usar o serviço para fins ilegais.</li>
              <li>Reservamo-nos o direito de encerrar contas que violem estes termos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Planos e pagamentos</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-white">Plano Grátis:</strong> até 10 lições por dia, sem custo.
              </li>
              <li>
                <strong className="text-white">Plano Pro:</strong> lições ilimitadas e recursos adicionais,
                cobrado mensalmente via cartão de crédito.
              </li>
              <li>
                <strong className="text-white">Plano Max:</strong> todos os recursos Pro com limites expandidos,
                cobrado mensalmente via cartão de crédito.
              </li>
              <li>Os pagamentos são processados pelo Stripe. Não armazenamos dados de cartão.</li>
              <li>Os preços podem ser alterados com aviso prévio de 30 dias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Cancelamento</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Você pode cancelar sua assinatura a qualquer momento pelo menu da sua conta ou entrando em contato com o suporte.</li>
              <li>O cancelamento é efetivo ao final do período já pago — não há cobranças adicionais.</li>
              <li>Não oferecemos reembolso proporcional por períodos não utilizados, exceto quando exigido por lei.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Uso aceitável</h2>
            <p className="mb-3">É proibido usar o Mindly para:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Gerar conteúdo ilegal, discriminatório ou que viole direitos de terceiros.</li>
              <li>Realizar engenharia reversa, scraping automatizado ou sobrecarregar os servidores.</li>
              <li>Revender ou redistribuir o conteúdo gerado em escala comercial sem autorização.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Conteúdo gerado por IA</h2>
            <p>
              As lições são geradas por inteligência artificial e têm caráter educativo e informativo.
              O Mindly não se responsabiliza por decisões tomadas com base no conteúdo gerado.
              Sempre consulte profissionais especializados para decisões médicas, jurídicas ou financeiras.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Limitação de responsabilidade</h2>
            <p>
              O Mindly é fornecido "como está", sem garantias de disponibilidade contínua ou ausência de erros.
              Não nos responsabilizamos por danos indiretos, perda de dados ou interrupções do serviço
              decorrentes de fatores fora do nosso controle (como falhas de terceiros ou força maior).
              Nossa responsabilidade total é limitada ao valor pago pelo usuário nos últimos 3 meses.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Alterações nos termos</h2>
            <p>
              Podemos atualizar estes termos periodicamente. Notificaremos usuários por e-mail em caso
              de alterações relevantes. O uso continuado do serviço após a notificação implica aceitação
              dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Lei aplicável</h2>
            <p>
              Estes termos são regidos pelas leis brasileiras. Eventuais disputas serão resolvidas
              no foro da comarca de São Paulo — SP, Brasil.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Contato</h2>
            <p>
              Dúvidas sobre estes termos:{" "}
              <a href="mailto:contato@mindly.app" className="text-[#a78bfa] hover:underline">
                contato@mindly.app
              </a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex gap-6 text-sm text-[#7a6a9a]">
          <Link href="/privacidade" className="hover:text-[#a78bfa] transition-colors">Política de Privacidade</Link>
          <Link href="/" className="hover:text-[#a78bfa] transition-colors">Voltar ao app</Link>
        </div>
      </div>
    </div>
  );
}
