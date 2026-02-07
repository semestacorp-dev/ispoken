
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Modality } from "@google/genai";
import { BookmarkPlus, CheckCircle2, Download, Layers, Loader2, Mic2, Play, Settings2, Share2, SlidersHorizontal, Square, Upload, Video, Wand2, Volume2, VolumeX, Sparkles, Smile, MessageSquareText, Cpu, X, UserCog, Edit3 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Project, Voice } from '../types';
import AudioVisualizer from './AudioVisualizer';

interface StudioPanelProps {
  voices: Voice[];
  initialVoice: Voice | null;
  initialText?: string;
  initialInstruction?: string;
  onSaveProject: (project: Project) => void;
  onClose: () => void;
}

const AMBIENCE_OPTIONS = [
  { id: 'none', name: 'None', url: '' },
  { id: 'cafe', name: 'Cafe', url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg' },
  { id: 'office', name: 'Office', url: 'https://actions.google.com/sounds/v1/ambiences/office_ambience.ogg' },
  { id: 'nature', name: 'Nature', url: 'https://actions.google.com/sounds/v1/ambiences/rain_on_roof.ogg' },
];

const PLATFORM_TARGETS = [
  { id: 'tiktok', name: 'TikTok', icon: <Share2 size={12}/> },
  { id: 'youtube', name: 'YouTube', icon: <Video size={12}/> },
  { id: 'podcast', name: 'Podcast', icon: <Mic2 size={12}/> },
];

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

const StudioPanel: React.FC<StudioPanelProps> = ({ voices, initialVoice, initialText = '', initialInstruction = '', onSaveProject, onClose }) => {
  const [selectedVoice, setSelectedVoice] = useState<Voice>(initialVoice || voices[0]);
  const [text, setText] = useState(initialText);
  const [systemInstruction, setSystemInstruction] = useState(initialInstruction);
  const [showPersonaEditor, setShowPersonaEditor] = useState(!!initialInstruction);
  const [ambienceId, setAmbienceId] = useState('none');
  
  // Mixer States
  const [voiceVol, setVoiceVol] = useState(1.0);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [ambienceVol, setAmbienceVol] = useState(0.4);
  const [sfxVol, setSfxVol] = useState(0.7);
  const [masterVol, setMasterVol] = useState(1.0);

  // Vocal FX States
  const [vocalFxType, setVocalFxType] = useState('none');
  const [fxIntensity, setFxIntensity] = useState(0.5);

  // AI Script States
  const [showAiWriter, setShowAiWriter] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [targetPlatform, setTargetPlatform] = useState('tiktok');

  // Lip Sync States
  const [isLipSyncEnabled, setIsLipSyncEnabled] = useState(false);
  const [isProcessingLipSync, setIsProcessingLipSync] = useState(false);
  const [lipSyncStatus, setLipSyncStatus] = useState('');
  const [syncedVideoUrl, setSyncedVideoUrl] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const voiceGainRef = useRef<GainNode | null>(null);
  const ambGainRef = useRef<GainNode | null>(null);
  const sfxGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const ambienceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const sfxNodesRef = useRef<AudioBufferSourceNode[]>([]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    const t = 0.1;
    const now = audioContextRef.current?.currentTime || 0;
    if (voiceGainRef.current) voiceGainRef.current.gain.setTargetAtTime(voiceMuted ? 0 : voiceVol, now, t);
    if (ambGainRef.current) ambGainRef.current.gain.setTargetAtTime(ambienceVol, now, t);
    if (sfxGainRef.current) sfxGainRef.current.gain.setTargetAtTime(sfxVol, now, t);
    if (masterGainRef.current) masterGainRef.current.gain.setTargetAtTime(masterVol, now, t);
  }, [voiceVol, voiceMuted, ambienceVol, sfxVol, masterVol]);

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

  const stopAudio = () => {
    if (sourceNodeRef.current) { try { sourceNodeRef.current.stop(); } catch (e) {} sourceNodeRef.current = null; }
    if (ambienceNodeRef.current) { try { ambienceNodeRef.current.stop(); } catch (e) {} ambienceNodeRef.current = null; }
    sfxNodesRef.current.forEach(node => { try { node.stop(); } catch(e) {} });
    sfxNodesRef.current = [];
    if (isMountedRef.current) setIsPlaying(false);
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
  };

  const handleGenerateScript = async () => {
    if (!aiPrompt.trim() || isGeneratingScript) return;
    setIsGeneratingScript(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Tulis naskah pendek untuk ${targetPlatform} tentang "${aiPrompt}" dalam Bahasa Indonesia yang sangat natural. Maks 30 kata.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setText((response.text || '').trim().replace(/^"|"$/g, ''));
      setShowAiWriter(false);
    } catch (err) { setError("Gagal membuat naskah."); } finally { setIsGeneratingScript(false); }
  };

  const getVideoFrameAsBase64 = (): string | null => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png').split(',')[1];
  };

  const processLipSync = async () => {
    if (!videoUrl || !text.trim() || isProcessingLipSync) return;
    
    // Check if user has selected API key (Required for Veo)
    if (!(await (window as any).aistudio.hasSelectedApiKey())) {
      await (window as any).aistudio.openSelectKey();
    }

    setIsProcessingLipSync(true);
    setLipSyncStatus('Mengekstrak karakter...');
    setError(null);

    try {
      const base64Image = getVideoFrameAsBase64();
      if (!base64Image) throw new Error("Gagal mengambil frame video.");

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      setLipSyncStatus('Menghubungkan ke Mesin Veo...');

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `A highly realistic video of this character speaking and moving their lips perfectly to the following script: "${text}". The head and eyes should move naturally while speaking. High fidelity, studio quality.`,
        image: {
          imageBytes: base64Image,
          mimeType: 'image/png',
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      while (!operation.done) {
        setLipSyncStatus('Menganalisis fonem & gerakan bibir (Sedang diproses)...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({operation: operation});
      }

      setLipSyncStatus('Finalisasi video...');
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("Video generation failed.");

      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      const syncedUrl = URL.createObjectURL(blob);
      setSyncedVideoUrl(syncedUrl);
      setLipSyncStatus('Selesai!');
      
      // Auto-switch to synced video if preview is active
      if (videoRef.current) {
        videoRef.current.src = syncedUrl;
      }
    } catch (err: any) {
      console.error("LipSync Error:", err);
      setError("Gagal memproses Lip-Sync AI.");
      if (err.message?.includes("entity was not found")) {
        await (window as any).aistudio.openSelectKey();
      }
    } finally {
      setIsProcessingLipSync(false);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim() || isLoading) return;
    stopAudio();
    setIsLoading(true);
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: { parts: [{ text: text }] },
        config: {
          systemInstruction: systemInstruction || undefined,
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice.name } } },
        },
      });
      
      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData) throw new Error("Audio generation failed");

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      } else if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const ctx = audioContextRef.current;
      
      // Setup Analyser if not present
      if (!analyserRef.current) {
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 256;
      }

      const mGain = ctx.createGain();
      mGain.gain.setValueAtTime(masterVol, ctx.currentTime);
      masterGainRef.current = mGain;
      
      // Chain: Sources -> Mixer Gains -> Master Gain -> Analyser -> Destination
      mGain.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);

      const rawBytes = decodeBase64(audioData);
      setAudioBlob(new Blob([rawBytes], { type: 'audio/pcm' }));
      const vocalBuffer = await decodeAudioData(rawBytes, ctx, 24000);
      let startTime = ctx.currentTime + 0.1;

      // Ambience
      const ambOption = AMBIENCE_OPTIONS.find(o => o.id === ambienceId);
      if (ambOption?.url) {
          const res = await fetch(ambOption.url);
          const ab = await res.arrayBuffer();
          const ambBuf = await ctx.decodeAudioData(ab);
          const aGain = ctx.createGain();
          aGain.gain.setValueAtTime(ambienceVol, ctx.currentTime);
          ambGainRef.current = aGain;
          aGain.connect(mGain);
          const s = ctx.createBufferSource();
          s.buffer = ambBuf; s.loop = true; s.connect(aGain); s.start(startTime);
          ambienceNodeRef.current = s;
      }

      // Vocal
      const vSource = ctx.createBufferSource();
      vSource.buffer = vocalBuffer;
      const vGain = ctx.createGain();
      vGain.gain.setValueAtTime(voiceMuted ? 0 : voiceVol, ctx.currentTime);
      voiceGainRef.current = vGain;
      vSource.connect(vGain).connect(mGain);
      vSource.start(startTime);
      sourceNodeRef.current = vSource;

      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }

      vSource.onended = () => { if (isMountedRef.current) setIsPlaying(false); };
      setIsPlaying(true);
    } catch (err) { setError("Render gagal."); } finally { setIsLoading(false); }
  };

  const handleSave = () => {
    if (!text.trim()) return;
    const project: Project = {
      id: Math.random().toString(36).substr(2, 9),
      title: text.slice(0, 20) + (text.length > 20 ? '...' : ''),
      text,
      voiceName: selectedVoice.name,
      systemInstruction,
      createdAt: Date.now(),
    };
    onSaveProject(project);
    setIsSaved(true);
    setTimeout(() => { if (isMountedRef.current) setIsSaved(false); }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-end">
      <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md transition-opacity" onClick={onClose}></div>
      
      <div className="relative h-[92vh] sm:h-full w-full max-w-2xl bg-white dark:bg-zinc-950 shadow-2xl flex flex-col rounded-t-[2.5rem] sm:rounded-none animate-slide-up sm:animate-slide-right overflow-hidden border-t sm:border-t-0 sm:border-l border-white/10">
        
        {/* Compact Header */}
        <div className="p-4 sm:p-6 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
                    <Layers size={20} />
                </div>
                <div>
                    <h2 className="text-sm sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight">Studio Voice Over</h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Live Engine v2.5</p>
                </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 active:scale-90 transition-transform">
                <X size={20} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6">
            
            {/* AI Assistant & Persona Module */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-[2rem] p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex gap-4">
                        <button 
                            onClick={() => { setShowAiWriter(true); setShowPersonaEditor(false); }}
                            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${showAiWriter ? 'text-indigo-600' : 'text-zinc-400'}`}
                        >
                            <Wand2 size={14} /> AI Script
                        </button>
                        <button 
                            onClick={() => { setShowPersonaEditor(true); setShowAiWriter(false); }}
                            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${showPersonaEditor ? 'text-indigo-600' : 'text-zinc-400'}`}
                        >
                            <UserCog size={14} /> AI Persona
                        </button>
                    </div>
                    <button onClick={() => { setShowAiWriter(false); setShowPersonaEditor(false); }} className="p-2 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-800">
                        <Edit3 size={14} className="text-indigo-500" />
                    </button>
                </div>

                {showAiWriter && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="flex gap-2">
                            {PLATFORM_TARGETS.map(p => (
                                <button key={p.id} onClick={() => setTargetPlatform(p.id)} className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${targetPlatform === p.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400'}`}>
                                    {p.name}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Ide naskah..." className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-500/20" />
                            <button onClick={handleGenerateScript} disabled={isGeneratingScript || !aiPrompt} className="absolute right-2 top-1.5 h-8 w-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-lg active:scale-90">
                                {isGeneratingScript ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="white" />}
                            </button>
                        </div>
                    </div>
                )}

                {showPersonaEditor && (
                    <div className="space-y-3 animate-fade-in">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Instruksi Suara (Persona)</span>
                        <textarea 
                            value={systemInstruction} 
                            onChange={(e) => setSystemInstruction(e.target.value)} 
                            placeholder="Deskripsikan gaya bicara (misal: energetik, berbisik, sedih...)" 
                            className="w-full h-24 bg-white/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-xs resize-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>
                )}

                {!showAiWriter && !showPersonaEditor && (
                    <div className="space-y-4 animate-fade-in">
                        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Tulis naskah atau gunakan AI..." className="w-full h-24 bg-white/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-sm resize-none focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                )}
            </div>

            {/* Mixer & LipSync Modules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Video Module */}
                <div className="bg-zinc-900 rounded-[2rem] aspect-video sm:aspect-auto sm:h-full relative overflow-hidden group shadow-xl border border-zinc-800">
                    <video ref={videoRef} src={syncedVideoUrl || videoUrl || ""} loop muted className={`w-full h-full object-cover ${videoUrl ? 'opacity-100' : 'opacity-20'}`} />
                    
                    {!videoUrl && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700 pointer-events-none">
                            <Video size={48} strokeWidth={1} />
                            <span className="text-xs font-bold uppercase mt-2 tracking-widest">No Character</span>
                        </div>
                    )}

                    {isProcessingLipSync && (
                        <div className="absolute inset-0 bg-indigo-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-pulse">
                            <Cpu size={48} className="text-indigo-400 mb-4 animate-spin" />
                            <h3 className="text-white font-black text-lg mb-1 uppercase tracking-tighter">AI Lip-Sync Engine</h3>
                            <p className="text-indigo-300 text-[10px] font-bold tracking-widest uppercase">{lipSyncStatus}</p>
                        </div>
                    )}

                    <div className="absolute bottom-4 right-4 flex gap-2">
                        <button onClick={() => fileInputRef.current?.click()} className="h-10 px-4 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-white/20 active:scale-95">
                            <Upload size={14} className="mr-2" /> Change
                        </button>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setVideoUrl(URL.createObjectURL(file));
                          setSyncedVideoUrl(null);
                        }
                    }} accept="video/*" className="hidden" />
                </div>

                {/* Console Module */}
                <div className="bg-zinc-50 dark:bg-zinc-900 rounded-[2.5rem] p-6 space-y-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                            <SlidersHorizontal size={14} /> Mix Console
                        </span>
                        {videoUrl && (
                            <button 
                                onClick={() => setIsLipSyncEnabled(!isLipSyncEnabled)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase transition-all border ${isLipSyncEnabled ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700'}`}
                            >
                                <Smile size={12} /> Lip-Sync {isLipSyncEnabled ? 'ON' : 'OFF'}
                            </button>
                        )}
                    </div>
                    
                    <div className="flex justify-between items-end gap-4 h-40">
                        {/* Voice Fader */}
                        <div className="flex flex-col items-center gap-3 flex-1">
                            <div className="w-10 h-full bg-zinc-200 dark:bg-zinc-800 rounded-full relative overflow-hidden p-1 shadow-inner">
                                <input type="range" min="0" max="1.5" step="0.01" value={voiceVol} onChange={(e) => setVoiceVol(parseFloat(e.target.value))} className="absolute inset-0 w-32 h-10 -rotate-90 origin-center translate-y-11 appearance-none bg-transparent cursor-pointer accent-indigo-500 z-10" />
                                <div className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-full shadow-[0_-4px_20px_rgba(99,102,241,0.5)] transition-all duration-75" style={{ height: `${(voiceVol / 1.5) * 100}%` }} />
                            </div>
                            <button onClick={() => setVoiceMuted(!voiceMuted)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${voiceMuted ? 'bg-red-500 text-white' : 'bg-white dark:bg-zinc-800 text-zinc-400 shadow-sm border border-zinc-200 dark:border-zinc-700'}`}>
                                <VolumeX size={14} />
                            </button>
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-tighter">Vocal</span>
                        </div>

                        {/* Ambient Fader */}
                        <div className="flex flex-col items-center gap-3 flex-1">
                            <div className="w-10 h-full bg-zinc-200 dark:bg-zinc-800 rounded-full relative overflow-hidden p-1 shadow-inner">
                                <input type="range" min="0" max="1.5" step="0.01" value={ambienceVol} onChange={(e) => setAmbienceVol(parseFloat(e.target.value))} className="absolute inset-0 w-32 h-10 -rotate-90 origin-center translate-y-11 appearance-none bg-transparent cursor-pointer accent-emerald-500 z-10" />
                                <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-full transition-all duration-75" style={{ height: `${(ambienceVol / 1.5) * 100}%` }} />
                            </div>
                            <select value={ambienceId} onChange={(e) => setAmbienceId(e.target.value)} className="w-8 h-8 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[8px] font-bold rounded-full p-1 appearance-none text-center cursor-pointer">
                                {AMBIENCE_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.name.charAt(0)}</option>)}
                            </select>
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-tighter">BG</span>
                        </div>

                        {/* Master Fader */}
                        <div className="flex flex-col items-center gap-3 flex-1">
                            <div className="w-10 h-full bg-zinc-200 dark:bg-zinc-800 rounded-full relative overflow-hidden p-1 shadow-inner ring-2 ring-indigo-500/20">
                                <input type="range" min="0" max="1.5" step="0.01" value={masterVol} onChange={(e) => setMasterVol(parseFloat(e.target.value))} className="absolute inset-0 w-32 h-10 -rotate-90 origin-center translate-y-11 appearance-none bg-transparent cursor-pointer accent-zinc-900 dark:accent-white z-10" />
                                <div className="absolute bottom-0 left-0 right-0 bg-zinc-900 dark:bg-white rounded-full transition-all duration-75" style={{ height: `${(masterVol / 1.5) * 100}%` }} />
                            </div>
                            <div className="w-8 h-8 flex items-center justify-center"><Volume2 size={16} className="text-zinc-400" /></div>
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-tighter">Master</span>
                        </div>
                    </div>

                    {isLipSyncEnabled && videoUrl && (
                        <button 
                            onClick={processLipSync}
                            disabled={isProcessingLipSync || !text.trim()}
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 animate-fade-in"
                        >
                            {isProcessingLipSync ? <Loader2 size={14} className="animate-spin" /> : <MessageSquareText size={14} />}
                            {isProcessingLipSync ? 'Syncing...' : 'Lip-Sync AI'}
                        </button>
                    )}
                </div>
            </div>

            {/* Visualizer & Feedback Module */}
            <div className="h-28 bg-zinc-900 rounded-[2.5rem] relative overflow-hidden flex items-center justify-center border border-zinc-800 shadow-2xl">
                {isPlaying ? (
                  <AudioVisualizer 
                    isPlaying={true} 
                    color="#6366f1" 
                    analyser={analyserRef.current || undefined} 
                  />
                ) : (
                  <div className="flex flex-col items-center text-zinc-800 opacity-20">
                    <Volume2 size={32} />
                    <span className="text-[8px] font-black uppercase tracking-widest mt-2">Ready to Engine</span>
                  </div>
                )}
                {isLoading && (
                    <div className="absolute inset-0 bg-indigo-600/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 animate-fade-in">
                        <Loader2 size={24} className="text-white animate-spin" />
                        <span className="text-[10px] text-white font-black uppercase tracking-widest">Processing Audio...</span>
                    </div>
                )}
            </div>
        </div>

        {/* Action Bar */}
        <div className="p-5 sm:p-6 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-4 gap-3">
            <button onClick={handleGenerate} disabled={isLoading || !text} className="col-span-3 h-14 bg-zinc-900 dark:bg-indigo-600 hover:bg-zinc-800 dark:hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-3xl shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all">
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : (isPlaying ? <Square size={20} fill="white" /> : <Play size={20} fill="white" className="ml-1" />)}
                <span className="text-sm uppercase tracking-wider">{isPlaying ? 'Stop' : 'Render & Play'}</span>
            </button>
            <button onClick={handleSave} disabled={!text} className="h-14 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-3xl flex items-center justify-center border border-zinc-200 dark:border-zinc-700 active:scale-95 transition-all shadow-sm">
                {isSaved ? <CheckCircle2 size={24} className="text-emerald-500" /> : <BookmarkPlus size={24} />}
            </button>
        </div>
      </div>
    </div>
  );
};

export default StudioPanel;
