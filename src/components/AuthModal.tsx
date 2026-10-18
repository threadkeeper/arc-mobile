import React, { useEffect, useState } from 'react';
import type { AuthCredentials, PlayerProgressState } from '../shared/types';
import {
  AUTH_COOKIE_NAME,
  AUTH_STORAGE_KEY,
  DEFAULT_APP_KEY,
  DEMO_USER_API_KEY,
  clearAuthCredentials,
  exportAuthCredentialsBackup,
  extractKeysFromText,
  importAuthCredentialsBackup,
  openArcTrackerKeyPage,
  openEmbarkPlayStationAuthPage,
  openSonyPsnPage,
  pullAuthFromBrowserEnvironment,
  saveAuthCredentials,
  startArcTrackerOAuthLogin,
} from '../services/authStore';
import {
  connectEmbarkPlayStationSession,
  connectSonyPsnNpssoBridge,
  createDemoPlayerProgressState,
  syncConsoleStateWithFoundryAi,
} from '../services/arcTrackerClient';

export interface AuthModalProps {
  isOpen: boolean;
  credentials: AuthCredentials | null;
  playerState?: PlayerProgressState;
  onSave: (creds: AuthCredentials) => void;
  onPlayerStateUpdated?: (
    nextState: PlayerProgressState,
    creds?: AuthCredentials,
  ) => void;
  onPullFromBrowser: () => Promise<void>;
  onClose: () => void;
}

