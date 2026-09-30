"use client";

import { useEffect } from "react";

// If Supabase falls back to the Site URL (redirectTo not in the Redirect URLs
// allow-list), an implicit-flow recovery link lands on whatever page with
// #access_token=...&type=recovery. The fragment never reaches the server, so
// forward it to /reset-password, where the browser client consumes it.
export function RecoveryHashRedirect() {
  useEffect(() => {
    const { hash, pathname } = window.location;
    if (pathname !== "/reset-password" && hash.includes("type=recovery")) {
      window.location.replace(`/reset-password${hash}`);
    }
  }, []);
  return null;
}
