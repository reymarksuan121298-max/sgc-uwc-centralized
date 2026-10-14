import { supabase } from '../config/supabaseClient';
import { formatRoleName } from '../utils/permissions';

const ACK_STORAGE_PREFIX = 'system_feature_ack_';

export const systemUpdateService = {
  /**
   * Safe getter for build metadata injected by Vite at build time
   */
  getBuildInfo() {
    try {
      if (typeof __APP_BUILD_INFO__ !== 'undefined' && __APP_BUILD_INFO__) {
        return __APP_BUILD_INFO__;
      }
    } catch {}
    return {
      branch: 'main',
      commitSha: 'latest',
      commitMessage: 'System updates and enhancements',
      buildTimestamp: new Date().toISOString()
    };
  },

  /**
   * Checks if a specific feature ID has already been acknowledged/seen by the given user role
   */
  hasRoleAcknowledged(featureId, userRole) {
    if (!featureId || !userRole) return false;
    try {
      const normalizedRole = formatRoleName(userRole);
      const key = `${ACK_STORAGE_PREFIX}${featureId}_${normalizedRole}`;
      const stored = localStorage.getItem(key);
      return Boolean(stored);
    } catch {
      return false;
    }
  },

  /**
   * Records an acknowledgment for a given feature ID and user role so it won't show again for that role
   */
  acknowledgeFeature(featureId, userRole) {
    if (!featureId || !userRole) return;
    try {
      const normalizedRole = formatRoleName(userRole);
      const key = `${ACK_STORAGE_PREFIX}${featureId}_${normalizedRole}`;
      localStorage.setItem(key, new Date().toISOString());
    } catch (e) {
      console.warn('Failed to save feature acknowledgment:', e);
    }
  },

  /**
   * Resets acknowledgment for testing or admin re-broadcast
   */
  resetAcknowledgment(featureId, userRole) {
    try {
      const normalizedRole = formatRoleName(userRole);
      const key = `${ACK_STORAGE_PREFIX}${featureId}_${normalizedRole}`;
      localStorage.removeItem(key);
    } catch {}
  },

  /**
   * Automatically detects if there is an unacknowledged feature applicable to the current user
   * Directly uses GitHub branch / Git commit message / Vercel build deployment metadata.
   * Returns the feature object if it should be displayed, or null if already seen/acknowledged.
   */
  async detectActiveFeature(currentUser) {
    if (!currentUser) return null;
    const userRole = formatRoleName(currentUser.role || 'Staff');
    const buildInfo = this.getBuildInfo();

    // 1. Check for dynamic announcement override in Supabase system_settings
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'dynamic_features_announcement')
        .maybeSingle();

      if (data && data.value && data.value.enabled) {
        const dynamicFeature = data.value;
        const matchesRole = (
          !dynamicFeature.targetRoles ||
          dynamicFeature.targetRoles.includes('ALL') ||
          dynamicFeature.targetRoles.some(r => r.toLowerCase() === userRole.toLowerCase())
        );

        if (matchesRole && !this.hasRoleAcknowledged(dynamicFeature.id, userRole)) {
          return {
            ...dynamicFeature,
            buildInfo
          };
        }
      }
    } catch (err) {
      console.warn('Dynamic feature settings check note:', err);
    }

    // 2. Automatic detection purely from Git / Vercel deployment metadata
    if (!buildInfo) return null;

    const rawMsg = buildInfo.commitMessage || 'System enhancements';
    let tag = '🚀 SYSTEM UPDATE';
    if (/^feat(\([^\)]+\))?:/i.test(rawMsg)) {
      tag = '✨ NEW FEATURE';
    } else if (/^fix(\([^\)]+\))?:/i.test(rawMsg)) {
      tag = '🛠️ SYSTEM FIX';
    } else if (/^perf(\([^\)]+\))?:/i.test(rawMsg)) {
      tag = '⚡ PERFORMANCE';
    } else if (/^refactor(\([^\)]+\))?:/i.test(rawMsg)) {
      tag = '🔄 REFACTOR';
    }

    const cleanMessage = rawMsg
      .replace(/^(feat|fix|perf|refactor|chore|build|ci|docs)(\([^\)]+\))?:\s*/i, '')
      .trim();
    const formattedTitle = cleanMessage.charAt(0).toUpperCase() + cleanMessage.slice(1);

    const activeFeature = {
      id: `deploy_${buildInfo.commitSha}`,
      version: null,
      tag,
      title: formattedTitle,
      marqueeText: `${tag}: ${formattedTitle}`,
      summary: formattedTitle,
      allowedRoles: ['all'],
      highlights: [
        {
          title: 'System Improvement',
          description: formattedTitle
        }
      ],
      releaseDate: (buildInfo.buildTimestamp || '').slice(0, 10),
      buildInfo
    };

    // Check if current user role has acknowledged this specific deployment in localStorage
    const alreadyAcknowledged = this.hasRoleAcknowledged(activeFeature.id, userRole);
    if (alreadyAcknowledged) {
      return null;
    }

    return activeFeature;
  }
};
