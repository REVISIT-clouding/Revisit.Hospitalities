// ─────────────────────────────────────────────────────────────────────────────
//  /api/staff/create.js  (or /api/staff/create/route.js for App Router)
//
//  WHY THIS EXISTS:
//  Creating a new user in Supabase requires the "service role" (admin) key.
//  That key has full database access, so it must NEVER be exposed in the browser.
//  This API route runs on your server (Node.js), so the key stays private.
//
//  HOW TO USE:
//  Save this file at:
//    app/api/staff/create/route.js      ← if you're using Next.js App Router
//    pages/api/staff/create.js          ← if you're using Next.js Pages Router
//
//  Then add this to your .env.local file:
//    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here   ← from Supabase dashboard
//    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here        ← you likely already have this
//
//  ⚠️  NEVER put SUPABASE_SERVICE_ROLE_KEY in any file that starts with NEXT_PUBLIC_
//      because those are exposed to the browser.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

// This is the all-powerful admin client — only used server-side
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY   // ← NOT the anon key, NOT NEXT_PUBLIC_
);

// ─────────────────────────────────────────────────────────────
//  App Router version  (use this if your folder is /app)
// ─────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const { name, email, role } = await request.json();

    // ── 1. Basic server-side validation ───────────────────────
    if (!name?.trim()) {
      return Response.json({ error: "Name is required." }, { status: 400 });
    }
    if (!email?.trim() || !/\S+@\S+\.\S+/.test(email)) {
      return Response.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const validRoles = ["admin","doctor","nurse","billing","pharmacist","staff"];
    if (!validRoles.includes(role)) {
      return Response.json({ error: "Invalid role selected." }, { status: 400 });
    }

    // ── 2. Check if this email is already registered ───────────
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return Response.json({ error: "A staff member with this email already exists." }, { status: 400 });
    }

    // ── 3. Create a Supabase Auth account for this person ──────
    //       They will receive a "Set your password" email automatically.
    //       The email contains a magic link — they click it, set a password, done.
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      email_confirm: false,   // Sends a confirmation / invite email
      user_metadata: {
        name: name.trim(),
        role,
      },
    });

    if (authError) {
      console.error("[Add Staff] Auth error:", authError);
      return Response.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // ── 4. Insert into your public.users table ─────────────────
    //       This is separate from auth.users — it's YOUR table with name, role, etc.
    const { data: newUser, error: dbError } = await supabaseAdmin
      .from("users")
      .insert({
        id:    userId,           // Must match the auth.users id (that's the FK you defined)
        name:  name.trim(),
        email: email.toLowerCase().trim(),
        role,
        // hospital_id — add this if you want to scope to a specific hospital
        // hospital_id: your_hospital_id,
      })
      .select("id, name, email, role, created_at")
      .single();

    if (dbError) {
      // If the DB insert failed, clean up the auth user to avoid orphans
      console.error("[Add Staff] DB error:", dbError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return Response.json({ error: "Could not save staff details. Please try again." }, { status: 500 });
    }

    // ── 5. Return the new staff member's details to the front end
    return Response.json({ user: newUser }, { status: 200 });

  } catch (err) {
    console.error("[Add Staff] Unexpected error:", err);
    return Response.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}


// ─────────────────────────────────────────────────────────────
//  Pages Router version  (use this instead if your folder is /pages)
//  Uncomment the code below and delete the App Router version above.
// ─────────────────────────────────────────────────────────────

/*
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, role } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: "Name is required." });
    if (!email?.trim() || !/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: "A valid email address is required." });

    const validRoles = ["admin","doctor","nurse","billing","pharmacist","staff"];
    if (!validRoles.includes(role)) return res.status(400).json({ error: "Invalid role selected." });

    const { data: existing } = await supabaseAdmin.from("users").select("id").eq("email", email).maybeSingle();
    if (existing) return res.status(400).json({ error: "A staff member with this email already exists." });

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      email_confirm: false,
      user_metadata: { name: name.trim(), role },
    });

    if (authError) return res.status(400).json({ error: authError.message });

    const userId = authData.user.id;

    const { data: newUser, error: dbError } = await supabaseAdmin
      .from("users")
      .insert({ id: userId, name: name.trim(), email: email.toLowerCase().trim(), role })
      .select("id, name, email, role, created_at")
      .single();

    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(500).json({ error: "Could not save staff details." });
    }

    return res.status(200).json({ user: newUser });
  } catch (err) {
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
}
*/