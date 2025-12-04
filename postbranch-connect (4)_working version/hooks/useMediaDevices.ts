
import { useState, useEffect, useCallback, useRef } from 'react';
import { MediaDevice, DeviceConfig } from '../types';

export const useMediaDevices = () => {
  const [devices, setDevices] = useState<MediaDevice[]>([]);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [config, setConfig] = useState<DeviceConfig>({
    videoInputId: '',
    audioInputId: '',
    audioOutputId: '',
    voiceName: 'Puck'
  });
  
  const streamRef = useRef<MediaStream | null>(null);
  const isMounted = useRef(true);
  const lastRequestId = useRef<number>(0);

  const getDevices = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const enumerate = await navigator.mediaDevices.enumerateDevices();
      if (!isMounted.current) return;

      const mapped = enumerate.map(d => ({
        deviceId: d.deviceId,
        label: d.label || `${d.kind} (${d.deviceId.slice(0, 5)}...)`,
        kind: d.kind
      }));
      setDevices(mapped);

      setConfig(prev => {
        if (prev.videoInputId && prev.audioInputId) return prev;
        return {
            videoInputId: prev.videoInputId || mapped.find(d => d.kind === 'videoinput')?.deviceId || '',
            audioInputId: prev.audioInputId || mapped.find(d => d.kind === 'audioinput')?.deviceId || '',
            audioOutputId: prev.audioOutputId || mapped.find(d => d.kind === 'audiooutput')?.deviceId || '',
            voiceName: prev.voiceName || 'Puck'
        };
      });
    } catch (e) {
      console.error("Error enumerating devices", e);
    }
  }, []);

  const startCamera = useCallback(async (videoDeviceId?: string, audioDeviceId?: string) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return null;
    
    const requestId = Date.now();
    lastRequestId.current = requestId;

    try {
        const videoConstraint = videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true;
        const audioConstraint = audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true;

        const stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraint,
            // Enable Audio for WebRTC "Original Voice" transmission
            audio: audioConstraint 
        });
        
        if (lastRequestId.current !== requestId || !isMounted.current) {
            stream.getTracks().forEach(t => t.stop());
            return null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }

        streamRef.current = stream;
        setActiveStream(stream);
        
        getDevices();
        return stream;
    } catch (e: any) {
        console.warn("Camera start failed:", e);
        if (lastRequestId.current === requestId && isMounted.current) {
            setActiveStream(null);
        }
        return null;
    }
  }, [getDevices]);

  useEffect(() => {
    isMounted.current = true;
    getDevices();
    startCamera();

    return () => {
        isMounted.current = false;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
    };
  }, []); 

  useEffect(() => {
     if (!isMounted.current) return;
     // Re-start if IDs change
     const currentStream = streamRef.current;
     if (currentStream) {
         const vidTrack = currentStream.getVideoTracks()[0];
         const audTrack = currentStream.getAudioTracks()[0];
         
         const vidChanged = config.videoInputId && vidTrack?.getSettings().deviceId !== config.videoInputId;
         const audChanged = config.audioInputId && audTrack?.getSettings().deviceId !== config.audioInputId;

         if (vidChanged || audChanged) {
             startCamera(config.videoInputId, config.audioInputId);
         }
     }
  }, [config.videoInputId, config.audioInputId, startCamera]);

  return {
    devices,
    config,
    setConfig,
    activeStream,
    refreshDevices: getDevices
  };
};
