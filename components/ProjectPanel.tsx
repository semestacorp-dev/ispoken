
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { X, FolderHeart, Trash2, Edit3, Clock, Search, ExternalLink } from 'lucide-react';
import { Project, Voice } from '../types';

interface ProjectPanelProps {
  projects: Project[];
  voices: Voice[];
  onDeleteProject: (id: string) => void;
  onLoadProject: (project: Project) => void;
  onClose: () => void;
}

const ProjectPanel: React.FC<ProjectPanelProps> = ({ projects, voices, onDeleteProject, onLoadProject, onClose }) => {
  const [search, setSearch] = useState('');

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.text.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-start">
      <div 
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      ></div>
      
      <div className="relative h-full w-full max-w-xl bg-white dark:bg-zinc-950 shadow-2xl flex flex-col animate-slide-left border-r border-zinc-200 dark:border-zinc-800">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                    <FolderHeart size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Library Proyek</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Naskah & setelan suara tersimpan</p>
                </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
            >
              <X size={20} />
            </button>
        </div>

        {/* Search */}
        <div className="p-4 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800">
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                    type="text" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari dalam library..."
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/10 transition-all"
                />
            </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3 bg-zinc-50/30 dark:bg-zinc-900/10">
            {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => {
                    const voice = voices.find(v => v.name === project.voiceName);
                    return (
                        <div key={project.id} className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-rose-200 dark:hover:border-rose-900/50 transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden ring-1 ring-zinc-100 dark:ring-zinc-800">
                                        {voice ? <img src={voice.imageUrl} alt={voice.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-200 animate-pulse" />}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-none mb-1">{project.title}</h3>
                                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium flex items-center gap-1">
                                            <Clock size={10} /> {formatDate(project.createdAt)} • {project.voiceName}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => onDeleteProject(project.id)}
                                        className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                                        title="Hapus"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4 italic leading-relaxed">
                                "{project.text}"
                            </p>

                            <button 
                                onClick={() => { onLoadProject(project); onClose(); }}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-zinc-50 dark:bg-zinc-800 hover:bg-rose-500 dark:hover:bg-rose-600 text-zinc-600 dark:text-zinc-300 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                            >
                                <Edit3 size={14} />
                                Buka di Studio
                            </button>
                        </div>
                    );
                })
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-12 opacity-50">
                    <FolderHeart size={48} strokeWidth={1} className="mb-4 text-zinc-300" />
                    <p className="text-sm font-medium text-zinc-400">Library kosong.</p>
                    <p className="text-xs text-zinc-400">Simpan naskah dari Studio untuk melihatnya di sini.</p>
                </div>
            )}
        </div>
      </div>

      <style>{`
        @keyframes slideLeft {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
        }
        .animate-slide-left {
            animation: slideLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default ProjectPanel;
