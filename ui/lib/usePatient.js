"use client";
import { useState, useEffect, useCallback } from "react";
import supabase from "./supabase";

export function usePatient(patientId) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPatient = useCallback(async () => {
    if (!patientId) return;
    
    setLoading(true);
    setError(null);
    
    const { data, error: err } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .single();

    if (err) {
      setError(err.message);
      setPatient(null);
    } else {
      setPatient(data);
    }
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    loadPatient();
  }, [loadPatient]);

  return { patient, loading, error, refresh: loadPatient };
}