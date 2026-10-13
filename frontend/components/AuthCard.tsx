"use client";

import React, { useState } from "react";
import { useAuth } from "../lib/auth-context";

interface AuthCardProps {
  initialMode?: "sign-in" | "sign-up";
  onSuccess?: () => void;
  showTitle?: boolean;
}

export function AuthCard({ initialMode = "sign-in", onSuccess, showTitle = true }: AuthCardProps) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const { signIn, signUp, signInWithOAuth, isConfigured } = useAuth();

  async function handleOAuth(provider: "google" | "github") {
    setErrorMessage("");
    setInfoMessage("");
    setOauthLoading(provider);
    try {
      const res = await signInWithOAuth(provider);
      if (res.error) {
        setErrorMessage(res.error);
      }
    } catch (err: any) {
      setErrorMessage(err?.message ?? `Failed to continue with ${provider}`);
    } finally {
      setOauthLoading(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setInfoMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "sign-in") {
        const result = await signIn(email.trim(), password);
        if (result.error) {
          setErrorMessage(result.error);
        } else {
          onSuccess?.();
        }
      } else {
        const result = await signUp(email.trim(), password);
        if (result.error) {
          setErrorMessage(result.error);
        } else if (result.needsEmailConfirmation) {
          setInfoMessage("Account created! Please check your email to confirm your account, then log in.");
          setMode("sign-in");
        } else {
          onSuccess?.();
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message ?? "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-card-box">
      {showTitle && (
        <div className="auth-header">
          <div className="auth-brand">
            <i className="fa-solid fa-wand-magic-sparkles fa-brand-accent" /> <span className="nav-brand-text">Res<span>.ai</span></span>
          </div>
          <h2>{mode === "sign-in" ? "Welcome back" : "Create an account"}</h2>
          <p>
            {mode === "sign-in"
              ? "Sign in to access your workspace & history."
              : "Sign up to save and track tailored resumes."}
          </p>
        </div>
      )}

      {!isConfigured && (
        <div className="auth-notice">
          <i className="fa-solid fa-triangle-exclamation" /> <strong>Setup required:</strong> Add{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
          <code>frontend/.env.local</code> to authenticate.
        </div>
      )}

      {/* Font Awesome Social Logins */}
      <div className="oauth-button-grid">
        <button
          type="button"
          className="oauth-btn"
          onClick={() => handleOAuth("google")}
          disabled={!!oauthLoading || isSubmitting}
        >
          {oauthLoading === "google" ? (
            <span className="spinner" />
          ) : (
            <i className="fa-brands fa-google oauth-icon-google" />
          )}
          <span>Google</span>
        </button>
        <button
          type="button"
          className="oauth-btn"
          onClick={() => handleOAuth("github")}
          disabled={!!oauthLoading || isSubmitting}
        >
          {oauthLoading === "github" ? (
            <span className="spinner" />
          ) : (
            <i className="fa-brands fa-github oauth-icon-github" />
          )}
          <span>GitHub</span>
        </button>
      </div>

      <div className="auth-divider">
        <span>or continue with email</span>
      </div>

      <div className="auth-tabs">
        <button
          type="button"
          className={`auth-tab ${mode === "sign-in" ? "active" : ""}`}
          onClick={() => {
            setMode("sign-in");
            setErrorMessage("");
            setInfoMessage("");
          }}
        >
          <i className="fa-solid fa-arrow-right-to-bracket" /> Sign In
        </button>
        <button
          type="button"
          className={`auth-tab ${mode === "sign-up" ? "active" : ""}`}
          onClick={() => {
            setMode("sign-up");
            setErrorMessage("");
            setInfoMessage("");
          }}
        >
          <i className="fa-solid fa-user-plus" /> Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        {errorMessage && (
          <div className="auth-error-banner" role="alert">
            <i className="fa-solid fa-circle-exclamation" /> {errorMessage}
          </div>
        )}
        {infoMessage && (
          <div className="auth-info-banner" role="status">
            <i className="fa-solid fa-circle-check" /> {infoMessage}
          </div>
        )}

        <div className="auth-field">
          <label htmlFor="auth-email">
            <i className="fa-solid fa-envelope" /> Email address
          </label>
          <input
            id="auth-email"
            type="email"
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="auth-password">
            <i className="fa-solid fa-lock" /> Password
          </label>
          <input
            id="auth-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          />
        </div>

        <button type="submit" className="primary auth-submit-btn" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="spinner" /> {mode === "sign-in" ? "Signing in..." : "Creating account..."}
            </>
          ) : mode === "sign-in" ? (
            <>
              Sign In <i className="fa-solid fa-arrow-right" />
            </>
          ) : (
            <>
              Create Account <i className="fa-solid fa-arrow-right" />
            </>
          )}
        </button>

        <div className="auth-switch-row">
          <span>
            {mode === "sign-in" ? "Don't have an account yet?" : "Already have an account?"}
          </span>
          <button
            type="button"
            className="auth-link-btn"
            onClick={() => {
              setMode(mode === "sign-in" ? "sign-up" : "sign-in");
              setErrorMessage("");
              setInfoMessage("");
            }}
          >
            {mode === "sign-in" ? "Sign up" : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}
