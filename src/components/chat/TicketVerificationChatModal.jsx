import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  X, Send, Image as ImageIcon, CheckCircle2, 
  RefreshCw, Eye, Check, ShieldCheck, 
  Trash2, UploadCloud, Clock, Search, 
  FileText, Sparkles, Copy, ThumbsUp, Smile,
  Minus, Maximize2, Minimize2, Users,
  MessageSquare, ChevronLeft, Plus, Building2, CheckCheck,
  Video, PhoneCall
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { scanTicketImage } from '../../utils/ticketOcrScanner';
import { canApproveDeletionRequests, isAdminRole, formatRoleName, isSSRRole, isUnclaimedSpecialistRole } from '../../utils/permissions';
import CreateGroupChatModal from './CreateGroupChatModal';
import VideoCallWindow from './VideoCallWindow';

// Deterministic Color Generator for User Initials per Sub-Office / Name
const getAvatarColor = (name = '', subOffice = '') => {
  const colors = [
    'bg-[#002B66] text-[#FFD700]',
    'bg-[#0084FF] text-white',
    'bg-emerald-700 text-white',
    'bg-teal-700 text-white',
    'bg-indigo-700 text-white',
    'bg-purple-700 text-white',
    'bg-rose-700 text-white',
    'bg-amber-600 text-white'
  ];
  const str = `${name}_${subOffice}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Safe Realtime Broadcaster that avoids REST API fallback warnings
const sendBroadcastSafe = (channel, event, payload) => {
  if (!channel) return;
  if (channel.state === 'joined' || channel.state === 'subscribed') {
    channel.send({
      type: 'broadcast',
      event,
      payload
    }).catch(() => {});
  }
};

export default function TicketVerificationChatModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  selectedContact = null,
  unclaimedData = [], 
  returnedData = [],
  onTicketVerified = null 
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState(null);
  const [isProcessingVerify, setIsProcessingVerify] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Active contact / room state
  const [activeContact, setActiveContact] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [chatCategory, setChatCategory] = useState('direct'); // 'direct' | 'groups'
  const [isChannelDrawerOpen, setIsChannelDrawerOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  // Messenger Window Mode: 'docked' (floating bottom-right window) | 'expanded' (full modal) | 'minimized'
  const [windowMode, setWindowMode] = useState('docked');

  // Live WebRTC Video Call States
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [videoCallState, setVideoCallState] = useState('idle'); // 'idle' | 'calling' | 'incoming' | 'connected'
  const [incomingCallData, setIncomingCallData] = useState(null);

  // Custom persistent chat groups
  const [chatGroups, setChatGroups] = useState(() => {
    try {
      const saved = localStorage.getItem('stl_custom_chat_groups');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'group-all-branches-ssr',
        name: 'All Branches SSR Desk',
        sub_office: 'All',
        isGroup: true,
        created_by: 'Mandaue Central',
        created_by_role: 'Unclaimed Specialist',
        members: []
      }
    ];
  });

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const isStaffOrAdmin = canApproveDeletionRequests(currentUser?.role) || isAdminRole(currentUser?.role);
  const isSSR = isSSRRole(currentUser?.role);
  const canCreateGroup = isUnclaimedSpecialistRole(currentUser?.role) || isAdminRole(currentUser?.role);

  // Dynamic current user properties
  const officerName = currentUser?.full_name || currentUser?.fullName || currentUser?.username || 'Branch Verifier';
  const officerRole = currentUser?.role ? String(formatRoleName(currentUser.role)).toUpperCase() : 'AUTHORIZED VERIFIER';
  const officerSubOffice = currentUser?.sub_office && currentUser.sub_office !== 'All' 
    ? currentUser.sub_office 
    : 'Mandaue Central HQ';

  // Sync selectedContact from props
  useEffect(() => {
    if (selectedContact) {
      setActiveContact(selectedContact);
      setChatCategory(selectedContact.isGroup ? 'groups' : 'direct');
    } else if (!activeContact) {
      // Default to general group channel if no contact provided
      setActiveContact({
        id: 'group-all-branches-ssr',
        name: 'All Branches SSR Desk',
        sub_office: 'All',
        isGroup: true,
        created_by: 'Mandaue Central'
      });
      setChatCategory('groups');
    }
  }, [selectedContact, isOpen]);

  // Fetch active users for 1-on-1 Direct Chat list
  const fetchActiveUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, username, full_name, role, sub_office, is_active, last_login_at')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (data && data.length > 0) {
        setActiveUsers(data);
      }
    } catch (err) {
      console.warn('Failed to load active users for messenger modal:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchActiveUsers();
    }
  }, [isOpen, fetchActiveUsers]);

  const handleCreateGroup = (newGroup) => {
    setChatGroups(prev => {
      const updated = [newGroup, ...prev.filter(g => g.id !== newGroup.id)];
      localStorage.setItem('stl_custom_chat_groups', JSON.stringify(updated));
      return updated;
    });
    setActiveContact(newGroup);
    setChatCategory('groups');
    setIsChannelDrawerOpen(false);
  };

  const isGroupChat = Boolean(activeContact?.isGroup || activeContact?.member_ids);

  // Target chat receiver profile
  const chatHeaderName = activeContact
    ? (activeContact.name || activeContact.full_name || activeContact.username)
    : (isSSR ? 'Admin & Unclaimed Verification Desk' : 'General SSR Desk');

  const chatHeaderRole = isGroupChat
    ? (activeContact.members?.length ? `${activeContact.members.length} SSR MEMBERS` : 'GROUP CHANNEL')
    : (activeContact
      ? formatRoleName(activeContact.role).toUpperCase()
      : (isSSR ? 'ADMIN / UNCLAIMED SPECIALIST' : officerRole));

  const chatHeaderSubOffice = activeContact
    ? (activeContact.sub_office && activeContact.sub_office !== 'All' ? activeContact.sub_office : 'All Branches')
    : (isSSR ? 'Mandaue Central / Sub-Offices' : officerSubOffice);

  const chatHeaderInitials = isGroupChat
    ? 'GP'
    : ((chatHeaderName || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase());
  const chatHeaderAvatarClass = isGroupChat
    ? 'bg-[#002B66] text-[#FFD700]'
    : getAvatarColor(chatHeaderName, chatHeaderSubOffice);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCopyText = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text).trim());
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // 1. Fetch initial chat history
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ticket_verification_chats')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        const local = localStorage.getItem('stl_tv_chat_fallback');
        if (local) setMessages(JSON.parse(local));
        return;
      }

      if (data) {
        setMessages(data);
        localStorage.setItem('stl_tv_chat_fallback', JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Chat fetch warning:', err);
    } finally {
      setLoading(false);
    }
  };

  // Live Typing, Presence & Seen Receipt States
  const [partnerTyping, setPartnerTyping] = useState(null); // { name, lastAt }
  const [partnerStatus, setPartnerStatus] = useState('active'); // 'active' | 'afk' | 'afk_typing'
  const [partnerSeenInfo, setPartnerSeenInfo] = useState(null); // { userId, name, at, lastMsgId }
  const realtimeChannelRef = useRef(null);
  const typingTimerRef = useRef(null);

  // Clear seen state when switching contacts
  useEffect(() => {
    setPartnerSeenInfo(null);
  }, [activeContact]);

  // Auto clear partner typing state after timeout
  useEffect(() => {
    if (!partnerTyping) return;
    const interval = setInterval(() => {
      if (Date.now() - partnerTyping.lastAt > 3500) {
        setPartnerTyping(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [partnerTyping]);

  // Global AFK Activity Tracker for local user (Throttled to avoid unnecessary socket traffic)
  const lastPresenceStateRef = useRef('active');

  useEffect(() => {
    let inactivityTimer = null;

    const notifyActivity = () => {
      if (lastPresenceStateRef.current !== 'active') {
        lastPresenceStateRef.current = 'active';
        sendBroadcastSafe(realtimeChannelRef.current, 'presence_status', {
          userId: currentUser?.id,
          username: currentUser?.username,
          status: 'active'
        });
      }
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        const newStatus = inputText.trim().length > 0 ? 'afk_typing' : 'afk';
        lastPresenceStateRef.current = newStatus;
        sendBroadcastSafe(realtimeChannelRef.current, 'presence_status', {
          userId: currentUser?.id,
          username: currentUser?.username,
          status: newStatus
        });
      }, 60000); // 1 minute inactivity = AFK
    };

    window.addEventListener('keydown', notifyActivity);
    window.addEventListener('click', notifyActivity);
    window.addEventListener('focus', notifyActivity);
    window.addEventListener('blur', () => {
      const newStatus = inputText.trim().length > 0 ? 'afk_typing' : 'afk';
      lastPresenceStateRef.current = newStatus;
      sendBroadcastSafe(realtimeChannelRef.current, 'presence_status', {
        userId: currentUser?.id,
        username: currentUser?.username,
        status: newStatus
      });
    });

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      window.removeEventListener('keydown', notifyActivity);
      window.removeEventListener('click', notifyActivity);
      window.removeEventListener('focus', notifyActivity);
    };
  }, [inputText, currentUser]);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
    }
  }, [isOpen]);

  // 2. Real-time Subscription for Incoming Tickets, Live Verifications, and Typing/AFK Broadcasts
  useEffect(() => {
    if (!isOpen) return;

    const myId = String(currentUser?.id || currentUser?.username || 'me').toLowerCase();
    const theirId = String(activeContact?.id || activeContact?.username || 'them').toLowerCase();
    const isGroup = Boolean(activeContact?.isGroup || activeContact?.member_ids || activeContact?.id?.toString().startsWith('group-'));

    const channelName = isGroup
      ? `rt_chat_${activeContact?.id || 'group-all-branches-ssr'}`
      : `rt_chat_${[myId, theirId].sort().join('_')}`;

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false }
        }
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ticket_verification_chats' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
            scrollToBottom();
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((m) => (m.id === payload.new.id ? payload.new : m))
            );
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload && payload.userId !== currentUser?.id && payload.username !== currentUser?.username) {
          if (payload.isTyping) {
            setPartnerTyping({
              name: payload.name || payload.username || 'Partner',
              lastAt: Date.now()
            });
            setPartnerStatus('typing');
          } else {
            setPartnerTyping(null);
            setPartnerStatus(payload.status || 'active');
          }
        }
      })
      .on('broadcast', { event: 'presence_status' }, ({ payload }) => {
        if (payload && payload.userId !== currentUser?.id && payload.username !== currentUser?.username) {
          setPartnerStatus(payload.status || 'active');
          if (payload.status === 'afk' || payload.status === 'afk_typing') {
            setPartnerTyping(null);
          }
        }
      })
      .on('broadcast', { event: 'message_seen' }, ({ payload }) => {
        if (payload && payload.userId !== (currentUser?.id || currentUser?.username)) {
          setPartnerSeenInfo({
            userId: payload.userId,
            name: payload.name || 'Partner',
            at: payload.seenAt || new Date().toISOString(),
            lastMsgId: payload.lastMsgId
          });
        }
      })
      // WebRTC Live Video Calling Realtime Signaling
      .on('broadcast', { event: 'video_call_offer' }, ({ payload }) => {
        if (payload && payload.callerId !== (currentUser?.id || currentUser?.username)) {
          setIncomingCallData(payload);
          setVideoCallState('incoming');
          setIsVideoCallOpen(true);
        }
      })
      .on('broadcast', { event: 'video_call_accept' }, () => {
        setVideoCallState('connected');
      })
      .on('broadcast', { event: 'video_call_reject' }, () => {
        setIsVideoCallOpen(false);
        setVideoCallState('idle');
        setIncomingCallData(null);
      })
      .on('broadcast', { event: 'video_call_end' }, () => {
        setIsVideoCallOpen(false);
        setVideoCallState('idle');
        setIncomingCallData(null);
      })
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      realtimeChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [isOpen, activeContact, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, windowMode, activeContact]);

  // 3. Central Image Processor
  const processImageFile = async (file) => {
    if (!file) return;

    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setFilePreview(previewUrl);

    setIsOcrScanning(true);
    try {
      const scanRes = await scanTicketImage(file);
      setOcrResult(scanRes);
    } catch (err) {
      console.error('OCR Error:', err);
    } finally {
      setIsOcrScanning(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) await processImageFile(file);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    sendBroadcastSafe(realtimeChannelRef.current, 'typing', {
      userId: currentUser?.id,
      username: currentUser?.username,
      name: currentUser?.full_name || currentUser?.username,
      isTyping: val.length > 0
    });

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      const stillHasDraft = val.trim().length > 0;
      sendBroadcastSafe(realtimeChannelRef.current, 'typing', {
        userId: currentUser?.id,
        username: currentUser?.username,
        name: currentUser?.full_name || currentUser?.username,
        isTyping: false,
        status: stillHasDraft ? 'afk_typing' : 'active'
      });
    }, 2800);
  };

  // 4. Clipboard Paste Handler (Ctrl + V / Cmd + V)
  const handlePaste = useCallback(async (e) => {
    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (blob) {
          await processImageFile(blob);
          break;
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onGlobalPaste = (e) => handlePaste(e);
    window.addEventListener('paste', onGlobalPaste);
    return () => window.removeEventListener('paste', onGlobalPaste);
  }, [isOpen, handlePaste]);

  // Drag and Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };
  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await processImageFile(file);
    }
  };

  // Compute 1-on-1 Direct Room ID between current user and active contact
  const directRoomId = useMemo(() => {
    if (isGroupChat || !activeContact) return null;
    const myId = String(currentUser?.id || currentUser?.username || '').trim().toLowerCase();
    const otherId = String(activeContact?.id || activeContact?.username || '').trim().toLowerCase();
    return `dm_${[myId, otherId].sort().join('__')}`;
  }, [isGroupChat, activeContact, currentUser]);

  // Filter displayed messages for Group Rooms vs 1-on-1 Direct Chats
  const displayedMessages = useMemo(() => {
    if (!activeContact) return messages;

    if (isGroupChat) {
      return messages.filter(m => 
        m.ocr_data?.roomId === activeContact.id ||
        (activeContact.id === 'group-all-branches-ssr' && (!m.ocr_data?.roomId || m.ocr_data?.isGroup)) ||
        (m.sub_office === activeContact.sub_office && m.ocr_data?.isGroup)
      );
    }

    // 1-on-1 Direct Communication filtering
    const myId = String(currentUser?.id || currentUser?.username || '').trim().toLowerCase();
    const myName = String(currentUser?.full_name || currentUser?.username || '').trim().toLowerCase();
    const otherId = String(activeContact.id || activeContact.username || '').trim().toLowerCase();
    const otherName = String(activeContact.full_name || activeContact.username || '').trim().toLowerCase();

    return messages.filter(m => {
      // 1. Direct room ID match
      if (m.ocr_data?.roomId === directRoomId) return true;

      // 2. Sender and Recipient pair match
      const sId = String(m.sender_id || '').toLowerCase();
      const sName = String(m.sender_name || '').toLowerCase();
      const rId = String(m.recipient_id || m.ocr_data?.recipient_id || '').toLowerCase();
      const rName = String(m.recipient_name || m.ocr_data?.recipient_name || '').toLowerCase();

      if ((sId === myId && rId === otherId) || (sId === otherId && rId === myId)) return true;
      if ((sName === myName && rName === otherName) || (sName === otherName && rName === myName)) return true;

      // 3. Fallback for legacy direct exchanges
      if (!m.ocr_data?.isGroup && !m.ocr_data?.roomId?.startsWith('group-')) {
        if ((sId === otherId || sName === otherName) && (!rId || rId === myId)) return true;
        if ((sId === myId || sName === myName) && (rId === otherId || rName === otherName)) return true;
      }

      return false;
    });
  }, [messages, isGroupChat, activeContact, directRoomId, currentUser]);

  // Broadcast seen status when reading conversation
  useEffect(() => {
    if (!isOpen || !activeContact || displayedMessages.length === 0) return;
    const lastMsg = displayedMessages[displayedMessages.length - 1];
    const isFromOther = lastMsg && (lastMsg.sender_id !== (currentUser?.id || currentUser?.username) && lastMsg.sender_name !== currentUser?.full_name);
    
    if (isFromOther) {
      sendBroadcastSafe(realtimeChannelRef.current, 'message_seen', {
        userId: currentUser?.id || currentUser?.username,
        name: currentUser?.full_name || currentUser?.username,
        lastMsgId: lastMsg.id,
        seenAt: new Date().toISOString()
      });
    }
  }, [isOpen, displayedMessages, activeContact, currentUser]);

  // 5. Send Message (Handles 1-on-1 Direct Messages and Group Channels)
  const handleSendMessage = async (textToSend = null) => {
    const text = typeof textToSend === 'string' ? textToSend : inputText;
    if ((!text.trim() && !filePreview) || isSending) return;

    setIsSending(true);

    const roomId = isGroupChat ? activeContact.id : directRoomId;
    const recipientId = isGroupChat ? null : (activeContact?.id || activeContact?.username || null);
    const recipientName = isGroupChat ? null : (activeContact?.full_name || activeContact?.username || null);

    const newMsg = {
      id: crypto.randomUUID(),
      sender_id: currentUser?.id || currentUser?.username || 'user-1',
      sender_name: currentUser?.full_name || currentUser?.username || officerName,
      sender_role: formatRoleName(currentUser?.role) || 'Sales Service Representative',
      sub_office: currentUser?.sub_office || officerSubOffice,
      recipient_id: recipientId,
      recipient_name: recipientName,
      room_id: roomId,
      message_text: text.trim() || null,
      image_url: filePreview || null,
      ocr_data: {
        ...(ocrResult || {}),
        roomId: roomId,
        isGroup: isGroupChat,
        groupName: isGroupChat ? chatHeaderName : null,
        recipient_id: recipientId,
        recipient_name: recipientName
      },
      verification_status: filePreview ? 'PENDING' : 'INFO',
      matched_transaction_id: ocrResult?.transactionId || null,
      is_archived: false,
      created_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from('ticket_verification_chats')
        .insert([newMsg]);

      if (error) {
        console.warn('Realtime chat write fallback:', error);
        setMessages((prev) => {
          const updated = [...prev, newMsg];
          localStorage.setItem('stl_tv_chat_fallback', JSON.stringify(updated));
          return updated;
        });
      } else {
        setMessages((prev) => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }

      setInputText('');
      setSelectedFile(null);
      setFilePreview(null);
      setOcrResult(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            userId: currentUser?.id,
            username: currentUser?.username,
            name: currentUser?.full_name || currentUser?.username,
            isTyping: false,
            status: 'active'
          }
        });
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setIsSending(false);
    }
  };

  // 6. Direct Ticket Verification
  const handleVerifyTicket = async (msg) => {
    if (!isStaffOrAdmin || isProcessingVerify) return;

    setIsProcessingVerify(msg.id);
    const transId = msg.matched_transaction_id || msg.ocr_data?.transactionId;

    try {
      const { error: chatErr } = await supabase
        .from('ticket_verification_chats')
        .update({
          verification_status: 'VERIFIED',
          verified_by: `${officerName} (${officerSubOffice})`,
          verified_at: new Date().toISOString()
        })
        .eq('id', msg.id);

      if (chatErr) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? {
                  ...m,
                  verification_status: 'VERIFIED',
                  verified_by: officerName,
                  verified_at: new Date().toISOString()
                }
              : m
          )
        );
      }

      await supabase.from('audit_logs').insert([
        {
          actor_username: currentUser?.username || 'staff',
          actor_role: currentUser?.role || 'Staff',
          action: 'TICKET_OCR_VERIFIED',
          target_type: 'OCR_CHAT_TICKET',
          target_id: transId || msg.id,
          sub_office: msg.sub_office || officerSubOffice,
          details: {
            verifiedBy: currentUser?.username,
            sender: msg.sender_name,
            code: transId
          }
        }
      ]);

      if (onTicketVerified) onTicketVerified(transId);
    } catch (err) {
      console.error('Verify ticket failed:', err);
      alert(`Verification failed: ${err.message}`);
    } finally {
      setIsProcessingVerify(null);
    }
  };

  // Video Call Action Handlers
  const handleStartVideoCall = () => {
    setIsVideoCallOpen(true);
    setVideoCallState('calling');
  };

  const handleAcceptCall = () => {
    setVideoCallState('connected');
    sendBroadcastSafe(realtimeChannelRef.current, 'video_call_accept', {
      responderId: currentUser?.id || currentUser?.username
    });
  };

  const handleRejectCall = () => {
    setIsVideoCallOpen(false);
    setVideoCallState('idle');
    setIncomingCallData(null);
    sendBroadcastSafe(realtimeChannelRef.current, 'video_call_reject', {
      responderId: currentUser?.id || currentUser?.username
    });
  };

  const handleEndCall = (isLocalInitiator = true) => {
    setIsVideoCallOpen(false);
    setVideoCallState('idle');
    setIncomingCallData(null);
    if (isLocalInitiator) {
      sendBroadcastSafe(realtimeChannelRef.current, 'video_call_end', {
        senderId: currentUser?.id || currentUser?.username
      });
    }
  };

  const handleTicketSnapshotScanned = (scanRes, previewUrl) => {
    if (previewUrl) setFilePreview(previewUrl);
    if (scanRes) setOcrResult(scanRes);
  };

  // Filtered contacts list
  const filteredUsers = useMemo(() => {
    let list = activeUsers.filter(u => {
      const isMyUsername = currentUser?.username && u.username?.toLowerCase() === currentUser.username.toLowerCase();
      const isMyId = currentUser?.id && String(u.id) === String(currentUser.id);
      const isMyName = currentUser?.full_name && u.full_name?.toLowerCase() === currentUser.full_name.toLowerCase();
      return !isMyUsername && !isMyId && !isMyName;
    });
    if (isSSR) {
      list = list.filter(u => isAdminRole(u.role) || isUnclaimedSpecialistRole(u.role));
    }
    const q = contactSearch.toLowerCase().trim();
    if (!q) return list;
    return list.filter(u => 
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (formatRoleName(u.role) || '').toLowerCase().includes(q) ||
      (u.sub_office || '').toLowerCase().includes(q)
    );
  }, [activeUsers, currentUser, isSSR, contactSearch]);

  const filteredGroups = useMemo(() => {
    let list = chatGroups;
    if (isSSR) {
      list = list.filter(g => 
        g.sub_office === 'All' || 
        g.sub_office === currentUser?.sub_office ||
        g.member_ids?.includes(currentUser?.id || currentUser?.username)
      );
    }
    const q = contactSearch.toLowerCase().trim();
    if (!q) return list;
    return list.filter(g =>
      (g.name || '').toLowerCase().includes(q) ||
      (g.sub_office || '').toLowerCase().includes(q)
    );
  }, [chatGroups, isSSR, contactSearch, currentUser]);

  if (!isOpen) return null;

  // MINIMIZED CHAT HEAD BAR (Messenger Style Pill)
  if (windowMode === 'minimized') {
    return (
      <div className="pointer-events-auto shrink-0 animate-in slide-in-from-bottom-5">
        <div
          onClick={() => setWindowMode('docked')}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-t-xl px-3.5 py-2 shadow-2xl text-xs font-bold text-slate-800 cursor-pointer transition-all hover:-translate-y-0.5"
        >
          <div className="relative shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black font-mono shadow-xs ${chatHeaderAvatarClass}`}>
              {chatHeaderInitials}
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
          </div>
          <div className="text-left max-w-[130px] min-w-0">
            <span className="font-extrabold text-[#002B66] block leading-tight truncate">{chatHeaderName}</span>
            <span className="text-[9px] text-emerald-600 font-bold leading-none flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> Active now
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer ml-1"
            title="Close"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    );
  }

  const isExpanded = windowMode === 'expanded';

  return (
    <div 
      className="pointer-events-auto shrink-0 animate-in slide-in-from-bottom-5 duration-200"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div 
        className={`bg-white flex flex-col overflow-hidden text-slate-900 border border-slate-300 shadow-2xl transition-all ${
          isExpanded 
            ? 'w-[420px] sm:w-[480px] h-[580px] sm:h-[620px] rounded-t-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)]' 
            : 'w-[320px] sm:w-[350px] h-[480px] sm:h-[500px] rounded-t-2xl shadow-xl'
        }`}
      >
        
        {/* DRAG & DROP OVERLAY */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-40 bg-[#0084FF]/90 border-3 border-dashed border-white flex flex-col items-center justify-center gap-2 text-white pointer-events-none animate-in fade-in">
            <UploadCloud size={40} className="animate-bounce" />
            <h4 className="text-sm font-black uppercase">Drop Ticket Receipt Here</h4>
            <p className="text-xs text-blue-100">Scans OCR and verifies instantly</p>
          </div>
        )}

        {/* MESSENGER TOP BAR */}
        <div className="bg-white border-b border-slate-200/90 px-3 py-2 flex items-center justify-between gap-1.5 shrink-0 shadow-2xs">
          
          {/* Contact identity */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black font-mono border border-white shadow-2xs ${chatHeaderAvatarClass}`}>
                {chatHeaderInitials}
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <h3 className="text-[12.5px] font-extrabold text-slate-900 truncate leading-tight">{chatHeaderName}</h3>
                {isGroupChat && (
                  <span className="text-[8px] font-black px-1.5 py-0.2 rounded uppercase shrink-0 bg-[#FFD700] text-[#002B66]">
                    GROUP
                  </span>
                )}
              </div>
              <p className="text-[9.5px] font-bold leading-none mt-0.5 truncate flex items-center gap-1">
                {partnerTyping ? (
                  <span className="text-[#0084FF] font-bold flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0084FF]" />
                    <span>{isGroupChat ? `${partnerTyping.name} is typing...` : 'Typing...'}</span>
                  </span>
                ) : partnerStatus === 'afk_typing' ? (
                  <span className="text-amber-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-amber-200" />
                    <span>Away (idle while typing)</span>
                  </span>
                ) : partnerStatus === 'afk' ? (
                  <span className="text-amber-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>Away / AFK</span>
                  </span>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 inline-block animate-pulse" />
                    <span className="text-emerald-600">Active now</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-400 font-medium truncate">{chatHeaderSubOffice}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-0.5 shrink-0 text-[#0084FF]">
            {/* Start Live Video Call Button */}
            <button
              type="button"
              onClick={handleStartVideoCall}
              className="p-1 rounded-full hover:bg-blue-50 text-[#0084FF] hover:text-blue-700 transition-colors cursor-pointer"
              title={`Start Video Call with ${chatHeaderName}`}
            >
              <Video size={16} />
            </button>

            <button
              type="button"
              onClick={() => setWindowMode(isExpanded ? 'docked' : 'expanded')}
              className="p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer text-slate-500 hover:text-[#0084FF]"
              title={isExpanded ? 'Collapse size' : 'Expand window'}
            >
              {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            <button
              type="button"
              onClick={() => setWindowMode('minimized')}
              className="p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer text-slate-500 hover:text-[#0084FF]"
              title="Minimize chat"
            >
              <Minus size={15} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer text-slate-500 hover:text-rose-600"
              title="Close chat"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* CHAT MESSAGES PANEL */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          
          {/* MESSENGER CHAT BODY */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 bg-white">
            
            {/* CHAT MESSAGES */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400 space-y-1.5">
                  <RefreshCw size={18} className="animate-spin text-[#0084FF]" />
                  <span className="text-[11px] font-bold">Syncing messages...</span>
                </div>
              ) : displayedMessages.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  <MessageSquare size={24} className="mx-auto mb-2 text-slate-300" />
                  <p className="font-bold">No messages in this conversation yet.</p>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">Send a message or attach a ticket receipt to begin.</p>
                </div>
              ) : (
                displayedMessages.map((msg, idx) => {
                  const isMine = msg.sender_id === (currentUser?.id || currentUser?.username) || 
                                 msg.sender_name === currentUser?.full_name || 
                                 msg.sender_name === currentUser?.username;
                  const isVerified = msg.verification_status === 'VERIFIED';
                  const transId = msg.matched_transaction_id || msg.ocr_data?.transactionId;
                  
                  const senderInitials = (msg.sender_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  const senderColor = getAvatarColor(msg.sender_name, msg.sub_office);
                  const isLastMessage = idx === displayedMessages.length - 1;

                  const lastMyMsgIndex = displayedMessages.map((m, i) => {
                    const isMy = m.sender_id === (currentUser?.id || currentUser?.username) || 
                                 m.sender_name === currentUser?.full_name || 
                                 m.sender_name === currentUser?.username;
                    return isMy ? i : -1;
                  }).filter(i => i !== -1).pop();

                  const isLatestMyMessage = isMine && idx === lastMyMsgIndex;

                  const isMessageSeen = isMine && (
                    (partnerSeenInfo && (partnerSeenInfo.lastMsgId === msg.id || new Date(partnerSeenInfo.at) >= new Date(msg.created_at))) ||
                    displayedMessages.some((m, mIdx) => mIdx > idx && (m.sender_id !== (currentUser?.id || currentUser?.username) && m.sender_name !== currentUser?.full_name)) ||
                    (partnerTyping && idx === lastMyMsgIndex)
                  );

                  const partnerDisplayName = activeContact?.name || activeContact?.full_name || activeContact?.username || 'Partner';
                  const partnerInitial = partnerDisplayName ? partnerDisplayName[0].toUpperCase() : 'P';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-1`}
                    >
                      {/* Timestamp & Sent/Seen Status Metadata Bar */}
                      <div className={`flex items-center gap-1 text-[10px] font-medium text-slate-400 px-1 font-mono ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMine && (
                          <span className={`flex items-center gap-0.5 ${isMessageSeen ? 'text-[#0084FF]' : 'text-slate-400'}`} title={isMessageSeen ? 'Seen' : 'Sent'}>
                            <CheckCheck size={12} className="stroke-[2.5]" />
                          </span>
                        )}
                      </div>

                      <div className={`flex items-end gap-1.5 max-w-[88%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                        
                        {!isMine && (
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black font-mono border border-slate-200 shrink-0 mb-1 shadow-2xs ${senderColor}`}>
                            {senderInitials}
                          </div>
                        )}

                        <div className="space-y-1.5">
                          {/* Text bubble */}
                          {msg.message_text && (
                            <div
                              className={`rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-snug font-medium break-words shadow-2xs ${
                                isMine
                                  ? 'bg-[#0084FF] text-white rounded-br-xs'
                                  : 'bg-[#E4E6EB] text-[#050505] rounded-bl-xs'
                              }`}
                            >
                              {msg.message_text}
                            </div>
                          )}

                          {/* Ticket Image & OCR details */}
                          {msg.image_url && (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 space-y-2 shadow-xs">
                              <div 
                                onClick={() => setSelectedPreviewImage(msg.image_url)}
                                className="relative group rounded-xl overflow-hidden bg-white border border-slate-200 cursor-pointer"
                              >
                                <img
                                  src={msg.image_url}
                                  alt="Ticket"
                                  className="w-full max-h-48 object-contain mx-auto group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[11px] font-bold gap-1 transition-opacity">
                                  <Eye size={13} /> View Full
                                </div>
                              </div>

                              {/* Scanned Code & Details Chip */}
                              {transId && (
                                <div className="bg-white border border-blue-200 rounded-xl p-2.5 text-xs space-y-1.5 shadow-2xs">
                                  <div className="flex items-center justify-between">
                                    <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${msg.ocr_data?.qrFound ? 'text-emerald-700' : 'text-[#0084FF]'}`}>
                                      {msg.ocr_data?.qrFound ? (
                                        <>
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                          QR Code Verified
                                        </>
                                      ) : (
                                        <>
                                          <Sparkles size={11} /> Scanned Code
                                        </>
                                      )}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px] tracking-wide border border-slate-200">
                                        {transId}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyText(transId, `c-${msg.id}`)}
                                        className="p-1 text-slate-400 hover:text-[#0084FF] cursor-pointer rounded hover:bg-slate-100"
                                        title="Copy Code"
                                      >
                                        {copiedId === `c-${msg.id}` ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10.5px] border-t border-slate-100 text-slate-600">
                                    {msg.ocr_data?.agent && (
                                      <p className="truncate">
                                        Agent: <strong className="text-slate-900">{msg.ocr_data.agent}</strong>
                                      </p>
                                    )}
                                    {msg.ocr_data?.draw && (
                                      <p className="truncate">
                                        Draw: <strong className="text-slate-900">{msg.ocr_data.draw}</strong>
                                      </p>
                                    )}
                                    {msg.ocr_data?.totalBet && (
                                      <p className="truncate">
                                        Amount: <strong className="text-slate-900 font-mono">₱{Number(msg.ocr_data.totalBet).toFixed(2)}</strong>
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Status & Verify Button */}
                              <div className="flex items-center justify-between gap-1 pt-1">
                                {isVerified ? (
                                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                    <CheckCircle2 size={12} /> Verified by {msg.verified_by || 'Unclaimed Specialist'}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                                    <Clock size={12} /> Pending Verification
                                  </span>
                                )}

                                {isStaffOrAdmin && !isVerified && (
                                  <button
                                    type="button"
                                    onClick={() => handleVerifyTicket(msg)}
                                    disabled={isProcessingVerify === msg.id}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                                  >
                                    {isProcessingVerify === msg.id ? 'Verifying...' : 'Verify Ticket'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Sent / Seen Status Indicator for latest outgoing message */}
                          {isMine && (isLastMessage || isLatestMyMessage) && (
                            <div className="flex items-center justify-end gap-1.5 text-[9.5px] font-bold font-mono pr-1 -mt-0.5 animate-in fade-in duration-150">
                              {isMessageSeen ? (
                                <>
                                  <div className="w-3.5 h-3.5 rounded-full bg-[#002B66] text-[#FFD700] flex items-center justify-center text-[7.5px] font-black font-mono shadow-2xs" title={`Seen by ${partnerDisplayName}`}>
                                    {partnerInitial}
                                  </div>
                                  <span className="text-[#0084FF] font-sans font-bold">Seen</span>
                                </>
                              ) : (
                                <>
                                  <CheckCheck size={11} className="text-slate-400 stroke-[2]" />
                                  <span className="text-slate-400 font-sans">Sent</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {/* PARTNER TYPING INDICATOR BUBBLE */}
              {partnerTyping && (
                <div className="flex items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150 py-1">
                  <div className="w-6 h-6 rounded-full bg-[#002B66] text-[#FFD700] flex items-center justify-center text-[9px] font-black font-mono shrink-0 shadow-xs">
                    {(partnerTyping.name || 'U')[0].toUpperCase()}
                  </div>
                  <div className="bg-slate-100 border border-slate-200/90 rounded-2xl rounded-bl-xs px-3 py-2 flex items-center gap-1.5 shadow-2xs">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0084FF] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0084FF] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0084FF] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium italic ml-1">
                      {isGroupChat ? `${partnerTyping.name} is typing...` : 'typing...'}
                    </span>
                  </div>
                </div>
              )}

              {/* PARTNER AFK WHILE TYPING NOTIFICATION */}
              {!partnerTyping && partnerStatus === 'afk_typing' && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl w-fit mx-auto animate-in fade-in">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="font-semibold">{chatHeaderName} is away (idle while typing)</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ATTACHED IMAGE PREVIEW BAR */}
            {filePreview && (
              <div className="bg-blue-50/90 border-t border-blue-200 p-2.5 flex items-center justify-between gap-2 shrink-0 animate-in fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="w-10 h-10 object-cover rounded-lg border border-blue-300 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black text-slate-800 uppercase">Attached Ticket</span>
                      {isOcrScanning ? (
                        <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1.5 rounded flex items-center gap-1">
                          <RefreshCw size={8} className="animate-spin" /> Scanning OCR...
                        </span>
                      ) : ocrResult?.transactionId ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[8px] font-bold px-1.5 rounded">
                          ✓ {ocrResult.transactionId}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">
                      Sending to {chatHeaderName}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setFilePreview(null);
                    setOcrResult(null);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}

            {/* MESSENGER INPUT BAR */}
            <div className="bg-white border-t border-slate-200 p-2.5 flex items-center gap-1.5 shrink-0">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                id="messenger-ticket-file-input"
              />

              {/* Photo upload icon */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-[#0084FF] hover:bg-blue-50 rounded-full transition-colors cursor-pointer shrink-0"
                title="Attach Ticket Photo (or Ctrl+V to paste)"
              >
                <ImageIcon size={19} />
              </button>

              {/* Sticker Emoji icon */}
              <button
                type="button"
                onClick={() => setInputText((prev) => prev + ' 🎟️ ')}
                className="p-1.5 text-[#0084FF] hover:bg-blue-50 rounded-full transition-colors cursor-pointer shrink-0"
                title="Add emoji"
              >
                <Smile size={19} />
              </button>

              {/* Capsule Pill Input */}
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={`Message ${chatHeaderName}... (Ctrl+V to paste)`}
                  value={inputText}
                  onChange={handleInputChange}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="w-full bg-[#F0F2F5] hover:bg-[#E4E6EB]/70 focus:bg-white border border-transparent focus:border-[#0084FF] rounded-full px-3.5 py-2 text-[12.5px] text-slate-900 placeholder:text-slate-500 outline-none transition-all shadow-inner"
                />
              </div>

              {/* Send or Thumbs Up Button */}
              {inputText.trim() || filePreview ? (
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={isSending || isOcrScanning}
                  className="p-2 bg-[#0084FF] hover:bg-blue-600 text-white rounded-full transition-all shadow-xs active:scale-90 cursor-pointer shrink-0 disabled:opacity-50"
                  title="Send message"
                >
                  {isSending ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendMessage('👍')}
                  className="p-1.5 text-[#0084FF] hover:bg-blue-50 rounded-full transition-all cursor-pointer shrink-0 active:scale-90"
                  title="Send Thumbs Up"
                >
                  <ThumbsUp size={19} />
                </button>
              )}
            </div>

          </div>

        </div>

      {/* FULL TICKET LIGHTBOX */}
      {selectedPreviewImage && (
        <div
          onClick={() => setSelectedPreviewImage(null)}
          className="fixed inset-0 z-[10000] bg-black/90 p-4 flex items-center justify-center animate-in fade-in"
        >
          <div className="relative max-w-xl max-h-[90vh] p-2 bg-white rounded-3xl border border-slate-300 shadow-2xl">
            <button
              onClick={() => setSelectedPreviewImage(null)}
              className="absolute -top-3 -right-3 p-1.5 bg-rose-600 text-white rounded-full shadow-lg hover:bg-rose-500 cursor-pointer z-10"
            >
              <X size={18} />
            </button>
            <img
              src={selectedPreviewImage}
              alt="Expanded Ticket"
              className="max-h-[80vh] w-auto object-contain rounded-2xl"
            />
          </div>
        </div>
      )}

      {/* CREATE GROUP CHAT MODAL */}
      <CreateGroupChatModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        currentUser={currentUser}
        activeUsers={activeUsers}
        onCreateGroup={handleCreateGroup}
      />

      {/* LIVE WEBRTC VIDEO CALL OVERLAY WINDOW */}
      <VideoCallWindow
        isOpen={isVideoCallOpen}
        callState={videoCallState}
        partner={incomingCallData ? { name: incomingCallData.callerName, sub_office: incomingCallData.callerSubOffice } : activeContact}
        currentUser={currentUser}
        realtimeChannel={realtimeChannelRef.current}
        onEndCall={handleEndCall}
        onAcceptCall={handleAcceptCall}
        onRejectCall={handleRejectCall}
        onTicketSnapshotScanned={handleTicketSnapshotScanned}
      />
    </div>
  );
}
