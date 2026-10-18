import React from 'react';
import type { Tab2RaidPlan, LiveMapCondition } from '../shared/types';

export interface Tab2RaidIdeasViewProps {
  plan: Tab2RaidPlan;
}

function getHazardClass(hazard: LiveMapCondition['hazardLevel']): string {
  switch (hazard) {
    case 'Low':
      return 'hazard-pill hazard-low';
    case 'Moderate':
      return 'hazard-pill hazard-moderate';
    case 'High':
      return 'hazard-pill hazard-high';
    case 'Extreme':
      return 'hazard-pill hazard-extreme';
  }
}

export function Tab2RaidIdeasView({ plan }: Tab2RaidIdeasViewProps): React.ReactElement {
  const { liveMapConditions, topRaidIdeas, agentRouteCommentary } = plan;

  return (
    <div className="tab-view tab2-raid-ideas-view" data-testid="tab2-raid-ideas-view">
      {/* Foundry Route Commentary Banner */}
      <section className="agent-banner" aria-label="Foundry Agent Route Intelligence">
        <div className="agent-banner-header">
          <span className="agent-pulse-dot" />
          <span className="agent-banner-label">Foundry Tactical Route Intelligence</span>
        </div>
        <p className="agent-banner-text">{agentRouteCommentary}</p>
      </section>

      {/* Live Map Conditions Strip */}
      <section className="tactical-card" aria-label="Live Map Conditions Strip">
        <div className="section-header-row">
          <h2 className="section-title">Live Map Conditions Strip</h2>
          <span className="live-indicator-pill">LIVE TELEMETRY</span>
        </div>

        <div className="map-conditions-strip">
          {liveMapConditions.map((cond) => (
            <div
              key={cond.mapSlug}
              className="map-condition-card"
              data-testid="live-map-condition-card"
            >
              <div className="map-condition-top">
                <strong className="map-condition-name">{cond.mapName}</strong>
                <span className={getHazardClass(cond.hazardLevel)}>
                  {cond.hazardLevel} Hazard
                </span>
              </div>
              <div className="map-condition-event">
                <span className="condition-active-label">{cond.activeCondition}</span>
                <span className="condition-timer">{cond.expiresInMinutes}m left</span>
              </div>
              <div className="map-bonus-tags">
                {cond.bonusLootTags.map((tag) => (
                  <span key={`${cond.mapSlug}-${tag}`} className="bonus-loot-tag">
                    +{tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top 3 Raid Ideas */}
      <section className="raid-ideas-section" aria-label="Top 3 Raid Ideas">
        <div className="section-header-row">
          <h2 className="section-title">Top 3 Raid Ideas</h2>
          <span className="section-subtitle-pill">Ranked by Missing Loot + Active Conditions</span>
        </div>

        <div className="raid-ideas-list">
          {topRaidIdeas.map((idea) => (
            <article
              key={`raid-rank-${idea.rank}`}
              className="tactical-card raid-idea-card"
              data-testid={`raid-idea-card-${idea.rank}`}
            >
              <div className="raid-card-header">
                <div className="raid-rank-badge">#{idea.rank}</div>
                <div className="raid-title-block">
                  <h3 className="raid-title">{idea.raidTitle}</h3>
                  <div className="raid-map-meta">
                    <span className="raid-map-name">{idea.mapName}</span>
                    <span className="meta-dot">•</span>
                    <span className="raid-condition-pill">{idea.activeCondition}</span>
                  </div>
                </div>
                <div className="raid-score-box">
                  <span className="raid-yield-label">{idea.estimatedCoinYield}</span>
                </div>
              </div>

              {/* Loadout Feasibility & Kit */}
              <div className="raid-loadout-bar">
                {idea.doableWithCurrentLoadout ? (
                  <span
                    className="loadout-fit-badge loadout-fit-green"
                    data-testid="loadout-doable-badge"
                  >
                    ✓ {idea.loadoutFitLabel}
                  </span>
                ) : (
                  <span className="loadout-fit-badge loadout-fit-warn">
                    ⚠ {idea.loadoutFitLabel}
                  </span>
                )}
                <span className="recommended-kit-text">
                  <strong>Kit:</strong> {idea.recommendedKitSummary}
                </span>
              </div>

              {/* Targeted Missing Items & Expected Rewards */}
              <div className="raid-targets-grid">
                <div className="raid-target-group">
                  <span className="target-group-label">Targeted Missing Items</span>
                  <div className="tag-row">
                    {idea.targetedMissingItems.map((item) => (
                      <span key={`${idea.rank}-missing-${item}`} className="target-missing-chip">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="raid-target-group">
                  <span className="target-group-label">Expected Rewards</span>
                  <div className="tag-row">
                    {idea.expectedRewards.map((reward) => (
                      <span key={`${idea.rank}-reward-${reward}`} className="expected-reward-chip">
                        {reward}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step-by-Step Raid Execution Plan */}
              <div className="raid-steps-container">
                <h4 className="steps-heading">Step-by-Step Raid Execution Plan</h4>
                <ol className="raid-steps-list">
                  {idea.steps.map((step) => (
                    <li
                      key={`${idea.rank}-step-${step.stepNumber}`}
                      className="raid-step-item"
                      data-testid="raid-step-item"
                    >
                      <div className="raid-step-header">
                        <strong className="raid-step-phase">
                          {step.stepNumber}. {step.phase}
                        </strong>
                        <span className="raid-step-poi">POI: {step.targetPoi}</span>
                      </div>
                      <p className="raid-step-instruction">{step.instruction}</p>
                      <p className="raid-step-caution">
                        <span className="caution-prefix">Caution:</span> {step.cautionNote}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
