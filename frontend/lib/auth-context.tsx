"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabase";

export interface TailoredResumeRecord {
  id: string;
  created_at: string;
  source_filename: string;
  job_description: string;
  tailored_resume: string;
  match_score: number;
  matched_skills?: string[];
  missing_keywords?: string[];
  changes?: string[];
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  signInWithOAuth: (provider: "google") => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  authModalOpen: boolean;
  authModalMode: "sign-in" | "sign-up";
  openAuthModal: (mode?: "sign-in" | "sign-up") => void;
  closeAuthModal: () => void;
  history: TailoredResumeRecord[];
  refreshHistory: () => Promise<void>;
  saveToHistory: (record: Omit<TailoredResumeRecord, "id" | "created_at">) => Promise<void>;
  deleteHistoryItem: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_PREFIX = "resai_history_";

function generateUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // RFC 4122 v4 fallback — always returns a valid UUID for the uuid DB column
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [history, setHistory] = useState<TailoredResumeRecord[]>([]);

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        if (mounted) {
          setSession(data.session);
          setUser(data.session?.user ?? null);
        }
      } catch (err) {
        console.error("Failed to retrieve Supabase session:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initSession();

    if (isSupabaseConfigured) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setLoading(false);
        }
      );

      return () => {
        mounted = false;
        authListener?.subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  // Load history whenever user changes
  useEffect(() => {
    if (user) {
      loadHistory(user.id);
    } else {
      setHistory([]);
    }
  }, [user]);

  async function loadHistory(userId: string) {
    // 1. Try local storage cache first
    try {
      const local = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
      if (local) {
        setHistory(JSON.parse(local));
      }
    } catch {
      // Ignore local storage parse error
    }

    // 2. If Supabase table exists, sync from Supabase
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("tailored_resumes")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          setHistory(data);
          try {
            localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(data));
          } catch {
            // Ignore
          }
        }
      } catch {
        // Table might not exist yet, local storage will handle it seamlessly
      }
    }
  }

  async function saveToHistory(record: Omit<TailoredResumeRecord, "id" | "created_at">) {
    if (!user) return;
    const newRecord: TailoredResumeRecord = {
      ...record,
      id: generateUuid(),
      created_at: new Date().toISOString(),
    };

    // Update local state and localStorage immediately
    setHistory((prev) => {
      const updated = [newRecord, ...prev];
      try {
        localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${user.id}`, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });

    // Also attempt to persist in Supabase DB if table exists
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("tailored_resumes").insert({
          id: newRecord.id,
          user_id: user.id,
          source_filename: newRecord.source_filename,
          job_description: newRecord.job_description,
          tailored_resume: newRecord.tailored_resume,
          match_score: newRecord.match_score,
          matched_skills: newRecord.matched_skills ?? [],
          missing_keywords: newRecord.missing_keywords ?? [],
          changes: newRecord.changes ?? [],
          created_at: newRecord.created_at,
        });
        if (error) {
          console.warn("Supabase history insert failed, kept local copy:", error.message);
        }
      } catch {
        // Fallback already saved locally
      }
    }
  }

  async function deleteHistoryItem(id: string) {
    if (!user) return;
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${user.id}`, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });

    if (isSupabaseConfigured) {
      try {
        await supabase.from("tailored_resumes").delete().eq("id", id).eq("user_id", user.id);
      } catch {
        // Ignore
      }
    }
  }

  async function refreshHistory() {
    if (user) {
      await loadHistory(user.id);
    }
  }

  async function signIn(email: string, password: string) {
    if (!isSupabaseConfigured) {
      return {
        error:
          "Supabase is not configured yet. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to frontend/.env.local",
      };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message };
    }
    setAuthModalOpen(false);
    return { error: null };
  }

  async function signUp(email: string, password: string) {
    if (!isSupabaseConfigured) {
      return {
        error:
          "Supabase is not configured yet. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to frontend/.env.local",
      };
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { error: error.message };
    }
    if (data.user && !data.session) {
      return { error: null, needsEmailConfirmation: true };
    }
    setAuthModalOpen(false);
    return { error: null, needsEmailConfirmation: false };
  }

  async function signInWithOAuth(provider: "google") {
    if (!isSupabaseConfigured) {
      return {
        error:
          "Supabase is not configured yet. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to frontend/.env.local",
      };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  }

  async function signOut() {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setHistory([]);
  }

  function openAuthModal(mode: "sign-in" | "sign-up" = "sign-in") {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }

  function closeAuthModal() {
    setAuthModalOpen(false);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        signInWithOAuth,
        signOut,
        authModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        history,
        refreshHistory,
        saveToHistory,
        deleteHistoryItem,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
