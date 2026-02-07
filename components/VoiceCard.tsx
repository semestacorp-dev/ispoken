
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useEffect } from 'react';
import { Play, Pause, Activity, Radio } from 'lucide-react';
import { Voice } from '../types';
import AudioVisualizer from './AudioVisualizer';

interface VoiceCardProps {
  voice: Voice;
  isPlaying: boolean;
  onPlayToggle: (voiceName: string) => void;
  onOpenStudio?: (voice: Voice) => void;
}

const VoiceCard: React.FC<VoiceCardProps> = ({ voice, isPlaying, onPlayToggle, onOpenStudio }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback failed", e));
      } else {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [isPlaying]);

  const handleAudioEnded = () => {
    if (isPlaying) {
      onPlayToggle(voice.name);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
      onPlayToggle(voice.name);
  };

  const handleStudioClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onOpenStudio) onOpenStudio(voice);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPlayToggle(voice.name);
      }
  };

  return (
    <div 
        className={`group relative bg-white dark:bg-zinc-800 border transition-all duration-200 flex flex-col sm:flex-row h-auto sm:h-28 cursor-pointer rounded-2xl overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-600 ${isPlaying ? 'border-indigo-200 dark:border-indigo-800 ring-2 ring-indigo-100 dark:ring-indigo-900/30 shadow-md' : 'border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md'}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label={`Play sample for ${voice.name}`}
    >
      
      {/* Visualizer / Action Area - Left Side */}
      <div className="relative h-20 sm:h-full w-full sm:w-28 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0 border-b sm:border-b-0 sm:border-r border-zinc-100 dark:border-zinc-700 flex items-center justify-center overflow-hidden">
        
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '8px 8px' }}></div>

        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${isPlaying ? 'opacity-0' : 'opacity-100'}`}>
             <Activity size={20} className="text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
        </div>

        <div className={`absolute inset-0 z-10 transition-opacity duration-200 ${isPlaying ? 'opacity-100' : 'opacity-0'}`}>
             <AudioVisualizer isPlaying={isPlaying} color={document.documentElement.classList.contains('dark') ? '#a5b4fc' : '#18181b'} />
        </div>

        <div className={`absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-200 ${isPlaying ? 'opacity-0 hover:opacity-100 focus:opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus:opacity-100'}`}>
            <div className="h-9 w-9 bg-zinc-900 dark:bg-zinc-100 rounded-full flex items-center justify-center shadow-lg transform transition-transform active:scale-95">
                {isPlaying ? <Pause size={14} className="text-white dark:text-zinc-900" fill="currentColor" /> : <Play size={14} className="text-white dark:text-zinc-900 ml-0.5" fill="currentColor" />}
            </div>
        </div>
        
        <div className={`absolute top-2 left-2 w-1.5 h-1.5 rounded-full ${isPlaying ? 'animate-google-colors' : 'bg-zinc-200 dark:bg-zinc-600'}`}></div>
      </div>

      {/* Content Area - Right Side */}
      <div className="flex-1 p-4 flex flex-col justify-center min-w-0 bg-white dark:bg-zinc-800 pr-12 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white tracking-tight">{voice.name}</h3>
        </div>
        
        {/* Description */}
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2 font-light">
            {voice.analysis.characteristics.join(', ')}
        </p>

        {/* Studio Quick Action */}
        <button 
            onClick={handleStudioClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-zinc-100 dark:border-zinc-800 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-sm"
            title="Gunakan untuk Voice Over"
        >
            <Radio size={16} />
        </button>
      </div>

      <audio ref={audioRef} src={voice.audioSampleUrl} onEnded={handleAudioEnded} preload="none" />
    </div>
  );
};

export default VoiceCard;
