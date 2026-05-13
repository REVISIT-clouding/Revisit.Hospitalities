// ─────────────────────────────────────────────────────────────────────────────
//  app/api/staff/create/route.js
//
//  What this does:
//    1. Validates the submitted name / email / role
//    2. Calls Supabase's "invite user" function — this sends the staff member
//       a proper invite email with a link like:
//         https://yourapp.com/auth/set-password?token=xxxxx
//    3. Inserts a row in public.users with their name, role, hospital
//
//  The staff member clicks the link → lands on /auth/set-password →
//  types a password → they are now logged in.
//
//  .env.local must have:
//    NEXT_PUBLIC_SUPABASE_URL=...
//    SUPABASE_SERVICE_ROLE_KEY=...   ← from Supabase dashboard → Settings → API
//    NEXT_PUBLIC_APP_URL=https://yourapp.com   ← where the invite link points to
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

// Admin client — only safe to use server-side, never in the browser
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { name, email, role, hospital_id } = await request.json();

    // ── Validate inputs ──────────────────────────────────────
    if (!name?.trim())
      return Response.json({ error: "Please provide the staff member's full name." }, { status: 400 });

    if (!email?.trim() || !/\S+@\S+\.\S+/.test(email))
      return Response.json({ error: "Please provide a valid email address." }, { status: 400 });

    const validRoles = ["admin", "doctor", "nurse", "billing", "pharmacist", "staff"];
    if (!validRoles.includes(role))
      return Response.json({ error: "Invalid role selected." }, { status: 400 });

    // ── Check for duplicate email ────────────────────────────
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existing)
      return Response.json({ error: "A staff member with this email already exists." }, { status: 400 });

    // ── Send the invite email ────────────────────────────────
    //
    //  inviteUserByEmail sends an email that looks like:
    //    "You've been invited to join [Your App]. Click here to accept."
    //
    //  The link in that email redirects to:
    //    NEXT_PUBLIC_APP_URL/auth/set-password
    //
    //  On that page the staff member sets their password.
    //  The name and role are stored in user_metadata so the
    //  set-password page can greet them by name.
    //
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email.toLowerCase().trim(),
      {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/set-password`,
        data: {
          // These land in auth.users → raw_user_meta_data
          // and are accessible on the set-password page
          name:        name.trim(),
          role,
          hospital_id: hospital_id ?? null,
        },
      }
    );

    if (inviteError) {
      console.error("[Invite staff] Auth error:", inviteError);
      // "User already registered" means they have an auth account but maybe no public.users row
      if (inviteError.message?.includes("already registered")) {
        return Response.json({ error: "This email address already has an account." }, { status: 400 });
      }
      return Response.json({ error: inviteError.message }, { status: 400 });
    }

    const userId = inviteData.user.id;

    // ── Insert into public.users ─────────────────────────────
    //
    //  We do this now (not after they set their password) so the
    //  staff member appears in the admin's staff list immediately,
    //  shown with a "Invite pending" status.
    //
    const { data: newUser, error: dbError } = await supabaseAdmin
      .from("users")
      .insert({
        id:          userId,
        name:        name.trim(),
        email:       email.toLowerCase().trim(),
        role,
        hospital_id: hospital_id ?? null,
      })
      .select("id, name, email, role, created_at")
      .single();

    if (dbError) {
      console.error("[Invite staff] DB insert error:", dbError);
      // Clean up the auth invite so we don't leave orphaned accounts
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return Response.json({ error: "Could not save staff details. Please try again." }, { status: 500 });
    }

    return Response.json({ user: newUser }, { status: 200 });

  } catch (err) {
    console.error("[Invite staff] Unexpected error:", err);
    return Response.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}