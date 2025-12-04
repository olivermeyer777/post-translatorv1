
import React from 'react';
import { DeviceConfig, MediaDevice } from '../types';
import { GEMINI_VOICES } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: MediaDevice[];
  config: DeviceConfig;
  setConfig: React.Dispatch<React.SetStateAction<DeviceConfig>>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, devices, config, setConfig }) => {
  if (!isOpen) return null;

  const videoInputs = devices.filter(d => d.kind === 'videoinput');
  const audioInputs = devices.filter(d => d.kind === 'audioinput');
  const audioOutputs = devices.filter(d => d.kind === 'audiooutput');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-lg text-gray-800">Device Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Camera */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Camera
            </label>
            <select 
              value={config.videoInputId} 
              onChange={(e) => setConfig(prev => ({ ...prev, videoInputId: e.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
            >
              {videoInputs.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Microphone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
              Microphone
            </label>
            <select 
              value={config.audioInputId} 
              onChange={(e) => setConfig(prev => ({ ...prev, audioInputId: e.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
            >
              {audioInputs.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Speakers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
              Audio Output
            </label>
            <select 
              value={config.audioOutputId} 
              onChange={(e) => setConfig(prev => ({ ...prev, audioOutputId: e.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
            >
              {audioOutputs.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
              ))}
            </select>
            {audioOutputs.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">Output selection not supported by this browser.</p>
            )}
          </div>

          {/* AI Voice */}
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
              </svg>
              AI Voice
             </label>
             <select
                value={config.voiceName || 'Puck'}
                onChange={(e) => setConfig(prev => ({ ...prev, voiceName: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
             >
                {GEMINI_VOICES.map(voice => (
                    <option key={voice} value={voice}>{voice}</option>
                ))}
             </select>
          </div>
        </div>

        <div className="p-4 bg-gray-50 flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
