// lib/auth-utils.js
import supabase from "./supabase";

/**
 * Checks if the current user has the required role.
 * @param {string[, nurse]} allowedRoles - Array of roles allowed (e.g., ['admin', 'doctor'])
 * @returns {Promise<{authorized: boolean, user: any}>}
 */
export async function checkRole(allowedRoles) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) return { authorized: false, user: null };

  const { data: userData, error: dbError } = await supabase
    .from("users")
    .select("role, hospital_id")
    .eq("id", user.id)
    .single();

  if (dbError || !allowedRoles.includes(userData?.role)) {
    return { authorized: false, user: userData };
  }

  return { authorized: true, user: userData };
}4