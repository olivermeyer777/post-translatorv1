
import { Language, UserRole, WebRTCSignal } from '../types';

// Declare Paho global from script tag
declare const Paho: any;

export type SignalingMessage = 
  | { type: 'PING'; role: UserRole; language: Language } 
  | { type: 'JOIN_ROOM'; role: UserRole; language: Language }
  | { type: 'AUDIO_CHUNK'; senderRole: UserRole; data: string }
  | { type: 'TRANSCRIPT'; senderRole: UserRole; text: string; isTranslation: boolean }
  | { type: 'WEBRTC_SIGNAL'; senderRole: UserRole; signal: WebRTCSignal }
  | { type: 'WEBRTC_READY'; role: UserRole };

class SignalingService {
  private client: any = null;
  private listeners: ((msg: SignalingMessage) => void)[] = [];
  private roomId: string | null = null;
  private isConnected: boolean = false;
  private messageQueue: any[] = [];
  private myId: string = Math.random().toString(36).substring(7);
  private reconnectTimer: any = null;
  private isReconnecting: boolean = false;

  constructor() {
    // Initialized on join
  }

  public join(roomId: string) {
    if (this.roomId === roomId && (this.isConnected || this.isReconnecting)) return;
    this.roomId = roomId;

    this.connectMQTT();
  }

  private connectMQTT() {
    if (!this.roomId) return;
    console.log(`Signaling: Joining Room ${this.roomId} via MQTT...`);

    // Using HiveMQ Public Broker (Secure WSS port 8884 for HTTPS compatibility)
    // Client ID must be unique
    const clientId = `postbranch-${this.roomId}-${this.myId}-${Date.now()}`;
    this.client = new Paho.MQTT.Client("broker.hivemq.com", 8884, clientId);

    this.client.onConnectionLost = (responseObject: any) => {
      console.warn("MQTT Connection Lost:", responseObject.errorMessage);
      this.isConnected = false;
      this.scheduleReconnect();
    };

    this.client.onMessageArrived = (message: any) => {
      try {
        const payload = JSON.parse(message.payloadString);
        // Prevent echo (don't process own messages)
        if (payload._senderId === this.myId) return;

        // Filter debug logs
        if (payload.type !== 'AUDIO_CHUNK' && payload.type !== 'WEBRTC_SIGNAL' && payload.type !== 'PING') {
           // console.debug('MQTT Received:', payload);
        }
        
        this.listeners.forEach(l => l(payload));
      } catch (e) {
        console.error("MQTT JSON Parse Error", e);
      }
    };

    // Connect options
    const options = {
      useSSL: true, 
      timeout: 3,
      onSuccess: () => {
        console.log("MQTT Connected Successfully");
        this.isConnected = true;
        this.isReconnecting = false;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        
        // Subscribe to room topic
        this.client.subscribe(`postbranch/v1/${this.roomId}`);
        // Flush pending messages
        this.flushQueue();
      },
      onFailure: (e: any) => {
        console.error("MQTT Connection Failed", e);
        this.isConnected = false;
        this.scheduleReconnect();
      }
    };

    try {
        this.client.connect(options);
    } catch(e) {
        console.error("MQTT Connect Error", e);
        this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
      if (this.isReconnecting) return;
      this.isReconnecting = true;
      console.log("MQTT: Scheduling reconnect in 2s...");
      this.reconnectTimer = setTimeout(() => {
          this.connectMQTT();
      }, 2000);
  }

  public send(msg: SignalingMessage) {
    const payload = { ...msg, _senderId: this.myId };
    
    if (!this.isConnected) {
      // Keep queue small to avoid flooding on reconnect
      if (this.messageQueue.length < 50) {
          this.messageQueue.push(payload);
      }
      return;
    }
    
    try {
        const message = new Paho.MQTT.Message(JSON.stringify(payload));
        message.destinationName = `postbranch/v1/${this.roomId}`;
        // QoS 0 is fire and forget, fastest for real-time audio
        message.qos = 0; 
        this.client.send(message);
    } catch(e) {
        console.warn("MQTT Send Failed", e);
        // If send fails, assume connection issue
        if (this.isConnected) {
            this.isConnected = false;
            this.scheduleReconnect();
        }
    }
  }

  private flushQueue() {
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      try {
        const message = new Paho.MQTT.Message(JSON.stringify(msg));
        message.destinationName = `postbranch/v1/${this.roomId}`;
        this.client.send(message);
      } catch(e) {}
    }
  }

  public subscribe(callback: (msg: SignalingMessage) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
}

export const signaling = new SignalingService();
