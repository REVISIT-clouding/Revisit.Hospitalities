"use client";
import { useAuth } from "@/context/AuthContext"; // Or however you store your user/role

export function HasAccess({ roles, children }) {
  const { userRole } = useAuth(); // Get the role we fetched from get_my_role()

  if (!roles.includes(userRole)) {
    return null; // Hide the component completely
  }

  return <>{children}</>;
}