
import { useEffect, useRef, useState, useCallback } from 'react';
import { signaling, SignalingMessage } from '../services/signalingService';
import { UserRole } from '../types';

interface UseWebRTCProps {
  userRole: UserRole;
  localStream: MediaStream | null;
  isConnectedToRoom: boolean; 
}

export const useWebRTC = ({ userRole, localStream, isConnectedToRoom }: UseWebRTCProps) => {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  
  // "Polite" peer accepts offers even if it's making one. 
  // AGENT = Polite, CUSTOMER = Impolite (initiator)
  const isPolite = userRole === UserRole.AGENT;
  const makingOffer = useRef(false);
  const ignoreOffer = useRef(false);
  const isSettingRemote = useRef(false);
  const hasNegotiated = useRef(false);

  // Robust free STUN list
  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ];

  const createPeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    console.log("WebRTC: Creating new PeerConnection");
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signaling.send({
          type: 'WEBRTC_SIGNAL',
          senderRole: userRole,
          signal: { type: 'CANDIDATE', candidate: event.candidate.toJSON() }
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("WebRTC: Received Remote Track", event.track.kind);
      if (event.streams && event.streams[0]) {
         setRemoteStream(event.streams[0]);
      }
    };

    // Perfect Negotiation Trigger
    pc.onnegotiationneeded = async () => {
        try {
            makingOffer.current = true;
            await pc.setLocalDescription();
            signaling.send({
                type: 'WEBRTC_SIGNAL',
                senderRole: userRole,
                signal: { type: 'OFFER', sdp: pc.localDescription! }
            });
            hasNegotiated.current = true;
        } catch (err) {
            console.error("Negotiation error", err);
        } finally {
            makingOffer.current = false;
        }
    };

    // Transceivers ensure we are ready to receive even if we don't send
    pc.addTransceiver('audio', { direction: 'sendrecv' });
    pc.addTransceiver('video', { direction: 'sendrecv' });

    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    pcRef.current = pc;
    return pc;
  }, [userRole, localStream]);

  // Signaling Handler
  useEffect(() => {
    const handleSignal = async (msg: SignalingMessage) => {
       const pc = pcRef.current || createPeerConnection();

       // TRIGGER 1: Peer Joined
       if (msg.type === 'JOIN_ROOM' && msg.role !== userRole) {
           console.log("WebRTC: Peer joined, announcing READY");
           // Announce we are ready so they can initiate if they are Impolite
           signaling.send({ type: 'WEBRTC_READY', role: userRole });
           
           // If I am Impolite (Customer) and I haven't negotiated yet, I should probably initiate
           // But usually we wait for the polite peer to be ready? 
           // Standard pattern: Impolite initiates when it sees Polite peer.
           if (!isPolite && localStream) {
              // Trigger negotiation manually if needed, but onnegotiationneeded should handle it once tracks are added
           }
       }

       // TRIGGER 2: Peer is Ready
       if (msg.type === 'WEBRTC_READY' && msg.role !== userRole) {
           console.log("WebRTC: Peer is READY");
           
           // If I am Impolite (Customer), I MUST initiate the offer now that I know peer is there.
           if (!isPolite && localStream) {
                // Check if we need to add tracks (redundant but safe)
                const senders = pc.getSenders();
                const hasVideo = senders.some(s => s.track?.kind === 'video');
                if (!hasVideo) {
                    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
                }
                // If onnegotiationneeded didn't fire (because tracks were already there?), force offer
                // Only force if we haven't negotiated or if state is stable
                if (pc.signalingState === 'stable') {
                    // This triggers onnegotiationneeded implicitly or we can call createOffer manually
                    // Let's rely on onnegotiationneeded logic, or force it if needed:
                    // pc.createOffer()...
                    // But onnegotiationneeded is cleaner.
                }
           }
       }

       if (msg.type !== 'WEBRTC_SIGNAL' || msg.senderRole === userRole) return;
       const { signal } = msg;

       try {
           if (signal.type === 'OFFER') {
               // Glare handling
               const offerCollision = makingOffer.current || pc.signalingState !== 'stable';
               ignoreOffer.current = !isPolite && offerCollision;
               
               if (ignoreOffer.current) {
                   console.log("WebRTC: Glare detected, ignoring offer (Impolite peer)");
                   return;
               }

               isSettingRemote.current = true;
               await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
               isSettingRemote.current = false;

               // If we received offer, we must ensure we are sending our tracks too
               if (localStream) {
                   const senders = pc.getSenders();
                   const hasVideo = senders.some(s => s.track?.kind === 'video');
                   if (!hasVideo) {
                        localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
                   }
               }

               await pc.setLocalDescription();
               signaling.send({
                   type: 'WEBRTC_SIGNAL',
                   senderRole: userRole,
                   signal: { type: 'ANSWER', sdp: pc.localDescription! }
               });
               hasNegotiated.current = true;

           } else if (signal.type === 'ANSWER') {
               if (pc.signalingState === 'stable') return; // Already stable
               isSettingRemote.current = true;
               await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
               isSettingRemote.current = false;
               hasNegotiated.current = true;

           } else if (signal.type === 'CANDIDATE') {
               try {
                   await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
               } catch (err) {
                   if (!ignoreOffer.current) console.warn("Candidate Error (Ignored)", err);
               }
           }
       } catch (err) {
           console.error("WebRTC Signaling Error", err);
           isSettingRemote.current = false;
       }
    };

    return signaling.subscribe(handleSignal);
  }, [userRole, createPeerConnection, localStream, isPolite]);

  // Announce presence
  useEffect(() => {
      if (isConnectedToRoom) {
          signaling.send({ type: 'WEBRTC_READY', role: userRole });
      }
  }, [isConnectedToRoom, userRole]);

  // Track Update Logic - ensure tracks are added whenever localStream becomes available
  useEffect(() => {
      const pc = pcRef.current;
      if (pc && localStream) {
          const senders = pc.getSenders();
          let changed = false;
          localStream.getTracks().forEach(track => {
              const sender = senders.find(s => s.track?.kind === track.kind);
              if (sender) {
                  if (sender.track?.id !== track.id) {
                      sender.replaceTrack(track);
                  }
              } else {
                  pc.addTrack(track, localStream);
                  changed = true;
              }
          });
          // If we added new tracks and connection is already established, onnegotiationneeded will fire.
      }
  }, [localStream]);

  return { remoteStream };
};
