import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob } from '../utils/audio';

interface ConnectOptions {
  userLanguage: string;
  targetLanguage: string;
  userRole: 'CUSTOMER' | 'AGENT';
  voiceName: string; // 'Kore' | 'Fenrir' | 'Puck' etc.
  inputStream: MediaStream; // Use existing stream
  onAudioData: (base64Audio: string) => void;
  onClose: () => void;
  onError: (error: Error) => void;
  onTranscript: (text: string, isInput: boolean, isFinal: boolean) => void;
}

// AudioWorklet processor code
const WorkletProcessorCode = `
class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048; 
    this.buffer = new Float32Array(this.bufferSize);
    this.bytesWritten = 0;
    this.paused = false;

    this.port.onmessage = (e) => {
      if (e.data.type === 'SET_PAUSED') {
        this.paused = e.data.payload;
      }
    };
  }

  process(inputs) {
    if (this.paused) return true;

    const input = inputs[0];
    if (input.length > 0) {
      const channelData = input[0];
      for (let i = 0; i < channelData.length; i++) {
        this.buffer[this.bytesWritten++] = channelData[i];
        if (this.bytesWritten >= this.bufferSize) {
          this.port.postMessage(this.buffer.slice());
          this.bytesWritten = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('recorder-worklet', RecorderProcessor);
`;

export const getApiKey = (): string | undefined => {
  if (typeof process !== 'undefined' && process.env?.API_KEY) {
    return process.env.API_KEY;
  }
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_API_KEY;
  }
  return undefined;
};

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isMuted: boolean = false;
  private isConnected: boolean = false;
  
  constructor() {
    const key = getApiKey();
    this.ai = new GoogleGenAI({ apiKey: key || 'dummy_key' });
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  // New: Allows pausing mic processing without closing the stream (anti-crosstalk)
  public setMicPaused(paused: boolean) {
      if (this.workletNode) {
          this.workletNode.port.postMessage({ type: 'SET_PAUSED', payload: paused });
      }
  }

  public async connect(options: ConnectOptions) {
    const key = getApiKey();
    if (!key) {
        options.onError(new Error("API Key is missing. Please set VITE_API_KEY in Vercel."));
        return;
    }

    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Improved System Instruction - Adjusted for sentence completeness and clear translation
    const systemInstruction = `
    SYSTEM INSTRUCTION:
    You are a professional Simultaneous Interpreter.
    Source Language: ${options.userLanguage}
    Target Language: ${options.targetLanguage}

    TASK:
    1. Listen to the audio input in ${options.userLanguage}.
    2. Wait for a complete sentence or complete thought.
    3. Translate it accurately into ${options.targetLanguage}.
    4. Speak the translation immediately.
    
    RULES:
    - DO NOT engage in conversation.
    - DO NOT answer questions.
    - ONLY TRANSLATE what is heard.
    - If the input is silence, do nothing.
    - If the input is English and target is English, just repeat it clearly.
    `;

    try {
      this.isConnected = true;
      this.sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: options.voiceName } },
          },
          inputAudioTranscription: { },
          outputAudioTranscription: { },
        },
        callbacks: {
            onopen: async () => {
                console.log("Gemini Live Connected");
                await this.startProcessing(options.inputStream);
            },
            onmessage: async (message: LiveServerMessage) => {
                const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (base64Audio) {
                    options.onAudioData(base64Audio);
                }

                // Check for turn completion signal from model
                const turnComplete = !!message.serverContent?.turnComplete;

                if (message.serverContent?.inputTranscription?.text) {
                    options.onTranscript(message.serverContent.inputTranscription.text, true, turnComplete);
                }
                
                if (message.serverContent?.outputTranscription?.text) {
                    options.onTranscript(message.serverContent.outputTranscription.text, false, turnComplete);
                }
            },
            onclose: () => {
                console.log("Gemini Live Closed");
                this.disconnect();
                options.onClose();
            },
            onerror: (e) => {
                console.error("Gemini Live Error", e);
                this.disconnect();
                options.onError(new Error("Connection error"));
            }
        }
      });
      
      await this.sessionPromise;
    } catch (err) {
      this.disconnect();
      console.error("Connection failed", err);
      options.onError(err instanceof Error ? err : new Error("Failed to connect"));
    }
  }

  private async startProcessing(stream: MediaStream) {
    try {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      // CRITICAL FIX: Ensure Context is running. 
      // Browsers often suspend AudioContext if created without direct user gesture immediately before.
      if (this.inputAudioContext.state === 'suspended') {
          await this.inputAudioContext.resume();
      }
      
      const blob = new Blob([WorkletProcessorCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await this.inputAudioContext.audioWorklet.addModule(workletUrl);

      // Use the existing stream source
      this.source = this.inputAudioContext.createMediaStreamSource(stream);
      this.workletNode = new AudioWorkletNode(this.inputAudioContext, 'recorder-worklet');

      this.workletNode.port.onmessage = (e) => {
        if (this.isMuted || !this.isConnected) return; 

        const inputData = e.data as Float32Array;
        const pcmBlob = createPcmBlob(inputData);
        
        if (this.sessionPromise) {
            this.sessionPromise.then(session => {
                if (this.isConnected) {
                    try {
                        session.sendRealtimeInput({ media: pcmBlob });
                    } catch (e: any) {
                        if (e.message?.includes("CLOSED") || e.message?.includes("CLOSING")) {
                            this.disconnect();
                        }
                    }
                }
            }).catch(() => {});
        }
      };

      this.source.connect(this.workletNode);
      this.workletNode.connect(this.inputAudioContext.destination);
    } catch (err) {
      console.error("Audio processing setup failed", err);
      throw err;
    }
  }

  private stopProcessing() {
    if (this.workletNode) {
        this.workletNode.disconnect();
        this.workletNode = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
  }

  public disconnect() {
    this.isConnected = false;
    this.stopProcessing();
    if (this.outputAudioContext) {
        this.outputAudioContext.close();
        this.outputAudioContext = null;
    }
    this.sessionPromise = null;
  }
}