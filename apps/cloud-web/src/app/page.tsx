import Link from "next/link";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";

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
      <AppHeader />

      <main id="conteudo-principal">
        {/* Bloco 1 — headline + status */}
        <section
          id="visao-geral"
          className="mx-auto max-w-content scroll-mt-28 px-6 pb-16 pt-12 md:pb-20 md:pt-16 lg:px-10"
          aria-labelledby="headline"
        >
          <div className="rounded-tf-lg border border-tf-border bg-tf-mid/35 p-8 md:p-10 lg:p-12 lg:pr-14">
            <h1
              id="headline"
              className="font-display max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight text-tf-fg sm:text-5xl lg:text-6xl"
            >
              TelaFlow Cloud
            </h1>
            <p className="mt-5 max-w-3xl text-lg font-medium leading-snug text-tf-fg sm:text-xl lg:text-2xl lg:leading-snug">
              Organize eventos, cenas e exports com clareza operacional.
            </p>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-tf-muted sm:text-lg">
              A camada de nuvem do ecossistema TelaFlow, pensada para governar o
              que sai da autoria e chega ao Player.
            </p>
            <div
              className="mt-8 inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-tf-accent/25 bg-gradient-to-r from-tf-accent-soft/50 via-tf-mid/80 to-tf-mid/60 px-5 py-2.5 text-sm shadow-[0_0_0_1px_rgba(248,250,252,0.04)_inset] md:gap-x-2.5 md:px-6 md:py-3"
              role="status"
              aria-label="Estágio da plataforma"
            >
              <span className="font-semibold tracking-tight text-tf-fg">
                MVP em evolução
              </span>
              <span
                className="select-none text-tf-faint md:px-0.5"
                aria-hidden
              >
                ·
              </span>
              <span className="text-tf-muted">contratos estáveis</span>
              <span className="select-none text-tf-faint" aria-hidden>
                ·
              </span>
              <span className="text-tf-muted">export em construção</span>
            </div>
          </div>
        </section>

        {/* Bloco 2 — arquitetura */}
        <section
          id="arquitetura"
          className="border-y border-tf-border bg-tf-surface/35 py-12 md:py-14"
          aria-labelledby="titulo-arquitetura"
        >
          <div className="mx-auto max-w-content px-6 lg:px-10">
            <h2
              id="titulo-arquitetura"
              className="font-display text-xl font-semibold text-tf-fg md:text-2xl"
            >
              Arquitetura
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-tf-muted">
              Fluxo operacional: Cloud → Pack → Player.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3 md:items-stretch">
              <article className="relative rounded-tf-lg border border-tf-accent/35 bg-gradient-to-b from-tf-accent-soft/35 to-tf-mid/55 p-6 shadow-[0_0_0_1px_rgba(37,99,235,0.12)_inset]">
                <p className="mb-3 inline-block rounded-full border border-tf-accent/30 bg-tf-accent-soft/40 px-2.5 py-0.5 text-[11px] font-semibold tracking-tight text-blue-100">
                  Camada atual
                </p>
                <h3 className="font-display text-lg font-semibold text-tf-fg">
                  Cloud
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-tf-muted">
                  Governança de event e scene; esta aplicação é a face pública
                  dessa camada.
                </p>
              </article>
              <article className="rounded-tf-lg border border-tf-border bg-tf-mid/40 p-5 md:p-6">
                <h3 className="font-display text-base font-semibold text-tf-fg md:text-lg">
                  Pack
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-tf-muted">
                  Contrato exportado com metadados e cenas — ponte até o local do
                  evento.
                </p>
              </article>
              <article className="rounded-tf-lg border border-tf-border bg-tf-mid/40 p-5 md:p-6">
                <h3 className="font-display text-base font-semibold text-tf-fg md:text-lg">
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
          className="mx-auto max-w-content px-6 py-12 md:py-14 lg:px-10"
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
              "Player: execução local dedicada",
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
          <div className="mx-auto max-w-content px-6 lg:px-10">
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
          className="mx-auto max-w-content scroll-mt-28 px-6 pb-20 pt-12 md:pb-24 md:pt-14 lg:px-10"
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
              A criação na interface está em{" "}
              <Link
                href="/events"
                className="font-medium text-tf-fg underline-offset-2 hover:underline"
              >
                Eventos
              </Link>
              ; a API continua disponível em{" "}
              <code className="rounded bg-black/35 px-1.5 py-0.5 font-mono text-xs text-tf-fg">
                POST /events
              </code>
              .
            </p>
          </div>

        </section>
      </main>

      <AppFooter />
    </div>
  );
}
