import { supabase } from '../config/supabaseClient';
import { getLocalDateString } from '../utils/dateFormatting';
import { isSSRRole } from '../utils/permissions';
import { notificationService } from './notificationService';

/**
 * Safely parse settlement terms from database record
 */
export const parseSettlementTerms = (terms) => {
  if (!terms) return null;
  try {
    let parsed = typeof terms === 'string' ? JSON.parse(terms) : terms;
    while (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }
    return parsed;
  } catch {
    return null;
  }
};

/**
 * Evaluates all active settlement agreements in Supabase
 * and returns due today, overdue, and upcoming installments
 */
export const evaluateSettlementDueDates = async ({ currentUser = null, todayOverride = null } = {}) => {
  try {
    let query = supabase
      .from('returned_winnings')
      .select('id, transactionId, fullName, username, sub_office, settlementTerms, totalInstallmentAmount, settlementStatus')
      .not('settlementTerms', 'is', null)
      .neq('settlementStatus', 'FULLY PAID');

    // Scoping for branch SSR users
    if (currentUser && isSSRRole(currentUser?.role) && currentUser?.sub_office && currentUser.sub_office !== 'All') {
      query = query.ilike('sub_office', currentUser.sub_office);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Failed to query settlement agreements for due date reminder:', error.message);
      return [];
    }

    const todayStr = todayOverride || getLocalDateString();
    const todayDate = new Date(`${todayStr}T00:00:00`);
    if (Number.isNaN(todayDate.getTime())) return [];

    const reminders = [];

    (data || []).forEach((item) => {
      const terms = parseSettlementTerms(item.settlementTerms);
      if (!terms || !Array.isArray(terms.installments) || terms.installments.length === 0) return;

      const payerName = item.fullName || item.username || 'Accountable Payer';
      const transId = item.transactionId || 'Unknown Record';
      const subOffice = item.sub_office || terms.sub_office || '';

      terms.installments.forEach((inst) => {
        // Skip installments already marked as paid
        const isPaid = String(inst.status || '').toUpperCase().trim() === 'PAID';
        if (isPaid || !inst.dueDate) return;

        const instDate = new Date(`${inst.dueDate}T00:00:00`);
        if (Number.isNaN(instDate.getTime())) return;

        // Calculate difference in whole calendar days (positive = future, negative = past)
        const diffMs = instDate.getTime() - todayDate.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        let category = null;
        let title = '';
        let statusText = '';
        let isOverdue = false;

        if (diffDays < 0) {
          // Overdue
          category = 'OVERDUE';
          isOverdue = true;
          const daysPast = Math.abs(diffDays);
          statusText = `${daysPast} day${daysPast > 1 ? 's' : ''} overdue`;
          title = `⚠️ Overdue Settlement Installment (${statusText})`;
        } else if (diffDays === 0) {
          // Due Today
          category = 'DUE_TODAY';
          statusText = 'due today';
          title = '📅 Settlement Installment Due Today';
        } else if (diffDays === 1) {
          // Due Tomorrow
          category = 'DUE_TOMORROW';
          statusText = 'due tomorrow';
          title = '⏳ Upcoming Settlement Installment (Due Tomorrow)';
        }

        if (category) {
          const amtStr = parseFloat(inst.amountDue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
          const message = `Installment #${inst.id} (PHP ${amtStr}) for ${payerName} [${transId}] is ${statusText} (${inst.dueDate}).`;

          reminders.push({
            id: `due_reminder_${transId}_inst_${inst.id}_${inst.dueDate}`,
            type: 'due_date_reminder',
            category,
            action: isOverdue ? 'INSTALLMENT_OVERDUE' : (diffDays === 0 ? 'INSTALLMENT_DUE_TODAY' : 'INSTALLMENT_DUE_TOMORROW'),
            title,
            message,
            subOffice,
            transactionId: transId,
            installmentId: inst.id,
            dueDate: inst.dueDate,
            amountDue: inst.amountDue,
            payer: payerName,
            isOverdue,
            diffDays,
            read: false,
            timestamp: new Date().toISOString()
          });
        }
      });
    });

    return reminders;
  } catch (err) {
    console.warn('Error during settlement due date evaluation:', err);
    return [];
  }
};

/**
 * Runs the reminder evaluation, deduplicates alerts, and dispatches notifications
 */
export const runSettlementReminderJob = async ({
  currentUser = null,
  appendNotification = null,
  triggerNotificationPopup = null,
  force = false
} = {}) => {
  if (!currentUser) return [];

  const todayStr = getLocalDateString();
  const userKey = currentUser?.id || currentUser?.username || 'default';
  const storageKey = `stl_notified_due_dates_${userKey}_${todayStr}`;

  let notifiedSet = new Set();
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      notifiedSet = new Set(JSON.parse(saved));
    }
  } catch {}

  const reminders = await evaluateSettlementDueDates({ currentUser });
  if (!reminders || reminders.length === 0) return [];

  const newAlerts = [];

  reminders.forEach((notif) => {
    // Check if this specific installment reminder has already been notified today
    const alreadyNotified = notifiedSet.has(notif.id);

    // 1. Always append to the in-app notification list so it's visible in the notification drawer
    if (appendNotification) {
      appendNotification(notif);
    }

    // 2. Dispatch real-time popup, audio chime, and desktop push if not yet alerted today or if forced
    if (!alreadyNotified || force) {
      newAlerts.push(notif);
      notifiedSet.add(notif.id);

      // Trigger native desktop push notification
      notificationService.dispatchSystemNotification(notif.title, {
        body: notif.message,
        tag: notif.id,
        data: notif
      }, () => {
        // Callback when user clicks push notification
        if (typeof window !== 'undefined') {
          window.focus();
        }
      });

      // Play sound alert chime
      notificationService.playTone(notif.isOverdue ? 'urgent' : 'audit', userKey);
    }
  });

  // Show heads-up banner popup for the highest priority new alert
  if (newAlerts.length > 0 && triggerNotificationPopup) {
    // Prioritize Overdue > Due Today > Due Tomorrow
    const highestPriority = newAlerts.find(n => n.category === 'OVERDUE') ||
      newAlerts.find(n => n.category === 'DUE_TODAY') ||
      newAlerts[0];
    triggerNotificationPopup(highestPriority);
  }

  // Persist updated notified set in localStorage
  try {
    localStorage.setItem(storageKey, JSON.stringify(Array.from(notifiedSet)));
  } catch {}

  return reminders;
};

/**
 * Starts the recurring cron job timer and focus listeners
 * Returns a cleanup function to cancel the schedule
 */
export const startSettlementReminderCron = ({
  currentUser,
  appendNotification,
  triggerNotificationPopup,
  intervalMs = 30 * 60 * 1000 // Default every 30 minutes
}) => {
  if (!currentUser) return () => {};

  // Run initial check with a short delay so the app settles
  const initialTimer = setTimeout(() => {
    runSettlementReminderJob({
      currentUser,
      appendNotification,
      triggerNotificationPopup
    });
  }, 2500);

  // Setup recurring interval
  const intervalId = setInterval(() => {
    runSettlementReminderJob({
      currentUser,
      appendNotification,
      triggerNotificationPopup
    });
  }, intervalMs);

  // Check on browser window focus (e.g. user returns to the portal tab)
  const handleFocus = () => {
    runSettlementReminderJob({
      currentUser,
      appendNotification,
      triggerNotificationPopup
    });
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleFocus);
  }

  // Return teardown function
  return () => {
    clearTimeout(initialTimer);
    clearInterval(intervalId);
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', handleFocus);
    }
  };
};
