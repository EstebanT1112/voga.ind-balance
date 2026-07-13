import type { Session } from "@supabase/supabase-js";
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest, getFriendlyErrorMessage } from "../lib/api";
import { supabase } from "../lib/supabase";
import type { ApiProfile, AuthMeResponse } from "./auth.types";

interface AuthContextValue {
  bootstrapping: boolean;
  email: string;
  errorMessage: string | null;
  loading: boolean;
  password: string;
  profile: ApiProfile | null;
  refreshProfile(): Promise<void>;
  session: Session | null;
  setEmail(email: string): void;
  setPassword(password: string): void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(session: Session): Promise<ApiProfile> {
  const response = await apiRequest<AuthMeResponse>("/auth/me", {
    method: "GET",
    session,
  });

  return response.profile;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) {
        return;
      }

      setSession(data.session);

      if (data.session) {
        try {
          setProfile(await loadProfile(data.session));
        } catch {
          await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
        }
      }

      setBootstrapping(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (!nextSession) {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      bootstrapping,
      email,
      errorMessage,
      loading,
      password,
      profile,
      async refreshProfile() {
        if (!session) {
          return;
        }

        setProfile(await loadProfile(session));
      },
      session,
      setEmail,
      setPassword,
      async signIn() {
        setLoading(true);
        setErrorMessage(null);

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

          if (error || !data.session) {
            throw new Error(error?.message ?? "No session returned");
          }

          setSession(data.session);
          setProfile(await loadProfile(data.session));
        } catch (error) {
          setErrorMessage(getFriendlyErrorMessage(error, "No se pudo iniciar sesion"));
          setSession(null);
          setProfile(null);
        } finally {
          setLoading(false);
        }
      },
      async signOut() {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        setPassword("");
      },
    }),
    [bootstrapping, email, errorMessage, loading, password, profile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
