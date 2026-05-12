"use client";
import { useState, useEffect, useCallback } from "react";
import supabase from "@/lib/supabase";

export function useVisits(patientId, hospitalId) {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadVisits = useCallback(async () => {
    if (!patientId || !hospitalId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("visits")
      .select("*")
      .eq("patient_id", patientId)
      .eq("hospital_id", hospitalId)
      .order("visit_date", { ascending: false });

    if (!error) setVisits(data || []);
    setLoading(false);
  }, [patientId, hospitalId]);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  return { visits, loading, refresh: loadVisits };
}