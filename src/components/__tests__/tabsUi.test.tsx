// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { App } from '../../App';

describe('ARC Mobile 3-Tab Companion UI (tabsUi.test.tsx)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      }),
    );
  });

  it('renders Tab 1 (Prep for 5 Raids) by default with 5-raid readiness, Rule 1a protected rare items, Rule 1b recycle/refine/craft queue, and Rule 1c immediate sell items', () => {
    render(<App />);

    // Header and Tab switcher buttons exist
    expect(screen.getByText('ARC Mobile Companion')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Tab 1: Prep \(5 Raids\)/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Tab 2: Top 3 Raid Ideas/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Tab 3: Inventory Smash/i }),
    ).toBeTruthy();

    // 5-Raid Loadout Readiness Bar & Grid
    const readinessPill = screen.getByTestId('overall-ready-raids');
    expect(readinessPill.textContent).toMatch(/\/ 5 Raids Ready/i);
    expect(screen.getByText('Primary Weapons')).toBeTruthy();
    expect(screen.getByText('Secondary Weapons')).toBeTruthy();
    expect(screen.getByText('Shields')).toBeTruthy();
    expect(screen.getByText('Augments')).toBeTruthy();
    expect(screen.getByText('Healing Kits')).toBeTruthy();
    expect(screen.getByText('Ammo Stacks')).toBeTruthy();

    // Rule 1b — Action Queue freeing stash slots
    const totalSlotsBadge = screen.getByTestId('total-slots-freed');
    expect(totalSlotsBadge.textContent).toMatch(/\+\d+ Stash Slots Freed/i);
    const actionCards = screen.getAllByTestId('prep-action-card');
    expect(actionCards.length).toBeGreaterThan(0);

    // Rule 1a — Protected Rare & Future Upgrade Lock-List
    const lockBadge = screen.getByTestId('do-not-consume-badge');
    expect(lockBadge.textContent).toContain('DO NOT CONSUME / DO NOT RECYCLE');
    const protectedRows = screen.getAllByTestId('protected-item-row');
    expect(protectedRows.length).toBeGreaterThan(0);
    expect(screen.getByText('Leaper Pulse Unit')).toBeTruthy();

    // Rule 1c — Sell Immediately for Raider Coins
    const totalCoinsBadge = screen.getByTestId('total-projected-coins');
    expect(totalCoinsBadge.textContent).toMatch(/Raider Coins/i);
    const sellRows = screen.getAllByTestId('sell-item-row');
    expect(sellRows.length).toBeGreaterThan(0);
    expect(screen.getByText(/Bronze Statuette/i)).toBeTruthy();
    expect(screen.getByText(/Fine Wristwatch/i)).toBeTruthy();
  });

  it('switches to Tab 2 (Top 3 Raid Ideas) and displays live map conditions plus #1, #2, #3 raid cards with step-by-step execution plans', () => {
    render(<App />);

    const tab2Button = screen.getByRole('button', {
      name: /Tab 2: Top 3 Raid Ideas/i,
    });
    fireEvent.click(tab2Button);

    expect(screen.getByTestId('tab2-raid-ideas-view')).toBeTruthy();

    // Live Map Conditions Strip
    const conditionCards = screen.getAllByTestId('live-map-condition-card');
    expect(conditionCards.length).toBeGreaterThanOrEqual(3);

    // Top 3 Raid Idea cards (#1, #2, #3)
    const card1 = screen.getByTestId('raid-idea-card-1');
    const card2 = screen.getByTestId('raid-idea-card-2');
    const card3 = screen.getByTestId('raid-idea-card-3');

    expect(within(card1).getByText('#1')).toBeTruthy();
    expect(within(card2).getByText('#2')).toBeTruthy();
    expect(within(card3).getByText('#3')).toBeTruthy();

    // Doable loadout green badges
    const doableBadges = screen.getAllByTestId('loadout-doable-badge');
    expect(doableBadges.length).toBeGreaterThanOrEqual(3);

    // Step-by-step instructions (1. Insertion, 2. Primary Objective, 3. High-Value Loot, 4. Extraction)
    expect(within(card1).getByText(/1\. Insertion/i)).toBeTruthy();
    expect(within(card1).getByText(/2\. Primary Objective/i)).toBeTruthy();
    expect(within(card1).getByText(/3\. High-Value Loot/i)).toBeTruthy();
    expect(within(card1).getByText(/4\. Extraction/i)).toBeTruthy();
  });

  it('switches to Tab 3 (Inventory Smash) and renders grey past badges, colored future badges, red-highlighted missing required items, and Best Place to Find farming locations', () => {
    render(<App />);

    const tab3Button = screen.getByRole('button', {
      name: /Tab 3: Inventory Smash/i,
    });
    fireEvent.click(tab3Button);

    expect(screen.getByTestId('tab3-inventory-smash-view')).toBeTruthy();

    // Section 1 — Current Inventory with grey past badges (.req-badge-past) and colored future badges (.req-badge-future)
    const inventoryRows = screen.getAllByTestId('annotated-inventory-row');
    expect(inventoryRows.length).toBeGreaterThan(0);

    const pastBadges = screen.getAllByTestId('req-badge-past');
    expect(pastBadges.length).toBeGreaterThan(0);
    for (const badge of pastBadges) {
      expect(badge.className).toContain('req-badge-past');
      expect(badge.textContent).toContain('(Past / Completed)');
    }

    const futureQuestBadges = screen.getAllByTestId('req-badge-future-quest');
    expect(futureQuestBadges.length).toBeGreaterThan(0);
    expect(futureQuestBadges[0].className).toContain('req-type-quest');

    const futureHideoutBadges = screen.getAllByTestId(
      'req-badge-future-hideout_upgrade',
    );
    expect(futureHideoutBadges.length).toBeGreaterThan(0);
    expect(futureHideoutBadges[0].className).toContain(
      'req-type-hideout_upgrade',
    );

    // Section 2 — Missing Required Items highlighted with .missing-item-red and #ef4444
    const missingRows = screen.getAllByTestId('missing-item-row');
    expect(missingRows.length).toBeGreaterThan(0);

    const redMissingLabels = screen.getAllByTestId('missing-item-red');
    expect(redMissingLabels.length).toBeGreaterThan(0);
    for (const label of redMissingLabels) {
      expect(label.className).toContain('missing-item-red');
      expect(label.className).toContain('missing-red-text');
      expect(label.textContent).toMatch(/Missing \d+ \(Have \d+ \/ Need \d+\)/i);
    }

    // Section 3 — Best Place to Find Missing Items
    expect(
      screen.getByText(/Section 3 — Best Place to Find Missing Items/i),
    ).toBeTruthy();
    const farmingCards = screen.getAllByTestId('farming-item-card');
    expect(farmingCards.length).toBe(missingRows.length);
    expect(screen.getAllByText(/POIs:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Containers:/i).length).toBeGreaterThan(0);
  });

  it('supports bottom mobile navigation bar switching and Foundry Agent refresh trigger', () => {
    render(<App />);

    // Verify Azure AI Foundry model subtitle and refresh button
    expect(screen.getByText(/gpt-6-astra/i)).toBeTruthy();
    const runAgentBtn = screen.getByRole('button', { name: /Run Foundry Agent/i });
    expect(runAgentBtn).toBeTruthy();

    // Switch tabs using sticky bottom mobile navigation bar
    const bottomTab2 = screen.getByRole('button', { name: /2\. Raid Ideas/i });
    fireEvent.click(bottomTab2);
    expect(screen.getByTestId('tab2-raid-ideas-view')).toBeTruthy();

    const bottomTab3 = screen.getByRole('button', { name: /3\. Inv Smash/i });
    fireEvent.click(bottomTab3);
    expect(screen.getByTestId('tab3-inventory-smash-view')).toBeTruthy();

    const bottomTab1 = screen.getByRole('button', { name: /1\. Prep Kits/i });
    fireEvent.click(bottomTab1);
    expect(screen.getByTestId('tab1-prep-view')).toBeTruthy();
  });

  it('opens the Auth / Pull Key modal when clicked and renders the PlayStation 5 & Console Raider Hub', () => {
    render(<App />);

    const authButton = screen.getByRole('button', { name: /Auth \/ Pull Key/i });
    fireEvent.click(authButton);

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByTestId('ps5-console-hub')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: /1-Click OAuth2 Sign In with ARC Tracker/i,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /1\. Login with PlayStation/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: /AI Sync PS5 Stash, Loadout & Workshop/i,
      }),
    ).toBeTruthy();
  });
});
