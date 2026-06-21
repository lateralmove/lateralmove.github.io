"use client";

import { useSyncExternalStore } from "react";

// Subscribe to changes of the <html> `dark` class (the theme lives on the DOM, set
// pre-paint by the inline script in layout.tsx). useSyncExternalStore reads it without
// a setState-in-effect and stays correct across SSR hydration.
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
};

export function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => false, // server snapshot
  );

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
    >
      {dark ? "☀" : "☾"}
    </button>
  );
}
