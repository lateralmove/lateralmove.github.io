import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { getMeta } from "@/lib/data";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const TITLE = "Lateral Move — Know every move before they make it";
const DESCRIPTION =
  "A faster, relationship-first browser for MITRE ATT&CK Enterprise — pivot across the adversary graph and surface coverage gaps, with no dead ends.";

export const metadata: Metadata = {
  // Absolute base so social/messaging crawlers (WhatsApp, Slack, etc.) resolve og:image.
  metadataBase: new URL("https://lateralmove.github.io"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Lateral Move",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// Apply the saved theme before paint to avoid a flash.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const meta = await getMeta();
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
        <footer className="space-y-1 border-t border-neutral-200 px-4 py-6 text-center text-xs text-neutral-400 dark:border-neutral-800">
          <div>
            MITRE ATT&CK® Enterprise{meta.version ? ` v${meta.version}` : ""} (latest) · data from{" "}
            <a className="link" href="https://github.com/mitre-attack/attack-stix-data" target="_blank" rel="noopener noreferrer">
              attack-stix-data
            </a>
          </div>
          <div>Independent project — not affiliated with The MITRE Corporation.</div>
        </footer>
      </body>
    </html>
  );
}
