"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth-context";

interface UserMenuProps {
  onOpenHistory?: () => void;
}

export function UserMenu({ onOpenHistory }: UserMenuProps) {
  const { user, signOut, history } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const initial = user.email ? user.email.charAt(0).toUpperCase() : "U";

  return (
    <div className="user-menu-wrapper" ref={menuRef}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="User account menu"
      >
        <span className="user-avatar">{initial}</span>
        <span className="user-email-center">{user.email}</span>
        <i className="fa-solid fa-chevron-down chevron-icon" />
      </button>

      {open && (
        <div className="user-dropdown-popover">
          <div className="dropdown-header">
            <span className="dropdown-label">
              <i className="fa-solid fa-shield-halved" /> Signed in
            </span>
            <strong className="dropdown-email">{user.email}</strong>
          </div>

          <div className="dropdown-divider" />

          {onOpenHistory && (
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                setOpen(false);
                onOpenHistory();
              }}
            >
              <i className="fa-solid fa-clock-rotate-left" />
              <span>Saved Resumes</span>
              {history.length > 0 && <span className="history-badge">{history.length}</span>}
            </button>
          )}

          <button
            type="button"
            className="dropdown-item signout-btn"
            onClick={async () => {
              setOpen(false);
              await signOut();
            }}
          >
            <i className="fa-solid fa-arrow-right-from-bracket" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
