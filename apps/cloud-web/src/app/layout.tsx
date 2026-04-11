import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.telaflow.ia.br";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TelaFlow Cloud",
    template: "%s · TelaFlow Cloud",
  },
  description:
    "Autoria, revisão e exportação de experiências visuais para eventos ao vivo. Camada Cloud da plataforma TelaFlow.",
  applicationName: "TelaFlow Cloud",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "TelaFlow Cloud",
    title: "TelaFlow Cloud",
    description:
      "Plataforma visual inteligente para eventos ao vivo — governança e exportação na nuvem.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TelaFlow Cloud",
    description:
      "Autoria e exportação de packs para execução no Player — Cloud → Pack → Player.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1120",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} ${sora.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
