"use client";
import { useEffect, useState } from "react";
import supabase from "@/lib/supabase";

export function useHospital() {
  const [hospital, setHospital] = useState(null);
  const [user,     setUser]     = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    async function fetchHospital(authUser) {
      const { data } = await supabase
        .from("users")
        .select("id, name, role, email, hospital_id, hospitals(*)")
        .eq("id", authUser.id)
        .single();

      if (data) {
        setUser({ id: data.id, name: data.name, role: data.role, email: data.email });
        setHospital(data.hospitals);
      }
    }

    // Load existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchHospital(session.user).finally(() => setLoading(false));
      else setLoading(false);
    });

    // Stay in sync if session changes (logout, token refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchHospital(session.user);
      else { setHospital(null); setUser(null); }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { hospital, user, loading };
}