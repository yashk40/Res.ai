"use client";

import React, { useEffect } from "react";
import { useAuth } from "../lib/auth-context";
import { AuthCard } from "./AuthCard";

export function AuthModal() {
  const { authModalOpen, authModalMode, closeAuthModal } = useAuth();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && authModalOpen) {
        closeAuthModal();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [authModalOpen, closeAuthModal]);

  if (!authModalOpen) return null;

  return (
    <div className="modal-backdrop" onClick={closeAuthModal} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="modal-close-btn"
          onClick={closeAuthModal}
          aria-label="Close dialog"
        >
          <i className="fa-solid fa-xmark" />
        </button>
        <AuthCard initialMode={authModalMode} onSuccess={closeAuthModal} />
      </div>
    </div>
  );
}
