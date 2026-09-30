import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// Landing point for Supabase's PKCE email links (signup confirmation).
// Supabase's /auth/v1/verify redirects here with ?code=..., which has to be
// exchanged for a session server-side — nothing else in the app does it, so
// without this the customer lands on the site still logged out.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Supabase drops the ?next= query when the allow-listed Redirect URL has
      // no wildcard, so a recovery link can arrive here without it. A
      // recovery_sent_at within the last hour identifies that case.
      const sentAt = data.user?.recovery_sent_at;
      const isRecovery =
        sentAt && Date.now() - new Date(sentAt).getTime() < 60 * 60 * 1000;
      return NextResponse.redirect(
        `${origin}${isRecovery ? "/reset-password" : safeNext}`
      );
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirm`);
}
