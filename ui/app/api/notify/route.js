import { NextResponse } from "next/server";
import { sendPatientNotification } from "@/lib/notifications";

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("NOTIFY BODY:", JSON.stringify(body, null, 2));
    const result = await sendPatientNotification(body);
    console.log("NOTIFY RESULT:", result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("NOTIFY ERROR:", err);
    return NextResponse.json({ success: false, reason: err.message }, { status: 500 });
  }
}