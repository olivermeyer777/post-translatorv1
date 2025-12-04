import { useState, useEffect, useRef, useCallback } from 'react';
import { GeminiLiveService } from '../services/geminiService';
import { Language, UserRole, TranscriptItem } from '../types';
import { signaling, SignalingMessage } from '../services/signalingService';
import { base64ToUint8Array, decodeAudioData } from '../utils/audio';

interface UseGeminiTranslatorProps {
  userLanguage: Language;
  userRole: UserRole;
  inputStream: MediaStream | null;
  audioOutputDeviceId?: string;
  voiceName?: string;
  externalAudioContext?: AudioContext | null;
}

export const useGeminiTranslator = ({ userLanguage, userRole, inputStream, audioOutputDeviceId, voiceName, externalAudioContext }: UseGeminiTranslatorProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<Language | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPlayingRemoteAudio, setIsPlayingRemoteAudio] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(externalAudioContext || null);
  const nextStartTimeRef = useRef<number>(0);
  const serviceRef = useRef<GeminiLiveService | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const translationTimeoutRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const audioPlayTimerRef = useRef<number | null>(null);
  const isPlayingRemoteAudioRef = useRef(false);
  
  const lastBubbleUpdateRef = useRef<number>(0);
  const inputBufferRef = useRef<string>("");
  const outputBufferRef = useRef<string>("");
  const flushTimeoutRef = useRef<number | null>(null);

  // Sync external context if provided later
  useEffect(() => {
    if (externalAudioContext && !audioContextRef.current) {
        audioContextRef.current = externalAudioContext;
        nextStartTimeRef.current = externalAudioContext.currentTime;
    }
  }, [externalAudioContext]);

  // Helper to prevent crosstalk: pause mic when remote audio is playing
  useEffect(() => {
    if (serviceRef.current) {
        serviceRef.current.setMicPaused(isPlayingRemoteAudio);
    }
    
    // Safety Watchdog: If stuck in "Playing" (and thus "Mic Paused") for too long, force release
    // This prevents locking the user out of the conversation
    if (isPlayingRemoteAudio) {
        const watchdog = setTimeout(() => {
            console.warn("Audio Playback Watchdog Triggered: Force releasing mic");
            setIsPlayingRemoteAudio(false);
            isPlayingRemoteAudioRef.current = false;
        }, 8000); // Reduced to 8 seconds to prevent long lockouts
        return () => clearTimeout(watchdog);
    }
  }, [isPlayingRemoteAudio]);

  const addTranscriptChunk = (text: string, senderRole: UserRole, isTranslation: boolean) => {
      setTranscripts(prev => {
          const senderLabel = senderRole === 'CUSTOMER' ? 'Client' : 'Agent';
          const now = Date.now();
          const lastItem = prev[prev.length - 1];
          const PAUSE_THRESHOLD_MS = 3000;
          
          const timeSinceLastUpdate = now - lastBubbleUpdateRef.current;
          let shouldAppend = false;

          if (lastItem && lastItem.sender === senderLabel) {
              if (isTranslation) {
                  shouldAppend = true;
              } else if (timeSinceLastUpdate < PAUSE_THRESHOLD_MS) {
                  shouldAppend = true;
              }
          }

          lastBubbleUpdateRef.current = now;

          if (shouldAppend && lastItem) {
               if (isTranslation) {
                  const spacer = (lastItem.translation && !lastItem.translation.endsWith(' ')) ? ' ' : '';
                  const updatedTranslation = (lastItem.translation + spacer + text).trim();
                  return [...prev.slice(0, -1), { ...lastItem, translation: updatedTranslation }];
               } else {
                  const spacer = (lastItem.original && !lastItem.original.endsWith(' ')) ? ' ' : '';
                  const updatedOriginal = (lastItem.original + spacer + text).trim();
                  return [...prev.slice(0, -1), { ...lastItem, original: updatedOriginal }];
               }
          }

          return [...prev, {
              id: now + Math.random(),
              sender: senderLabel,
              original: isTranslation ? '' : text.trim(),
              translation: isTranslation ? text.trim() : '',
              timestamp: now
          }].slice(-50); 
      });
  };

  const playAudio = useCallback(async (base64Data: string) => {
    try {
        if (!audioContextRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
            nextStartTimeRef.current = audioContextRef.current.currentTime;
        }
        
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        if (audioOutputDeviceId && (ctx as any).setSinkId) {
             try { await (ctx as any).setSinkId(audioOutputDeviceId); } catch(e) {}
        }

        const audioBytes = base64ToUint8Array(base64Data);
        const audioBuffer = await decodeAudioData(audioBytes, ctx);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        
        // Add GainNode to boost translation volume
        const gainNode = ctx.createGain();
        gainNode.gain.value = 1.3; // Boost to 130% to overpower the original audio
        
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        const now = ctx.currentTime;
        // Drift correction: if next start time is behind or way too far ahead (glitch), reset
        if (nextStartTimeRef.current < now || nextStartTimeRef.current > now + 5) {
            nextStartTimeRef.current = now;
        }
        
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;

        setIsPlayingRemoteAudio(true);
        isPlayingRemoteAudioRef.current = true;
        
        const playDurationSec = (nextStartTimeRef.current - now);
        
        if (audioPlayTimerRef.current) clearTimeout(audioPlayTimerRef.current);
        audioPlayTimerRef.current = window.setTimeout(() => {
            if (ctx.currentTime >= nextStartTimeRef.current - 0.2) {
                 setIsPlayingRemoteAudio(false);
                 isPlayingRemoteAudioRef.current = false;
            }
        }, (playDurationSec * 1000) + 150);

    } catch (e) {
        console.error("Error playing remote audio", e);
    }
  }, [audioOutputDeviceId]);

  useEffect(() => {
    const cleanup = signaling.subscribe((msg: SignalingMessage) => {
        if (msg.type === 'PING' && msg.role !== userRole) {
            if (!targetLanguage || targetLanguage.code !== msg.language.code) {
                console.log("Peer Discovered:", msg.language.name);
                setTargetLanguage(msg.language);
            }
            // Respond to ping immediately
            signaling.send({ type: 'JOIN_ROOM', role: userRole, language: userLanguage });
        }
        if (msg.type === 'JOIN_ROOM' && msg.role !== userRole) {
             if (!targetLanguage || targetLanguage.code !== msg.language.code) {
                console.log("Peer Joined:", msg.language.name);
                setTargetLanguage(msg.language);
            }
        }

        if (msg.type === 'AUDIO_CHUNK' && msg.senderRole !== userRole) {
            playAudio(msg.data);
        }

        if (msg.type === 'TRANSCRIPT' && msg.senderRole !== userRole) {
             addTranscriptChunk(msg.text, msg.senderRole, msg.isTranslation);
        }
    });

    const startHeartbeat = () => {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        
        // Send initial ping immediately to Announce Presence
        signaling.send({ type: 'PING', role: userRole, language: userLanguage });
        
        // Fast ping interval initially (every 1s), then slower could be optimization but keep simple for now
        heartbeatRef.current = window.setInterval(() => {
             signaling.send({ type: 'PING', role: userRole, language: userLanguage });
        }, 1000); // 1s Interval for faster discovery
    };
    startHeartbeat();

    return () => {
        cleanup();
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        if (audioPlayTimerRef.current) clearTimeout(audioPlayTimerRef.current);
    };
  }, [userRole, userLanguage, playAudio, targetLanguage]);

  // Connection Logic
  useEffect(() => {
    if (!targetLanguage || isConnected || isConnecting || !inputStream) return;
    
    if (retryCountRef.current > 10) { // Increased retries
        setError("Unable to connect to translation service. Please reload.");
        return;
    }

    const start = async () => {
        setIsConnecting(true);
        setError(null);
        const service = new GeminiLiveService();
        serviceRef.current = service;

        try {
            const myTranslatorVoice = voiceName || (userRole === UserRole.CUSTOMER ? 'Kore' : 'Fenrir');
            console.log(`Connecting Translator: Me(${userLanguage.code}) -> Target(${targetLanguage.code})`);
            
            await service.connect({
                userLanguage: userLanguage.geminiName,
                targetLanguage: targetLanguage.geminiName,
                userRole: userRole,
                voiceName: myTranslatorVoice,
                inputStream,
                onAudioData: (base64Audio) => {
                    // Send translated audio to peer
                    setIsTranslating(false);
                    if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);
                    signaling.send({
                        type: 'AUDIO_CHUNK',
                        senderRole: userRole,
                        data: base64Audio
                    });
                },
                onTranscript: (text, isInput, isFinal) => {
                    // BUFFERING LOGIC:
                    // Only process input if we aren't currently listening to remote audio (Crosstalk protection)
                    if (isInput && isPlayingRemoteAudioRef.current) return;

                    if (isInput) {
                        inputBufferRef.current += text;
                        if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
                        
                        const flush = () => {
                            const fullText = inputBufferRef.current.trim();
                            if (fullText) {
                                setIsTranslating(true);
                                if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);
                                translationTimeoutRef.current = window.setTimeout(() => setIsTranslating(false), 5000);

                                addTranscriptChunk(fullText, userRole, false); 
                                signaling.send({
                                    type: 'TRANSCRIPT',
                                    senderRole: userRole,
                                    text: fullText,
                                    isTranslation: false
                                });
                                inputBufferRef.current = "";
                            }
                        };

                        if (isFinal) {
                            flush();
                        } else {
                            flushTimeoutRef.current = window.setTimeout(flush, 800);
                        }

                    } else {
                        // Output Translation
                        outputBufferRef.current += text;
                        if (isFinal || text.match(/[.!?]$/)) {
                             const fullTranslation = outputBufferRef.current.trim();
                             if (fullTranslation) {
                                addTranscriptChunk(fullTranslation, userRole, true); 
                                signaling.send({
                                    type: 'TRANSCRIPT',
                                    senderRole: userRole,
                                    text: fullTranslation,
                                    isTranslation: true
                                });
                                outputBufferRef.current = "";
                                setIsTranslating(false);
                             }
                        }
                    }
                },
                onClose: () => {
                    console.log("Translator Disconnected");
                    setIsConnected(false);
                    setIsConnecting(false);
                    serviceRef.current = null;
                },
                onError: (err) => {
                    console.warn("Service error, attempting retry...", err);
                    setError(err.message);
                    setIsConnected(false);
                    setIsConnecting(false);
                    serviceRef.current = null;
                    
                    retryCountRef.current += 1;
                    const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
                    retryTimeoutRef.current = window.setTimeout(() => {
                        retryTimeoutRef.current = null;
                        setIsConnected(false); 
                    }, delay);
                }
            });
            setIsConnected(true);
            retryCountRef.current = 0; 
        } catch(e) {
            console.error(e);
            setError("Failed to connect to Translator");
            setIsConnecting(false);
            serviceRef.current = null;
        }
    };
    start();
    return () => {
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);
        if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
    };
  }, [targetLanguage, userLanguage, userRole, isConnected, isConnecting, inputStream, voiceName]);

  const disconnect = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.disconnect();
      serviceRef.current = null;
    }
    // Don't close external audio context
    if (audioContextRef.current && !externalAudioContext) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsConnected(false);
    setTargetLanguage(null);
  }, [externalAudioContext]);

  const connect = useCallback(() => {
      retryCountRef.current = 0;
      setIsConnected(false);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
      if (serviceRef.current) {
          serviceRef.current.setMuted(muted);
      }
  }, []);

  return {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    isTranslating,
    targetLanguage,
    error,
    transcripts,
    setMuted,
    isPlayingRemoteAudio
  };
};