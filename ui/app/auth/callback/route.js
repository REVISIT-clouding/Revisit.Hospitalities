// ─────────────────────────────────────────────────────────────────────────────
//  app/auth/callback/route.js
//
//  Supabase redirects to this URL first when a staff member clicks their
//  invite link. This route exchanges the one-time token for a session,
//  then forwards the user to /auth/set-password.
//
//  Without this file, the invite link will land on a blank page.
//
//  You also need to add this URL to your Supabase dashboard:
//    Authentication → URL Configuration → Redirect URLs
//    Add:  https://yourapp.com/auth/callback
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import { NextResponse }  from "next/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);

  const code  = searchParams.get("code");   // PKCE flow (newer Supabase)
  const token = searchParams.get("token");  // legacy token flow

  // ── PKCE code flow (used by newer Supabase projects) ────────
  if (code) {
    // We need a server-side Supabase client for this exchange
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          // We pass the code through cookies so the browser session is set
          persistSession: false,
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] Code exchange failed:", error.message);
      return NextResponse.redirect(`${origin}/auth/set-password?error=invalid_link`);
    }

    // Token exchanged — forward to the set-password page
    return NextResponse.redirect(`${origin}/auth/set-password`);
  }

  // ── Legacy token flow (older Supabase projects) ─────────────
  //    The token lives in the URL hash (#) so JavaScript on the
  //    set-password page handles it via onAuthStateChange.
  //    Just forward them directly.
  if (token) {
    return NextResponse.redirect(`${origin}/auth/set-password`);
  }

  // No recognised token — something went wrong
  return NextResponse.redirect(`${origin}/auth/set-password?error=invalid_link`);
}