import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { getMeta } from "@/lib/data";
import { SITE_URL } from "@/lib/seo";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const TITLE = "Lateral Move: a faster way to browse Enterprise MITRE ATT&CK";
const DESCRIPTION =
  "A faster, easy-to-search way to browse the MITRE ATT&CK Enterprise knowledge base. Independent and open source.";

export const metadata: Metadata = {
  // Absolute base so social/messaging crawlers (WhatsApp, Slack, etc.) resolve og:image.
  metadataBase: new URL(SITE_URL),
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

// Cloudflare Web Analytics beacon token. Cookieless + privacy-first, so no consent
// banner is needed. Read from the env at build time (NEXT_PUBLIC_ → inlined), so it's
// only emitted in production builds where the var is set — local dev/builds stay uncounted.
const CF_BEACON_TOKEN = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const meta = await getMeta();
  // Link the exact versioned STIX file this build was made from (matches the About page).
  const stixHref = meta.version
    ? `https://github.com/mitre-attack/attack-stix-data/blob/master/enterprise-attack/enterprise-attack-${meta.version}.json`
    : "https://github.com/mitre-attack/attack-stix-data";
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {CF_BEACON_TOKEN && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: CF_BEACON_TOKEN })}
          />
        )}
      </head>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
        <footer className="space-y-1 border-t border-neutral-200 px-4 py-6 text-center text-xs text-neutral-500 dark:border-neutral-800">
          <div>
            MITRE ATT&CK® Enterprise{meta.version ? ` v${meta.version}` : ""} (latest) · data from{" "}
            <a className="link" href={stixHref} target="_blank" rel="noopener noreferrer">
              attack-stix-data
            </a>
          </div>
          <div>Independent project — not affiliated with The MITRE Corporation.</div>
        </footer>
      </body>
    </html>
  );
}
