import React, { useCallback, useEffect, useState } from 'react';
import {
  loadAuthCredentials,
  saveAuthCredentials,
  pullAuthFromBrowserEnvironment,
} from './services/authStore';
import {
  syncPlayerState,
  fetchLiveMapConditions,
} from './services/arcTrackerClient';
import {
  runAutonomousFoundryAgent,
  DEFAULT_FOUNDRY_MODEL,
  DEFAULT_FOUNDRY_ENDPOINT,
} from './services/foundryAgent';
import {
  DEMO_PLAYER_STATE,
  DEFAULT_LIVE_MAP_CONDITIONS,
} from './data/gameCatalog';
import { buildTab1PrepPlan } from './engine/prepIntelligence';
import { buildTab2RaidPlan } from './engine/raidPlanner';
import { buildTab3InventorySmashPlan } from './engine/inventorySmash';
import { AuthModal } from './components/AuthModal';
import { Tab1PrepView } from './components/Tab1PrepView';
import { Tab2RaidIdeasView } from './components/Tab2RaidIdeasView';
import { Tab3InventorySmashView } from './components/Tab3InventorySmashView';
import type {
  AuthCredentials,
  FoundryAutonomousPlan,
  LiveMapCondition,
  PlayerProgressState,
} from './shared/types';

export type ActiveTabId = 'tab1-prep' | 'tab2-raids' | 'tab3-smash';

function createInitialSynchronousPlan(
  player: PlayerProgressState,
  conditions: LiveMapCondition[],
): FoundryAutonomousPlan {
  const tab1Prep = buildTab1PrepPlan(player);
  const tab3InventorySmash = buildTab3InventorySmashPlan(player);
  const tab2Raids = buildTab2RaidPlan(
    player,
    conditions,
    tab3InventorySmash.missingRequiredItems,
  );

  return {
    generatedAt: player.syncedAt,
    modelUsed: `${DEFAULT_FOUNDRY_MODEL} (deterministic-ready)`,
    foundryEndpoint: DEFAULT_FOUNDRY_ENDPOINT,
    usedLiveWebSearch: false,
    webSearchCitations: [],
    tab1Prep,
    tab2Raids,
    tab3InventorySmash,
  };
}

