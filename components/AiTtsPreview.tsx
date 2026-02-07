
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Play, Square, Loader2, Volume2, AlertCircle, ChevronDown, Rabbit, Music } from 'lucide-react';
import { Voice } from '../types';
import AudioVisualizer from './AudioVisualizer';

interface AiTtsPreviewProps {
  text: string;
  voices: Voice[];
}

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const AiTtsPreview: React.FC<AiTtsPreviewProps> = ({ text, voices }) => {
  const [selectedVoiceName, setSelectedVoiceName] = useState(voices[0]?.name || '');
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopAudio();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, []);

  useEffect(() => {
    if (voices.length > 0 && !voices.find(v => v.name === selectedVoiceName)) {
        setSelectedVoiceName(voices[0].name);
    }
  }, [voices, selectedVoiceName]);

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    if (isMountedRef.current) {
      setIsPlaying(false);
    }
  };

  const handlePlay = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isLoading) return;
    if (isPlaying) {
      stopAudio();
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: { parts: [{ text: text }] },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoiceName } },
          },
        },
      });
      
      if (!isMountedRef.current) return;

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData) throw new Error("Tidak ada data audio yang diterima.");

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      } else if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const rawBytes = decodeBase64(audioData);
      const audioBuffer = await decodeAudioData(rawBytes, audioContextRef.current, 24000);
      
      if (!isMountedRef.current) return;

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = speed * pitch;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        if (isMountedRef.current) setIsPlaying(false);
      };
      
      sourceNodeRef.current = source;
      source.start();
      setIsPlaying(true);

    } catch (err: any) {
      console.error("TTS Error:", err);
      if (isMountedRef.current) setError("Gagal menghasilkan suara. Silakan coba lagi.");
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="p-4 flex flex-col gap-4 bg-white dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-700">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative group w-full sm:w-auto">
                    <select
                        value={selectedVoiceName}
                        onChange={(e) => setSelectedVoiceName(e.target.value)}
                        className="appearance-none w-full sm:w-48 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 py-2 pl-3 pr-10 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-600 cursor-pointer transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        disabled={isLoading || isPlaying}
                    >
                        {voices.map(voice => (
                            <option key={voice.name} value={voice.name}>
                                {voice.name} ({voice.analysis.gender === 'Female' ? 'Wanita' : 'Pria'})
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
                        <ChevronDown size={14} />
                    </div>
                </div>

                <button
                    onClick={handlePlay}
                    disabled={isLoading}
                    className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 transform active:scale-95 ${
                        isPlaying 
                        ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-600' 
                        : 'bg-zinc-900 dark:bg-indigo-600 text-white hover:bg-zinc-800 dark:hover:bg-indigo-500 shadow-md'
                    } ${isLoading ? 'cursor-not-allowed opacity-70' : ''}`}
                >
                    {isLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : isPlaying ? (
                        <Square size={16} className="fill-current" />
                    ) : (
                        <Play size={16} className="fill-current" />
                    )}
                    <span>{isLoading ? 'Memproses...' : isPlaying ? 'Berhenti' : 'Dengarkan'}</span>
                </button>
            </div>

            {/* Sliders for Preview */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-50 dark:border-zinc-700">
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1"><Rabbit size={10}/> Speed</span>
                        <span>{speed.toFixed(1)}x</span>
                    </div>
                    <input 
                        type="range" min="0.5" max="2.0" step="0.1" value={speed}
                        onChange={(e) => setSpeed(parseFloat(e.target.value))}
                        className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1"><Music size={10}/> Pitch</span>
                        <span>{pitch.toFixed(1)}x</span>
                    </div>
                    <input 
                        type="range" min="0.5" max="2.0" step="0.1" value={pitch}
                        onChange={(e) => setPitch(parseFloat(e.target.value))}
                        className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
            </div>
        </div>

        <div 
            className={`h-24 relative flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 overflow-hidden group ${isLoading ? 'cursor-not-allowed' : 'cursor-pointer'}`} 
            onClick={handlePlay}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') handlePlay(); }}
            aria-label={isPlaying ? "Berhenti pratinjau" : "Putar pratinjau audio"}
        >
             <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '8px 8px' }}></div>
            
             <div className="w-full h-full absolute inset-0 flex items-center justify-center pointer-events-none">
                 {isPlaying ? (
                     <div className="w-full h-full opacity-80">
                         <AudioVisualizer isPlaying={true} color={document.documentElement.classList.contains('dark') ? '#a5b4fc' : '#18181b'} />
                     </div>
                 ) : (
                     <div className="flex flex-col items-center gap-2 text-zinc-300 dark:text-zinc-600">
                         <Volume2 size={24} />
                         <span className="text-xs font-medium">Klik untuk pratinjau suara</span>
                     </div>
                 )}
             </div>

             {error && (
                 <div className="absolute inset-0 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-red-500 dark:text-red-400 gap-2 text-sm z-20">
                     <AlertCircle size={16} />
                     <span>{error}</span>
                 </div>
             )}
        </div>
    </div>
  );
};

export default AiTtsPreview;
