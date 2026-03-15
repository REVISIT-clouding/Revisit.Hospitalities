import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import supabase from "@/lib/supabase";

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("REGISTER BODY:", body);

    const { hospitalName, address, phone, slug, adminName, email, password, hospitalEmail } = body;

    if (!hospitalName || !slug || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data: hospital, error: hErr } = await supabase
      .from("hospitals")
      .insert([{ name: hospitalName, address, phone, slug , email: hospitalEmail }])
      .select()
      .single();

    console.log("HOSPITAL RESULT:", hospital, hErr);
if (hErr) {
  console.log("HERR CODE:", hErr.code, typeof hErr.code);
  const message = hErr.code === "23505"
    ? "That URL slug is already taken. Please choose a different one."
    : hErr.message;
  return NextResponse.json({ error: message }, { status: 400 });
}



    const hashed = await bcrypt.hash(password, 10);

    const { data: newUser, error: uErr } = await supabase
      .from("users")
      .insert([{
        hospital_id: hospital.id,
        name:        adminName,
        email:       email.toLowerCase().trim(),
        password:    hashed,
        role:        "admin",
      }])
      .select()
      .single();

    console.log("USER RESULT:", newUser, uErr);

    if (uErr) {
      return NextResponse.json(
        { error: uErr.message || "User creation failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Hospital registered successfully",
      slug: hospital.slug,
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Something went wrong" },
      { status: 500 }
    );
  }
}