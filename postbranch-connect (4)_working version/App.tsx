import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, Language, UserRole } from './types';
import { DEFAULT_AGENT_LANGUAGE, DEFAULT_CUSTOMER_LANGUAGE, SUPPORTED_LANGUAGES } from './constants';
import { Button } from './components/Button';
import { LanguageSelector } from './components/LanguageSelector';
import { useGeminiTranslator } from './hooks/useGeminiTranslator';
import { useWebRTC } from './hooks/useWebRTC';
import { Visualizer } from './components/Visualizer';
import { useMediaDevices } from './hooks/useMediaDevices';
import { SettingsModal } from './components/SettingsModal';
import { getApiKey } from './services/geminiService';
import { signaling } from './services/signalingService';
import { TranslationBubble } from './components/TranslationBubble';
import { KioskLandingPage } from './components/KioskLandingPage'; 

// --- STATIC ROOM ID ---
const STATIC_ROOM_ID = "postbranch-main-hall";

// --- ICONS ---
const Icons = {
    PhoneX: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="23" y1="1" x2="1" y2="23"/></svg>
    ),
    MessageSquare: ({ on }: { on: boolean }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    ),
    Mic: ({ on }: { on: boolean }) => (
        on ? 
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> :
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
    ),
    Video: ({ on }: { on: boolean }) => (
        on ?
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> :
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    ),
    Settings: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    ),
    User: () => (
       <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    ),
    Briefcase: () => (
       <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
    ),
    Copy: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
    ),
    Check: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    ),
    Link: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
    )
};

