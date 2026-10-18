import React from 'react';
import type { Tab1PrepPlan, PrepActionKind } from '../shared/types';

export interface Tab1PrepViewProps {
  plan: Tab1PrepPlan;
}

function getActionBadgeClass(kind: PrepActionKind): string {
  switch (kind) {
    case 'RECYCLE':
      return 'action-badge action-badge-recycle';
    case 'REFINE':
      return 'action-badge action-badge-refine';
    case 'CRAFT':
      return 'action-badge action-badge-craft';
  }
}

export function Tab1PrepView({ plan }: Tab1PrepViewProps): React.ReactElement {
  const {
    readiness,
    protectedRareAndUpgradeItems,
    recycleRefineCraftQueue,
    sellImmediatelyList,
    totalProjectedCoinsFromSales,
    totalStashSlotsFreed,
    agentTacticalSummary,
  } = plan;

  const targetRaids = readiness.targetRaids || 5;
  const readinessPct = Math.min(
    100,
    Math.round((readiness.overallReadyRaids / targetRaids) * 100),
  );

  const readinessCells = [
    {
      label: 'Primary Weapons',
      current: readiness.primaryWeaponsReady,
      target: 5,
    },
    {
      label: 'Secondary Weapons',
      current: readiness.secondaryWeaponsReady,
      target: 5,
    },
    {
      label: 'Shields',
      current: readiness.shieldsReady,
      target: 5,
    },
    {
      label: 'Augments',
      current: readiness.augmentsReady,
      target: 5,
    },
    {
      label: 'Healing Kits',
      current: readiness.healingStacksReady,
      target: 15,
    },
    {
      label: 'Ammo Stacks',
      current: readiness.ammoStacksReady,
      target: 5,
    },
  ];

  return (
    <div className="tab-view tab1-prep-view" data-testid="tab1-prep-view">
      {/* Foundry Agent Prep Summary Banner */}
      <section className="agent-banner" aria-label="Foundry Agent Prep Summary">
        <div className="agent-banner-header">
          <span className="agent-pulse-dot" />
          <span className="agent-banner-label">Foundry Agent Prep Summary</span>
        </div>
        <p className="agent-banner-text">{agentTacticalSummary}</p>
      </section>

      {/* 5-Raid Loadout Readiness Bar & Grid */}
      <section className="tactical-card" aria-label="5-Raid Loadout Readiness">
        <div className="section-header-row">
          <h2 className="section-title">5-Raid Loadout Readiness</h2>
          <span className="readiness-pill" data-testid="overall-ready-raids">
            {readiness.overallReadyRaids} / 5 Raids Ready
          </span>
        </div>

        <div className="progress-track" role="progressbar" aria-valuenow={readinessPct} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="progress-fill"
            style={{ width: `${readinessPct}%` }}
          />
        </div>

        <div className="readiness-grid">
          {readinessCells.map((cell) => {
            const isComplete = cell.current >= cell.target;
            return (
              <div
                key={cell.label}
                className={`readiness-cell ${isComplete ? 'readiness-cell-ready' : 'readiness-cell-short'}`}
              >
                <span className="readiness-cell-label">{cell.label}</span>
                <span className="readiness-cell-value">
                  {cell.current}/{cell.target}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Rule 1b — Action Queue: Recycle, Refine & Craft for 5 Raids */}
      <section className="tactical-card" aria-label="Action Queue: Recycle, Refine & Craft">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">Action Queue: Recycle, Refine &amp; Craft for 5 Raids</h2>
            <p className="section-subtitle">
              Rule 1b — Free stash space &amp; build missing 5-raid loadout kits
            </p>
          </div>
          <span className="slots-freed-total-badge" data-testid="total-slots-freed">
            +{totalStashSlotsFreed} Stash Slots Freed
          </span>
        </div>

        {recycleRefineCraftQueue.length === 0 ? (
          <p className="empty-hint">All 5-raid kits and stash stacks are fully optimized.</p>
        ) : (
          <div className="action-queue-list">
            {recycleRefineCraftQueue.map((action) => (
              <article key={action.id} className="action-queue-card" data-testid="prep-action-card">
                <div className="action-queue-top">
                  <div className="action-badge-group">
                    <span className="step-order-chip">#{action.stepOrder}</span>
                    <span className={getActionBadgeClass(action.kind)}>{action.kind}</span>
                    <strong className="action-title">{action.title}</strong>
                  </div>
                  <span className="slots-freed-chip">
                    +{action.slotsFreed} Stash Slots Freed
                  </span>
                </div>

                <div className="action-io-flow">
                  <span className="io-input">
                    {action.sourceQuantity}x {action.sourceItemName}
                  </span>
                  <span className="io-arrow" aria-hidden="true">
                    -&gt;
                  </span>
                  <span className="io-output">
                    {action.outputs
                      .map((out) => `${out.quantity}x ${out.itemName}`)
                      .join(', ')}
                  </span>
                </div>

                <p className="action-reason">{action.reason}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Rule 1a — Protected Rare & Future Upgrade Lock-List */}
      <section className="tactical-card protected-card" aria-label="Rule 1a Protected Rare and Future Upgrade Lock-List">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">Rule 1a — Protected Rare &amp; Future Upgrade Lock-List</h2>
            <p className="section-subtitle">
              Locked for uncompleted Hideout upgrades, Expedition stages, and Quests
            </p>
          </div>
          <span className="lock-warning-badge" data-testid="do-not-consume-badge">
            DO NOT CONSUME / DO NOT RECYCLE
          </span>
        </div>

        {protectedRareAndUpgradeItems.length === 0 ? (
          <p className="empty-hint">No protected items currently in stash.</p>
        ) : (
          <div className="protected-list">
            {protectedRareAndUpgradeItems.map((item) => (
              <article key={item.itemId} className="protected-item-row" data-testid="protected-item-row">
                <div className="protected-item-header">
                  <div className="protected-item-title-group">
                    <span className={`rarity-dot rarity-${item.rarity}`} />
                    <strong className="protected-item-name">{item.itemName}</strong>
                    <span className={`rarity-tag rarity-tag-${item.rarity}`}>
                      {item.rarity.toUpperCase()}
                    </span>
                  </div>
                  <div className="protected-item-Right">
                    <span className="lock-mini-badge">DO NOT CONSUME / DO NOT RECYCLE</span>
                    <span className="protected-qty-chip">
                      Owned: {item.ownedQuantity} | Protected: {item.protectedQuantity}
                    </span>
                  </div>
                </div>

                <div className="protected-reasons">
                  {item.reasons.map((r, idx) => (
                    <span
                      key={`${item.itemId}-reason-${idx}`}
                      className={`req-badge req-badge-future req-type-${r.category}`}
                    >
                      {r.label} (Need {r.neededQuantity})
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Rule 1c — Sell Immediately for Raider Coins */}
      <section className="tactical-card sell-card" aria-label="Rule 1c Sell Immediately for Raider Coins">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">Rule 1c — Sell Immediately for Raider Coins</h2>
            <p className="section-subtitle">
              Zero future quest/upgrade demand — vendor payout beats recycle value
            </p>
          </div>
          <span className="coins-total-badge" data-testid="total-projected-coins">
            +{totalProjectedCoinsFromSales.toLocaleString()} Raider Coins ({totalProjectedCoinsFromSales})
          </span>
        </div>

        {sellImmediatelyList.length === 0 ? (
          <p className="empty-hint">No vendor-only items in stash right now.</p>
        ) : (
          <div className="sell-list">
            {sellImmediatelyList.map((entry) => (
              <article key={entry.itemId} className="sell-item-row" data-testid="sell-item-row">
                <div className="sell-item-main">
                  <div className="sell-item-header">
                    <strong className="sell-item-name">
                      {entry.quantityToSell}x {entry.itemName}
                    </strong>
                    <span className="sell-coins-chip">
                      +{entry.totalCoins.toLocaleString()} Coins ({entry.unitCoins} ea)
                    </span>
                  </div>
                  <p className="sell-item-reason">{entry.reason}</p>
                </div>
                <span className="sell-slots-chip">+{entry.slotsFreed} Slots</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
