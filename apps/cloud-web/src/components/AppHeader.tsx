"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navClass =
  "text-sm text-tf-muted transition-colors hover:text-tf-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tf-accent/60";

const navActive =
  "text-sm font-medium text-tf-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tf-accent/60";

export function AppHeader() {
  const pathname = usePathname();
  const onEvents = pathname === "/events";

  return (
    <>
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-tf focus:bg-tf-surface focus:px-4 focus:py-2 focus:text-tf-fg"
      >
        Ir para o conteúdo principal
      </a>
      <header className="sticky top-0 z-40 border-b border-tf-border bg-tf-mid/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3.5 lg:px-10">
          <Link
            href="/"
            className="font-display text-lg font-semibold tracking-tight text-tf-fg"
          >
            TelaFlow Cloud
          </Link>
          <nav
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
            aria-label="Principal"
          >
            <Link href="/#visao-geral" className={navClass}>
              Visão geral
            </Link>
            <Link href="/events" className={onEvents ? navActive : navClass}>
              Eventos
            </Link>
            <Link href="/#arquitetura" className={navClass}>
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
    </>
  );
}
