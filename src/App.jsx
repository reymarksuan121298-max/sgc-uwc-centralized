import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toPng } from 'html-to-image';
import { supabase } from './config/supabaseClient';
import { getLocalDateString, parseToDateString, formatDrawTime, getTicketTransId } from './utils/formatters';
import { isSuperAdminRole, isSSRRole, canViewTab } from './utils/permissions';
import MainLayout from './layouts/MainLayout';
import AppRoutes from './routes/AppRoutes';
import Login from './pages/Login/Login';
import ConfirmReturnModal from './components/winnings/ConfirmReturnModal';
import TicketQrModal from './components/winnings/TicketQrModal';
import TicketVerificationChatModal from './components/chat/TicketVerificationChatModal';
import TicketVerificationBotModal from './components/chat/TicketVerificationBotModal';
import AgentMascotAvatar from './components/chat/AgentMascotAvatar';
import { MessageSquare, Sparkles, Bot } from 'lucide-react';

const DEFAULT_COMMISSIONS = {
  adminPercent: 50,
  agentPercent: 30,
  staffPercent: 10,
  collectorPercent: 10
};

export default function App() {
  // Persistent Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('stl_user_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.username && parsed.role) {
          return parsed;
        }
      }
    } catch {
      // Safe fallback
    }
    return null;
  });

  // Dynamic Settings from Database
  const [gatewayConfig, setGatewayConfig] = useState(null);
  const [gatewayEndpoints, setGatewayEndpoints] = useState([]);
  const [selectedEndpointFilter, setSelectedEndpointFilter] = useState('ALL');
  const [commissionConfig, setCommissionConfig] = useState(DEFAULT_COMMISSIONS);

  // Dashboard Navigation & Filters
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedTab = localStorage.getItem('stl_active_tab');
      if (savedTab) return savedTab;
      const stored = localStorage.getItem('stl_user_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && isSuperAdminRole(parsed.role)) return 'superadmin';
      }
    } catch { }
    return 'unclaimed';
  });
  const todayStr = getLocalDateString();
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [data, setData] = useState([]);
  const [returnedData, setReturnedData] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showDailyTable, setShowDailyTable] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Image Capture States
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrModalTicket, setQrModalTicket] = useState(null);
  const [copiedTransIds, setCopiedTransIds] = useState(() => new Set());
  const [openedQrTransIds, setOpenedQrTransIds] = useState(() => new Set());
  const [isCapturingImage, setIsCapturingImage] = useState(null);
  const [copiedSupervisorKey, setCopiedSupervisorKey] = useState(null);
  const [copiedSupervisorKeys, setCopiedSupervisorKeys] = useState(() => new Set());

  const [selectedSettlementTicketId, setSelectedSettlementTicketId] = useState('');

  // Real-time Ticket Verification Multi-Chat & Bot States
  const [openChats, setOpenChats] = useState([]);
  const [isBotOpen, setIsBotOpen] = useState(false);
  const [pendingTicketsChatCount, setPendingTicketsChatCount] = useState(0);

  const isSuperAdmin = isSuperAdminRole(currentUser?.role);
  const isSSR = isSSRRole(currentUser?.role);

  const handleNavigateToSettlement = (ticketOrId) => {
    const transId = typeof ticketOrId === 'string'
      ? ticketOrId
      : (ticketOrId?.transactionId || ticketOrId?.transId || ticketOrId?.receipt_no || '');
    setSelectedSettlementTicketId(transId);
    setActiveTab('settlement');
  };

  const fetchPendingChatCount = useCallback(async () => {
    if (!currentUser) return;
    try {
      const userKey = currentUser.id || currentUser.username || 'user';
      const lastRead = localStorage.getItem(`stl_chat_last_read_${userKey}`) || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const currentUserName = (currentUser.full_name || currentUser.username || '').trim().toLowerCase();
      const currentUserId = currentUser.id;

      // Query unread chats sent by others or pending verification
      const { data, error } = await supabase
        .from('ticket_verification_chats')
        .select('id, sender_id, sender_name, verification_status, created_at')
        .gt('created_at', lastRead);

      if (!error && Array.isArray(data)) {
        const unreadCount = data.filter(msg => {
          const isSender = (currentUserId && msg.sender_id === currentUserId) || 
                           (msg.sender_name && String(msg.sender_name).trim().toLowerCase() === currentUserName);
          return !isSender || msg.verification_status === 'PENDING';
        }).length;
        setPendingTicketsChatCount(unreadCount);
      } else {
        const { count } = await supabase
          .from('ticket_verification_chats')
          .select('*', { count: 'exact', head: true })
          .eq('verification_status', 'PENDING');
        if (typeof count === 'number') {
          setPendingTicketsChatCount(count);
        }
      }
    } catch {
      // ignore
    }
  }, [currentUser]);


  // Load dynamic settings from system_settings table
  const loadSystemSettings = useCallback(async () => {
    try {
      const { data: sData, error } = await supabase.from('system_settings').select('*');
      if (error) {
        console.warn('System settings query notice:', error.message);
        return null;
      }
      if (sData && sData.length) {
        let loadedEndpoints = [];
        let loadedConfig = null;

        sData.forEach((row) => {
          if (!row.value) return;
          let parsed = row.value;
          while (typeof parsed === 'string') {
            try {
              const next = JSON.parse(parsed);
              if (next === parsed) break;
              parsed = next;
            } catch { break; }
          }

          if (row.key === 'commission_config' || row.key === 'commission_rates') {
            setCommissionConfig(parsed);
          } else if (row.key === 'sub_offices') {
            // Managed in branch registry
          } else if (Array.isArray(parsed) && parsed.length > 0 && parsed.some(e => e && (e.baseUrl || e.token || e.name))) {
            loadedEndpoints = parsed;
            setGatewayEndpoints(parsed);
            const defaultEp = parsed.find(e => e.is_default && e.is_active !== false) || parsed.find(e => e.is_active !== false) || parsed[0];
            if (defaultEp && defaultEp.baseUrl) {
              loadedConfig = {
                baseUrl: defaultEp.baseUrl,
                token: defaultEp.token || '',
                isClaim: defaultEp.isClaim ?? 0
              };
              setGatewayConfig(loadedConfig);
            }
          } else if (parsed && typeof parsed === 'object' && parsed.baseUrl && !loadedConfig) {
            loadedConfig = parsed;
            setGatewayConfig(parsed);
          }
        });

        return { loadedEndpoints, loadedConfig };
      }
      return null;
    } catch (err) {
      console.warn('Failed to load system settings:', err);
      return null;
    }
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Network Traffic Optimization: In-flight guard, debounced realtime & cache
  const isFetchingLiveRef = useRef(false);
  const memoryCacheRef = useRef({ key: '', timestamp: 0, data: [] });
  const realtimeDebounceTimerRef = useRef(null);

  const fetchReturnedFromSupabase = useCallback(async () => {
    try {
      const { data: sData, error } = await supabase
        .from('returned_winnings')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (sData) setReturnedData(sData);
    } catch (err) {
      console.warn("Returned winnings fetch:", err.message);
    }
  }, []);

  const fetchReceiptsFromSupabase = useCallback(async () => {
    try {
      const { data: rData, error } = await supabase
        .from('remittance_receipts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) return;
      if (rData) setReceipts(rData);
    } catch (err) {
      // Gracefully silent if optional table is not present
    }
  }, []);

  const handleTicketVerifiedFromChat = useCallback(async (transId) => {
    if (transId) {
      showToast(`Ticket ${transId} verified & auto-cleared from pending chat queue!`);
      await fetchReturnedFromSupabase();
      fetchPendingChatCount();
    }
  }, [fetchReturnedFromSupabase, fetchPendingChatCount]);

  // Fetch Winning Numbers from Central Live Gateway
  const fetchData = useCallback(async (force = false, customFrom = null, customTo = null, endpointsOverride = null, configOverride = null) => {
    if (isFetchingLiveRef.current && !force) return;

    const today = getLocalDateString();
    const apiFromDate = parseToDateString(customFrom !== null && customFrom !== undefined ? customFrom : fromDate) || today;
    const apiToDate = parseToDateString(customTo !== null && customTo !== undefined ? customTo : toDate) || today;

    const epsToUse = (endpointsOverride && endpointsOverride.length > 0) ? endpointsOverride : gatewayEndpoints;
    const cfgToUse = configOverride || gatewayConfig;

    const cacheKey = `${selectedEndpointFilter}_${currentUser?.sub_office || 'All'}_${apiFromDate}_${apiToDate}`;
    const now = Date.now();

    // 20-Second Memory Cache Hit
    if (!force && memoryCacheRef.current.key === cacheKey && (now - memoryCacheRef.current.timestamp) < 20000 && memoryCacheRef.current.data.length > 0) {
      setData(memoryCacheRef.current.data);
      return;
    }

    isFetchingLiveRef.current = true;
    setLoading(true);
    setErrorMsg(null);

    try {
      let targetEndpoints = [];

      if (epsToUse && epsToUse.length > 0) {
        const activeEndpoints = epsToUse.filter(e => e.is_active !== false && e.baseUrl);

        if (currentUser?.sub_office && currentUser.sub_office !== 'All') {
          const match = activeEndpoints.find(e => e.sub_office === currentUser.sub_office);
          targetEndpoints = match ? [match] : [activeEndpoints.find(e => e.sub_office === 'All' || e.is_default) || activeEndpoints[0]].filter(Boolean);
        } else {
          if (selectedEndpointFilter !== 'ALL') {
            const match = activeEndpoints.find(e => e.id === selectedEndpointFilter);
            targetEndpoints = match ? [match] : activeEndpoints;
          } else {
            targetEndpoints = activeEndpoints;
          }
        }
      } else if (cfgToUse && cfgToUse.baseUrl) {
        targetEndpoints = [cfgToUse];
      }

      if (targetEndpoints.length === 0) {
        setData([]);
        return;
      }

      const fetchPromises = targetEndpoints.map(async (cfg) => {
        if (!cfg.baseUrl) return [];
        let cleanBaseUrl = cfg.baseUrl.trim().replace(/\/+$/, '');
        let targetUrl = cleanBaseUrl;
        if (!targetUrl.toLowerCase().includes('unclaimedreceipts')) {
          if (targetUrl.toLowerCase().endsWith('/api')) {
            targetUrl = `${targetUrl}/accountant/UnclaimedReceipts`;
          } else {
            targetUrl = `${targetUrl}/api/accountant/UnclaimedReceipts`;
          }
        }

        const queryGlue = targetUrl.includes('?') ? '&' : '?';
        const fullUrl = `${targetUrl}${queryGlue}isClaim=${cfg.isClaim ?? 0}&from=${apiFromDate}&to=${apiToDate}`;

        const rawToken = (cfg.token || '').trim();
        const authHeader = rawToken ? (rawToken.toLowerCase().startsWith('bearer ') ? rawToken : `Bearer ${rawToken}`) : '';

        const res = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) throw new Error(`[${cfg.name || cfg.sub_office || 'Gateway'}] HTTP ${res.status}`);
        const result = await res.json();
        const deepData = result?.data?.data || result?.data || result;
        const arr = Array.isArray(deepData) ? deepData : deepData && typeof deepData === 'object' ? [deepData] : [];
        return arr.map(item => ({
          ...item,
          sub_office: item.sub_office || (cfg.sub_office && cfg.sub_office !== 'All' ? cfg.sub_office : item.location || 'Mandaue Central')
        }));
      });

      const results = await Promise.allSettled(fetchPromises);
      const errors = [];
      const combined = results.flatMap((r, idx) => {
        if (r.status === 'fulfilled') return r.value;
        errors.push(r.reason?.message || `Gateway ${idx + 1} unreachable`);
        return [];
      });

      const seen = new Set();
      const uniqueData = combined.filter((item, idx) => {
        const id = item.id || item.apiId || item._id;
        const key = id
          ? `${item.sub_office}::${id}`.toLowerCase()
          : `${item.sub_office}::${item.transactionId || item.transId || item.receipt_no || item.ticket_no}::${item.betNo || item.CombiNo}::${item.drawTime || item.draw}::${item.winAmount}::${idx}`.toLowerCase();
        return !seen.has(key) && seen.add(key);
      });

      // Save to memory cache
      memoryCacheRef.current = { key: cacheKey, timestamp: Date.now(), data: uniqueData };
      setData(uniqueData);

      if (errors.length && uniqueData.length === 0) {
        setErrorMsg(`Gateway connection warning: ${errors.join(', ')}`);
      }
    } catch (error) {
      setErrorMsg(error.message);
      setData([]);
    } finally {
      isFetchingLiveRef.current = false;
      setLoading(false);
    }
  }, [fromDate, toDate, selectedEndpointFilter, currentUser, gatewayConfig, gatewayEndpoints]);

  // Parallel Initial Load to eliminate waterfall delays
  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;

    (async () => {
      if (isMounted) {
        const settingsRes = await loadSystemSettings();
        await Promise.allSettled([
          fetchReturnedFromSupabase(),
          fetchReceiptsFromSupabase(),
          fetchPendingChatCount(),
          fetchData(true, fromDate, toDate, settingsRes?.loadedEndpoints, settingsRes?.loadedConfig)
        ]);
      }
    })();

    return () => { isMounted = false; };
  }, [currentUser]);

  // Re-fetch on filter changes
  useEffect(() => {
    if (!currentUser) return;
    if (gatewayEndpoints.length > 0 || gatewayConfig?.baseUrl) {
      fetchData(false);
    }
  }, [fromDate, toDate, selectedEndpointFilter]);

  // REAL-TIME SUPABASE SUBSCRIPTION (Debounced to prevent query storms on high traffic)
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('realtime_returned_winnings_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'returned_winnings'
        },
        (payload) => {
          // Debounce incoming network refetches (batches multiple rapid-fire updates into one query)
          if (realtimeDebounceTimerRef.current) {
            clearTimeout(realtimeDebounceTimerRef.current);
          }
          realtimeDebounceTimerRef.current = setTimeout(() => {
            fetchReturnedFromSupabase();
          }, 250);

          // Alert Staff & Admin in real-time when a deletion request is created by SSR
          if (
            payload.eventType === 'UPDATE' &&
            payload.new?.deletion_request_status === 'PENDING_ADMIN_APPROVAL' &&
            payload.old?.deletion_request_status !== 'PENDING_ADMIN_APPROVAL'
          ) {
            const role = String(currentUser.role || '').toLowerCase();
            const canApprove = role.includes('admin') || role.includes('staff') || role.includes('head') || role.includes('auditor');
            if (canApprove) {
              const reqBy = payload.new?.deletion_request_by || 'SSR';
              const tId = payload.new?.transactionId || payload.new?.batch_serial_no || 'Ticket';
              showToast(`⚠️ New Deletion Request: ${tId} by ${reqBy}`);
            }
          }

          // Alert SSR in real-time when their request is approved
          if (
            payload.eventType === 'DELETE' &&
            payload.old?.deletion_request_status === 'PENDING_ADMIN_APPROVAL'
          ) {
            showToast(`✅ Deletion request approved and deducted from Collections.`);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_verification_chats'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const currentUserName = (currentUser?.full_name || currentUser?.username || '').trim().toLowerCase();
            const currentUserId = currentUser?.id;
            const isMe = (currentUserId && payload.new?.sender_id === currentUserId) ||
                         (payload.new?.sender_name && String(payload.new.sender_name).trim().toLowerCase() === currentUserName);

            if (!isMe) {
              if (openChats.length > 0) {
                const userKey = currentUser?.id || currentUser?.username || 'user';
                localStorage.setItem(`stl_chat_last_read_${userKey}`, new Date().toISOString());
                setPendingTicketsChatCount(0);
              } else {
                setPendingTicketsChatCount(prev => prev + 1);
                const sender = payload.new?.sender_name || 'SSR';
                const msgSnippet = payload.new?.message || payload.new?.text || 'Sent a new message';
                showToast(`💬 ${sender}: "${msgSnippet.slice(0, 45)}${msgSnippet.length > 45 ? '...' : ''}"`);
              }
            }
          } else {
            fetchPendingChatCount();
          }
        }
      )
      .subscribe();

    return () => {
      if (realtimeDebounceTimerRef.current) {
        clearTimeout(realtimeDebounceTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [currentUser, fetchReturnedFromSupabase, fetchPendingChatCount]);

  const returnedTransIds = useMemo(() => new Set(returnedData.map(i => String(i.transactionId || '').trim().toLowerCase())), [returnedData]);

  const pendingFilteredData = useMemo(() => {
    return data.filter(i => {
      // Exclude usernames or supervisors with '-SK' (e.g. SPVR-PERYA-SK)
      const uName = String(i.username || '').trim().toUpperCase();
      const sName = String(i.supervisor || '').trim().toUpperCase();
      if (uName.includes('-SK') || sName.includes('-SK')) return false;

      const isReturned = returnedTransIds.has(String(i.transactionId || i.transId || i.receipt_no || i.ticket_no || '').trim().toLowerCase());
      if (isReturned) return false;
      const itemDateVal = i.drawDate || i.drawTime || i.created_at || i.date;
      const itemDateStr = parseToDateString(itemDateVal);
      if (!itemDateStr) return true;
      if (fromDate && itemDateStr < fromDate) return false;
      if (toDate && itemDateStr > toDate) return false;
      return true;
    });
  }, [data, returnedTransIds, fromDate, toDate]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return pendingFilteredData;
    const q = searchQuery.toLowerCase().trim();
    return pendingFilteredData.filter((item, i) =>
      (item.username || '').toLowerCase().includes(q) ||
      (item.fullName || item.outlet || '').toLowerCase().includes(q) ||
      (item.transactionId || item.transId || item.receipt_no || item.ticket_no || `REC-${i + 1}`).toLowerCase().includes(q) ||
      (item.betNo || item.CombiNo || '').toLowerCase().includes(q) ||
      (item.betCode || '').toLowerCase().includes(q) ||
      (item.sub_office || '').toLowerCase().includes(q)
    );
  }, [pendingFilteredData, searchQuery]);

  const groupedData = useMemo(() => {
    if (!Array.isArray(filteredData) || !filteredData.length) return {};
    return filteredData.reduce((acc, item) => {
      const userKey = (item.username || 'UNASSIGNED-USER').trim().toUpperCase();
      (acc[userKey] = acc[userKey] || []).push(item);
      return acc;
    }, {});
  }, [filteredData]);

  const totals = useMemo(() => {
    if (!Array.isArray(filteredData) || !filteredData.length) return { betAmount: 0, winAmount: 0, count: 0 };
    return filteredData.reduce((acc, item) => ({
      betAmount: acc.betAmount + parseFloat(item.betAmount ?? item.amount ?? item.gross ?? 0),
      winAmount: acc.winAmount + parseFloat(item.winAmount ?? 0),
      count: acc.count + 1
    }), { betAmount: 0, winAmount: 0, count: 0 });
  }, [filteredData]);

  const activeDisplayDate = useMemo(() => {
    if (!fromDate && !toDate) return 'All Active Unclaimed Records';
    const formatToMDY = (dStr) => {
      if (!dStr) return '';
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${month}/${day}/${year}`;
      }
      return dStr;
    };
    if (fromDate === toDate) {
      return formatToMDY(fromDate);
    }
    return `${formatToMDY(fromDate)} to ${formatToMDY(toDate)}`;
  }, [fromDate, toDate]);

  const handleRowClick = (item, index) => {
    setSelectedTicket({ ...item, computedTransId: getTicketTransId(item, `REC-${index + 1}`) });
    setIsModalOpen(true);
  };

  const handleConfirmReturn = async () => {
    if (!selectedTicket) return;
    setIsSaving(true);

    const winAmt = parseFloat(selectedTicket.winAmount ?? 0);
    const admP = commissionConfig?.adminPercent ?? 50;
    const agtP = commissionConfig?.agentPercent ?? 30;
    const stfP = commissionConfig?.staffPercent ?? 10;
    const colP = commissionConfig?.collectorPercent ?? 10;

    const adminComm = winAmt * (admP / 100);
    const agentComm = winAmt * (agtP / 100);
    const staffComm = winAmt * (stfP / 100);
    const collectorComm = winAmt * (colP / 100);

    const targetSubOffice = currentUser?.sub_office && currentUser.sub_office !== 'All'
      ? currentUser.sub_office
      : (selectedTicket.location || selectedTicket.address || 'Mandaue Central');

    const payload = {
      apiId: selectedTicket.id || selectedTicket.sourceId || null,
      transactionId: String(selectedTicket.computedTransId).trim(),
      username: selectedTicket.username || null,
      fullName: selectedTicket.fullName || selectedTicket.outlet || null,
      address: selectedTicket.address || null,
      location: selectedTicket.location || null,
      outlet: selectedTicket.outlet || null,
      supervisor: selectedTicket.supervisor || null,
      sub_office: targetSubOffice,
      drawTime: selectedTicket.drawTime || selectedTicket.draw || null,
      drawDate: selectedTicket.drawDate || selectedTicket.created_at || null,
      betNo: selectedTicket.betNo || selectedTicket.CombiNo || selectedTicket.SoldOutCombiNo || null,
      betCode: selectedTicket.betCode || (selectedTicket.rambolito ? 'RS3' : 'TS3'),
      betAmount: parseFloat(selectedTicket.betAmount ?? selectedTicket.amount ?? selectedTicket.gross ?? 0),
      winAmount: winAmt,
      return_amount_out: winAmt,
      admin_commission: adminComm,
      agent_commission: agentComm,
      staff_commission: staffComm,
      collector_commission: collectorComm,
      receipt_status: 'NO_RECEIPT'
    };

    try {
      const { error } = await supabase.from('returned_winnings').insert([payload]);
      if (error) throw error;

      await supabase.from('audit_logs').insert([{
        actor_username: currentUser?.username || 'SYSTEM',
        actor_role: currentUser?.role || 'Unclaimed Specialist',
        action: 'TICKET_RETURNED',
        target_type: 'returned_winnings',
        target_id: String(selectedTicket.computedTransId).trim(),
        sub_office: targetSubOffice,
        details: { winAmount: winAmt, admin_commission: adminComm }
      }]);

      showToast(`Ticket ${selectedTicket.computedTransId} returned to Supabase ledger successfully!`);
      setIsModalOpen(false);
      setSelectedTicket(null);
      await fetchReturnedFromSupabase();
      await fetchData();
    } catch (err) {
      alert(`Failed to save return record: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecord = async (item) => {
    try {
      const transId = getTicketTransId(item);
      const query = item.id
        ? supabase.from('returned_winnings').delete().eq('id', item.id)
        : supabase.from('returned_winnings').delete().eq('transactionId', transId);
      const { error } = await query;
      if (error) throw error;

      try {
        await supabase.from('audit_logs').insert([{
          actor_username: currentUser?.username || 'SYSTEM',
          actor_role: currentUser?.role || 'Unclaimed Specialist',
          action: 'RECORD_DELETED',
          target_type: 'returned_winnings',
          target_id: transId,
          sub_office: item.sub_office || 'Mandaue Central',
          details: { reason: 'Claimed and deleted from returned winnings ledger' }
        }]);
      } catch (auditErr) {
        console.warn('Audit write note:', auditErr);
      }

      showToast(`Record ${transId} successfully deleted from Supabase ledger.`);
      await fetchReturnedFromSupabase();
    } catch (err) {
      alert(`Delete Error: ${err.message}`);
    }
  };

  const handleSaveAgreement = async (payload) => {
    try {
      const { error } = await supabase
        .from('returned_winnings')
        .update({
          isUnderSettlement: payload.isUnderSettlement,
          settlementTerms: payload.settlementTerms,
          totalInstallmentAmount: payload.totalInstallmentAmount,
          settlementStatus: payload.settlementStatus
        })
        .eq('transactionId', payload.transactionId);

      if (error) throw error;

      await supabase.from('audit_logs').insert([{
        actor_username: currentUser?.username || 'SYSTEM',
        actor_role: currentUser?.role || 'Unclaimed Specialist',
        action: 'SETTLEMENT_AGREEMENT_SAVED',
        target_type: 'returned_winnings',
        target_id: payload.transactionId,
        sub_office: payload.ticket?.sub_office || 'Mandaue Central',
        details: { installmentsCount: payload.installmentsCount, total: payload.totalInstallmentAmount }
      }]);

      showToast(`Settlement Agreement for ${payload.transactionId} saved to database successfully!`);
      await fetchReturnedFromSupabase();
    } catch (err) {
      alert(`Failed to save agreement: ${err.message}`);
    }
  };

  const handleCopySupervisorImage = async (userKey) => {
    const captureNode = document.getElementById(`supervisor-card-${userKey}`);
    if (!captureNode) {
      alert("Could not find table element to capture screenshot.");
      return;
    }

    setIsCapturingImage(userKey);
    try {
      const dataUrl = await toPng(captureNode, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });

      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Mark supervisor key and associated ticket trans IDs as copied
      setCopiedSupervisorKeys(prev => new Set(prev).add(userKey));
      if (groupedData?.[userKey]) {
        setCopiedTransIds(prev => {
          const next = new Set(prev);
          groupedData[userKey].forEach(item => {
            const tId = getTicketTransId(item);
            if (tId) next.add(tId);
          });
          return next;
        });
      }

      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([item]);
        setCopiedSupervisorKey(userKey);
        showToast(`Table for "${userKey}" copied as image to clipboard!`);
        setTimeout(() => setCopiedSupervisorKey(null), 3000);
      } else {
        const downloadLink = document.createElement('a');
        downloadLink.href = dataUrl;
        downloadLink.download = `supervisor_${userKey}_${todayStr}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        showToast(`Image downloaded for "${userKey}" successfully!`);
      }
    } catch (err) {
      console.error("Failed to copy image:", err);
      alert("Error capturing screenshot: " + (err.message || err));
    } finally {
      setIsCapturingImage(null);
    }
  };

  const handleLoginSuccess = (user) => {
    try {
      localStorage.setItem('stl_user_session', JSON.stringify(user));
    } catch (e) {
      console.warn('Could not persist session:', e);
    }
    setCurrentUser(user);
    const targetTab = isSuperAdminRole(user?.role) ? 'superadmin' : 'unclaimed';
    setActiveTab(targetTab);
    try {
      localStorage.setItem('stl_active_tab', targetTab);
    } catch { }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('stl_user_session');
      localStorage.removeItem('stl_active_tab');
    } catch (e) {
      console.warn('Could not clear session storage:', e);
    }
    setCurrentUser(null);
    setActiveTab('unclaimed');
  };

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    try {
      localStorage.setItem('stl_active_tab', newTab);
    } catch { }
  };

  // Background session verification (checks if current user account is still active in database)
  useEffect(() => {
    if (!currentUser?.username) return;

    let isMounted = true;
    const verifySession = async () => {
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('id, username, full_name, role, sub_office, is_active')
          .eq('username', currentUser.username.trim().toLowerCase())
          .maybeSingle();

        if (isMounted) {
          if (error || !data || data.is_active === false) {
            handleLogout();
          } else {
            const updated = { ...currentUser, ...data };
            localStorage.setItem('stl_user_session', JSON.stringify(updated));
            setCurrentUser(updated);
          }
        }
      } catch {
        // Safe offline fallback
      }
    };

    verifySession();
    return () => { isMounted = false; };
  }, [currentUser?.username]);

  // If not logged in, render Login page
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const handleCopyTransId = (transId) => {
    if (!transId) return;
    const strId = String(transId).trim();
    if (strId && strId !== 'N/A') {
      setCopiedTransIds(prev => new Set(prev).add(strId));
    }
  };

  const handleOpenQrModal = (ticket) => {
    if (!ticket) return;
    const computedId = getTicketTransId(ticket, 'N/A');
    if (computedId && computedId !== 'N/A') {
      setOpenedQrTransIds(prev => new Set(prev).add(computedId));
    }
    setQrModalTicket({ ...ticket, computedTransId: computedId });
    setIsQrModalOpen(true);
  };

  return (
    <>
      <MainLayout
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        setActiveTab={handleTabChange}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        onLogout={handleLogout}
        onSync={() => fetchData(true)}
        isSyncing={loading}
        toastMessage={toastMessage}
        pendingCount={pendingFilteredData.length}
        returnedCount={returnedData.length}
        pendingTicketsChatCount={pendingTicketsChatCount}
        onOpenTicketChat={(contact) => {
          const targetContact = contact || {
            id: 'group-all-branches-ssr',
            name: 'All Branches SSR Desk',
            sub_office: 'All',
            isGroup: true,
            created_by: 'Mandaue Central'
          };
          setOpenChats((prev) => {
            const targetKey = targetContact.id || targetContact.username;
            const exists = prev.find((c) => (c.id || c.username) === targetKey);
            if (exists) {
              // Bring to front
              return [targetContact, ...prev.filter((c) => (c.id || c.username) !== targetKey)];
            }
            // Allow up to 4 simultaneous docked chat windows
            return [targetContact, ...prev.slice(0, 3)];
          });
          if (currentUser) {
            const userKey = currentUser.id || currentUser.username || 'user';
            localStorage.setItem(`stl_chat_last_read_${userKey}`, new Date().toISOString());
          }
          setPendingTicketsChatCount(0);
        }}
        onOpenBot={() => setIsBotOpen(true)}
      >
        <AppRoutes
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          currentUser={currentUser}
          isSuperAdmin={isSuperAdmin}
          // Unclaimed Registry Props
          fromDate={fromDate}
          setFromDate={setFromDate}
          toDate={toDate}
          setToDate={setToDate}
          gatewayEndpoints={gatewayEndpoints}
          selectedEndpointFilter={selectedEndpointFilter}
          setSelectedEndpointFilter={setSelectedEndpointFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totals={totals}
          errorMsg={errorMsg}
          showDailyTable={showDailyTable}
          setShowDailyTable={setShowDailyTable}
          loading={loading}
          groupedData={groupedData}
          activeDisplayDate={activeDisplayDate}
          onRowClick={handleRowClick}
          onCopySupervisorImage={handleCopySupervisorImage}
          isCapturingImage={isCapturingImage}
          copiedSupervisorKey={copiedSupervisorKey}
          copiedSupervisorKeys={copiedSupervisorKeys}
          copiedTransIds={copiedTransIds}
          formatDrawTime={formatDrawTime}
          onOpenQrModal={handleOpenQrModal}
          // Returned Winnings Props
          returnedGroupedData={groupedData}
          returnedFilteredData={returnedData}
          liveData={data}
          isLoadingLive={loading}
          onDeleteRecord={handleDeleteRecord}
          onNavigateToSettlement={handleNavigateToSettlement}
          // Settlement Props
          selectedSettlementTicketId={selectedSettlementTicketId}
          onSaveAgreement={handleSaveAgreement}
          onSyncLedger={fetchReturnedFromSupabase}
        />
      </MainLayout>

      {/* Floating Docked Multi-Chat Messenger Windows (Side-by-Side) */}
      <div className="fixed bottom-0 right-3 sm:right-6 z-[9999] flex flex-row-reverse items-end gap-3 pointer-events-none max-w-[calc(100vw-24px)] overflow-x-auto pb-0">
        {openChats.map((contact) => {
          const contactKey = contact.id || contact.username || 'chat';
          return (
            <TicketVerificationChatModal
              key={contactKey}
              isOpen={true}
              onClose={() => {
                setOpenChats((prev) => prev.filter((c) => (c.id || c.username) !== contactKey));
              }}
              currentUser={currentUser}
              selectedContact={contact}
              unclaimedData={data}
              returnedData={returnedData}
              onTicketVerified={handleTicketVerifiedFromChat}
            />
          );
        })}
      </div>

      {/* Automated AI Ticket Verification Bot Modal */}
      <TicketVerificationBotModal
        isOpen={isBotOpen}
        onClose={() => setIsBotOpen(false)}
        currentUser={currentUser}
        unclaimedData={data}
        returnedData={returnedData}
        gatewayEndpoints={gatewayEndpoints}
        onNavigateToSettlement={handleNavigateToSettlement}
      />

      {/* Floating Agent Maria Verifier Bot Launcher */}
      {!isBotOpen && openChats.length === 0 && currentUser && (
        <button
          type="button"
          onClick={() => setIsBotOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex flex-col items-center group cursor-pointer hover:scale-105 active:scale-95 transition-transform animate-in fade-in"
          title="Open Agent Maria Verifier Bot"
        >
          <AgentMascotAvatar size="lg" showStatus={true} />
          <span className="mt-1 bg-[#FFD700] text-[#002B66] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md shadow-lg tracking-wider border border-[#002B66]/20">
            VERIFIER BOT
          </span>
        </button>
      )}

      {/* Standalone Reusable Confirmation Modal */}
      <ConfirmReturnModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTicket(null);
        }}
        ticket={selectedTicket}
        commissionConfig={commissionConfig}
        isSaving={isSaving}
        copiedTransIds={copiedTransIds}
        openedQrTransIds={openedQrTransIds}
        onCopyTransId={handleCopyTransId}
        onConfirm={handleConfirmReturn}
        onOpenQrModal={handleOpenQrModal}
        currentUser={currentUser}
      />

      {/* Standalone Reusable QR Modal */}
      <TicketQrModal
        isOpen={isQrModalOpen}
        onClose={() => {
          setIsQrModalOpen(false);
          setQrModalTicket(null);
        }}
        ticket={qrModalTicket}
        copiedTransIds={copiedTransIds}
        onCopyTransId={handleCopyTransId}
      />
    </>
  );
}
