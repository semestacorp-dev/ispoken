
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useEffect } from 'react';
import { VOICE_DATA } from './constants';
import Carousel3D from './components/Carousel3D';
import GridView from './components/GridView';
import FilterBar from './components/FilterBar';
import VoiceFinder from './components/VoiceFinder';
import AiResultCard from './components/AiResultCard';
import StudioPanel from './components/StudioPanel';
import ProjectPanel from './components/ProjectPanel';
import CloneVoicePanel from './components/CloneVoicePanel';
import { FilterState, AiRecommendation, Voice, Project, VoiceClone } from './types';
import { Info } from 'lucide-react';

const App: React.FC = () => {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiRecommendation | null>(null);
  const [isAiCardVisible, setIsAiCardVisible] = useState(false);
  const [showVoiceFinder, setShowVoiceFinder] = useState(false);
  const [showStudio, setShowStudio] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showClonePanel, setShowClonePanel] = useState(false);
  const [studioVoice, setStudioVoice] = useState<Voice | null>(null);
  const [studioInitialText, setStudioInitialText] = useState<string>('');
  const [studioInitialInstruction, setStudioInitialInstruction] = useState<string>('');
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('carousel');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Persistence State
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('bp_projects');
    return saved ? JSON.parse(saved) : [];
  });

  const [clones, setClones] = useState<VoiceClone[]>(() => {
    const saved = localStorage.getItem('bp_clones');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('bp_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('bp_clones', JSON.stringify(clones));
  }, [clones]);

  const [activeIndex, setActiveIndex] = useState(0);

  const [filters, setFilters] = useState<FilterState>({
    gender: 'Semua',
    pitch: 'Semua',
    search: '',
  });

  useEffect(() => {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const uniqueGenders = useMemo(() => Array.from(new Set(VOICE_DATA.map(v => v.analysis.gender))).sort(), []);
  const uniquePitches = useMemo(() => Array.from(new Set(VOICE_DATA.map(v => v.analysis.pitch))).sort(), []);

  const filteredVoices = useMemo(() => {
    let baseData = VOICE_DATA;
    if (aiResult) {
       const recommended = aiResult.voiceNames
          .map(name => VOICE_DATA.find(v => v.name === name))
          .filter((v): v is typeof VOICE_DATA[0] => !!v);
       return recommended.length > 0 ? recommended : baseData;
    }

    return baseData.filter(voice => {
      const matchGender = filters.gender === 'Semua' || voice.analysis.gender === filters.gender;
      const matchPitch = filters.pitch === 'Semua' || voice.analysis.pitch === filters.pitch;
      
      const searchLower = filters.search.toLowerCase();
      const matchSearch = filters.search === '' || 
        voice.name.toLowerCase().includes(searchLower) || 
        voice.characteristics.some(c => c.toLowerCase().includes(searchLower)) ||
        voice.analysis.characteristics.some(c => c.toLowerCase().includes(searchLower)) ||
        voice.analysis.gender.toLowerCase().startsWith(searchLower) ||
        voice.pitch.toLowerCase().includes(searchLower) ||
        voice.analysis.pitch.toLowerCase().includes(searchLower);

      return matchGender && matchPitch && matchSearch;
    });
  }, [filters, aiResult]);

  useEffect(() => {
    setActiveIndex(0);
  }, [filteredVoices.length]);

  const handlePlayToggle = (voiceName: string) => {
    setPlayingVoice(current => current === voiceName ? null : voiceName);
  };

  const handleOpenStudio = (voice?: Voice, initialText: string = '', initialInstruction: string = '') => {
    setStudioVoice(voice || null);
    setStudioInitialText(initialText);
    setStudioInitialInstruction(initialInstruction);
    setShowStudio(true);
    setShowProjects(false);
  };

  const handleSaveProject = (project: Project) => {
    setProjects(prev => {
      const exists = prev.findIndex(p => p.id === project.id);
      if (exists !== -1) {
        const updated = [...prev];
        updated[exists] = project;
        return updated;
      }
      return [project, ...prev];
    });
  };

  const handleAddClone = (clone: VoiceClone) => {
    setClones(prev => {
      const exists = prev.find(p => p.id === clone.id);
      if (exists) return prev;
      return [clone, ...prev];
    });
    
    // Automatically open studio with matched voice
    const v = VOICE_DATA.find(voice => voice.name === clone.matchedVoiceName);
    if (v) handleOpenStudio(v, "Halo! Ini adalah suara hasil kloning saya.");
  };

  const handleDeleteClone = (id: string) => {
    setClones(prev => prev.filter(c => c.id !== id));
  };

  const handleDeleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const clearAiResult = () => {
    setAiResult(null);
    setIsAiCardVisible(false);
    setFilters({ ...filters, search: '' });
  };

  const isModalOpen = showVoiceFinder || (aiResult && isAiCardVisible) || showStudio || showProjects || showClonePanel;

  return (
    <div className="h-screen w-screen bg-[#FDFDFD] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden flex flex-col relative transition-colors duration-300">
      
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-50 dark:bg-blue-900/20 blur-3xl opacity-60"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-50 dark:bg-purple-900/20 blur-3xl opacity-50"></div>
      </div>

      <div 
        className="flex flex-col flex-1 overflow-hidden" 
        aria-hidden={isModalOpen}
        // @ts-ignore
        inert={isModalOpen ? '' : undefined}
        style={isModalOpen ? { pointerEvents: 'none', filter: 'blur(4px)', transition: 'filter 0.3s ease' } : { transition: 'filter 0.3s ease' }}
      >
        <FilterBar 
          filters={filters}
          onFilterChange={setFilters}
          uniqueGenders={uniqueGenders}
          uniquePitches={uniquePitches}
          onOpenAiCasting={() => setShowVoiceFinder(true)}
          onOpenStudio={() => handleOpenStudio()}
          onOpenProjects={() => setShowProjects(true)}
          onOpenClone={() => setShowClonePanel(true)}
          projectCount={projects.length}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
        />

        <main className="flex-1 relative flex flex-col overflow-hidden">
              {filteredVoices.length > 0 ? (
                  viewMode === 'carousel' ? (
                    <div className="w-full flex-1 flex items-center justify-center pb-8 min-h-0">
                         <Carousel3D 
                            voices={filteredVoices}
                            activeIndex={activeIndex}
                            onChange={setActiveIndex}
                            playingVoice={playingVoice}
                            onPlayToggle={handlePlayToggle}
                            onOpenStudio={handleOpenStudio}
                            disabled={isModalOpen}
                         />
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto">
                      <GridView 
                          voices={filteredVoices}
                          playingVoice={playingVoice}
                          onPlayToggle={handlePlayToggle}
                          onOpenStudio={handleOpenStudio}
                      />
                    </div>
                  )
              ) : (
                  <div className="w-full h-full flex items-center justify-center pb-24">
                      <div className="text-center animate-fade-in">
                          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 mb-6 shadow-sm">
                              <Info size={32} className="text-zinc-300 dark:text-zinc-500" />
                          </div>
                          <h3 className="text-xl font-serif text-zinc-900 dark:text-white mb-2">Suara tidak ditemukan</h3>
                          <p className="text-zinc-500 dark:text-zinc-400 mb-6">Coba sesuaikan filter atau gunakan AI Casting.</p>
                          <button 
                              onClick={() => setShowVoiceFinder(true)}
                              className="px-4 py-2 bg-zinc-900 dark:bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-zinc-800 dark:hover:bg-indigo-500 transition-colors"
                          >
                              Buka AI Casting
                          </button>
                      </div>
                  </div>
              )}
        </main>
      </div>

      {showVoiceFinder && (
        <VoiceFinder 
            voices={VOICE_DATA}
            onRecommendation={(rec) => {
                if (rec) {
                    setAiResult(rec);
                    setIsAiCardVisible(true);
                    setFilters(prev => ({ ...prev, search: '' })); 
                }
                setShowVoiceFinder(false);
            }}
            onClose={() => setShowVoiceFinder(false)}
        />
      )}

      {showStudio && (
        <StudioPanel 
          voices={VOICE_DATA}
          initialVoice={studioVoice}
          initialText={studioInitialText}
          initialInstruction={studioInitialInstruction}
          onSaveProject={handleSaveProject}
          onClose={() => setShowStudio(false)}
        />
      )}

      {showProjects && (
        <ProjectPanel 
          projects={projects}
          voices={VOICE_DATA}
          onDeleteProject={handleDeleteProject}
          onLoadProject={(p) => {
            const v = VOICE_DATA.find(voice => voice.name === p.voiceName);
            handleOpenStudio(v, p.text, p.systemInstruction);
          }}
          onClose={() => setShowProjects(false)}
        />
      )}

      {showClonePanel && (
          <CloneVoicePanel 
            voices={VOICE_DATA}
            clones={clones}
            onDeleteClone={handleDeleteClone}
            onCloneComplete={handleAddClone}
            onClose={() => setShowClonePanel(false)}
          />
      )}

      {aiResult && isAiCardVisible && (
          <div 
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-result-title"
          >
             <div className="absolute inset-0" onClick={clearAiResult}></div>
             <div className="relative w-full max-w-5xl animate-slide-up max-h-[90vh] overflow-hidden rounded-2xl">
                 <AiResultCard 
                    result={aiResult} 
                    voices={VOICE_DATA} 
                    onOpenInStudio={(voiceName, text, instruction) => {
                        const v = VOICE_DATA.find(voice => voice.name === voiceName);
                        handleOpenStudio(v, text, instruction);
                        clearAiResult();
                    }}
                    onClose={clearAiResult} 
                 />
             </div>
          </div>
      )}

    </div>
  );
};

export default App;
