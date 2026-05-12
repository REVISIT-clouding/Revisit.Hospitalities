import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export async function POST(req) {
  try {
    const body = await req.json();
    const { hospitalName, address, phone, slug, adminName, email, password, hospitalEmail } = body;

    if (!hospitalName || !slug || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Insert hospital (admin_id filled in after user creation)
    const { data: hospital, error: hErr } = await supabaseAdmin
      .from("hospitals")
      .insert([{ name: hospitalName, address, phone, slug, email: hospitalEmail }])
      .select()
      .single();

    if (hErr) {
      const message = hErr.code === "23505" ? "Slug already taken." : hErr.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // 2. Create user in Supabase Auth
    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: adminName, hospital_id: hospital.id },
    });

    if (authErr) {
      // Clean up the hospital row so slug isn't orphaned
      await supabaseAdmin.from("hospitals").delete().eq("id", hospital.id);
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }

    const userId = authUser.user.id;

    // 3. Insert into public.users — id must match auth.users id
    const { error: uErr } = await supabaseAdmin
      .from("users")
      .insert([{
        id: userId,           // synced with auth.users
        hospital_id: hospital.id,
        name: adminName,
        email: email.toLowerCase().trim(),
        role: "admin",
      }]);

    if (uErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      await supabaseAdmin.from("hospitals").delete().eq("id", hospital.id);
      return NextResponse.json({ error: uErr.message }, { status: 400 });
    }

    // 4. Now update hospitals.admin_id to complete the link
    await supabaseAdmin
      .from("hospitals")
      .update({ admin_id: userId })
      .eq("id", hospital.id);

    return NextResponse.json({
      message: "Registered successfully",
      slug: hospital.slug,
    });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}