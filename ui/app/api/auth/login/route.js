import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";
import supabase from "@/lib/supabase";

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    // Get user first
    const { data: user, error: uErr } = await supabase
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    console.log("USER:", user, uErr);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Get hospital separately
    const { data: hospital, error: hErr } = await supabase
      .from("hospitals")
      .select("*")
      .eq("id", user.hospital_id)
      .maybeSingle();

    console.log("HOSPITAL:", hospital, hErr);

    if (!hospital) {
      return NextResponse.json(
        { error: "Hospital not found" },
        { status: 401 }
      );
    }

    // Check password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = signToken({
      userId:       user.id,
      hospitalId:   user.hospital_id,
      hospitalSlug: hospital.slug,
      hospitalName: hospital.name,
      role:         user.role,
    });

    return NextResponse.json({
      token,
      hospital,
      user: { id: user.id, name: user.name, role: user.role },
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Something went wrong" },
      { status: 500 }
    );
  }
}