/**
 * Central Feature & Release Registry
 * 
 * Auto-Detection Engine:
 * Any feature added here is automatically checked against the logged-in user's role.
 * If the role has not yet acknowledged the feature, the Marquee Tag notification
 * automatically appears across the portal and displays until dismissed by that role.
 */

export const SYSTEM_FEATURES_REGISTRY = [
  {
    id: 'feat_claimed_deletions_deduction_selector_v2_5',
    version: '2.5.0',
    title: 'Claimed Deletions Deduction Selector & Submission Gate',
    tag: '✨ NEW FEATURE',
    severity: 'gold', // 'gold', 'amber', 'emerald', 'blue'
    targetRoles: ['ALL'], // 'ALL' or specific roles: ['Sales Service Representative', 'Admin', 'Unclaimed Specialist', 'Teller']
    releaseDate: '2026-10-13',
    marqueeText: '🚀 SYSTEM UPDATE: Claimed Deletions Deduction Selector is now live! SSRs can now select and deduct claimed winning tickets directly from weekly remittance deposits with automatic net liability calculation and submission alert gating.',
    summary: 'Sales Service Representatives and Admins can now offset claimed winning tickets directly inside the Attach Remittance Proof workflow.',
    highlights: [
      {
        title: 'Claimed Deletions Deduction Selector',
        description: 'New interactive modal inside Attach Remittance Proof allowing SSRs to multi-select or search claimed tickets to deduct.'
      },
      {
        title: 'Automated Net Remittance Calculation',
        description: 'Selected deductions instantly reduce the gross weekly winning liability, calculating the exact net payable deposit.'
      },
      {
        title: 'Submission Warning Gate',
        description: 'Prevents accidental deposits by intercepting remittance submission when claimed deletions exist but none are selected.'
      },
      {
        title: 'Dedicated Deletion Requests Table',
        description: 'Independent table with status filtering (Pending Approval, Approved, Rejected) and mobile-responsive card view.'
      }
    ],
    actionTab: 'returned',
    actionLabel: 'Go to Returned Winnings →'
  }
];

/**
 * Returns all registered features sorted from newest to oldest
 */
export const getRegisteredFeatures = () => {
  return [...SYSTEM_FEATURES_REGISTRY].sort((a, b) => {
    return new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0);
  });
};

/**
 * Gets the latest active feature applicable to the given role
 */
export const getLatestFeatureForRole = (userRole = '') => {
  const roleName = String(userRole || '').trim();
  const allFeatures = getRegisteredFeatures();

  return allFeatures.find(feat => {
    if (!feat.targetRoles || !feat.targetRoles.length) return true;
    if (feat.targetRoles.includes('ALL')) return true;
    return feat.targetRoles.some(r => r.toLowerCase() === roleName.toLowerCase());
  }) || null;
};
