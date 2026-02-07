
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface VoiceAnalysis {
  gender: string;
  pitch: string;
  characteristics: string[];
  visualDescription: string;
}

export interface Voice {
  name: string;
  pitch: string;
  characteristics: string[];
  audioSampleUrl: string;
  fileUri: string;
  analysis: VoiceAnalysis;
  imageUrl: string; 
}

export interface FilterState {
  gender: string | 'All' | 'Semua';
  pitch: string | 'All' | 'Semua';
  search: string;
}

export interface AiRecommendation {
  voiceNames: string[];
  systemInstruction: string;
  sampleText: string;
}

export interface Project {
  id: string;
  title: string;
  text: string;
  voiceName: string;
  systemInstruction?: string;
  createdAt: number;
}

export interface VoiceClone {
  id: string;
  name: string;
  originalSampleBase64: string;
  matchedVoiceName: string;
  analysis: VoiceAnalysis;
  createdAt: number;
}
