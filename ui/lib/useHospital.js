"use client";
import { useEffect, useState } from "react";

export function useHospital() {
  const [hospital, setHospital] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const h = localStorage.getItem("hospital");
    const u = localStorage.getItem("user");
    if (h) setHospital(JSON.parse(h));
    if (u) setUser(JSON.parse(u));
  }, []);

  return { hospital, user };
}