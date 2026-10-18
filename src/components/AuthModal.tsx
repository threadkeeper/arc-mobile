import React, { useEffect, useState } from 'react';
import type { AuthCredentials } from '../shared/types';
import {
  AUTH_COOKIE_NAME,
  AUTH_STORAGE_KEY,
  DEFAULT_APP_KEY,
  DEMO_USER_API_KEY,
  clearAuthCredentials,
  extractKeysFromText,
  openArcTrackerKeyPage,
  pullAuthFromBrowserEnvironment,
  saveAuthCredentials,
} from '../services/authStore';

export interface AuthModalProps {
  isOpen: boolean;
  credentials: AuthCredentials | null;
  onSave: (creds: AuthCredentials) => void;
  onPullFromBrowser: () => Promise<void>;
  onClose: () => void;
}

export function AuthModal(props: AuthModalProps): React.ReactElement | null {
  const { isOpen, credentials, onSave, onPullFromBrowser, onClose } = props;

  const [userApiKey, setUserApiKey] = useState<string>(
    credentials?.userApiKey ?? '',
  );
  const [appApiKey, setAppApiKey] = useState<string>(
    credentials?.appApiKey ?? DEFAULT_APP_KEY,
  );
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [errorNote, setErrorNote] = useState<string | null>(null);
  const [isPulling, setIsPulling] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setUserApiKey(credentials?.userApiKey ?? '');
      setAppApiKey(credentials?.appApiKey ?? DEFAULT_APP_KEY);
      setStatusNote(null);
      setErrorNote(null);
    }
  }, [isOpen, credentials]);

  if (!isOpen) {
    return null;
  }

  const handleUserKeyInputChange = (rawInput: string) => {
    setErrorNote(null);
    const extracted = extractKeysFromText(rawInput);
    if (extracted.userApiKey && rawInput.trim() !== extracted.userApiKey) {
      setUserApiKey(extracted.userApiKey);
      if (extracted.appApiKey) {
        setAppApiKey(extracted.appApiKey);
      }
      setStatusNote('Auto-extracted ARC Tracker key from pasted text/URL.');
      return;
    }
    setUserApiKey(rawInput);
  };

  const handleSaveManual = (event: React.FormEvent) => {
    event.preventDefault();
    setErrorNote(null);

    const extracted = extractKeysFromText(`${userApiKey} ${appApiKey}`);
    const resolvedUserKey = (extracted.userApiKey ?? userApiKey).trim();
    const resolvedAppKey = (extracted.appApiKey ?? appApiKey).trim() || DEFAULT_APP_KEY;

    if (!resolvedUserKey.startsWith('arc_u1_')) {
      setErrorNote(
        'Personal API Key must start with "arc_u1_" (or click "Use Demo Raider Profile").',
      );
      return;
    }

    const saved = saveAuthCredentials({
      userApiKey: resolvedUserKey,
      appApiKey: resolvedAppKey,
      savedAt: new Date().toISOString(),
      source:
        resolvedUserKey === DEMO_USER_API_KEY
          ? 'demo'
          : 'manual',
    });

    onSave(saved);
    onClose();
  };

  const handleOpenAndPull = async () => {
    setErrorNote(null);
    setStatusNote('Opened arctracker.io/settings — checking browser & clipboard for your key...');
    openArcTrackerKeyPage();
    setIsPulling(true);
    try {
      await onPullFromBrowser();
      const pulled = await pullAuthFromBrowserEnvironment();
      if (pulled) {
        setUserApiKey(pulled.userApiKey);
        setAppApiKey(pulled.appApiKey);
        onSave(pulled);
        setStatusNote(`Pulled key (${pulled.source}) and persisted to LocalStorage + 365-day Cookie.`);
      }
    } finally {
      setIsPulling(false);
    }
  };

  const handlePullFromClipboardOrUrl = async () => {
    setErrorNote(null);
    setIsPulling(true);
    try {
      await onPullFromBrowser();
      const pulled = await pullAuthFromBrowserEnvironment();
      if (pulled) {
        setUserApiKey(pulled.userApiKey);
        setAppApiKey(pulled.appApiKey);
        onSave(pulled);
        setStatusNote(`Key detected via ${pulled.source} and saved!`);
      } else {
        setStatusNote(
          'No arc_u1_ key found in URL or clipboard yet. Copy your key on arctracker.io/settings or paste it below.',
        );
      }
    } finally {
      setIsPulling(false);
    }
  };

  const handleUseDemoProfile = () => {
    setErrorNote(null);
    const demoCreds = saveAuthCredentials({
      userApiKey: DEMO_USER_API_KEY,
      appApiKey: appApiKey.trim() || DEFAULT_APP_KEY,
      savedAt: new Date().toISOString(),
      source: 'demo',
    });
    setUserApiKey(demoCreds.userApiKey);
    setAppApiKey(demoCreds.appApiKey);
    onSave(demoCreds);
    onClose();
  };

  const handleClearCredentials = () => {
    clearAuthCredentials();
    setUserApiKey('');
    setAppApiKey(DEFAULT_APP_KEY);
    setStatusNote('Cleared LocalStorage and Cookie backup.');
  };

  return (
    <div
      className="auth-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(8, 11, 18, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="auth-modal-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#121824',
          border: '1px solid #28354a',
          borderRadius: '14px',
          padding: '20px',
          color: '#f1f5f9',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.65)',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <h2
            id="auth-modal-title"
            style={{
              margin: 0,
              fontSize: '1.15rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            ARC Tracker Sync &amp; Raider Auth
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            style={{
              background: 'transparent',
              border: '1px solid #334155',
              color: '#cbd5e1',
              borderRadius: '8px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Close
          </button>
        </div>

        {/* Persistence status banner */}
        <div
          className="auth-persistence-banner"
          style={{
            backgroundColor: '#0f2922',
            border: '1px solid #10b981',
            borderRadius: '10px',
            padding: '10px 12px',
            marginBottom: '14px',
            fontSize: '0.8rem',
            lineHeight: 1.4,
            color: '#d1fae5',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '2px' }}>
            Dual Persistence Active: LocalStorage + 365-Day Cookie Backup
          </div>
          <div>
            Keys are saved in <code>{AUTH_STORAGE_KEY}</code> (LocalStorage) and{' '}
            <code>{AUTH_COOKIE_NAME}</code> (365-day Cookie backup) so your login
            auto-restores if either store is cleared.
          </div>
          {credentials && (
            <div style={{ marginTop: '6px', color: '#6ee7b7', fontWeight: 600 }}>
              Active source: {credentials.source} &bull; Key:{' '}
              {credentials.userApiKey.slice(0, 12)}&hellip;
            </div>
          )}
        </div>

        {/* One-tap browser pull actions */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          <button
            type="button"
            onClick={handleOpenAndPull}
            disabled={isPulling}
            style={{
              width: '100%',
              padding: '11px 14px',
              borderRadius: '10px',
              border: '1px solid #38bdf8',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Open ARC Tracker &amp; Pull Key from Browser
          </button>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handlePullFromClipboardOrUrl}
              disabled={isPulling}
              style={{
                flex: '1 1 180px',
                padding: '9px 12px',
                borderRadius: '10px',
                border: '1px solid #475569',
                backgroundColor: '#1e293b',
                color: '#e2e8f0',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Pull from Clipboard / URL
            </button>

            <button
              type="button"
              onClick={handleUseDemoProfile}
              style={{
                flex: '1 1 180px',
                padding: '9px 12px',
                borderRadius: '10px',
                border: '1px solid #f59e0b',
                backgroundColor: '#451a03',
                color: '#fde68a',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Use Demo Raider Profile
            </button>
          </div>
        </div>

        {/* Manual / Paste form */}
        <form onSubmit={handleSaveManual}>
          <div style={{ marginBottom: '12px' }}>
            <label
              htmlFor="arc-user-api-key"
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: '4px',
                color: '#cbd5e1',
              }}
            >
              Personal API Key (<code>arc_u1_...</code>) or Paste Full Link / JSON
            </label>
            <input
              id="arc-user-api-key"
              type="text"
              value={userApiKey}
              onChange={(e) => handleUserKeyInputChange(e.target.value)}
              placeholder="arc_u1_your_personal_raider_key"
              autoComplete="off"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#090d16',
                color: '#f8fafc',
                fontSize: '0.9rem',
                fontFamily: 'monospace',
              }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label
              htmlFor="arc-app-api-key"
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: '4px',
                color: '#cbd5e1',
              }}
            >
              App API Key (optional, defaults to <code>{DEFAULT_APP_KEY}</code>)
            </label>
            <input
              id="arc-app-api-key"
              type="text"
              value={appApiKey}
              onChange={(e) => setAppApiKey(e.target.value)}
              placeholder={DEFAULT_APP_KEY}
              autoComplete="off"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#090d16',
                color: '#f8fafc',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
              }}
            />
          </div>

          {statusNote && (
            <div
              role="status"
              style={{
                marginBottom: '12px',
                padding: '8px 10px',
                borderRadius: '8px',
                backgroundColor: '#1e293b',
                color: '#38bdf8',
                fontSize: '0.8rem',
              }}
            >
              {statusNote}
            </div>
          )}

          {errorNote && (
            <div
              role="alert"
              style={{
                marginBottom: '12px',
                padding: '8px 10px',
                borderRadius: '8px',
                backgroundColor: '#450a0a',
                border: '1px solid #ef4444',
                color: '#fecaca',
                fontSize: '0.8rem',
              }}
            >
              {errorNote}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '11px 16px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#10b981',
                color: '#052e16',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Save &amp; Persist Key
            </button>

            {credentials && (
              <button
                type="button"
                onClick={handleClearCredentials}
                style={{
                  padding: '11px 12px',
                  borderRadius: '10px',
                  border: '1px solid #475569',
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
