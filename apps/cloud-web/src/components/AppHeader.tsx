"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { clearAuthSession, isAuthenticated } from "@/lib/auth-session";

const navClass =
  "text-sm text-tf-muted transition-colors hover:text-tf-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tf-accent/60";

const navActive =
  "text-sm font-medium text-tf-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tf-accent/60";

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isAuthenticated());
  }, [pathname]);

  const logout = useCallback(() => {
    clearAuthSession();
    setLoggedIn(false);
    router.refresh();
  }, [router]);

  const onHome = pathname === "/";
  const onEvents =
    pathname === "/events" || pathname?.startsWith("/events/");
  const onLogin = pathname === "/login";

  return (
    <>
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-tf focus:bg-tf-surface focus:px-4 focus:py-2 focus:text-tf-fg"
      >
        Ir para o conteúdo principal
      </a>
      <header className="sticky top-0 z-40 border-b border-tf-border bg-tf-mid/90 backdrop-blur-md supports-[backdrop-filter]:bg-tf-mid/80">
        <div className="mx-auto flex max-w-content min-w-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-y-2 sm:px-6 sm:py-3.5 lg:px-10">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="shrink-0 font-display text-base font-semibold tracking-tight text-tf-fg sm:text-lg"
            >
              TelaFlow
            </Link>
          </div>
          <nav
            className="-mx-1 flex min-w-0 flex-nowrap items-center gap-x-4 gap-y-2 overflow-x-auto px-1 pb-0.5 text-sm sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
            aria-label="Principal"
          >
            <Link href="/events" className={onEvents ? navActive : navClass}>
              Eventos
            </Link>
            {loggedIn ? (
              <button
                type="button"
                onClick={logout}
                className={navClass}
              >
                Sair
              </button>
            ) : (
              <Link href="/login" className={onLogin ? navActive : navClass}>
                Entrar
              </Link>
            )}
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
