/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { FilterState } from '../types';
import { Search, Sparkles, ChevronDown, Mic, LayoutGrid, GalleryHorizontalEnd, Sun, Moon, Radio, FolderHeart, Fingerprint } from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  uniqueGenders: string[];
  uniquePitches: string[];
  onOpenAiCasting: () => void;
  onOpenStudio: () => void;
  onOpenProjects: () => void;
  onOpenClone: () => void;
  projectCount: number;
  viewMode: 'carousel' | 'grid';
  onViewModeChange: (mode: 'carousel' | 'grid') => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ 
  filters, 
  onFilterChange, 
  uniqueGenders, 
  uniquePitches,
  onOpenAiCasting,
  onOpenStudio,
  onOpenProjects,
  onOpenClone,
  projectCount,
  viewMode,
  onViewModeChange,
  isDarkMode,
  toggleTheme
}) => {
  
  const handleGenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, gender: e.target.value });
  };

  const handlePitchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, pitch: e.target.value });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  return (
    <div className="relative z-50 w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 transition-colors duration-300">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 h-16">
            <div className="flex items-center justify-between h-full gap-2 sm:gap-4">
                
                {/* Left: Brand + Actions */}
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <div className="flex items-center gap-2 group select-none">
                        <div className="w-9 h-9 bg-zinc-900 dark:bg-zinc-100 rounded-xl flex items-center justify-center shadow-lg shadow-zinc-900/10 shrink-0">
                            <Mic size={18} className="text-white dark:text-zinc-900" />
                        </div>
                        <h1 className="hidden lg:block text-lg font-bold tracking-tight text-zinc-900 dark:text-white font-display whitespace-nowrap">
                            ispoken.co
                        </h1>
                    </div>

                    <button 
                        onClick={onOpenAiCasting}
                        className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-full text-xs sm:text-sm font-medium shadow-sm transition-all hover:scale-105 active:scale-95 group shrink-0"
                    >
                        <Sparkles size={14} className="text-indigo-500 dark:text-indigo-400" />
                        <span className="tracking-wide hidden sm:inline">Direktur Casting AI</span>
                        <span className="tracking-wide sm:hidden">Casting</span>
                    </button>

                    <button 
                        onClick={onOpenClone}
                        className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-800/40 text-indigo-700 dark:text-indigo-300 rounded-full text-xs sm:text-sm font-bold shadow-sm transition-all hover:scale-105 active:scale-95 group shrink-0"
                    >
                        <Fingerprint size={14} />
                        <span className="tracking-wide hidden sm:inline">Kloning Suara</span>
                        <span className="tracking-wide sm:hidden">Kloning</span>
                    </button>

                    <button 
                        onClick={onOpenStudio}
                        className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-zinc-900 dark:bg-indigo-600 hover:bg-zinc-800 dark:hover:bg-indigo-500 text-white rounded-full text-xs sm:text-sm font-medium shadow-md transition-all hover:scale-105 active:scale-95 group shrink-0"
                    >
                        <Radio size={14} className="text-indigo-200 dark:text-indigo-100" />
                        <span className="tracking-wide hidden sm:inline">Studio Voice Over</span>
                        <span className="tracking-wide sm:hidden">Studio</span>
                    </button>

                    <button 
                        onClick={onOpenProjects}
                        className="relative flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-full text-xs sm:text-sm font-medium shadow-sm transition-all hover:scale-105 active:scale-95 group shrink-0"
                    >
                        <FolderHeart size={14} className="text-rose-500 dark:text-rose-400" />
                        <span className="tracking-wide hidden sm:inline">Library Proyek</span>
                        <span className="tracking-wide sm:hidden">Proyek</span>
                        {projectCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white animate-fade-in ring-2 ring-white dark:ring-zinc-900">
                                {projectCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Right: Search, Filters & Actions */}
                <div className="flex items-center gap-2 justify-end min-w-0 flex-1">
                    <div className="relative group w-full max-w-[120px] sm:max-w-[200px] transition-all">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500 group-focus-within:text-zinc-600 dark:group-focus-within:text-zinc-300 transition-colors">
                            <Search size={14} />
                        </div>
                        <input
                            type="text"
                            placeholder="Cari suara..."
                            value={filters.search}
                            onChange={handleSearchChange}
                            className="block w-full pl-8 pr-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 border-transparent focus:bg-white dark:focus:bg-zinc-900 border focus:border-indigo-200 dark:focus:border-indigo-700 rounded-lg text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all"
                        />
                    </div>

                    <div className="flex gap-1.5 sm:gap-2 shrink-0">
                        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
                            <button
                                onClick={() => onViewModeChange('carousel')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'carousel' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
                                title="Tampilan Carousel"
                            >
                                <GalleryHorizontalEnd size={14} />
                            </button>
                            <button
                                onClick={() => onViewModeChange('grid')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
                                title="Tampilan Grid"
                            >
                                <LayoutGrid size={14} />
                            </button>
                        </div>

                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                        >
                            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default FilterBar;