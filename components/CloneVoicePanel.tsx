
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { X, Mic, Upload, Loader2, Fingerprint, Play, Square, CheckCircle2, AlertCircle, Clock, Trash2, ArrowRight } from 'lucide-react';
import { Voice, VoiceClone } from '../types';

interface CloneVoicePanelProps {
  voices: Voice[];
  clones: VoiceClone[];
  onDeleteClone: (id: string) => void;
  onCloneComplete: (clone: VoiceClone) => void;
  onClose: () => void;
}

const CloneVoicePanel: React.FC<CloneVoicePanelProps> = ({ voices, clones, onDeleteClone, onCloneComplete, onClose }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>(clones.length > 0 ? 'history' : 'create');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/ogg;codecs=opus';
        
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setAudioMimeType(mimeType);
        
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          setAudioBase64(base64String);
        };
        reader.readAsDataURL(blob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError("Izin mikrofon ditolak atau tidak tersedia.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError("Ukuran file terlalu besar (maks 15MB).");
      return;
    }

    setAudioMimeType(file.type || 'audio/mpeg');
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setAudioBase64(base64String);
    };
    reader.readAsDataURL(file);
    setError(null);
  };

  const analyzeAndClone = async () => {
    if (!audioBase64 || !audioMimeType) return;
    setLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const simplifiedVoices = voices.map(v => ({
        name: v.name,
        gender: v.analysis.gender,
        pitch: v.analysis.pitch,
        characteristics: v.analysis.characteristics
      }));

      const prompt = `
        Analisis sampel suara manusia yang diberikan dan temukan kecocokan digital terbaik dari perpustakaan suara TTS kami.
        
        Data Suara Tersedia:
        ${JSON.stringify(simplifiedVoices)}

        Tugas Anda:
        1. Identifikasi Jenis Kelamin, Nada (Rendah/Sedang/Tinggi), dan Karakteristik vokal.
        2. Pilih 1 nama suara dari daftar yang paling mendekati sampel ini.
        3. Jelaskan mengapa suara tersebut dipilih.

        Respon harus dalam format JSON.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: audioBase64, mimeType: audioMimeType } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matchedVoiceName: { type: Type.STRING },
              analysis: {
                type: Type.OBJECT,
                properties: {
                  gender: { type: Type.STRING },
                  pitch: { type: Type.STRING },
                  characteristics: { type: Type.ARRAY, items: { type: Type.STRING } },
                  reasoning: { type: Type.STRING }
                }
              }
            }
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      
      const newClone: VoiceClone = {
        id: Math.random().toString(36).substr(2, 9),
        name: `Kloning Vokal #${clones.length + 1}`,
        originalSampleBase64: audioBase64,
        matchedVoiceName: result.matchedVoiceName || voices[0].name,
        analysis: {
          gender: result.analysis?.gender || 'Unknown',
          pitch: result.analysis?.pitch || 'Unknown',
          characteristics: result.analysis?.characteristics || [],
          visualDescription: result.analysis?.reasoning || 'Profil suara berhasil dianalisis.'
        },
        createdAt: Date.now()
      };

      onCloneComplete(newClone);
      onClose();
    } catch (err) {
      console.error("Cloning Error:", err);
      setError("Gagal menganalisis suara. Pastikan file audio valid dan kunci API benar.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(ts));
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose}></div>
      
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-white/20">
        
        <div className="p-8">
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                        <Fingerprint size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Kloning Suara AI</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Temukan kembaran digital suara Anda</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                    <X size={24} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl mb-6">
                <button 
                    onClick={() => setActiveTab('create')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'create' ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                    Buat Baru
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                    Riwayat
                    {clones.length > 0 && <span className="bg-zinc-200 dark:bg-zinc-600 text-[10px] px-1.5 py-0.5 rounded-md">{clones.length}</span>}
                </button>
            </div>

            {activeTab === 'create' ? (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center text-center space-y-4">
                        {isRecording ? (
                            <div className="flex flex-col items-center space-y-4">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-25"></div>
                                    <div className="relative w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg">
                                        <Square size={24} fill="white" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-lg font-bold text-zinc-900 dark:text-white">Merekam...</p>
                                    <p className="text-xs text-zinc-400 font-medium tracking-tight">Kualitas suara terbaik didapat dari lingkungan yang tenang.</p>
                                </div>
                                <button 
                                    onClick={stopRecording}
                                    className="px-8 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-sm font-bold active:scale-95 transition-transform shadow-md"
                                >
                                    Berhenti
                                </button>
                            </div>
                        ) : audioUrl ? (
                            <div className="flex flex-col items-center space-y-4 w-full">
                                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/20">
                                    <CheckCircle2 size={32} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-lg font-bold text-zinc-900 dark:text-white">Sampel Siap</p>
                                    <p className="text-xs text-zinc-400 mb-2">{audioMimeType}</p>
                                    <audio src={audioUrl} controls className="h-8 w-full max-w-xs mx-auto" />
                                </div>
                                <button onClick={() => { setAudioUrl(null); setAudioBase64(null); setAudioMimeType(null); }} className="text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 underline">Ulangi Rekaman</button>
                            </div>
                        ) : (
                            <>
                                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400">
                                    <Mic size={32} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-lg font-bold text-zinc-900 dark:text-white">Butuh sampel suara Anda</p>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Gunakan mikrofon atau unggah file audio (MP3/WAV/AAC).</p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs pt-4">
                                    <button 
                                        onClick={startRecording}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-95"
                                    >
                                        <Mic size={18} />
                                        Rekam
                                    </button>
                                    <label className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl font-bold hover:bg-zinc-50 dark:hover:bg-zinc-750 cursor-pointer transition-all active:scale-95">
                                        <Upload size={18} />
                                        Unggah
                                        <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
                                    </label>
                                </div>
                            </>
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-4 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="pt-4">
                        <button
                            onClick={analyzeAndClone}
                            disabled={!audioBase64 || loading}
                            className="w-full py-4 bg-zinc-900 dark:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-lg shadow-xl shadow-zinc-900/20 dark:shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all active:scale-95"
                        >
                            {loading ? <Loader2 size={24} className="animate-spin" /> : <Fingerprint size={24} />}
                            <span>{loading ? 'Menganalisis...' : 'Mulai Analisis Suara'}</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 animate-fade-in max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {clones.length > 0 ? (
                        clones.map((clone) => {
                            const voice = voices.find(v => v.name === clone.matchedVoiceName);
                            return (
                                <div key={clone.id} className="group bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 rounded-2xl p-4 transition-all hover:border-indigo-300 dark:hover:border-indigo-800">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-200">
                                                {voice && <img src={voice.imageUrl} alt={voice.name} className="w-full h-full object-cover" />}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-none mb-1">{clone.name}</h3>
                                                <p className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
                                                    <Clock size={10} /> {formatDate(clone.createdAt)} • Matched: {clone.matchedVoiceName}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => onDeleteClone(clone.id)}
                                            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {clone.analysis.characteristics.slice(0, 3).map(char => (
                                            <span key={char} className="px-2 py-0.5 bg-white dark:bg-zinc-700 text-[9px] font-bold text-zinc-500 rounded-md border border-zinc-100 dark:border-zinc-600 uppercase tracking-tighter">
                                                {char}
                                            </span>
                                        ))}
                                    </div>
                                    <button 
                                        onClick={() => onCloneComplete(clone)}
                                        className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all hover:bg-indigo-500 active:scale-95"
                                    >
                                        Gunakan Profil Ini
                                        <ArrowRight size={14} />
                                    </button>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                            <Clock size={40} strokeWidth={1} className="mb-4" />
                            <p className="text-sm font-medium">Belum ada riwayat kloning</p>
                            <p className="text-xs">Profil suara yang Anda buat akan muncul di sini.</p>
                        </div>
                    )}
                </div>
            )}

            <p className="mt-6 text-[10px] text-zinc-400 dark:text-zinc-500 text-center uppercase tracking-widest font-bold">
                Mencocokkan Biometrik Vokal dengan AI
            </p>
        </div>
      </div>
    </div>
  );
};

export default CloneVoicePanel;