async function compressImageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const rawDataUrl = String(reader.result || '');
      if (typeof Image === 'undefined' || typeof document === 'undefined') {
        resolve(rawDataUrl);
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(rawDataUrl);
      img.onload = () => {
        const maxDim = 1280;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function AuthModal(props: AuthModalProps): React.ReactElement | null {
  const {
    isOpen,
    credentials,
    playerState,
    onSave,
    onPlayerStateUpdated,
    onPullFromBrowser,
    onClose,
  } = props;

  const [userApiKey, setUserApiKey] = useState<string>(
    credentials?.userApiKey ?? '',
  );
  const [appApiKey, setAppApiKey] = useState<string>(
    credentials?.appApiKey ?? DEFAULT_APP_KEY,
  );
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [errorNote, setErrorNote] = useState<string | null>(null);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [backupJsonText, setBackupJsonText] = useState<string>('');
  const [showBackupPanel, setShowBackupPanel] = useState<boolean>(false);

  // PlayStation 5 & Console Hub states
  const [embarkSessionInput, setEmbarkSessionInput] = useState<string>('');
  const [psnNpssoInput, setPsnNpssoInput] = useState<string>('');
  const [consoleTranscript, setConsoleTranscript] = useState<string>('');
  const [isConsoleSyncing, setIsConsoleSyncing] = useState<boolean>(false);
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);

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

  const handleExportBackupJson = async () => {
    setErrorNote(null);
    const json = exportAuthCredentialsBackup(
      userApiKey.trim().startsWith('arc_u1_')
        ? {
            userApiKey: userApiKey.trim(),
            appApiKey: appApiKey.trim() || DEFAULT_APP_KEY,
            savedAt: credentials?.savedAt ?? new Date().toISOString(),
            source: credentials?.source ?? 'manual',
          }
        : credentials,
    );
    setBackupJsonText(json);
    setShowBackupPanel(true);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json);
        setStatusNote('Exported JSON token backup and copied to clipboard.');
        return;
      }
    } catch {
      // Clipboard write unavailable
    }
    setStatusNote('Generated JSON token backup below.');
  };

  const handleImportBackupJson = () => {
    setErrorNote(null);
    const imported = importAuthCredentialsBackup(backupJsonText);
    if (!imported) {
      setErrorNote('Could not find a valid "arc_u1_..." token in the backup JSON.');
      return;
    }
    setUserApiKey(imported.userApiKey);
    setAppApiKey(imported.appApiKey);
    onSave(imported);
    setStatusNote('Imported and persisted token backup to LocalStorage + 365-day Cookie!');
  };

  const handleConnectEmbarkPsnSession = async () => {
    setErrorNote(null);
    setStatusNote('Resolving Embark ID & PlayStation Network link via id.embark.games...');
    setIsConsoleSyncing(true);
    try {
      const result = await connectEmbarkPlayStationSession(
        embarkSessionInput,
        playerState,
      );
      if (!result.ok || !result.credentials || !result.playerState) {
        setErrorNote(result.error || 'Could not verify Embark PlayStation session.');
        return;
      }
      onSave(result.credentials);
      onPlayerStateUpdated?.(result.playerState, result.credentials);
      setStatusNote(
        `Connected Embark ID ${result.embarkId || ''}${
          result.psnOnlineId ? ` • PSN: ${result.psnOnlineId}` : ''
        }!`,
      );
    } finally {
      setIsConsoleSyncing(false);
    }
  };

  const handleConnectPsnNpsso = async () => {
    setErrorNote(null);
    setStatusNote(
      'Running Sony PSN Mobile OAuth + Embark PlayStation Federated Handshake...',
    );
    setIsConsoleSyncing(true);
    try {
      const result = await connectSonyPsnNpssoBridge(psnNpssoInput, playerState);
      if (!result.ok || !result.credentials || !result.playerState) {
        setErrorNote(result.error || 'Could not verify PlayStation NPSSO token.');
        return;
      }
      onSave(result.credentials);
      onPlayerStateUpdated?.(result.playerState, result.credentials);
      setStatusNote(
        `PlayStation Verified! PSN: ${result.psnOnlineId || 'Connected'}${
          result.embarkId ? ` • Embark ID: ${result.embarkId}` : ''
        }`,
      );
    } finally {
      setIsConsoleSyncing(false);
    }
  };

  const handleConsoleImageSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setErrorNote(null);
    setStatusNote(
      'Scanning PS5 TV photo / PS App screenshot with Azure AI Foundry (gpt-6-astra Vision)...',
    );
    setIsConsoleSyncing(true);
    try {
      const imageDataUrl = await compressImageFileToDataUrl(file);
      const baseState = playerState ?? createDemoPlayerProgressState();
      const result = await syncConsoleStateWithFoundryAi({
        imageDataUrl,
        transcript: consoleTranscript,
        currentState: baseState,
      });
      if (!result.ok) {
        setErrorNote(result.error || 'Vision sync failed.');
        return;
      }
      if (result.credentials) {
        onSave(result.credentials);
      }
      onPlayerStateUpdated?.(result.updatedState, result.credentials);
      setStatusNote(`PS5 Vision Sync Complete: ${result.summary}`);
    } catch (err) {
      setErrorNote(
        err instanceof Error ? err.message : 'Failed to process PS5 screenshot.',
      );
    } finally {
      setIsConsoleSyncing(false);
      event.target.value = '';
    }
  };

  const handleConsoleVoiceOrTextSync = async () => {
    if (!consoleTranscript.trim()) {
      setErrorNote(
        'Speak or type what you extracted or upgraded on PS5 (e.g., "Extracted with 2 Bombardier Cells and upgraded Gunsmith to L2").',
      );
      return;
    }
    setErrorNote(null);
    setStatusNote(
      'Updating PS5 Stash, Loadout & Workshop with Azure AI Foundry (gpt-6-astra)...',
    );
    setIsConsoleSyncing(true);
    try {
      const baseState = playerState ?? createDemoPlayerProgressState();
      const result = await syncConsoleStateWithFoundryAi({
        transcript: consoleTranscript,
        currentState: baseState,
      });
      if (!result.ok) {
        setErrorNote(result.error || 'PS5 AI Quick Sync failed.');
        return;
      }
      if (result.credentials) {
        onSave(result.credentials);
      }
      onPlayerStateUpdated?.(result.updatedState, result.credentials);
      setStatusNote(`PS5 AI Sync Complete: ${result.summary}`);
    } finally {
      setIsConsoleSyncing(false);
    }
  };

  const handleToggleVoiceDictation = () => {
    const SpeechRec =
      typeof window !== 'undefined'
        ? (window as unknown as Record<string, unknown>).SpeechRecognition ||
          (window as unknown as Record<string, unknown>).webkitSpeechRecognition
        : null;
    if (!SpeechRec || typeof SpeechRec !== 'function') {
      setErrorNote(
        'Use your mobile keyboard microphone button or type your PS5 raid update below.',
      );
      return;
    }
    try {
      const recognition = new (SpeechRec as new () => {
        lang: string;
        interimResults: boolean;
        onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
      })();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      setIsListeningMic(true);
      recognition.onresult = (e) => {
        const spoken = e.results?.[0]?.[0]?.transcript || '';
        if (spoken) {
          setConsoleTranscript((prev) => (prev ? `${prev} ${spoken}` : spoken));
        }
      };
      recognition.onerror = () => setIsListeningMic(false);
      recognition.onend = () => setIsListeningMic(false);
      recognition.start();
    } catch {
      setIsListeningMic(false);
    }
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
            onClick={() => startArcTrackerOAuthLogin()}
            style={{
              width: '100%',
              padding: '11px 14px',
              borderRadius: '10px',
              border: '1px solid #a855f7',
              background: 'linear-gradient(135deg, #6b21a8 0%, #3b0764 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            1-Click OAuth2 Sign In with ARC Tracker (No Key Copy Needed)
          </button>

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

        {/* PlayStation 5 & Console Raider Hub */}
        <div
          data-testid="ps5-console-hub"
          style={{
            backgroundColor: '#0b1528',
            border: '1px solid #2563eb',
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}
          >
            <span
              style={{
                fontSize: '0.88rem',
                fontWeight: 800,
                color: '#60a5fa',
                letterSpacing: '0.02em',
              }}
            >
              PlayStation 5 &amp; Console Raider Hub (No PC Required)
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                padding: '2px 7px',
                borderRadius: '999px',
                backgroundColor: '#1d4ed8',
                color: '#eff6ff',
                fontWeight: 700,
              }}
            >
              PSN + GPT-6-Astra Vision
            </span>
          </div>
          <p
            style={{
              margin: '0 0 10px 0',
              fontSize: '0.76rem',
              color: '#94a3b8',
              lineHeight: 1.35,
            }}
          >
            Playing on PS5? Authenticate your Embark ID via PlayStation Network, or
            snap a photo of your TV / PS App screenshot to sync your Stash, Loadout &amp;
            Workshop directly with Azure AI Foundry.
          </p>

          {/* Method A: Embark ID PlayStation Login + Session Pull */}
          <div
            style={{
              backgroundColor: '#090d16',
              border: '1px solid #1e3a8a',
              borderRadius: '8px',
              padding: '9px',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#bfdbfe',
                marginBottom: '6px',
              }}
            >
              A. Embark ID PlayStation Network Sign-In (id.embark.games)
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <button
                type="button"
                onClick={() => openEmbarkPlayStationAuthPage('login-psn')}
                style={{
                  flex: '1 1 140px',
                  padding: '7px 9px',
                  borderRadius: '7px',
                  border: '1px solid #3b82f6',
                  backgroundColor: '#1d4ed8',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                1. Login with PlayStation
              </button>
              <button
                type="button"
                onClick={() => openEmbarkPlayStationAuthPage('session-json')}
                style={{
                  flex: '1 1 140px',
                  padding: '7px 9px',
                  borderRadius: '7px',
                  border: '1px solid #475569',
                  backgroundColor: '#1e293b',
                  color: '#e2e8f0',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                2. Open Session Token
              </button>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                aria-label="Embark PlayStation session JSON or JWT"
                value={embarkSessionInput}
                onChange={(e) => setEmbarkSessionInput(e.target.value)}
                placeholder='Paste {"accessToken":"eyJ..."} from step 2'
                style={{
                  flex: 1,
                  padding: '7px 9px',
                  borderRadius: '7px',
                  border: '1px solid #334155',
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                }}
              />
              <button
                type="button"
                disabled={isConsoleSyncing}
                onClick={() => void handleConnectEmbarkPsnSession()}
                style={{
                  padding: '7px 10px',
                  borderRadius: '7px',
                  border: '1px solid #38bdf8',
                  backgroundColor: '#0369a1',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Link Embark
              </button>
            </div>
          </div>

          {/* Method B: Direct Sony PSN NPSSO Handshake */}
          <div
            style={{
              backgroundColor: '#090d16',
              border: '1px solid #1e3a8a',
              borderRadius: '8px',
              padding: '9px',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#bfdbfe',
                marginBottom: '6px',
              }}
            >
              B. Direct Sony PSN NPSSO Handshake (ca.account.sony.com)
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <button
                type="button"
                onClick={() => openSonyPsnPage('playstation-login')}
                style={{
                  flex: '1 1 130px',
                  padding: '6px 8px',
                  borderRadius: '7px',
                  border: '1px solid #475569',
                  backgroundColor: '#1e293b',
                  color: '#e2e8f0',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                1. Login PlayStation.com
              </button>
              <button
                type="button"
                onClick={() => openSonyPsnPage('ssocookie')}
                style={{
                  flex: '1 1 130px',
                  padding: '6px 8px',
                  borderRadius: '7px',
                  border: '1px solid #475569',
                  backgroundColor: '#1e293b',
                  color: '#e2e8f0',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                2. Copy Sony NPSSO JSON
              </button>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                aria-label="Sony PSN NPSSO token"
                value={psnNpssoInput}
                onChange={(e) => setPsnNpssoInput(e.target.value)}
                placeholder='Paste {"npsso":"64-char-token"}'
                style={{
                  flex: 1,
                  padding: '7px 9px',
                  borderRadius: '7px',
                  border: '1px solid #334155',
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                }}
              />
              <button
                type="button"
                disabled={isConsoleSyncing}
                onClick={() => void handleConnectPsnNpsso()}
                style={{
                  padding: '7px 10px',
                  borderRadius: '7px',
                  border: '1px solid #3b82f6',
                  backgroundColor: '#1d4ed8',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Sync PSN
              </button>
            </div>
          </div>

          {/* Method C: PS5 TV Camera / PS App Screenshot + Voice AI Sync */}
          <div
            style={{
              backgroundColor: '#090d16',
              border: '1px solid #10b981',
              borderRadius: '8px',
              padding: '9px',
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#6ee7b7',
                marginBottom: '6px',
              }}
            >
              C. PS5 TV Camera / PS App Screenshot &amp; Voice AI Sync
            </div>
            <label
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '9px 10px',
                borderRadius: '8px',
                border: '1px dashed #10b981',
                backgroundColor: '#064e3b',
                color: '#ecfdf5',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: '8px',
              }}
            >
              Snap PS5 TV Photo or Upload PS App Screenshot
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void handleConsoleImageSelected(e)}
                style={{ display: 'none' }}
              />
            </label>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
              <input
                type="text"
                aria-label="PS5 voice or text raid update"
                value={consoleTranscript}
                onChange={(e) => setConsoleTranscript(e.target.value)}
                placeholder='Or tell AI: "PS5: have 3 Leaper Pulse Units, Gunsmith L2..."'
                style={{
                  flex: 1,
                  padding: '7px 9px',
                  borderRadius: '7px',
                  border: '1px solid #334155',
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  fontSize: '0.75rem',
                }}
              />
              <button
                type="button"
                onClick={handleToggleVoiceDictation}
                style={{
                  padding: '7px 9px',
                  borderRadius: '7px',
                  border: '1px solid #475569',
                  backgroundColor: isListeningMic ? '#dc2626' : '#1e293b',
                  color: '#f8fafc',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isListeningMic ? 'Listening...' : 'Mic'}
              </button>
            </div>

            <button
              type="button"
              disabled={isConsoleSyncing}
              onClick={() => void handleConsoleVoiceOrTextSync()}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '7px',
                border: 'none',
                backgroundColor: '#10b981',
                color: '#052e16',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {isConsoleSyncing
                ? 'Syncing with Azure AI Foundry (gpt-6-astra)...'
                : 'AI Sync PS5 Stash, Loadout & Workshop'}
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

        {/* JSON Token Backup Export / Import */}
        <div
          style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #1e293b',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleExportBackupJson}
              style={{
                flex: '1 1 160px',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#0f172a',
                color: '#cbd5e1',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Export JSON Token Backup
            </button>
            <button
              type="button"
              onClick={() => setShowBackupPanel((prev) => !prev)}
              style={{
                flex: '1 1 160px',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#0f172a',
                color: '#cbd5e1',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {showBackupPanel ? 'Hide JSON Backup' : 'Import JSON Token Backup'}
            </button>
          </div>

          {showBackupPanel && (
            <div style={{ marginTop: '10px' }}>
              <textarea
                aria-label="JSON token backup"
                value={backupJsonText}
                onChange={(e) => setBackupJsonText(e.target.value)}
                rows={4}
                placeholder='{"userApiKey":"arc_u1_...","appApiKey":"arc_k1_..."}'
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  backgroundColor: '#090d16',
                  color: '#f8fafc',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                  marginBottom: '8px',
                }}
              />
              <button
                type="button"
                onClick={handleImportBackupJson}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #38bdf8',
                  backgroundColor: '#0369a1',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Restore from JSON Backup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
