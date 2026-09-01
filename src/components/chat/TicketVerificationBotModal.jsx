import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Send, RefreshCw, ShieldCheck, Minimize2, 
  Maximize2, Camera, RotateCcw, Copy, Check, Sparkles, Building2, User, AlertCircle
} from 'lucide-react';
import AgentMascotAvatar from './AgentMascotAvatar';
import { 
  verifyTicketAsync, 
  generateBotResponseAsync 
} from '../../services/ticketVerificationBot';
import { formatRoleName } from '../../utils/permissions';
import { scanTicketImage } from '../../utils/ticketOcrScanner';

export default function TicketVerificationBotModal({
  isOpen,
  onClose,
  currentUser,
  unclaimedData = [],
  returnedData = [],
  gatewayEndpoints = [],
  onNavigateToSettlement = () => {}
}) {
  const initialGreeting = {
    id: 'msg-init-1',
    sender: 'bot',
    type: 'TEXT',
    text: 'Please enter a Transaction ID (e.g., `081628-...`) or upload a receipt photo to verify its status.',
    timestamp: new Date().toISOString()
  };

  const [messages, setMessages] = useState([initialGreeting]);
  const [inputText, setInputText] = useState('');
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [windowMode, setWindowMode] = useState('docked'); // 'docked' | 'expanded' | 'minimized'
  const [copiedId, setCopiedId] = useState(null);
  const [modalPos, setModalPos] = useState({ x: null, y: null });
  const modalDragRef = useRef(null);
  const modalDragData = useRef({ startX: 0, startY: 0, initX: 0, initY: 0, moved: false });

  const handleHeaderPointerDown = (e) => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    if (e.button !== undefined && e.button !== 0) return;
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientX === undefined || clientY === undefined) return;

    const el = modalDragRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    modalDragData.current = {
      startX: clientX,
      startY: clientY,
      initX: rect.left,
      initY: rect.top,
      moved: false
    };

    const handlePointerMove = (moveEvent) => {
      const curX = moveEvent.clientX ?? moveEvent.touches?.[0]?.clientX;
      const curY = moveEvent.clientY ?? moveEvent.touches?.[0]?.clientY;
      if (curX === undefined || curY === undefined) return;

      const deltaX = curX - modalDragData.current.startX;
      const deltaY = curY - modalDragData.current.startY;

      if (Math.hypot(deltaX, deltaY) > 5) {
        modalDragData.current.moved = true;
      }

      if (modalDragData.current.moved) {
        const maxX = window.innerWidth - rect.width - 10;
        const maxY = window.innerHeight - rect.height - 10;
        const newX = Math.max(10, Math.min(maxX, modalDragData.current.initX + deltaX));
        const newY = Math.max(10, Math.min(maxY, modalDragData.current.initY + deltaY));
        setModalPos({ x: newX, y: newY });
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
  };

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isBotThinking]);

  const handleResetChat = () => {
    setMessages([
      {
        id: `msg-reset-${Date.now()}`,
        sender: 'bot',
        type: 'TEXT',
        text: 'Please enter a Transaction ID (e.g., `081628-...`) or upload a receipt photo to verify its status.',
        timestamp: new Date().toISOString()
      }
    ]);
    setInputText('');
  };

  const handleCopyText = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text).trim());
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (ts) => {
    try {
      const d = ts ? new Date(ts) : new Date();
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  // Process text submission (supports async isClaim=0 and isClaim=1 gateway lookup)
  const handleSendMessage = async (textToSend = null) => {
    const text = typeof textToSend === 'string' ? textToSend : inputText;
    if (!text.trim() || isBotThinking) return;

    const userMsg = {
      id: `u-${crypto.randomUUID()}`,
      sender: 'user',
      type: 'TEXT',
      text: text.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsBotThinking(true);

    try {
      const response = await generateBotResponseAsync(text, {
        unclaimedData,
        returnedData,
        gatewayEndpoints,
        currentUser
      });

      const botMsg = {
        id: `b-${crypto.randomUUID()}`,
        sender: 'bot',
        type: response.type,
        text: response.text,
        data: response.data || null,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, botMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `b-err-${crypto.randomUUID()}`,
          sender: 'bot',
          type: 'TEXT',
          text: `Unable to verify Transaction ID \`${text}\`. Please verify network connection or try again.`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsBotThinking(false);
    }
  };

  // Process receipt photo upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const previewUrl = URL.createObjectURL(file);

    const userImgMsg = {
      id: `u-img-${crypto.randomUUID()}`,
      sender: 'user',
      type: 'IMAGE',
      imageUrl: previewUrl,
      text: 'Uploaded ticket receipt photo for audit.',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userImgMsg]);

    try {
      const ocr = await scanTicketImage(file);
      const transId = ocr?.transactionId;

      if (transId) {
        const result = await verifyTicketAsync(transId, { unclaimedData, returnedData, gatewayEndpoints });
        setMessages(prev => [
          ...prev,
          {
            id: `b-ocr-${crypto.randomUUID()}`,
            sender: 'bot',
            type: (result.status === 'MATCHED_UNCLAIMED' || result.status === 'MATCHED_CLAIMED') ? 'VERIFICATION_RESULT' : 'TEXT',
            text: result.message,
            data: result,
            timestamp: new Date().toISOString()
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `b-ocr-err-${crypto.randomUUID()}`,
            sender: 'bot',
            type: 'TEXT',
            text: 'Could not detect a clear Transaction ID from the photo. Please type the Transaction ID manually.',
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `b-err-${crypto.randomUUID()}`,
          sender: 'bot',
          type: 'TEXT',
          text: 'Unable to process receipt photo. Please enter the Transaction ID manually.',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  // Minimized Mode
  if (windowMode === 'minimized') {
    return (
      <div className="fixed bottom-6 right-6 z-[99999] animate-in slide-in-from-bottom-5">
        <button
          type="button"
          onClick={() => setWindowMode('docked')}
          className="flex flex-col items-center group cursor-pointer"
        >
          <AgentMascotAvatar size="lg" showStatus={true} />
          <span className="mt-1 bg-[#FFD700] text-[#002B66] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md shadow-md">
            VERIFIER BOT
          </span>
        </button>
      </div>
    );
  }

  const isExpanded = windowMode === 'expanded';
  const userDisplayName = currentUser?.full_name || currentUser?.username || formatRoleName(currentUser?.role) || 'Master Super Administrator';

  const modalStyle = modalPos.x !== null && modalPos.y !== null ? {
    left: `${modalPos.x}px`,
    top: `${modalPos.y}px`,
    bottom: 'auto',
    right: 'auto',
    position: 'fixed'
  } : {};

  return (
    <div 
      ref={modalDragRef}
      style={modalStyle}
      className={`fixed ${modalPos.x === null ? 'bottom-4 sm:bottom-6 right-3 sm:right-6' : ''} z-[99999] flex flex-col overflow-hidden bg-[#F4F6F9] text-slate-900 border border-slate-300/90 rounded-2xl sm:rounded-3xl shadow-[0_24px_65px_-12px_rgba(0,43,102,0.35)] transition-all duration-300 animate-in slide-in-from-bottom-5 ${
        isExpanded 
          ? 'w-[calc(100vw-1.5rem)] sm:w-[560px] md:w-[680px] h-[82vh] max-h-[850px]' 
          : 'w-[calc(100vw-1.5rem)] sm:w-[440px] md:w-[480px] h-[640px] max-h-[calc(100vh-3.5rem)]'
      }`}
    >
      {/* HEADER (Draggable on desktop & mobile) */}
      <div 
        onMouseDown={handleHeaderPointerDown}
        onTouchStart={handleHeaderPointerDown}
        className="bg-[#002B66] text-white px-4 py-3 flex items-center justify-between gap-2 shrink-0 border-b border-blue-900/80 shadow-xs cursor-move select-none touch-none"
        title="Drag header to move window"
      >
        <div className="flex items-center gap-3 min-w-0">
          <AgentMascotAvatar size="md" showStatus={true} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white tracking-wide truncate">
                Agent Maria
              </h3>
              <span className="bg-[#FFD700] text-[#002B66] text-[9px] font-black px-1.5 py-0.5 rounded uppercase shrink-0">
                VERIFIER BOT
              </span>
            </div>
            <p className="text-[10px] text-blue-200 font-semibold truncate flex items-center gap-1 mt-0.5">
              <ShieldCheck size={11} className="text-[#00E676] shrink-0" />
              <span>STL Mandaue Receipt & Ticket Auditor</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0 text-white/80">
          <button
            type="button"
            onClick={handleResetChat}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Reset Conversation"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            onClick={() => setWindowMode(isExpanded ? 'docked' : 'expanded')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse chat box' : 'Expand chat box'}
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

        {/* CHAT MESSAGES BODY */}
        <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#F8FAFC]">
          {messages.map((msg) => {
            const isBot = msg.sender === 'bot';
            const isClaimedRecord = msg.data?.isClaimed || msg.data?.status === 'MATCHED_CLAIMED';

            return (
              <div key={msg.id} className={`flex flex-col ${isBot ? 'items-start' : 'items-end'} space-y-1`}>
                
                {/* Metadata Header */}
                <div className="text-[10px] font-medium text-slate-400 px-1">
                  {isBot ? `Agent Maria (STL Verifier) • ${formatTime(msg.timestamp)}` : `${userDisplayName} • ${formatTime(msg.timestamp)}`}
                </div>

                <div className={`flex items-start gap-2 max-w-[95%] ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                  {isBot && (
                    <div className="mt-0.5 shrink-0">
                      <AgentMascotAvatar size="sm" showStatus={false} />
                    </div>
                  )}

                  <div className="space-y-2 min-w-0 w-full">
                    
                    {/* Bot Message Text Bubble */}
                    {msg.text && (
                      <div className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-xs ${
                        isBot 
                          ? 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs font-normal' 
                          : 'bg-[#002B66] text-white rounded-tr-xs font-semibold'
                      }`}>
                        {msg.text}
                      </div>
                    )}

                    {/* Image Preview if uploaded */}
                    {msg.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white p-1 shadow-xs max-w-xs">
                        <img src={msg.imageUrl} alt="Receipt" className="rounded-lg max-h-36 object-contain mx-auto" />
                      </div>
                    )}

                    {/* OFFICIAL AUDIT VERIFICATION SLIP CARD (Supports UNCLAIMED, CLAIMED, and RETURNED) */}
                    {msg.type === 'VERIFICATION_RESULT' && (msg.data?.status === 'MATCHED_UNCLAIMED' || msg.data?.status === 'MATCHED_CLAIMED' || msg.data?.status === 'MATCHED_RETURNED') && (
                      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md space-y-0 animate-in fade-in zoom-in-95">
                        
                        {/* Top Slip Header (Green for UNCLAIMED, Amber for CLAIMED, Navy/Blue for RETURNED) */}
                        <div className={`${
                          msg.data?.status === 'MATCHED_RETURNED' || msg.data?.isReturned
                            ? 'bg-[#002B66]' 
                            : isClaimedRecord 
                            ? 'bg-[#D97706]' 
                            : 'bg-[#00875A]'
                        } text-white px-3.5 py-2.5 flex items-center justify-between`}>
                          <div className="flex items-center gap-1.5">
                            <Sparkles size={14} className="text-[#FFD700]" />
                            <span className={`w-2 h-2 rounded-full ${
                              msg.data?.status === 'MATCHED_RETURNED' || msg.data?.isReturned
                                ? 'bg-cyan-300'
                                : isClaimedRecord 
                                ? 'bg-amber-300' 
                                : 'bg-[#00E676]'
                            } animate-pulse`} />
                            <span className="font-black text-xs tracking-wider uppercase">
                              {msg.data?.status === 'MATCHED_RETURNED' || msg.data?.isReturned
                                ? 'STATUS: RETURNED'
                                : isClaimedRecord 
                                ? 'STATUS: CLAIMED (PAID OUT)' 
                                : 'STATUS: UNCLAIMED'}
                            </span>
                          </div>
                          <span className="bg-black/25 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
                            {msg.data.gameType || 'RS3'}
                          </span>
                        </div>

                        {/* Slip Body */}
                        <div className="p-3.5 space-y-2.5 text-xs bg-white">
                          
                          {/* Transaction Barcode Box */}
                          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 flex items-center justify-between">
                            <div>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                                TRANSACTION BARCODE / ID
                              </span>
                              <strong className="text-sm font-black font-mono text-[#002B66]">
                                {msg.data.transactionId}
                              </strong>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText(msg.data.transactionId, `tid-${msg.id}`)}
                              className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            >
                              {copiedId === `tid-${msg.id}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                              <span>{copiedId === `tid-${msg.id}` ? 'Copied' : 'Copy ID'}</span>
                            </button>
                          </div>

                          {/* 2x2 Info Grid */}
                          <div className="grid grid-cols-2 gap-2">
                            {/* Bet Combination */}
                            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                BET COMBINATION
                              </span>
                              <strong className="text-sm font-black text-slate-900 block mt-0.5">
                                {msg.data.betNumber || '489'}
                              </strong>
                              <span className="text-[10px] text-slate-400 font-semibold">
                                ({msg.data.gameType || 'RS3'})
                              </span>
                            </div>

                            {/* Draw Schedule */}
                            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                DRAW SCHEDULE
                              </span>
                              <strong className="text-sm font-black text-slate-900 block mt-0.5">
                                {msg.data.drawTime || '14'}
                              </strong>
                              <span className="text-[10px] text-slate-400 font-semibold truncate block">
                                {msg.data.drawDate || '2026-08-30'}
                              </span>
                            </div>

                            {/* Bet Amount */}
                            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                BET AMOUNT
                              </span>
                              <strong className="text-sm font-black text-slate-900 block mt-0.5">
                                ₱{Number(msg.data.betAmount || 10).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </strong>
                            </div>

                            {/* Winning Prize (Highlighted dynamically) */}
                            <div className={`${
                              msg.data?.status === 'MATCHED_RETURNED' || msg.data?.isReturned
                                ? 'bg-blue-50/80 border-blue-200'
                                : isClaimedRecord 
                                ? 'bg-amber-50/80 border-amber-200' 
                                : 'bg-emerald-50/70 border-emerald-200'
                            } border rounded-xl p-2.5`}>
                              <span className={`text-[9px] font-black ${
                                msg.data?.status === 'MATCHED_RETURNED' || msg.data?.isReturned
                                  ? 'text-[#002B66]'
                                  : isClaimedRecord 
                                  ? 'text-[#D97706]' 
                                  : 'text-[#00875A]'
                              } uppercase tracking-wider block`}>
                                WINNING PRIZE
                              </span>
                              <strong className={`text-sm sm:text-base font-black font-mono ${
                                msg.data?.status === 'MATCHED_RETURNED' || msg.data?.isReturned
                                  ? 'text-[#002B66]'
                                  : isClaimedRecord 
                                  ? 'text-[#B45309]' 
                                  : 'text-[#00875A]'
                              } block mt-0.5`}>
                                ₱{Number(msg.data.winAmount || 833).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </strong>
                            </div>
                          </div>

                          {/* Agent / Outlet & Teller Username */}
                          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800 truncate">
                              <Building2 size={13} className="text-blue-600 shrink-0" />
                              <span className="truncate">{msg.data.agentName || 'MANINGO, ALDELIN'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-600 font-bold text-[11px] shrink-0 font-mono">
                              <User size={12} className="text-slate-400" />
                              <span>{msg.data.tellerName || msg.data.username || 'spvr-eya'}</span>
                            </div>
                          </div>

                          {/* Audit Verification / Claim / Return Notice Banner */}
                          {msg.data?.status === 'MATCHED_RETURNED' || msg.data?.isReturned ? (
                            <div className="bg-blue-50 border border-blue-300 rounded-xl p-3 flex items-start gap-2.5">
                              <ShieldCheck size={16} className="text-[#002B66] shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <h5 className="font-bold text-[#002B66] text-[11.5px] leading-tight">
                                  Verified: RETURNED (Official Remittance Record)
                                </h5>
                                <p className="text-[10px] text-blue-950/80 mt-0.5 leading-normal font-medium">
                                  This winning ticket has been officially recorded in the Returned Winnings audit ledger and remitted.
                                </p>
                              </div>
                            </div>
                          ) : isClaimedRecord ? (
                            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5">
                              <AlertCircle size={16} className="text-[#D97706] shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <h5 className="font-bold text-[#D97706] text-[11.5px] leading-tight">
                                  Notice: CLAIMED RECORD (Already Paid Out)
                                </h5>
                                <p className="text-[10px] text-amber-900/90 mt-0.5 leading-normal font-medium">
                                  This winning ticket has ALREADY BEEN CLAIMED and disbursed at the authorized terminal cashier.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-start gap-2.5">
                              <ShieldCheck size={16} className="text-[#00875A] shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <h5 className="font-bold text-[#00875A] text-[11.5px] leading-tight">
                                  Verified: UNCLAIMED (Active Winning Record)
                                </h5>
                                <p className="text-[10px] text-emerald-900/80 mt-0.5 leading-normal font-medium">
                                  This winning ticket is active and eligible for payout at the authorized cashier / teller terminal.
                                </p>
                              </div>
                            </div>
                          )}

                        </div>

                        {/* Dotted Perforation Line Footer */}
                        <div className="border-t border-dashed border-slate-300/90 bg-slate-50/70 py-1.5 px-3 text-center">
                          <span className="text-[8.5px] font-mono tracking-widest text-slate-400 uppercase">
                            CENTRALIZED UNCLAIMED WINNINGS • AUDIT VERIFICATION SLIP
                          </span>
                        </div>

                      </div>
                    )}

                  </div>
                </div>

              </div>
            );
          })}

          {isBotThinking && (
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold pl-2 animate-pulse">
              <AgentMascotAvatar size="sm" showStatus={false} />
              <span>Agent Maria is checking the registry & gateway endpoints...</span>
            </div>
          )}

          {isUploading && (
            <div className="flex items-center gap-2 text-blue-600 text-xs font-bold pl-2 animate-pulse">
              <RefreshCw size={13} className="animate-spin" />
              <span>Scanning receipt image...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT FOOTER */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0 space-y-2">
          
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          <div className="flex items-center gap-2">
            {/* Camera Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80 shrink-0"
              title="Upload Receipt Photo"
            >
              <Camera size={18} />
            </button>

            {/* Text Input */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Type Transaction ID (e.g. 081628-OIIIRA0CN)..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="w-full bg-slate-50/90 focus:bg-white border border-slate-200 focus:border-[#002B66] rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all"
              />
            </div>

            {/* Send Button */}
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isBotThinking}
              className="w-10 h-10 rounded-xl bg-[#002B66]/20 hover:bg-[#002B66] text-[#002B66] hover:text-[#FFD700] flex items-center justify-center transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Send"
            >
              <Send size={16} />
            </button>
          </div>

          {/* Official Footer Subtitle */}
          <p className="text-[9.5px] text-center text-slate-400 font-medium">
            Official Verification Bot • CENTRALIZED UNCLAIMED WINNINGS
          </p>

        </div>

      </div>
  );
}
