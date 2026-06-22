"use client";

import { useEffect, useState } from "react";

/**
 * The command-palette shortcut hint: `⌘K` on macOS, `Ctrl K` elsewhere.
 *
 * Platform can only be read on the client (`navigator`), but this renders inside
 * statically prerendered HTML. To avoid a hydration mismatch, the server render and
 * the first client render both use the macOS form; a post-mount effect swaps to the
 * Ctrl form on non-Apple platforms. The actual handler (SiteHeader) already accepts
 * both ⌘ and Ctrl, so this only affects the label.
 */
export function ShortcutHint({ className }: { className?: string }) {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    const platform =
      (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
      navigator.platform ??
      "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- platform is client-only; detect once after mount so it matches the SSR/first-render default
    setIsMac(/mac|iphone|ipad|ipod/i.test(platform));
  }, []);
  return <kbd className={className}>{isMac ? "⌘K" : "Ctrl K"}</kbd>;
}
