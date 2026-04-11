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

const navClass =
  "text-sm text-tf-muted transition-colors hover:text-tf-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tf-accent/60";

export default function Home() {
  return (
    <div className="min-h-screen text-tf-muted">
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-tf focus:bg-tf-surface focus:px-4 focus:py-2 focus:text-tf-fg"
      >
        Ir para o conteúdo principal
      </a>

      <header className="sticky top-0 z-40 border-b border-tf-border bg-tf-mid/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3.5">
          <Link
            href="#visao-geral"
            className="font-display text-lg font-semibold tracking-tight text-tf-fg"
          >
            TelaFlow Cloud
          </Link>
          <nav
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
            aria-label="Principal"
          >
            <Link href="#visao-geral" className={navClass}>
              Visão geral
            </Link>
            <Link href="#eventos" className={navClass}>
              Eventos
            </Link>
            <Link href="#arquitetura" className={navClass}>
              Arquitetura
            </Link>
            <span className="hidden h-4 w-px bg-tf-border sm:inline" aria-hidden />
            <Link
              href="https://telaflow.ia.br/"
              className={`${navClass} text-tf-subtle sm:pl-0`}
            >
              Site público
            </Link>
          </nav>
        </div>
      </header>

      <main id="conteudo-principal">
        {/* Bloco 1 — headline + status */}
        <section
          id="visao-geral"
          className="mx-auto max-w-content scroll-mt-28 px-6 pb-14 pt-12 md:pb-16 md:pt-14"
          aria-labelledby="headline"
        >
          <h1
            id="headline"
            className="font-display text-4xl font-semibold leading-tight tracking-tight text-tf-fg md:text-5xl"
          >
            TelaFlow Cloud
          </h1>
          <p className="mt-4 max-w-2xl text-lg font-medium leading-snug text-tf-fg md:text-xl">
            Organize eventos, cenas e exports com clareza operacional.
          </p>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-tf-muted md:text-lg">
            A camada de nuvem do ecossistema TelaFlow, pensada para governar o
            que sai da autoria e chega ao Player.
          </p>
          <div
            className="mt-8 flex flex-wrap items-center gap-2 border border-tf-border bg-tf-mid/40 px-4 py-3 text-sm text-tf-subtle"
            role="status"
            aria-label="Resumo do estágio atual"
          >
            <span className="font-medium text-tf-muted">Status:</span>
            <span>MVP em evolução</span>
            <span className="text-tf-faint" aria-hidden>
              ·
            </span>
            <span>contratos estáveis</span>
            <span className="text-tf-faint" aria-hidden>
              ·
            </span>
            <span>export em construção</span>
          </div>
        </section>

        {/* Bloco 2 — arquitetura */}
        <section
          id="arquitetura"
          className="border-y border-tf-border bg-tf-surface/35 py-12 md:py-14"
          aria-labelledby="titulo-arquitetura"
        >
          <div className="mx-auto max-w-content px-6">
            <h2
              id="titulo-arquitetura"
              className="font-display text-xl font-semibold text-tf-fg md:text-2xl"
            >
              Arquitetura
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-tf-muted">
              Fluxo operacional: Cloud → Pack → Player.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <article className="rounded-tf-lg border border-tf-border bg-tf-mid/40 p-5">
                <h3 className="font-display text-base font-semibold text-tf-fg">
                  Cloud
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-tf-muted">
                  Governança de event e scene; esta aplicação é a face pública
                  dessa camada.
                </p>
              </article>
              <article className="rounded-tf-lg border border-tf-border bg-tf-mid/40 p-5">
                <h3 className="font-display text-base font-semibold text-tf-fg">
                  Pack
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-tf-muted">
                  Contrato exportado com metadados e cenas — ponte até o local do
                  evento.
                </p>
              </article>
              <article className="rounded-tf-lg border border-tf-border bg-tf-mid/40 p-5">
                <h3 className="font-display text-base font-semibold text-tf-fg">
                  Player
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-tf-muted">
                  Execução local, offline-first; leitura do pack, não substituto
                  da Cloud.
                </p>
              </article>
            </div>
            <p className="mt-6 text-center font-mono text-xs text-tf-faint">
              Cloud → Pack → Player
            </p>
          </div>
        </section>

        {/* Bloco 3 — capacidades */}
        <section
          className="mx-auto max-w-content px-6 py-12 md:py-14"
          aria-labelledby="capacidades"
        >
          <h2
            id="capacidades"
            className="font-display text-xl font-semibold text-tf-fg md:text-2xl"
          >
            Capacidades atuais
          </h2>
          <p className="mt-2 max-w-xl text-sm text-tf-subtle">
            O que já orienta time e integradores.
          </p>
          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {[
              "Event e scene no domínio Cloud (contratos)",
              "Export de pack versionado para o Player",
              "Player: produto à parte; execução local",
              "Offline-first como requisito de campo",
              "Cloud API mínima (evolução documentada)",
            ].map((text) => (
              <li
                key={text}
                className="flex gap-2.5 rounded-tf border border-tf-border bg-tf-mid/30 px-3.5 py-2.5 text-sm leading-snug"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-tf-teal" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Bloco 4 — MVP */}
        <section
          id="mvp"
          className="border-t border-tf-border bg-tf-surface/25 py-12 md:py-14"
          aria-labelledby="mvp-titulo"
        >
          <div className="mx-auto max-w-content px-6">
            <h2
              id="mvp-titulo"
              className="font-display text-xl font-semibold text-tf-fg md:text-2xl"
            >
              Status do MVP
            </h2>
            <p className="mt-2 max-w-xl text-sm text-tf-subtle">
              Sem prometer o que o backend ainda não cobre.
            </p>
            <div className="mt-6 overflow-hidden rounded-tf-lg border border-tf-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-tf-mid/80 text-tf-subtle">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Área</th>
                    <th className="px-4 py-2.5 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tf-border bg-tf-mid/25">
                  <tr>
                    <td className="px-4 py-3 text-tf-muted">shared-contracts</td>
                    <td className="px-4 py-3">
                      <StatusPill label="Pronto" tone="ready" />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-tf-muted">Cloud API mínima</td>
                    <td className="px-4 py-3">
                      <StatusPill label="Em evolução" tone="progress" />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-tf-muted">Export mínimo</td>
                    <td className="px-4 py-3">
                      <StatusPill label="Em evolução" tone="progress" />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-tf-muted">Runtime local (Player)</td>
                    <td className="px-4 py-3">
                      <StatusPill label="Planejado" tone="planned" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Bloco 5 — próximos passos + API / eventos */}
        <section
          id="proximos-passos"
          className="mx-auto max-w-content scroll-mt-28 px-6 pb-20 pt-12 md:pb-24 md:pt-14"
          aria-labelledby="proximos-titulo"
        >
          <h2
            id="proximos-titulo"
            className="font-display text-xl font-semibold text-tf-fg md:text-2xl"
          >
            Próximos passos
          </h2>
          <ul className="mt-5 max-w-xl list-inside list-disc space-y-1.5 text-sm leading-relaxed text-tf-muted marker:text-tf-faint">
            <li>Fechar export mínimo com validação ponta a ponta.</li>
            <li>Evoluir Cloud API conforme contratos do monorepo.</li>
            <li>Introduzir autoria visual na Cloud quando o fluxo estiver maduro.</li>
          </ul>

          <div
            id="eventos"
            className="mt-10 scroll-mt-28 rounded-tf-lg border border-tf-border bg-tf-mid/35 p-5 md:p-6"
          >
            <div className="grid gap-6 md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="font-display text-sm font-semibold tracking-tight text-tf-fg">
                  Cloud API disponível
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-tf-muted">
                  Integração via HTTP; sem depender de UI completa nesta fase.
                </p>
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold tracking-tight text-tf-fg">
                  Fluxo visual em evolução
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-tf-muted">
                  Telas de autoria seguem o roadmap — mesma honestidade do MVP.
                </p>
              </div>
            </div>
            <p className="mt-6 border-t border-tf-border pt-5 text-sm leading-relaxed text-tf-muted">
              Nesta fase, a criação de evento acontece via endpoint{" "}
              <code className="rounded bg-black/35 px-1.5 py-0.5 font-mono text-xs text-tf-fg">
                POST /events
              </code>
              . A interface visual completa será a próxima camada da Cloud.
            </p>
          </div>

        </section>
      </main>

      <footer className="border-t border-tf-border py-7 text-center text-xs text-tf-faint">
        <p>
          TelaFlow Cloud ·{" "}
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