export function App(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<ActiveTabId>('tab1-prep');
  const [credentials, setCredentials] = useState<AuthCredentials | null>(() =>
    loadAuthCredentials(),
  );
  const [playerState, setPlayerState] =
    useState<PlayerProgressState>(DEMO_PLAYER_STATE);
  const [foundryPlan, setFoundryPlan] = useState<FoundryAutonomousPlan>(() =>
    createInitialSynchronousPlan(
      DEMO_PLAYER_STATE,
      DEFAULT_LIVE_MAP_CONDITIONS,
    ),
  );
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isRunningAgent, setIsRunningAgent] = useState<boolean>(false);

  const executeSyncAndFoundryLoop = useCallback(
    async (
      overrideCreds?: AuthCredentials | null,
      isMounted: () => boolean = () => true,
    ) => {
      if (isMounted()) {
        setIsRunningAgent(true);
      }
      try {
        const activeCreds =
          overrideCreds !== undefined ? overrideCreds : loadAuthCredentials();
        const [syncedPlayer, liveConditions] = await Promise.all([
          syncPlayerState(activeCreds),
          fetchLiveMapConditions(),
        ]);

        if (!isMounted()) return;
        setPlayerState(syncedPlayer);

        const autonomousPlan = await runAutonomousFoundryAgent(
          syncedPlayer,
          liveConditions,
        );
        if (!isMounted()) return;
        setFoundryPlan(autonomousPlan);
      } catch {
        // Fallback to deterministic local plan if network/proxy fails
      } finally {
        if (isMounted()) {
          setIsRunningAgent(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      void (async () => {
        let currentCreds = loadAuthCredentials();
        if (!currentCreds) {
          const pulled = await pullAuthFromBrowserEnvironment();
          if (pulled && mounted) {
            currentCreds = pulled;
            setCredentials(pulled);
          }
        }
        if (mounted) {
          await executeSyncAndFoundryLoop(currentCreds, () => mounted);
        }
      })();
    }, 0);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [executeSyncAndFoundryLoop]);

  const handleSaveCredentials = (newCreds: AuthCredentials) => {
    const saved = saveAuthCredentials(newCreds);
    setCredentials(saved);
    void executeSyncAndFoundryLoop(saved);
  };

  const handlePullFromBrowser = async () => {
    const pulled = await pullAuthFromBrowserEnvironment();
    if (pulled) {
      setCredentials(pulled);
      await executeSyncAndFoundryLoop(pulled);
    }
  };

  return (
    <div className="app-mobile-frame" data-testid="arc-mobile-app">
      {/* Sticky Mobile-First Header */}
      <header className="app-header">
        <div className="header-top-row">
          <div>
            <h1 className="brand-title">ARC Mobile Companion</h1>
            <p className="brand-subtitle">
              Azure AI Foundry ({foundryPlan.modelUsed})
              {foundryPlan.usedLiveWebSearch ? ' • Live Web Search' : ''}
            </p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="btn-tactical btn-tactical-primary"
              onClick={() => void executeSyncAndFoundryLoop(credentials)}
              disabled={isRunningAgent}
            >
              Run Foundry Agent
            </button>
            <button
              type="button"
              className="btn-tactical"
              onClick={() => setIsAuthModalOpen(true)}
            >
              Auth / Pull Key
            </button>
          </div>
        </div>

        <div className="player-telemetry-strip">
          <span className="telemetry-stat">
            Raider: <strong>{playerState.username}</strong> (Lv.{playerState.level})
          </span>
          <span className="telemetry-stat">
            Coins: <strong>{playerState.raiderCoins.toLocaleString()}</strong>
          </span>
          <span className="telemetry-stat">
            Stash:{' '}
            <strong>
              {playerState.stash.length}/{playerState.stashCapacity}
            </strong>
          </span>
          <span className="telemetry-stat">
            Auth:{' '}
            <strong>
              {credentials ? credentials.source.toUpperCase() : 'DEMO'}
            </strong>
          </span>
        </div>
      </header>

      {/* Top Quick Tab Switcher Pills */}
      <nav className="top-tab-bar" aria-label="Primary Intelligence Tabs">
        <button
          type="button"
          className={`tab-pill-btn ${activeTab === 'tab1-prep' ? 'active' : ''}`}
          aria-pressed={activeTab === 'tab1-prep'}
          onClick={() => setActiveTab('tab1-prep')}
        >
          Tab 1: Prep (5 Raids)
        </button>
        <button
          type="button"
          className={`tab-pill-btn ${activeTab === 'tab2-raids' ? 'active' : ''}`}
          aria-pressed={activeTab === 'tab2-raids'}
          onClick={() => setActiveTab('tab2-raids')}
        >
          Tab 2: Top 3 Raid Ideas
        </button>
        <button
          type="button"
          className={`tab-pill-btn ${activeTab === 'tab3-smash' ? 'active' : ''}`}
          aria-pressed={activeTab === 'tab3-smash'}
          onClick={() => setActiveTab('tab3-smash')}
        >
          Tab 3: Inventory Smash
        </button>
      </nav>

      {/* Active Tab View */}
      <main className="app-main-content">
        {activeTab === 'tab1-prep' && (
          <Tab1PrepView plan={foundryPlan.tab1Prep} />
        )}
        {activeTab === 'tab2-raids' && (
          <Tab2RaidIdeasView plan={foundryPlan.tab2Raids} />
        )}
        {activeTab === 'tab3-smash' && (
          <Tab3InventorySmashView plan={foundryPlan.tab3InventorySmash} />
        )}
      </main>

      {/* Sticky Bottom Mobile Navigation Bar */}
      <nav className="bottom-mobile-nav" aria-label="Bottom Mobile Navigation">
        <button
          type="button"
          className={`bottom-nav-btn ${activeTab === 'tab1-prep' ? 'active' : ''}`}
          onClick={() => setActiveTab('tab1-prep')}
        >
          1. Prep Kits
        </button>
        <button
          type="button"
          className={`bottom-nav-btn ${activeTab === 'tab2-raids' ? 'active' : ''}`}
          onClick={() => setActiveTab('tab2-raids')}
        >
          2. Raid Ideas
        </button>
        <button
          type="button"
          className={`bottom-nav-btn ${activeTab === 'tab3-smash' ? 'active' : ''}`}
          onClick={() => setActiveTab('tab3-smash')}
        >
          3. Inv Smash
        </button>
      </nav>

      {/* Persistent Player Auth & Browser Key Pull Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        credentials={credentials}
        onSave={handleSaveCredentials}
        onPullFromBrowser={handlePullFromBrowser}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export default App;