const SessionView: React.FC<{ role: UserRole, selectedLang: Language, unlockedAudioContext: AudioContext | null }> = ({ role, selectedLang, unlockedAudioContext }) => {
  const [showTranscript, setShowTranscript] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const transcriptRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (window.innerWidth < 768) {
        setShowTranscript(false);
    }
  }, []);

  // JOIN ROOM AUTOMATICALLY
  useEffect(() => {
      console.log(`Joining Static Room: ${STATIC_ROOM_ID}`);
      signaling.join(STATIC_ROOM_ID);
  }, []);

  const { config, setConfig, activeStream, devices } = useMediaDevices();
  
  useEffect(() => {
      setConfig(prev => {
          if (prev.voiceName) return prev;
          return {
              ...prev,
              voiceName: role === UserRole.CUSTOMER ? 'Kore' : 'Fenrir'
          };
      });
  }, [role, setConfig]);
  
  const { 
      connect: connectGemini, 
      disconnect: disconnectGemini, 
      isConnected: isGeminiConnected,
      isConnecting: isGeminiConnecting,
      isTranslating,
      targetLanguage,
      transcripts,
      setMuted,
      isPlayingRemoteAudio,
      error: geminiError
  } = useGeminiTranslator({
      userLanguage: selectedLang,
      userRole: role,
      inputStream: activeStream, // Pass active stream for unified mic handling
      audioOutputDeviceId: config.audioOutputId,
      voiceName: config.voiceName,
      externalAudioContext: unlockedAudioContext // Pass the unlocked context
  });

  useEffect(() => {
    // Attempt connection once the stream is ready
    if (!isGeminiConnected && activeStream) {
        connectGemini();
    }
    return () => disconnectGemini();
  }, [activeStream]); 

  useEffect(() => {
      if (transcriptRef.current) {
          transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
      }
  }, [transcripts]);

  const { remoteStream } = useWebRTC({
      userRole: role,
      localStream: activeStream,
      isConnectedToRoom: true
  });

  const handleEndCall = () => {
      disconnectGemini();
      window.location.reload();
  };

  useEffect(() => {
      if (activeStream) {
          activeStream.getAudioTracks().forEach(t => t.enabled = isMicOn);
          setMuted(!isMicOn);
      }
  }, [isMicOn, activeStream, setMuted]);

  useEffect(() => {
      if (activeStream) {
          activeStream.getVideoTracks().forEach(t => t.enabled = isCamOn);
      }
  }, [isCamOn, activeStream]);

  const setLocalVideoRef = useCallback((node: HTMLVideoElement | null) => {
    if (node && activeStream) {
        node.srcObject = activeStream;
        node.muted = true; 
        node.play().catch(e => console.error("Local video play failed", e));
    }
  }, [activeStream]);

  // Handle Remote Video Volume Ducking (lowering volume when translation plays)
  const setRemoteVideoRef = useCallback((node: HTMLVideoElement | null) => {
    remoteVideoRef.current = node;
    if (node && remoteStream) {
        node.srcObject = remoteStream;
        node.muted = false; // Enable original audio
        node.volume = 1.0; 
        node.play().catch(e => console.error("Remote video play failed", e));
    }
  }, [remoteStream]);

  // Force play if stream updates
  useEffect(() => {
      if (remoteVideoRef.current && remoteStream) {
          remoteVideoRef.current.play().catch(() => {});
          remoteVideoRef.current.muted = false; // Ensure unmuted
          remoteVideoRef.current.volume = 1.0;
      }
  }, [remoteStream]);

  // Volume Ducking Effect
  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video) return;

    if (isPlayingRemoteAudio) {
        // Duck the original audio when translation is playing
        video.volume = 0.15; 
    } else {
        // Restore original audio volume
        video.volume = 1.0;
    }
  }, [isPlayingRemoteAudio]);


  return (
      <div className="fixed inset-0 bg-black flex flex-col overflow-hidden font-sans">
        <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)}
            devices={devices}
            config={config}
            setConfig={setConfig}
        />

        {!getApiKey() && (
            <div className="absolute top-0 left-0 right-0 z-50 bg-red-600 text-white text-xs py-1 px-4 text-center font-mono">
                API KEY MISSING
            </div>
        )}
        {geminiError && (
             <div className="absolute top-16 left-0 right-0 z-50 bg-orange-600 text-white text-xs py-1 px-4 text-center font-mono animate-fade-in">
                Translation Error: {geminiError}
            </div>
        )}

        {/* --- HEADER (YELLOW BAR) --- */}
        <header className="h-16 bg-[#FFCC00] flex items-center justify-between px-6 shrink-0 z-40 shadow-sm">
            <div className="flex flex-col justify-center">
                <h1 className="text-xl font-bold text-black leading-tight">PostBranch PegaLab</h1>
                <span className="text-sm font-medium text-black/80">
                    {role === UserRole.CUSTOMER ? 'Video Counter' : 'Agent Portal'}
                </span>
            </div>
            
            <div className="flex items-center gap-4">
                 {/* Connection Status Indicator */}
                 <div className="flex items-center gap-2 bg-black/10 px-3 py-1 rounded-full">
                     <div className={`h-2.5 w-2.5 rounded-full ${isGeminiConnected ? 'bg-green-600' : isGeminiConnecting ? 'bg-blue-500 animate-pulse' : 'bg-red-500'}`}></div>
                     <span className="text-xs font-bold uppercase tracking-wide opacity-70">
                        {isGeminiConnected ? 'Translator Active' : isGeminiConnecting ? 'Connecting AI...' : 'AI Offline'}
                     </span>
                 </div>
                 
                 <div className="hidden md:flex items-center gap-2 font-mono text-xs text-black/50">
                    <Icons.Link />
                    <span>{STATIC_ROOM_ID}</span>
                 </div>
            </div>
        </header>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 relative bg-gray-900 overflow-hidden">
            
            {/* --- LAYOUT CONTAINER --- */}
            <div className="w-full h-full md:grid md:grid-cols-2 md:p-4 md:gap-4 flex flex-col">
                
                {/* REMOTE VIDEO */}
                <div className="relative w-full h-full md:bg-gray-800 md:rounded-2xl overflow-hidden flex flex-col bg-black order-1 md:order-2">
                     {remoteStream ? (
                        <video 
                            ref={setRemoteVideoRef}
                            autoPlay 
                            playsInline 
                            // removed muted={true} to allow original audio
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
                             <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center animate-pulse mb-4">
                                <span className="text-3xl">👋</span>
                            </div>
                            <h3 className="text-xl font-light opacity-80">
                                {targetLanguage 
                                    ? `Waiting for ${targetLanguage.name}...`
                                    : 'Waiting for participant...'}
                            </h3>
                            <div className="mt-4 px-3 py-1 bg-gray-800 rounded font-mono text-xs text-gray-500 select-all">
                                Room: {STATIC_ROOM_ID}
                            </div>
                        </div>
                    )}
                    
                    {/* Remote Info Badge */}
                    {targetLanguage && (
                         <div className="absolute top-4 left-4 md:top-auto md:bottom-4 md:left-4 z-10">
                             <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border-l-4 border-[#FFCC00]">
                                <span className="text-xs font-bold text-white uppercase tracking-wider">
                                    {role === UserRole.CUSTOMER ? 'Agent' : 'Client'}
                                </span>
                                <span className="text-lg">{targetLanguage.flag}</span>
                                {isPlayingRemoteAudio && <span className="text-[#FFCC00] text-[10px] animate-pulse">● Speaking</span>}
                             </div>
                        </div>
                    )}
                </div>

                {/* LOCAL VIDEO */}
                <div className="
                    absolute bottom-24 right-4 w-28 h-40 shadow-2xl rounded-xl overflow-hidden border-2 border-white z-20 
                    md:relative md:inset-auto md:w-full md:h-full md:rounded-2xl md:border-0 md:shadow-none md:order-1
                    bg-gray-800 flex flex-col
                ">
                    <video 
                        ref={setLocalVideoRef} 
                        autoPlay 
                        muted 
                        playsInline 
                        className={`w-full h-full object-cover transform scale-x-[-1] ${!isCamOn ? 'hidden' : ''}`} 
                    />
                    {!isCamOn && (
                        <div className="w-full h-full flex items-center justify-center bg-gray-700 text-gray-400">
                            <Icons.Video on={false} />
                        </div>
                    )}
                    
                    {/* Local Info Badge */}
                    <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4">
                        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-2 py-1 md:px-3 md:py-1.5 rounded-lg">
                            <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-wider">You</span>
                            <span className="text-sm md:text-lg">{selectedLang.flag}</span>
                            <div className="scale-75 origin-left"><Visualizer isActive={isMicOn} /></div>
                        </div>
                    </div>

                    {/* Translation Bubble (Overlay on local video) */}
                    <div className="absolute top-2 left-0 w-full flex justify-center md:bottom-20 md:top-auto">
                         <TranslationBubble show={isTranslating} />
                    </div>
                </div>

            </div>

            {/* Transcript Sidebar */}
            <div className={`
                fixed inset-y-0 right-0 w-full md:w-80 lg:w-96 bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out mt-16
                ${showTranscript ? 'translate-x-0' : 'translate-x-full'}
            `}>
                <div className="h-12 bg-gray-100 flex items-center justify-center relative px-4 border-b border-gray-200">
                    <h3 className="font-bold text-gray-700 uppercase tracking-wider text-sm">Live Transcript</h3>
                    <button onClick={() => setShowTranscript(false)} className="absolute right-2 text-gray-500 hover:bg-gray-200 p-2 rounded-full">
                            <Icons.PhoneX /> 
                    </button>
                </div>
                <div ref={transcriptRef} className="h-[calc(100%-3rem)] overflow-y-auto p-4 space-y-4 bg-white pb-24">
                    {transcripts.map((t) => {
                        const isMe = t.sender === (role === 'CUSTOMER' ? 'Client' : 'Agent');
                        const senderLabel = t.sender; 
                        return (
                            <div key={t.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[90%] rounded-lg p-3 shadow-sm text-sm border-l-4 whitespace-pre-wrap ${
                                    isMe ? 'bg-gray-50 border-[#FFCC00]' : 'bg-gray-50 border-gray-400'
                                }`}>
                                    {t.original && (
                                        <div className="mb-2 pb-2 border-b border-gray-200">
                                            <p className="text-[10px] font-bold text-gray-400 mb-0.5 uppercase tracking-wide">
                                                {senderLabel} (Original)
                                            </p>
                                            <p className="text-gray-800 leading-relaxed">{t.original}</p>
                                        </div>
                                    )}
                                    {t.translation && (
                                        <div>
                                                <p className="text-[10px] font-bold text-[#FFCC00] mb-0.5 uppercase tracking-wide">
                                                    {senderLabel} (Translation)
                                                </p>
                                                <p className="text-black font-medium leading-relaxed">{t.translation}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* --- CONTROL BAR --- */}
        <div className="h-20 bg-white border-t border-gray-200 flex items-center justify-between px-4 md:px-8 z-50 shrink-0">
            {/* Empty space for alignment on desktop, or small status on mobile */}
             <div className="hidden md:block w-20"></div>

            {/* Main Controls */}
            <div className="flex items-center gap-2 md:gap-4 mx-auto">
                <button 
                    onClick={() => setIsMicOn(!isMicOn)}
                    className={`h-10 w-10 md:h-12 md:w-12 flex items-center justify-center rounded-lg transition-all ${isMicOn ? 'bg-gray-100 text-black hover:bg-gray-200' : 'bg-red-50 text-red-500 border border-red-200'}`}
                >
                    <Icons.Mic on={isMicOn} />
                </button>
                <button 
                    onClick={() => setIsCamOn(!isCamOn)}
                    className={`h-10 w-10 md:h-12 md:w-12 flex items-center justify-center rounded-lg transition-all ${isCamOn ? 'bg-gray-100 text-black hover:bg-gray-200' : 'bg-red-50 text-red-500 border border-red-200'}`}
                >
                    <Icons.Video on={isCamOn} />
                </button>
                <div className="w-px h-8 bg-gray-200 mx-1 md:mx-2"></div>
                <Button onClick={handleEndCall} variant="danger" className="!rounded-lg px-4 md:px-6 h-10 md:h-12 shadow-none hover:shadow-md">
                    <span className="hidden md:inline">End Call</span>
                    <span className="md:hidden"><Icons.PhoneX /></span>
                </Button>
            </div>

            {/* Secondary Controls */}
            <div className="flex items-center gap-2">
                 <button 
                    onClick={() => setShowTranscript(!showTranscript)}
                    className={`p-2 md:p-3 rounded-lg transition-all ${showTranscript ? 'bg-[#FFCC00] text-black' : 'hover:bg-gray-100 text-gray-500'}`}
                >
                    <Icons.MessageSquare on={showTranscript} />
                 </button>
                 <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 md:p-3 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                    <Icons.Settings />
                 </button>
            </div>
        </div>
      </div>
  );
};

const LanguagePopup: React.FC<{ role: UserRole, onComplete: (lang: Language, ctx: AudioContext) => void }> = ({ role, onComplete }) => {
    const [selected, setSelected] = useState<Language | null>(null);

    const handleStart = async (lang: Language) => {
        // Unlock Audio Context on User Gesture
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass({ sampleRate: 24000 });
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }
        onComplete(lang, ctx);
    };

    return (
        <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col items-center justify-center p-6 font-sans">
             <div className="w-full max-w-3xl flex flex-col items-center gap-6 md:gap-8">
                 <h2 className="text-2xl md:text-3xl font-bold text-black text-center">
                     {role === UserRole.CUSTOMER ? 'Welche Sprache sprechen Sie?' : 'Select Agent Language'}
                 </h2>
                 <LanguageSelector onSelect={setSelected} selectedLang={selected || undefined} />
                 
                 <div className="w-full max-w-sm flex flex-col gap-4">
                     {selected && (
                        <Button onClick={() => handleStart(selected)} variant="post-yellow" size="lg" fullWidth className="!rounded-lg shadow-xl py-4">
                            {selected.startCallText}
                        </Button>
                     )}
                 </div>
             </div>
        </div>
    );
}

const Launcher: React.FC = () => {
  const handleStart = (role: UserRole) => {
    const url = new URL(window.location.href);
    url.searchParams.set('role', role === UserRole.CUSTOMER ? 'customer' : 'agent');
    // REMOVED RANDOM ROOM GENERATION. Using Single Static Room.
    url.searchParams.set('room', STATIC_ROOM_ID);
    window.location.href = url.toString();
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
        <header className="h-20 bg-[#FFCC00] w-full flex items-center px-6 shadow-sm">
             <h1 className="text-xl md:text-2xl font-bold text-black">PostBranch PegaLab</h1>
             <div className="ml-auto bg-black/10 text-black/60 px-3 py-1 rounded text-sm font-mono">Room: {STATIC_ROOM_ID}</div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
             <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="bg-white rounded-2xl p-8 md:p-10 shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-[#FFCC00] flex flex-col items-center text-center group">
                       <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center text-[#FFCC00] mb-6 group-hover:scale-110 transition-transform"><Icons.User /></div>
                       <h2 className="text-2xl font-bold mb-2">Video Counter</h2>
                       <p className="text-gray-500 mb-8">Start client interface</p>
                       <Button onClick={() => handleStart(UserRole.CUSTOMER)} variant="post-yellow" fullWidth className="!rounded-lg py-4 text-lg">Launch Video Counter</Button>
                  </div>
                  <div className="bg-white rounded-2xl p-8 md:p-10 shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-gray-400 flex flex-col items-center text-center group">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-600 mb-6 group-hover:scale-110 transition-transform"><Icons.Briefcase /></div>
                       <h2 className="text-2xl font-bold mb-2">Agent Portal</h2>
                       <p className="text-gray-500 mb-8">Start agent interface</p>
                       <Button onClick={() => handleStart(UserRole.AGENT)} variant="secondary" fullWidth className="!rounded-lg py-4 text-lg border border-gray-200">Launch Portal</Button>
                  </div>
             </div>
        </div>
    </div>
  );
};

export default function App() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('role');
    if (r === 'customer') setRole(UserRole.CUSTOMER);
    else if (r === 'agent') setRole(UserRole.AGENT);
  }, []);
  
  if (!role) return <Launcher />;
  
  if (!selectedLanguage) {
      if (role === UserRole.CUSTOMER) {
          return (
            <KioskLandingPage 
                onStart={async (lang) => {
                    // Unlock Audio Context on Kiosk Tap
                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                    const ctx = new AudioContextClass({ sampleRate: 24000 });
                    if (ctx.state === 'suspended') await ctx.resume();
                    setAudioCtx(ctx);
                    setSelectedLanguage(lang);
                }} 
            />
          );
      }
      return (
        <LanguagePopup 
            role={role} 
            onComplete={(lang, ctx) => {
                setAudioCtx(ctx);
                setSelectedLanguage(lang);
            }} 
        />
      );
  }
  
  return <SessionView role={role} selectedLang={selectedLanguage} unlockedAudioContext={audioCtx} />;
}