import React from 'react';
import type { Tab3InventorySmashPlan, RequirementCategory } from '../shared/types';

export interface Tab3InventorySmashViewProps {
  plan: Tab3InventorySmashPlan;
}

function formatCategoryLabel(category: RequirementCategory): string {
  switch (category) {
    case 'quest':
      return 'Quest';
    case 'hideout_upgrade':
      return 'Hideout Upgrade';
    case 'project':
      return 'Project';
    case 'weapon_upgrade':
      return 'Weapon Upgrade';
  }
}

export function Tab3InventorySmashView({ plan }: Tab3InventorySmashViewProps): React.ReactElement {
  const { annotatedInventory, missingRequiredItems, agentFarmingTip } = plan;

  return (
    <div className="tab-view tab3-inventory-smash-view" data-testid="tab3-inventory-smash-view">
      {/* Foundry Farming Tip Banner */}
      <section className="agent-banner" aria-label="Foundry Agent Farming Tip">
        <div className="agent-banner-header">
          <span className="agent-pulse-dot" />
          <span className="agent-banner-label">Foundry Inventory &amp; Farming Advisor</span>
        </div>
        <p className="agent-banner-text">{agentFarmingTip}</p>
      </section>

      {/* Section 1 — Current Inventory (Past vs. Future Upgrade/Quest Links) */}
      <section
        className="tactical-card"
        aria-label="Section 1 Current Inventory Past vs Future Upgrade and Quest Links"
      >
        <div className="section-header-row">
          <div>
            <h2 className="section-title">
              Section 1 — Current Inventory (Past vs. Future Upgrade/Quest Links)
            </h2>
            <p className="section-subtitle">
              Grey = Completed (Past) • Cyan = Quest • Amber = Hideout • Purple = Project • Emerald = Weapon
            </p>
          </div>
          <span className="inventory-count-pill">{annotatedInventory.length} Items</span>
        </div>

        <div className="annotated-inventory-list">
          {annotatedInventory.map((item) => (
            <article
              key={item.itemId}
              className="annotated-inventory-row"
              data-testid="annotated-inventory-row"
            >
              <div className="inventory-item-top">
                <div className="inventory-item-identity">
                  <span className={`rarity-dot rarity-${item.rarity}`} />
                  <strong className="inventory-item-name">{item.itemName}</strong>
                  <span className="inventory-qty-pill">x{item.ownedQuantity}</span>
                  <span className="inventory-slots-pill">{item.slotsUsed} slots</span>
                </div>
                <span className="safe-action-summary">{item.safeActionSummary}</span>
              </div>

              <div className="requirement-badges-row">
                {item.requirements.length === 0 ? (
                  <span className="no-req-chip">No Quest / Upgrade Links — Safe to Recycle or Sell</span>
                ) : (
                  item.requirements.map((req) => {
                    if (req.status === 'past') {
                      return (
                        <span
                          key={`${item.itemId}-${req.id}-past`}
                          className="req-badge req-badge-past"
                          data-testid="req-badge-past"
                        >
                          {req.label} ({req.requiredQuantity}) (Past / Completed)
                        </span>
                      );
                    }
                    return (
                      <span
                        key={`${item.itemId}-${req.id}-future`}
                        className={`req-badge req-badge-future req-type-${req.category}`}
                        data-testid={`req-badge-future-${req.category}`}
                      >
                        [{formatCategoryLabel(req.category)}] {req.label} (Need {req.requiredQuantity})
                      </span>
                    );
                  })
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Section 2 — Missing Required Items (Highlighted in Red Text) */}
      <section
        className="tactical-card missing-items-card"
        aria-label="Section 2 Missing Required Items"
      >
        <div className="section-header-row">
          <div>
            <h2 className="section-title">
              Section 2 — Missing Required Items (Highlighted in Red Text)
            </h2>
            <p className="section-subtitle">
              Critical bottlenecks blocking your active Quests, Hideout Stations, and Expedition Stages
            </p>
          </div>
          <span className="missing-count-pill">{missingRequiredItems.length} Missing</span>
        </div>

        <div className="missing-items-list">
          {missingRequiredItems.map((item) => (
            <article
              key={`missing-${item.itemId}`}
              className="missing-item-row"
              data-testid="missing-item-row"
            >
              <div className="missing-item-header">
                <strong
                  className="missing-item-red missing-red-text"
                  style={{ color: '#ef4444' }}
                  data-testid="missing-item-red"
                >
                  {item.itemName} — Missing {item.missingQuantity} (Have {item.ownedQuantity} / Need{' '}
                  {item.requiredQuantity})
                </strong>
                <span className={`rarity-tag rarity-tag-${item.rarity}`}>
                  {item.rarity.toUpperCase()}
                </span>
              </div>

              <div className="missing-required-for-row">
                {item.requiredFor.map((req) => (
                  <span
                    key={`missing-${item.itemId}-req-${req.id}`}
                    className={`req-badge req-badge-future req-type-${req.category}`}
                  >
                    {req.label} (Need {req.quantityNeeded})
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Section 3 — Best Place to Find Missing Items */}
      <section
        className="tactical-card farming-guide-card"
        aria-label="Section 3 Best Place to Find Missing Items"
      >
        <div className="section-header-row">
          <div>
            <h2 className="section-title">Section 3 — Best Place to Find Missing Items</h2>
            <p className="section-subtitle">
              Exact maps, POI landmarks, loot container categories, and ARC enemy unit drops
            </p>
          </div>
        </div>

        <div className="farming-guide-list">
          {missingRequiredItems.map((item) => (
            <article
              key={`farm-${item.itemId}`}
              className="farming-item-card"
              data-testid="farming-item-card"
            >
              <div className="farming-item-header">
                <strong className="farming-item-title">{item.itemName}</strong>
                <span className="missing-item-red missing-red-text" style={{ color: '#ef4444' }}>
                  Need {item.missingQuantity} more
                </span>
              </div>

              <div className="farming-locations-grid">
                {item.bestPlacesToFind.map((loc, idx) => (
                  <div
                    key={`${item.itemId}-loc-${loc.mapSlug}-${idx}`}
                    className="farming-location-box"
                  >
                    <div className="farming-loc-top">
                      <strong className="farming-map-name">{loc.mapName}</strong>
                      <span className="farming-drop-hint">{loc.dropRateHint}</span>
                    </div>

                    <div className="farming-detail-line">
                      <span className="farming-detail-label">POIs:</span>{' '}
                      <span>{loc.poiNames.join(', ')}</span>
                    </div>
                    <div className="farming-detail-line">
                      <span className="farming-detail-label">Containers:</span>{' '}
                      <span>{loc.containerTypes.join(', ')}</span>
                    </div>
                    {loc.arcSources.length > 0 && (
                      <div className="farming-detail-line">
                        <span className="farming-detail-label">ARC Drops:</span>{' '}
                        <span>{loc.arcSources.join(', ')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
