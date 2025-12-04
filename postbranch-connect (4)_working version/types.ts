
export enum AppState {
  LANDING = 'LANDING',
  LANGUAGE_SELECTION = 'LANGUAGE_SELECTION',
  ROOM = 'ROOM',
}

export interface KioskText {
  title: string;
  services: string[];
  buttonText: string;
  footerText: string;
}

export interface Language {
  code: string;
  name: string;
  flag: string; // Emoji
  geminiName: string; // How we refer to it in the prompt
  greeting: string; // "Hello", "Guten Tag", etc.
  startCallText: string; // Localized "Start Video Call"
  kiosk: KioskText; // New localized text for the kiosk
}

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  AGENT = 'AGENT',
}

export interface DeviceConfig {
  videoInputId: string;
  audioInputId: string;
  audioOutputId: string;
  voiceName?: string;
}

export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export type WebRTCSignal = 
  | { type: 'OFFER'; sdp: RTCSessionDescriptionInit }
  | { type: 'ANSWER'; sdp: RTCSessionDescriptionInit }
  | { type: 'CANDIDATE'; candidate: RTCIceCandidateInit };

export interface TranscriptItem {
  id: number;
  sender: 'Client' | 'Agent';
  original: string;
  translation: string;
  timestamp: number;
}
