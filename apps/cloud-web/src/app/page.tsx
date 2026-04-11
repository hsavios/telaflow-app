import Link from "next/link";

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "ready" | "progress" | "planned";
}) {
  const styles = {
    ready: "bg-tf-teal-soft text-tf-teal border-tf-teal/25",
    progress: "bg-tf-accent-soft text-blue-200 border-tf-accent/25",
    planned: "bg-white/[0.06] text-tf-subtle border-tf-border",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight ${styles[tone]}`}
    >
      {label}
    </span>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen text-tf-muted">
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-tf focus:bg-tf-surface focus:px-4 focus:py-2 focus:text-tf-fg"
      >
        Ir para o conteúdo principal
      </a>

      <header className="border-b border-tf-border bg-tf-mid/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-lg font-semibold tracking-tight text-tf-fg">
              TelaFlow Cloud
            </span>
            <span className="hidden text-sm text-tf-subtle sm:inline">
              Operação e autoria na nuvem
            </span>
          </div>
          <Link
            href="https://telaflow.ia.br/"
            className="text-sm font-medium text-tf-muted transition-colors hover:text-tf-fg"
          >
            Site público
          </Link>
        </div>
      </header>

      <main id="conteudo-principal">
        {/* Bloco 1 — headline */}
        <section
          className="mx-auto max-w-content px-6 pb-16 pt-14 md:pb-20 md:pt-20"
          aria-labelledby="headline"
        >
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-tf-subtle">
            Plataforma TelaFlow
          </p>
          <h1
            id="headline"
            className="font-display max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-tf-fg md:text-5xl"
          >
            TelaFlow Cloud
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-tf-muted md:text-xl">
            Autoria, revisão e exportação de experiências visuais para eventos ao
            vivo. Aqui você governa o que vai para o pack e, em seguida, para o
            Player — com clareza operacional, sem ruído de painel genérico.
          </p>
        </section>

        {/* Bloco 2 — estado da plataforma */}
        <section
          className="border-y border-tf-border bg-tf-surface/40 py-14 md:py-16"
          aria-labelledby="estado-plataforma"
        >
          <div className="mx-auto max-w-content px-6">
            <h2
              id="estado-plataforma"
              className="font-display text-xl font-semibold text-tf-fg md:text-2xl"
            >
              Estado da plataforma
            </h2>
            <p className="mt-4 max-w-3xl leading-relaxed text-tf-muted">
              O produto está em evolução contínua, com prioridade para contratos
              estáveis e um export mínimo confiável. O que você vê hoje é a base
              real do fluxo{" "}
              <span className="whitespace-nowrap font-medium text-tf-fg">
                Cloud → Pack → Player
              </span>
              , não um mock isolado: cada camada avança em cima da anterior.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: "Contratos centrais",
                  body: "Modelos de event, scene e pack alinhados ao monorepo — base para integração e export.",
                },
                {
                  title: "Export mínimo",
                  body: "Caminho de empacotamento em construção; foco em consistência antes de volume de recursos.",
                },
                {
                  title: "Próximas camadas",
                  body: "Player dedicado e pré-flight operacional entram como próximos passos do mesmo fluxo.",
                },
              ].map((item) => (
                <li
                  key={item.title}
                  className="rounded-tf-lg border border-tf-border bg-tf-mid/50 p-5"
                >
                  <h3 className="font-display text-sm font-semibold text-tf-fg">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-tf-subtle">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Bloco 3 — arquitetura */}
        <section
          id="arquitetura"
          className="mx-auto max-w-content scroll-mt-24 px-6 py-16 md:py-20"
          aria-labelledby="titulo-arquitetura"
        >
          <h2
            id="titulo-arquitetura"
            className="font-display text-xl font-semibold text-tf-fg md:text-2xl"
          >
            Arquitetura do produto
          </h2>
          <p className="mt-3 max-w-2xl text-tf-muted">
            Três papéis claros. Nomes técnicos em inglês onde o contrato exige;
            descrição em português para operação.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <article className="rounded-tf-lg border border-tf-border bg-tf-mid/40 p-6">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-tf-accent-soft text-sm font-semibold text-blue-200"
                  aria-hidden
                >
                  1
                </span>
                <h3 className="font-display text-lg font-semibold text-tf-fg">
                  Cloud
                </h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-tf-muted">
                Onde eventos e cenas são organizados, revisados e governados.
                Esta aplicação é a face pública dessa camada.
              </p>
            </article>
            <article className="rounded-tf-lg border border-tf-border bg-tf-mid/40 p-6">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-tf-teal-soft text-sm font-semibold text-cyan-200"
                  aria-hidden
                >
                  2
                </span>
                <h3 className="font-display text-lg font-semibold text-tf-fg">
                  Pack
                </h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-tf-muted">
                Contrato operacional exportado: metadados, cenas e requisitos
                para execução. Ponte entre a nuvem e o local do evento.
              </p>
            </article>
            <article className="rounded-tf-lg border border-tf-border bg-tf-mid/40 p-6">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-tf-violet-soft text-sm font-semibold text-violet-200"
                  aria-hidden
                >
                  3
                </span>
                <h3 className="font-display text-lg font-semibold text-tf-fg">
                  Player
                </h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-tf-muted">
                Execução local, pensada para operação offline-first no veículo
                do evento — leitura do pack, não substituto da Cloud.
              </p>
            </article>
          </div>
          <p className="mt-8 text-center font-mono text-sm text-tf-subtle">
            Cloud → Pack → Player
          </p>
        </section>

        {/* Bloco 4 — capacidades */}
        <section
          className="border-t border-tf-border bg-tf-surface/30 py-14 md:py-16"
          aria-labelledby="capacidades"
        >
          <div className="mx-auto max-w-content px-6">
            <h2
              id="capacidades"
              className="font-display text-xl font-semibold text-tf-fg md:text-2xl"
            >
              Capacidades iniciais
            </h2>
            <p className="mt-3 max-w-2xl text-tf-muted">
              O que já orienta o trabalho do time e dos integradores nesta fase.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "Eventos — identidade e organização no domínio Cloud",
                "Scenes — unidades de experiência visual no contrato",
                "Exportação de pack — contrato versionado para o Player",
                "Execução local no Player — fora deste app; mesma linha de produto",
                "Operação offline-first — requisito de campo, refletido no desenho",
                "API mínima — criação de evento e evolução incremental documentada",
              ].map((text) => (
                <li
                  key={text}
                  className="flex gap-3 rounded-tf border border-tf-border bg-tf-mid/35 px-4 py-3 text-sm leading-snug"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-tf-teal" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Bloco 5 — MVP */}
        <section
          id="mvp"
          className="mx-auto max-w-content scroll-mt-24 px-6 py-16 md:py-20"
          aria-labelledby="mvp-titulo"
        >
          <h2
            id="mvp-titulo"
            className="font-display text-xl font-semibold text-tf-fg md:text-2xl"
          >
            Status do MVP
          </h2>
          <p className="mt-3 max-w-2xl text-tf-muted">
            Transparência sobre o que está maduro e o que ainda está em curso —
            sem prometer recurso que o backend não sustenta.
          </p>
          <div className="mt-8 overflow-hidden rounded-tf-lg border border-tf-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-tf-mid/80 text-tf-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium">Área</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tf-border bg-tf-mid/30">
                <tr>
                  <td className="px-4 py-3.5 text-tf-muted">shared-contracts</td>
                  <td className="px-4 py-3.5">
                    <StatusPill label="Pronto" tone="ready" />
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3.5 text-tf-muted">Cloud API mínima</td>
                  <td className="px-4 py-3.5">
                    <StatusPill label="Em evolução" tone="progress" />
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3.5 text-tf-muted">Export mínimo</td>
                  <td className="px-4 py-3.5">
                    <StatusPill label="Em evolução" tone="progress" />
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3.5 text-tf-muted">Runtime local (Player)</td>
                  <td className="px-4 py-3.5">
                    <StatusPill label="Planejado" tone="planned" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Bloco 6 — ações */}
        <section
          id="acoes"
          className="border-t border-tf-border pb-20 pt-14 md:pb-24"
          aria-labelledby="acoes-titulo"
        >
          <div className="mx-auto max-w-content px-6">
            <h2
              id="acoes-titulo"
              className="font-display text-xl font-semibold text-tf-fg md:text-2xl"
            >
              Próximas ações
            </h2>
            <p className="mt-3 max-w-2xl text-tf-muted">
              Atalhos para quem está operando ou integrando. Nada de fluxo falso:
              o que ainda não tem UI própria está indicado de forma explícita.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <Link
                href="#arquitetura"
                className="inline-flex items-center justify-center rounded-tf bg-tf-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Ver arquitetura Cloud → Pack → Player
              </Link>
              <Link
                href="#mvp"
                className="inline-flex items-center justify-center rounded-tf border border-tf-border bg-tf-mid/50 px-5 py-2.5 text-sm font-semibold text-tf-fg transition-colors hover:border-tf-accent/40 hover:bg-tf-mid"
              >
                Revisar status do MVP
              </Link>
            </div>
            <div className="mt-10 rounded-tf-lg border border-tf-border bg-tf-mid/40 p-6 md:p-8">
              <h3 className="font-display text-base font-semibold text-tf-fg">
                Criar evento
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-tf-muted">
                A interface web de criação e edição completa de eventos ainda não
                está disponível nesta versão. Nesta fase, o registro na nuvem é
                feito pela Cloud API — endpoint{" "}
                <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-xs text-tf-fg">
                  POST /events
                </code>
                , documentado no repositório do produto.
              </p>
              <p className="mt-3 text-sm text-tf-subtle">
                Quando a autoria na Cloud estiver na interface, este bloco será
                substituído pelo fluxo guiado correspondente.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-tf-border py-8 text-center text-xs text-tf-faint">
        <p>
          TelaFlow Cloud · parte do ecossistema{" "}
          <Link
            href="https://telaflow.ia.br/"
            className="text-tf-subtle underline-offset-2 hover:text-tf-muted hover:underline"
          >
            telaflow.ia.br
          </Link>
        </p>
      </footer>
    </div>
  );
}
