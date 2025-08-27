"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { auth, db } from '@/lib/firebase/firebaseConfig';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}
