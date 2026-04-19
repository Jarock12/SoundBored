"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../utils/supabase/supabaseClient";
import { getCurrentUserSafe, clearAuthCache } from "../../utils/supabase/auth";

type AuthState = {
  user: User | null;
  authLoading: boolean;
};

const AuthContext = createContext<AuthState>({ user: null, authLoading: true });

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    // Resolve initial session — getSession() reads localStorage, no network.
    getCurrentUserSafe().then((u) => {
      if (!mounted.current) return;
      setUser(u);
      setAuthLoading(false);
    });

    // Keep context in sync with sign-in / sign-out / token refresh events.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted.current) return;
      if (event === "SIGNED_OUT") {
        clearAuthCache();
        setUser(null);
      } else if (session?.user) {
        setUser(session.user);
      }
      setAuthLoading(false);
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
