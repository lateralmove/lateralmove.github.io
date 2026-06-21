"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CommandPalette } from "./CommandPalette";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/", label: "Matrix" },
  { href: "/search/", label: "Search" },
  { href: "/search/?type=technique", label: "Techniques" },
  { href: "/search/?type=group", label: "Groups" },
  { href: "/analytics/", label: "Analytics" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close the mobile menu when navigation changes the route.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync to the router: the menu must collapse on navigation
  useEffect(() => setMobileOpen(false), [pathname]);

  const navItemClass = (active: boolean) =>
    "rounded-md px-2.5 py-1.5 " +
    (active
      ? "bg-neutral-200 font-medium dark:bg-neutral-800"
      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800");
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href.split("?")[0]));

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-neutral-50/85 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/85">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-6 w-6 place-items-center rounded bg-rose-600 text-[11px] font-bold tracking-tight text-white">LM</span>
            <span className="hidden sm:inline">Lateral Move</span>
          </Link>

          <nav className="hidden items-center gap-1 text-sm md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={navItemClass(isActive(n.href))}>
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              <span>Search</span>
              <kbd className="hidden rounded border border-neutral-300 px-1 text-[10px] sm:inline dark:border-neutral-600">⌘K</kbd>
            </button>
            <ThemeToggle />
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
              aria-expanded={mobileOpen}
              className="rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm hover:bg-neutral-100 md:hidden dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              {mobileOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <nav className="space-y-0.5 border-t border-neutral-200 px-2 py-2 text-sm md:hidden dark:border-neutral-800">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setMobileOpen(false)}
                className={"block " + navItemClass(isActive(n.href))}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </>
  );
}
