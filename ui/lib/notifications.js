import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPatientNotification({
  patient,
  isExisting,
  complaint,
  hospitalName,
  hospitalPhone,
  hospitalEmail,
}) {
  // 1. Check first before doing anything
  if (!patient.email) return { success: false, reason: "no email" };

  // 2. Define subject
  const subject = isExisting
    ? `Welcome back to ${hospitalName}`
    : `Welcome to ${hospitalName}`;

  // 3. Define html
  const html = isExisting
    ? `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #0d9488;">Welcome Back!</h2>
        <p>Hi <strong>${patient.full_name}</strong>,</p>
        <p>Your visit has been logged at <strong>${hospitalName}</strong>.</p>
        <p>Your reference code is: <strong style="font-size: 20px; color: #0d9488;">${patient.patient_id}</strong></p>
        ${complaint ? `<p>Reason for visit: ${complaint}</p>` : ""}
        <p>Please show your reference code at reception when you arrive.</p>
        <hr />
        <p style="font-size: 12px; color: #94a3b8;">${hospitalName} · ${hospitalPhone}</p>
      </div>
    `
    : `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #0d9488;">You're Registered!</h2>
        <p>Hi <strong>${patient.full_name}</strong>,</p>
        <p>Welcome to <strong>${hospitalName}</strong>. Your intake has been received.</p>
        <p>Your reference code is: <strong style="font-size: 20px; color: #0d9488;">${patient.patient_id}</strong></p>
        ${complaint ? `<p>Reason for visit: ${complaint}</p>` : ""}
        <p>Please show this code at reception when you arrive.</p>
        <hr />
        <p style="font-size: 12px; color: #94a3b8;">${hospitalName} · ${hospitalPhone}</p>
      </div>
    `;

  // 4. Now send — subject and html are ready
  try {
  const response = await resend.emails.send({
    from: "Revisit HMS <onboarding@resend.dev>",
    to: patient.email,
    subject,
    html,
  });
  console.log("RESEND RESPONSE:", response);
  return { success: true };
} catch (err) {
  console.error("EMAIL ERROR:", err.message, err);
  return { success: false, reason: err.message };
}
}