// @Arch[tierUtils]
// Centralized Package Tier Ranking & Dynamic Select Options Utility

export const TIER_RANK: Record<string, number> = {
  basic: 10,
  essential: 10,
  pro: 20,
  growth: 20,
  enterprise: 30,
  autopilot: 30,
  developer: 40,
  agency: 50,
  vip: 60,
};

export const getSortedTierOptions = (tiers: any[] = []) => {
  const rawTiers = (tiers && tiers.length > 0)
    ? tiers
    : [{ name: 'basic' }, { name: 'pro' }, { name: 'enterprise' }];

  const sorted = [...rawTiers].sort((a: any, b: any) => {
    const rA = TIER_RANK[(a.name || '').toLowerCase()] ?? 99;
    const rB = TIER_RANK[(b.name || '').toLowerCase()] ?? 99;
    return rA - rB;
  });

  return sorted.map((t: any) => ({
    value: (t.name || '').toLowerCase(),
    label: `${(t.name || '').toUpperCase()} TIER`
  }));
};
