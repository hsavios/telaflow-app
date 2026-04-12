import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="border-t border-tf-border bg-tf-mid/30 py-8 text-center text-xs leading-relaxed text-tf-subtle md:py-9">
      <p className="font-medium text-tf-muted">TelaFlow Cloud</p>
      <p className="mt-2">
        <Link
          href="https://telaflow.ia.br/"
          className="text-tf-faint underline-offset-2 transition-colors hover:text-tf-muted hover:underline"
        >
          telaflow.ia.br
        </Link>
      </p>
    </footer>
  );
}
