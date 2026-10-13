"use client";

import React from "react";
import { useAuth, TailoredResumeRecord } from "../lib/auth-context";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecord: (record: TailoredResumeRecord) => void;
}

export function HistoryDrawer({ isOpen, onClose, onSelectRecord }: HistoryDrawerProps) {
  const { history, deleteHistoryItem } = useAuth();

  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <aside className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h2>
              <i className="fa-solid fa-clock-rotate-left fa-brand-accent" /> Tailored Resumes History
            </h2>
            <p>Saved under your account</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close history">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="drawer-content">
          {history.length === 0 ? (
            <div className="drawer-empty">
              <i className="fa-regular fa-folder-open drawer-empty-icon" />
              <h3>No saved resumes yet</h3>
              <p>Whenever you tailor a resume while logged in, it will be automatically saved here.</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((item) => (
                <div key={item.id} className="history-item-card">
                  <div className="history-item-top">
                    <div>
                      <strong className="history-filename">
                        <i className="fa-regular fa-file-lines" /> {item.source_filename}
                      </strong>
                      <span className="history-date">
                        <i className="fa-regular fa-clock" />{" "}
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="history-score-chip">
                      <i className="fa-solid fa-bullseye" /> <span>{item.match_score}%</span> match
                    </div>
                  </div>

                  <p className="history-snippet">
                    {item.tailored_resume.slice(0, 140).trim()}...
                  </p>

                  <div className="history-item-actions">
                    <button
                      type="button"
                      className="history-action-load"
                      onClick={() => {
                        onSelectRecord(item);
                        onClose();
                      }}
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square" /> Load into view
                    </button>
                    <button
                      type="button"
                      className="history-action-delete"
                      onClick={() => deleteHistoryItem(item.id)}
                      title="Delete record"
                    >
                      <i className="fa-solid fa-trash-can" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
