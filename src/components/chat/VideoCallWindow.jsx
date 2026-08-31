import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, Phone, 
  Maximize2, Minimize2, Monitor, Camera, Sparkles, 
  RefreshCw, Volume2, VolumeX, ShieldCheck, Building2, 
  CheckCircle2, AlertCircle, Scan, Eye
} from 'lucide-react';
import { scanTicketImage } from '../../utils/ticketOcrScanner';
import { supabase } from '../../config/supabaseClient';

// Public STUN servers for NAT traversal
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

// Safe Realtime Broadcaster that avoids REST API fallback warning
const sendSafeBroadcast = (channel, event, payload) => {
  if (!channel) return;
  if (channel.state === 'joined' || channel.state === 'subscribed') {
    channel.send({
      type: 'broadcast',
      event,
      payload
    }).catch(() => {});
  }
};

export default function VideoCallWindow({
  isOpen,
  callState, // 'calling' | 'incoming' | 'connected'
  partner,
  currentUser,
  realtimeChannel,
  initialOffer = null,
  onEndCall,
  onAcceptCall,
  onRejectCall,
  onTicketSnapshotScanned
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isScanningFrame, setIsScanningFrame] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasCameraError, setHasCameraError] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const ringtoneOscRef = useRef(null);

  // Play synthetic soft ringtone using Web Audio API
  const playRingtone = useCallback((type = 'outgoing') => {
    try {
      if (audioContextRef.current) return;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = type === 'outgoing' ? 440 : 880;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      // Pulse ringtone
      let isBeep = true;
      const ringInterval = setInterval(() => {
        if (!audioContextRef.current) {
          clearInterval(ringInterval);
          return;
        }
        if (isBeep) {
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
        } else {
          gain.gain.setValueAtTime(0, ctx.currentTime);
        }
        isBeep = !isBeep;
      }, 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      ringtoneOscRef.current = { osc, interval: ringInterval };
    } catch {
      // safe fallback if audio context blocked
    }
  }, []);

  const stopRingtone = useCallback(() => {
    try {
      if (ringtoneOscRef.current) {
        clearInterval(ringtoneOscRef.current.interval);
        ringtoneOscRef.current.osc.stop();
        ringtoneOscRef.current.osc.disconnect();
        ringtoneOscRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    } catch {
      // safe
    }
  }, []);

  // Call duration counter
  useEffect(() => {
    if (callState === 'connected') {
      stopRingtone();
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else if (callState === 'calling' || callState === 'incoming') {
      playRingtone(callState);
    } else {
      stopRingtone();
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      stopRingtone();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState, playRingtone, stopRingtone]);

  // Format seconds to mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 1. Initialize Local Media Stream
  const initLocalStream = useCallback(async () => {
    try {
      setHasCameraError(null);
      if (localStreamRef.current) return localStreamRef.current;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.warn('Camera/Mic permission warning:', err);
      setHasCameraError(err.name === 'NotAllowedError' ? 'Camera/Mic permission denied' : 'Camera device unavailable');
      return null;
    }
  }, []);

  // 2. Initialize Peer Connection
  const createPeerConnection = useCallback((stream) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    if (stream) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    }

    // Remote track arrived
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // ICE Candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const icePayload = {
          senderId: currentUser?.id || currentUser?.username,
          candidate: event.candidate
        };
        if (realtimeChannel) {
          sendSafeBroadcast(realtimeChannel, 'video_ice_candidate', icePayload);
        }
        const targetUsername = String(partner?.username || partner?.id || '').toLowerCase().trim();
        if (targetUsername) {
          const directInboxChannel = supabase.channel(`user_inbox_${targetUsername}`);
          directInboxChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              directInboxChannel.send({
                type: 'broadcast',
                event: 'video_ice_candidate',
                payload: icePayload
              }).catch(() => {});
            }
          });
        }
      }
    };

    return pc;
  }, [realtimeChannel, currentUser, partner]);

  // Start Call as Initiator
  useEffect(() => {
    let isCancelled = false;

    const startOutgoingCall = async () => {
      if (callState !== 'calling') return;
      const stream = await initLocalStream();
      if (isCancelled) return;

      const pc = createPeerConnection(stream);
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);

        const targetUsername = String(partner?.username || partner?.id || '').toLowerCase().trim();
        const callPayload = {
          callerId: currentUser?.id || currentUser?.username,
          callerUsername: currentUser?.username,
          callerName: currentUser?.full_name || currentUser?.username,
          callerRole: currentUser?.role || 'Staff',
          callerSubOffice: currentUser?.sub_office || 'Mandaue Central',
          targetUsername: targetUsername,
          sdp: offer
        };

        // 1. Shared direct room broadcast
        if (realtimeChannel) {
          sendSafeBroadcast(realtimeChannel, 'video_call_offer', callPayload);
        }

        // 2. Direct broadcast to recipient's personal inbound channel
        if (targetUsername) {
          const directInboxChannel = supabase.channel(`user_inbox_${targetUsername}`);
          directInboxChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              directInboxChannel.send({
                type: 'broadcast',
                event: 'video_call_offer',
                payload: callPayload
              }).catch(() => {});
            }
          });
        }
      } catch (err) {
        console.error('Failed to create offer:', err);
      }
    };

    startOutgoingCall();

    return () => {
      isCancelled = true;
    };
  }, [callState, initLocalStream, createPeerConnection, realtimeChannel, currentUser, partner]);

  // Handle Answering When Receiving Offer (Callee Side)
  useEffect(() => {
    if (callState !== 'connected') return;
    const offerData = initialOffer;
    if (!offerData?.sdp) return;

    const answerCall = async () => {
      const stream = await initLocalStream();
      const pc = createPeerConnection(stream);

      try {
        if (pc.signalingState !== 'stable') {
          await pc.setRemoteDescription(new RTCSessionDescription(offerData.sdp));
        } else {
          await pc.setRemoteDescription(new RTCSessionDescription(offerData.sdp));
        }
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        const answerPayload = {
          responderId: currentUser?.id || currentUser?.username,
          responderUsername: currentUser?.username,
          sdp: answer
        };

        if (realtimeChannel) {
          sendSafeBroadcast(realtimeChannel, 'video_call_answer', answerPayload);
        }

        if (offerData.callerUsername) {
          const callerInbox = supabase.channel(`user_inbox_${String(offerData.callerUsername).toLowerCase().trim()}`);
          callerInbox.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              callerInbox.send({
                type: 'broadcast',
                event: 'video_call_answer',
                payload: answerPayload
              }).catch(() => {});
            }
          });
        }
      } catch (err) {
        console.error('Failed to create WebRTC answer:', err);
      }
    };

    answerCall();
  }, [callState, initialOffer, initLocalStream, createPeerConnection, realtimeChannel, currentUser]);

  // Handle Realtime WebRTC Signaling Events
  useEffect(() => {
    if (!realtimeChannel) return;

    const onAnswer = async ({ payload }) => {
      if (!payload || !peerConnectionRef.current) return;
      try {
        if (peerConnectionRef.current.signalingState === 'have-local-offer') {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }
      } catch (err) {
        console.error('Failed to set remote answer:', err);
      }
    };

    const onIce = async ({ payload }) => {
      if (!payload || !peerConnectionRef.current || payload.senderId === (currentUser?.id || currentUser?.username)) return;
      try {
        if (payload.candidate) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      } catch (err) {
        console.warn('Failed to add ICE candidate:', err);
      }
    };

    const onEnd = () => {
      cleanUpCall();
      if (onEndCall) onEndCall(false);
    };

    realtimeChannel
      .on('broadcast', { event: 'video_call_answer' }, onAnswer)
      .on('broadcast', { event: 'video_ice_candidate' }, onIce)
      .on('broadcast', { event: 'video_call_end' }, onEnd);

    return () => {};
  }, [realtimeChannel, currentUser, onEndCall]);

  // Clean up streams & peer connection and persist call log
  const cleanUpCall = useCallback(async () => {
    stopRingtone();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Persist call log to Supabase audit_logs
    if (callDuration > 0 || callState === 'connected') {
      try {
        await supabase.from('audit_logs').insert([{
          actor_username: currentUser?.username || 'officer',
          actor_role: currentUser?.role || 'Staff',
          action: 'VIDEO_CALL_COMPLETED',
          target_type: 'VIDEO_CALL',
          target_id: partner?.username || partner?.id || 'partner',
          sub_office: currentUser?.sub_office || 'Mandaue Central',
          details: {
            durationSeconds: callDuration,
            callerName: currentUser?.full_name || currentUser?.username,
            partnerName: partner?.name || partner?.full_name || partner?.username,
            scannedTicket: scanResult?.transactionId || null,
            callType: isScreenSharing ? 'SCREEN_SHARE' : 'VIDEO',
            status: 'COMPLETED'
          }
        }]);
      } catch (err) {
        console.warn('Video call log persist notice:', err);
      }
    }
  }, [stopRingtone, callDuration, callState, currentUser, partner, isScreenSharing, scanResult]);

  // Toggle Mute Audio
  const handleToggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Video Track
  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Toggle Screen Share
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      // Revert to camera stream
      const cameraStream = await initLocalStream();
      if (cameraStream && peerConnectionRef.current) {
        const videoTrack = cameraStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = cameraStream;
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false
        });
        const screenTrack = screenStream.getVideoTracks()[0];

        screenTrack.onended = () => {
          handleToggleScreenShare();
        };

        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender && screenTrack) {
            sender.replaceTrack(screenTrack);
          }
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        setIsScreenSharing(true);
      } catch (err) {
        console.warn('Screen share cancelled:', err);
      }
    }
  };

  // Instant Snapshot & OCR Scan from Remote or Local Video Stream
  const handleSnapshotOcr = async () => {
    const targetVideo = remoteVideoRef.current || localVideoRef.current;
    if (!targetVideo) return;

    setIsScanningFrame(true);
    setScanResult(null);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = targetVideo.videoWidth || 1280;
      canvas.height = targetVideo.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(targetVideo, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsScanningFrame(false);
          return;
        }
        const file = new File([blob], `live_ocr_${Date.now()}.png`, { type: 'image/png' });
        const res = await scanTicketImage(file);
        setScanResult(res);
        setIsScanningFrame(false);

        if (onTicketSnapshotScanned && res) {
          onTicketSnapshotScanned(res, URL.createObjectURL(blob));
        }
      }, 'image/png');
    } catch (err) {
      console.error('Snapshot OCR failed:', err);
      setIsScanningFrame(false);
    }
  };

  if (!isOpen) return null;

  const partnerName = partner?.name || partner?.full_name || partner?.username || 'Branch Officer';
  const partnerSubOffice = partner?.sub_office || 'Mandaue Central';

  return (
    <div className={`fixed z-[10000] transition-all duration-300 ${
      isExpanded 
        ? 'inset-4 sm:inset-10 bg-slate-950/95 backdrop-blur-2xl rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.6)] border border-slate-700/60 overflow-hidden flex flex-col' 
        : 'bottom-20 right-4 sm:right-8 w-[350px] sm:w-[420px] h-[520px] bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/80 overflow-hidden flex flex-col'
    }`}>
      
      {/* TOP BAR */}
      <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#FFD700] text-[#002B66] flex items-center justify-center font-black text-xs font-mono shadow-xs shrink-0">
            <Video size={16} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-extrabold text-white truncate leading-tight flex items-center gap-1.5">
              <span>{partnerName}</span>
              {callState === 'connected' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
              )}
            </h4>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
              <span className="flex items-center gap-1 text-slate-300">
                <Building2 size={10} /> {partnerSubOffice}
              </span>
              <span>•</span>
              <span className={callState === 'connected' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {callState === 'connected' ? formatTime(callDuration) : callState === 'calling' ? 'Calling...' : 'Incoming Video Call...'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title={isExpanded ? 'Minimize call view' : 'Maximize call view'}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            type="button"
            onClick={() => {
              cleanUpCall();
              if (onEndCall) onEndCall(true);
            }}
            className="p-1.5 text-rose-400 hover:text-white rounded-lg hover:bg-rose-600 transition-colors cursor-pointer"
            title="End Video Call"
          >
            <PhoneOff size={16} />
          </button>
        </div>
      </div>

      {/* MAIN VIDEO AREA */}
      <div className="flex-1 relative bg-slate-950 flex items-center justify-center overflow-hidden">
        
        {/* Remote Video (Main Display) */}
        {callState === 'connected' ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover bg-slate-950"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#002B66] to-[#0084FF] border-4 border-[#FFD700] text-white flex items-center justify-center font-black text-2xl font-mono shadow-2xl">
                {partnerName.slice(0, 2).toUpperCase()}
              </div>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-white">
                <Sparkles size={12} />
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">{partnerName}</h3>
              <p className="text-xs text-slate-400">{partnerSubOffice}</p>
              <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-amber-400 font-bold mt-2">
                <RefreshCw size={12} className="animate-spin" />
                <span>{callState === 'calling' ? 'Ringing partner terminal...' : 'Incoming secure connection...'}</span>
              </div>
            </div>

            {callState === 'incoming' && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onAcceptCall}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/50 cursor-pointer active:scale-95 transition-all"
                >
                  <Phone size={14} /> Accept Call
                </button>
                <button
                  type="button"
                  onClick={onRejectCall}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-rose-900/50 cursor-pointer active:scale-95 transition-all"
                >
                  <PhoneOff size={14} /> Decline
                </button>
              </div>
            )}
          </div>
        )}

        {/* Picture-in-Picture Self Camera Preview */}
        <div className={`absolute top-3 right-3 rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700/80 bg-slate-900 transition-all ${
          isExpanded ? 'w-48 h-32' : 'w-28 h-20'
        }`}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
          />
          {isVideoOff && (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 text-[9px] font-bold gap-1">
              <VideoOff size={16} />
              <span>Camera Off</span>
            </div>
          )}
          <span className="absolute bottom-1 left-1.5 text-[8px] font-black font-mono text-white/90 bg-black/60 px-1.5 py-0.5 rounded-md backdrop-blur-xs">
            YOU
          </span>
        </div>

        {/* Live Ticket OCR Scan Result Overlay Banner */}
        {scanResult?.transactionId && (
          <div className="absolute top-3 left-3 max-w-xs bg-slate-900/90 backdrop-blur-md border border-emerald-500/60 rounded-2xl p-2.5 shadow-2xl animate-in slide-in-from-top-2 text-left space-y-1">
            <div className="flex items-center justify-between text-emerald-400 text-[10px] font-black uppercase">
              <span className="flex items-center gap-1"><CheckCircle2 size={12} /> Scanned Live from Video</span>
              <button onClick={() => setScanResult(null)} className="text-slate-400 hover:text-white cursor-pointer">×</button>
            </div>
            <p className="font-mono text-xs font-black text-white bg-slate-800 px-2 py-1 rounded border border-slate-700">
              {scanResult.transactionId}
            </p>
            <div className="text-[10px] text-slate-300 grid grid-cols-2 gap-1 pt-0.5 font-mono">
              <span>Bet: ₱{Number(scanResult.totalBet || 0).toFixed(2)}</span>
              <span>Draw: {scanResult.draw || 'N/A'}</span>
            </div>
          </div>
        )}

        {/* Camera Permission Alert */}
        {hasCameraError && (
          <div className="absolute bottom-16 inset-x-4 bg-rose-900/90 border border-rose-500 text-white rounded-2xl p-2.5 text-xs text-center font-bold flex items-center justify-center gap-2 animate-in fade-in">
            <AlertCircle size={15} />
            <span>{hasCameraError}</span>
          </div>
        )}
      </div>

      {/* BOTTOM FLOATING CALL CONTROLS BAR */}
      <div className="bg-slate-950/90 border-t border-slate-800 px-4 py-3 flex items-center justify-center gap-2.5 shrink-0">
        
        {/* Toggle Mute Microphone */}
        <button
          type="button"
          onClick={handleToggleMic}
          className={`p-3 rounded-full transition-all cursor-pointer shadow-md ${
            isMuted 
              ? 'bg-rose-600/90 hover:bg-rose-500 text-white ring-2 ring-rose-400' 
              : 'bg-slate-800 hover:bg-slate-700 text-white'
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        {/* Toggle Camera Video */}
        <button
          type="button"
          onClick={handleToggleVideo}
          className={`p-3 rounded-full transition-all cursor-pointer shadow-md ${
            isVideoOff 
              ? 'bg-rose-600/90 hover:bg-rose-500 text-white ring-2 ring-rose-400' 
              : 'bg-slate-800 hover:bg-slate-700 text-white'
          }`}
          title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
        >
          {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
        </button>

        {/* Screen Share / Ticket Verification Mode */}
        <button
          type="button"
          onClick={handleToggleScreenShare}
          className={`p-3 rounded-full transition-all cursor-pointer shadow-md ${
            isScreenSharing 
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400' 
              : 'bg-slate-800 hover:bg-slate-700 text-white'
          }`}
          title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen (Live Ticket Inspection)'}
        >
          <Monitor size={18} />
        </button>

        {/* Instant OCR Frame Scanner */}
        <button
          type="button"
          onClick={handleSnapshotOcr}
          disabled={isScanningFrame || callState !== 'connected'}
          className="p-3 bg-[#0084FF] hover:bg-blue-600 text-white rounded-full transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1"
          title="Scan Ticket QR/Barcode directly from live video feed"
        >
          {isScanningFrame ? <RefreshCw size={18} className="animate-spin" /> : <Scan size={18} />}
        </button>

        {/* End Call Button */}
        <button
          type="button"
          onClick={() => {
            cleanUpCall();
            if (onEndCall) onEndCall(true);
          }}
          className="p-3 bg-rose-600 hover:bg-rose-500 text-white rounded-full transition-all cursor-pointer shadow-lg shadow-rose-900/60 active:scale-95 ml-2"
          title="End Call"
        >
          <PhoneOff size={18} />
        </button>

      </div>

    </div>
  );
}
