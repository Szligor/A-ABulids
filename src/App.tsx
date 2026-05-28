import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Trash2, 
  Save, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Grid, 
  Layers, 
  Compass, 
  Plus, 
  Sliders, 
  Library, 
  Wand2, 
  Hammer, 
  Image as ImageIcon, 
  CheckCircle, 
  Undo,
  Pipette,
  User,
  ExternalLink
} from 'lucide-react';
import { Voxel, PresetBlueprint, PaletteItem, PaintBrushType, GridConfig } from './types';
import VoxelCanvas from './components/VoxelCanvas';
import { synths } from './utils/audio';

const buildPalette: PaletteItem[] = [
  { name: 'Szary Kamień', color: '#6c6c70', type: 'stone' },
  { name: 'Śnieżny Dioryt', color: '#e0e0e3', type: 'stone' },
  { name: 'Szlachetna Cegła', color: '#b85e4a', type: 'planks' },
  { name: 'Świerkowe Drewno', color: '#52341d', type: 'wood' },
  { name: 'Ciemna Kora', color: '#382211', type: 'wood' },
  { name: 'Karminowy Dach', color: '#8b2e33', type: 'stone' },
  { name: 'Magiczna Esencja', color: '#a32cc4', type: 'glass' },
  { name: 'Złoty Voxel', color: '#ffd53d', type: 'glass' },
  { name: 'Świeży Liść', color: '#3a5f2b', type: 'leaves' },
  { name: 'Głęboka Czerń', color: '#16161a', type: 'stone' },
  { name: 'Błękitne Szkło', color: '#7eaee3', type: 'glass' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'presets' | 'ai' | 'editor'>('presets');
  
  // Storage catalogs
  const [presets, setPresets] = useState<PresetBlueprint[]>([]);
  const [customBlueprints, setCustomBlueprints] = useState<PresetBlueprint[]>([]);
  const [selectedBlueprint, setSelectedBlueprint] = useState<PresetBlueprint | null>(null);
  
  // Custom sandbox state drawer
  const [customVoxels, setCustomVoxels] = useState<Voxel[]>([]);
  const [activeVoxels, setActiveVoxels] = useState<Voxel[]>([]);
  
  // Dimension and timing handlers
  const [currentLayer, setCurrentLayer] = useState<number>(0);
  const [maxLayer, setMaxLayer] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // Controls & styling configs
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [soundVolume, setSoundVolume] = useState<number>(0.3);
  const [gridConfig, setGridConfig] = useState<GridConfig>({
    size: 30,
    visible: true,
    soloLayer: false,
    theme: 'neon'
  });
  const [buildColorItem, setBuildColorItem] = useState<PaletteItem>(buildPalette[0]);
  const [brushType, setBrushType] = useState<PaintBrushType>('pencil');

  // AI Generators
  const [aiTextPrompt, setAiTextPrompt] = useState<string>('');
  const [isProcessingAI, setIsProcessingAI] = useState<boolean>(false);
  const [aiErrorMsg, setAiErrorMsg] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Scribes manual save modal
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [saveName, setSaveName] = useState<string>('');
  const [saveDesc, setSaveDesc] = useState<string>('');

  // Fetch initial blueprints catalog from database backend
  const fetchCatalogs = async () => {
    try {
      const response = await fetch('/api/blueprints');
      if (!response.ok) throw new Error('Nie udało się załadować blueprints z bazy.');
      const data = await response.json();
      setPresets(data.presets || []);
      setCustomBlueprints(data.custom || []);

      // Autoselect the first preset initially
      if (data.presets && data.presets.length > 0 && !selectedBlueprint) {
        setSelectedBlueprint(data.presets[0]);
        setActiveVoxels(data.presets[0].voxels);
        setMaxLayer(Math.max(...data.presets[0].voxels.map((v: Voxel) => v.y), 0));
        setCurrentLayer(Math.max(...data.presets[0].voxels.map((v: Voxel) => v.y), 0));
      }
    } catch (error: any) {
      console.error(error);
      setAiErrorMsg('Błąd serwera: ' + error.message);
    }
  };

  useEffect(() => {
    fetchCatalogs();
  }, []);

  // Update sound values in the synthesizer module
  useEffect(() => {
    synths.volumeValue = soundVolume;
  }, [soundVolume]);

  // Synchronize active displayed coordinates depending on selection type
  useEffect(() => {
    if (!selectedBlueprint) return;

    if (selectedBlueprint.id === 'custom') {
      setActiveVoxels(customVoxels);
      const customMax = customVoxels.length > 0 ? Math.max(...customVoxels.map(v => v.y), 0) : 0;
      setMaxLayer(customMax);
    } else {
      setActiveVoxels(selectedBlueprint.voxels);
      const blueprintMax = selectedBlueprint.voxels.length > 0 ? Math.max(...selectedBlueprint.voxels.map(v => v.y), 0) : 0;
      setMaxLayer(blueprintMax);
    }
  }, [selectedBlueprint, customVoxels]);

  // Handle Layer build anim increments
  useEffect(() => {
    let animTimer: NodeJS.Timeout;
    if (isPlaying) {
      animTimer = setInterval(() => {
        setCurrentLayer(prev => {
          if (prev >= maxLayer) {
            setIsPlaying(false);
            return maxLayer;
          }
          if (soundEnabled) synths.playPlace(0.08);
          return prev + 1;
        });
      }, 350);
    }
    return () => clearInterval(animTimer);
  }, [isPlaying, maxLayer, soundEnabled]);

  // Choose a blueprint template
  const selectBlueprint = (bp: PresetBlueprint) => {
    setSelectedBlueprint(bp);
    setIsPlaying(false);
    
    const maxVal = bp.voxels.length > 0 ? Math.max(...bp.voxels.map(v => v.y), 0) : 0;
    setMaxLayer(maxVal);
    setCurrentLayer(maxVal);
    
    if (bp.id === 'custom') {
      setActiveTab('editor');
    }
  };

  // POST local voxel draft to secure server store
  const handleSaveBlueprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) return;

    try {
      const response = await fetch('/api/blueprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName,
          voxels: customVoxels,
          description: saveDesc
        })
      });

      if (!response.ok) throw new Error('Nie udało się zapisać projektu.');

      if (soundEnabled) synths.playMagic();
      setShowSaveModal(false);
      setSaveName('');
      setSaveDesc('');
      
      // Refresh list
      await fetchCatalogs();
    } catch (error: any) {
      setAiErrorMsg('Zapis błędu: ' + error.message);
    }
  };

  // Delete dynamic persisted blueprint
  const handleDeleteBlueprint = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Czy na pewno chcesz na zawsze skasować ten blueprint z bazy serwera?')) return;

    try {
      const response = await fetch(`/api/blueprints/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Nie udało się skasować blueprintu.');

      if (soundEnabled) synths.playDelete();
      
      // If we deleted the active blueprint, reset selection back to first default
      if (selectedBlueprint && selectedBlueprint.id === id) {
        setSelectedBlueprint(null);
      }
      
      await fetchCatalogs();
    } catch (error: any) {
      setAiErrorMsg('Błąd usuwania: ' + error.message);
    }
  };

  // Securely request server to compile description into 3D voxel list using Gemini 3.5
  const handleAIVoxelGeneration = async () => {
    if (!aiTextPrompt.trim()) return;
    
    setIsProcessingAI(true);
    setAiErrorMsg('');
    setIsPlaying(false);

    try {
      const response = await fetch('/api/voxels/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiTextPrompt })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Generacja nie powiodła się.');
      }

      const generatedVoxels = data.voxels;
      if (Array.isArray(generatedVoxels) && generatedVoxels.length > 0) {
        // Play magical chime bells on compilation success!
        if (soundEnabled) synths.playMagic();

        // Create virtual blueprint placeholder representing translation success
        const aiBlueprint: PresetBlueprint = {
          id: 'ai_' + Date.now(),
          name: `AI: ${aiTextPrompt.substring(0, 15)}...`,
          isCustom: false,
          description: `Zaprojektowany przez Gemini 3.5 z opisu: "${aiTextPrompt}"`,
          voxels: generatedVoxels
        };

        // Inject into current presets list dynamically
        setPresets(prev => [aiBlueprint, ...prev]);
        setSelectedBlueprint(aiBlueprint);
        
        // Setup layer timers to construct the structure upwards dynamically!
        setCurrentLayer(0);
        setMaxLayer(Math.max(...generatedVoxels.map(v => v.y), 0));
        setIsPlaying(true);
        setAiTextPrompt('');
      } else {
        throw new Error('Środowisko AI wyeksportowało pusty model voxelowy.');
      }
    } catch (err: any) {
      console.error(err);
      setAiErrorMsg(err.message || 'Wystąpił nieznany problem w komunikacji z Gemini.');
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Upload Photo Scanner
  const handleImageUploaded = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    setIsProcessingAI(true);
    setUploadProgress('Skanowanie i przesyłanie zdjęcia...');
    setAiErrorMsg('');

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;

        const response = await fetch('/api/voxels/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Analiza zdjęcia: ${file.name}`,
            image: base64
          })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Błąd analizy obrazu przez AI.');
        }

        const generatedVoxels = data.voxels;
        if (Array.isArray(generatedVoxels) && generatedVoxels.length > 0) {
          if (soundEnabled) synths.playMagic();

          const scanBlueprint: PresetBlueprint = {
            id: 'scan_' + Date.now(),
            name: `Fotoodczyt: ${file.name.substring(0, 12)}`,
            isCustom: false,
            description: `Model zrekonstruowany z pliku graficznego za pomocą analizy multispektralnej Gemini.`,
            voxels: generatedVoxels
          };

          setPresets(prev => [scanBlueprint, ...prev]);
          setSelectedBlueprint(scanBlueprint);
          
          setCurrentLayer(0);
          setMaxLayer(Math.max(...generatedVoxels.map(v => v.y), 0));
          setIsPlaying(true);
        } else {
          throw new Error('Brak skrzyżowań z klockami voxelowymi po analizie zdjęcia.');
        }

      } catch (err: any) {
        setAiErrorMsg(err.message || 'Błąd skanowania zdjęcia.');
      } finally {
        setIsProcessingAI(false);
        setUploadProgress('');
        e.target.value = ''; // clean input
      }
    };

    reader.readAsDataURL(file);
  };

  const clearSandboxGrid = () => {
    if (window.confirm('Wyczyścić całą planszę Twojego projektu? Ta operacja jest nieodwracalna.')) {
      setCustomVoxels([]);
      setCurrentLayer(0);
      setMaxLayer(0);
      if (soundEnabled) synths.playDelete();
    }
  };

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-[#E0E0E0] font-sans overflow-hidden select-none">
      
      {/* Dynamic Error Status Alerts */}
      {aiErrorMsg && (
        <div className="fixed top-6 right-6 z-50 bg-red-950/90 hover:bg-red-900 border border-red-500/50 rounded-2xl p-4 shadow-2xl max-w-sm flex items-start gap-3 backdrop-blur-md transition-all duration-300">
          <div className="bg-red-500 text-[#E0E0E0] rounded-full p-1.5 mt-0.5 shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="9" x2="12" y2="15"></line><line x1="12" y1="19" x2="12.01" y2="19"></line><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
          </div>
          <div className="flex-grow">
            <h4 className="font-bold text-sm text-red-200">Wystąpił błąd</h4>
            <p className="text-xs text-red-300 mt-1">{aiErrorMsg}</p>
          </div>
          <button onClick={() => setAiErrorMsg('')} className="text-red-400 hover:text-[#E0E0E0] text-xs font-semibold focus:outline-none shrink-0">
            Zamknij
          </button>
        </div>
      )}

      {/* Save Project Modals Panel */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold font-display text-[#E0E0E0] mb-1">Zapisz jako nowy Blueprint</h2>
            <p className="text-xs text-white/40 mb-6">Wprowadź unikalną nazwę dla Twojej budowli. Zapisane plany ukażą się w katalogu i zostaną zapamiętane na serwerze.</p>
            
            <form onSubmit={handleSaveBlueprint} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Nazwa budowli</label>
                <input 
                  type="text"
                  required
                  placeholder="np. Moja Świątynia Pixel-art" 
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  className="w-full bg-[#222] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C2A578] text-[#E0E0E0]"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Opis (opcjonalny)</label>
                <textarea 
                  placeholder="np. Strzelisty minaret wybudowany przy użyciu polerowanego diorytu..." 
                  value={saveDesc}
                  onChange={e => setSaveDesc(e.target.value)}
                  className="w-full bg-[#222] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C2A578] text-[#E0E0E0] h-20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white/50 text-sm font-semibold rounded-xl py-3 transition-colors"
                >
                  Anuluj
                </button>
                <button 
                  type="submit" 
                  className="flex-grow bg-[#C2A578] hover:bg-[#A38A64] text-[#E0E0E0] text-sm font-semibold rounded-xl py-3 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Zapisz projekt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Left controls Sidebar Panel */}
      <aside className="w-85 bg-[#111] border-r border-white/10 flex flex-col z-10 shadow-2xl overflow-y-auto">
        
        {/* Branding header area */}
        <div className="p-5 border-b border-white/10 bg-[#0A0A0A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#C2A578] rounded-xl flex items-center justify-center text-[#E0E0E0] shadow-xl shadow-[#C2A578]/30">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
            <div>
              <h1 className="font-serif italic text-xl tracking-widest text-[#E0E0E0] flex items-center gap-1.5 uppercase">
                A&Acast
                <span className="text-[10px] uppercase font-bold text-[#C2A578] bg-[#C2A578]/10 px-1.5 py-0.5 rounded tracking-widest font-mono not-italic">3D</span>
              </h1>
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 mt-1">Algorithmic Voxel Blueprinting</p>
            </div>
          </div>
        </div>

        {/* Action controls Tabs row */}
        <div className="flex border-b border-white/10 shrink-0 bg-[#0A0A0A]/50 p-2 gap-1 uppercase tracking-widest">
          <button 
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-3 rounded-xl text-[9px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'presets' 
                ? 'bg-[#222] text-[#C2A578] border-t border-b border-white/10 shadow-inner' 
                : 'text-white/40 hover:text-[#E0E0E0] hover:bg-white/5'
            }`}
          >
            <Library size={13} />
            Katalog
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-3 rounded-xl text-[9px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'ai' 
                ? 'bg-[#222] text-[#C2A578] border-t border-b border-white/10 shadow-inner' 
                : 'text-white/40 hover:text-[#E0E0E0] hover:bg-white/5'
            }`}
          >
            <Sparkles size={13} />
            Kreator
          </button>
          <button 
            onClick={() => setActiveTab('editor')}
            className={`flex-1 py-3 rounded-xl text-[9px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'editor' 
                ? 'bg-[#222] text-[#C2A578] border-t border-b border-white/10 shadow-inner' 
                : 'text-white/40 hover:text-[#E0E0E0] hover:bg-white/5'
            }`}
          >
            <Hammer size={13} />
            Plac Budowy
          </button>
        </div>

        {/* Tabs specific side menus */}
        <div className="flex-grow p-4 overflow-y-auto flex flex-col">
          
          {/* TAB 1: PRESETS AND CATALOG */}
          {activeTab === 'presets' && (
            <div className="space-y-4 flex-grow flex flex-col">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 px-1 mb-2">Zaprojektowane Wzory</h3>
                <div className="space-y-2">
                  {presets.map(bp => (
                    <button
                      key={bp.id}
                      onClick={() => selectBlueprint(bp)}
                      className={`w-full text-left p-3.5 rounded-2xl border text-xs transition-all duration-200 ${
                        selectedBlueprint?.id === bp.id 
                          ? 'bg-[#C2A578]/10 text-[#E0E0E0] border-[#C2A578]/30 shadow-lg shadow-[#C2A578]/5' 
                          : 'bg-[#111] hover:bg-[#222] text-white/40 border-white/10 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`font-semibold ${selectedBlueprint?.id === bp.id ? 'text-[#C2A578]' : 'text-[#E0E0E0]'}`}>{bp.name}</span>
                        <span className="text-[10px] font-mono text-white/30 bg-white/5 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <Layers size={9} />
                          {bp.voxels.length} bl.
                        </span>
                      </div>
                      <p className="text-[11px] text-white/40 leading-snug">{bp.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {customBlueprints.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 px-1 mb-2">Twoje Zapisane Projekty</h3>
                  <div className="space-y-2">
                    {customBlueprints.map(bp => (
                      <div
                        key={bp.id}
                        onClick={() => selectBlueprint(bp)}
                        className={`w-full text-left p-3.5 rounded-2xl border text-xs transition-all duration-200 cursor-pointer flex gap-3 ${
                          selectedBlueprint?.id === bp.id 
                            ? 'bg-[#C2A578]/10 text-[#E0E0E0] border-[#C2A578]/30 shadow-lg shadow-[#C2A578]/5' 
                            : 'bg-[#111] hover:bg-[#222] text-white/40 border-white/10 hover:border-white/10'
                        }`}
                      >
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`font-semibold truncate ${selectedBlueprint?.id === bp.id ? 'text-[#C2A578]' : 'text-[#E0E0E0]'}`}>{bp.name}</span>
                            <span className="text-[10px] font-mono text-white/30 bg-white/5 px-2 py-0.5 rounded-lg shrink-0">
                              {bp.voxels.length} bl.
                            </span>
                          </div>
                          <p className="text-[11px] text-white/40 leading-snug truncate">{bp.description}</p>
                        </div>
                        <button 
                          onClick={(e) => handleDeleteBlueprint(bp.id, e)}
                          className="text-white/30 hover:text-red-400 transition-colors self-center p-1 hover:bg-white/5 rounded-lg"
                          title="Usuń z bazy"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AI COGNITIVE VOXEL SCRIBERS */}
          {activeTab === 'ai' && (
            <div className="space-y-4 flex-grow flex flex-col">
              
              <div className="bg-[#111] border border-white/10 rounded-2xl p-4 shadow-inner space-y-3">
                <div className="flex items-center gap-2 text-[#E0E0E0]">
                  <div className="w-6 h-6 rounded border border-[#C2A578]/30 flex items-center justify-center text-[#C2A578]">
                    <Sparkles size={12} />
                  </div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Projektowanie Tekstowe</h4>
                </div>
                
                <p className="text-[11px] text-white/40 leading-snug">Zleć AI (Gemini 3.5) wybudowanie dowolnego pionowego modelu 3D z prostego opisu w języku polskim.</p>

                <div className="space-y-2 pt-2">
                  <input 
                    type="text"
                    disabled={isProcessingAI}
                    value={aiTextPrompt}
                    onChange={e => setAiTextPrompt(e.target.value)}
                    placeholder="np. czerwona rakieta rajdowa..."
                    onKeyDown={e => e.key === 'Enter' && handleAIVoxelGeneration()}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:border-[#C2A578] placeholder-gray-500 text-[#E0E0E0] disabled:opacity-50"
                  />
                  <button
                    disabled={!aiTextPrompt || isProcessingAI}
                    onClick={handleAIVoxelGeneration}
                    className="w-full bg-[#C2A578] hover:bg-[#A38A64] text-[#E0E0E0] text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-md shadow-[#C2A578]/10"
                  >
                    <Sparkles size={13} />
                    Generuj Voxel 3D ✨
                  </button>
                </div>
              </div>

              <div className="bg-[#111] border border-white/10 rounded-2xl p-4 shadow-inner space-y-3">
                <div className="flex items-center gap-2 text-[#E0E0E0]">
                  <div className="w-6 h-6 rounded border border-[#C2A578]/30 flex items-center justify-center text-[#C2A578]">
                    <ImageIcon size={12} />
                  </div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Fotoodczyt Voxel (Skaner)</h4>
                </div>
                
                <p className="text-[11px] text-white/40 leading-snug">Prześlij zdjęcie obiektu (np. mebel, postać, proste logo, dom), a system przeanalizuje jego sylwetkę i ułoży wektory klocków.</p>

                <div className="pt-2">
                  <label htmlFor="scan-upload" className="w-full border border-dashed border-white/10 hover:border-[#C2A578]/50 hover:bg-[#C2A578]/5 rounded-2xl py-6 px-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                      <ImageIcon size={16} />
                    </div>
                    <span className="text-xs font-semibold text-white/50">Prześlij plik graficzny</span>
                    <span className="text-[10px] text-white/30">Maks. rozmiar 10MB</span>
                  </label>
                  <input 
                    type="file" 
                    id="scan-upload"
                    accept="image/*"
                    disabled={isProcessingAI}
                    onChange={handleImageUploaded}
                    className="hidden" 
                  />
                </div>
              </div>

              {/* Tips */}
              <div className="mt-auto bg-white/2 p-3.5 rounded-xl border border-white/10 text-[11px] text-white/40 leading-snug flex items-start gap-2.5">
                <span className="text-[#C2A578] text-base">💡</span>
                <p>Nasze algorytmy dbają o fizyczne pionowe podparcie modelu, dzięki czemu każdy klocek ma spoiwo z ziemią.</p>
              </div>

            </div>
          )}

          {/* TAB 3: PLAC BUDOWY - MANUAL VOXEL SCULPTING */}
          {activeTab === 'editor' && (
            <div className="space-y-4 flex-grow flex flex-col">
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 px-1">Typ Pędzla</h3>
                  {selectedBlueprint?.id !== 'custom' && (
                    <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg font-medium">Tylko Odczyt</span>
                  )}
                </div>

                {selectedBlueprint?.id === 'custom' ? (
                  <div className="grid grid-cols-5 gap-2.5">
                    <button
                      onClick={() => setBrushType('pencil')}
                      title="Ołówek 1x1"
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                        brushType === 'pencil' 
                          ? 'bg-[#C2A578]/15 text-[#C2A578] border-[#C2A578]/30 shadow' 
                          : 'bg-[#111] hover:bg-white/5 text-white/40 border-white/10'
                      }`}
                    >
                      <Hammer size={15} />
                      <span className="text-[9px] font-bold">1x1</span>
                    </button>

                    <button
                      onClick={() => setBrushType('brush2x2')}
                      title="Matryca 2x2"
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                        brushType === 'brush2x2' 
                          ? 'bg-[#C2A578]/15 text-[#C2A578] border-[#C2A578]/30 shadow' 
                          : 'bg-[#111] hover:bg-white/5 text-white/40 border-white/10'
                      }`}
                    >
                      <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5">
                        <div className="bg-current rounded-[1px]"></div>
                        <div className="bg-current rounded-[1px]"></div>
                        <div className="bg-current rounded-[1px]"></div>
                        <div className="bg-current rounded-[1px]"></div>
                      </div>
                      <span className="text-[9px] font-bold">2x2</span>
                    </button>

                    <button
                      onClick={() => setBrushType('brush3x3')}
                      title="Matryca 3x3"
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                        brushType === 'brush3x3' 
                          ? 'bg-[#C2A578]/15 text-[#C2A578] border-[#C2A578]/30 shadow' 
                          : 'bg-[#111] hover:bg-white/5 text-white/40 border-white/10'
                      }`}
                    >
                      <div className="grid grid-cols-3 gap-0.5 w-4 h-4">
                        {[...Array(9)].map((_, i) => (
                          <div key={i} className="bg-current rounded-[1px]"></div>
                        ))}
                      </div>
                      <span className="text-[9px] font-bold">3x3</span>
                    </button>

                    <button
                      onClick={() => setBrushType('pipette')}
                      title="Pipeta pobierania koloru"
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                        brushType === 'pipette' 
                          ? 'bg-[#C2A578]/15 text-[#C2A578] border-[#C2A578]/30 shadow' 
                          : 'bg-[#111] hover:bg-white/5 text-white/40 border-white/10'
                      }`}
                    >
                      <Pipette size={14} />
                      <span className="text-[9px] font-bold">Pipeta</span>
                    </button>

                    <button
                      onClick={() => setBrushType('delete')}
                      title="Gumka (PPM)"
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                        brushType === 'delete' 
                          ? 'bg-red-500/10 text-red-400 border-red-500/35 shadow' 
                          : 'bg-[#111] hover:bg-white/5 text-white/40 border-white/10'
                      }`}
                    >
                      <Trash2 size={15} />
                      <span className="text-[9px] font-bold">Gumka</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-500/85 leading-snug">
                    Bieżący wzór katalogu jest zablokowany przed edycją. Aby malować i stawiać klocki, przełącz się wyżej na <strong>"Kreatywny Plac Budowy"</strong>.
                  </div>
                )}
              </div>

              {selectedBlueprint?.id === 'custom' && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 px-1 mb-2">Paleta Teksturowana</h3>
                  <div className="grid grid-cols-4 gap-2.5">
                    {buildPalette.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setBuildColorItem(item);
                          if (brushType === 'delete' || brushType === 'pipette') setBrushType('pencil');
                        }}
                        title={`${item.name} (${item.type})`}
                        className={`p-2 rounded-xl bg-[#111] border text-[10px] text-left transition-all ${
                          buildColorItem.color === item.color 
                            ? 'border-white text-[#E0E0E0] shadow' 
                            : 'border-white/10 text-white/30 hover:border-white/10 hover:text-white/50'
                        }`}
                      >
                        <div 
                          className="w-full h-7 rounded-md mb-1.5 border border-white/10 relative overflow-hidden" 
                          style={{ backgroundColor: item.color }}
                        >
                          <span className="absolute bottom-0 right-0 py-0.5 px-1 bg-black/40 text-[7px] text-[#E0E0E0] uppercase font-bold text-xxs tracking-wider">
                            {item.type.substring(0, 3)}
                          </span>
                        </div>
                        <span className="block font-medium truncate leading-none pt-0.5">{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedBlueprint?.id === 'custom' && (
                <div className="pt-4 border-t border-white/10 mt-auto flex flex-col gap-2">
                  <button 
                    onClick={() => setShowSaveModal(true)}
                    disabled={customVoxels.length === 0}
                    className="w-full bg-green-600 hover:bg-green-500 text-[#E0E0E0] font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Save size={13} />
                    Zapisz ten plan do bazy
                  </button>
                  <button 
                    onClick={clearSandboxGrid}
                    disabled={customVoxels.length === 0}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/10 text-white/50 font-semibold text-xs py-2.5 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Wyczyść planszę
                  </button>
                </div>
              )}

            </div>
          )}

        </div>

        <div className="p-4 bg-[#080808] border-t border-white/5 flex flex-col gap-2.5 shrink-0 text-center">
          <div className="flex items-center justify-center gap-3.5 pt-1 uppercase tracking-widest text-[9px]">
            <a href="https://kick.com/a-acast" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-[#E0E0E0] transition-colors" title="KICK stream"><span className="font-semibold">KICK</span></a>
            <span className="text-white/20 font-mono">|</span>
            <a href="https://www.twitch.tv/a_acast" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-[#C2A578] transition-colors" title="Twitch channel"><span className="font-semibold">TWITCH</span></a>
            <span className="text-white/20 font-mono">|</span>
            <a href="https://www.youtube.com/@A-Acast" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-[#E0E0E0] transition-colors" title="YouTube"><span className="font-semibold">YOUTUBE</span></a>
            <span className="text-white/20 font-mono">|</span>
            <a href="https://www.instagram.com/aia.cast/" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-[#C2A578] transition-colors" title="Instagram"><span className="font-semibold">INSTAGRAM</span></a>
          </div>
          <span className="text-[10px] text-white/30 font-light font-serif italic">© 2026 A&Acast Studio. Wszystkie prawa zastrzeżone.</span>
        </div>
      </aside>

      {/* Main 3D Viewport Area */}
      <main className="flex-grow flex flex-col relative bg-[#0A0A0A]">
        
        {/* Loading AI Hologram overlays */}
        {isProcessingAI && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
              {/* Outer double glowing spinning circles */}
              <div className="absolute inset-0 border-[3.5px] border-dashed border-[#C2A578]/20 rounded-full"></div>
              <div className="absolute inset-0 border-[3.5px] border-t-transparent border-t-[#C2A578] rounded-full animate-spin"></div>
              <div className="absolute inset-4 border border-emerald-500/20 rounded-full"></div>
              <div className="absolute inset-4 border-b-transparent border-b-emerald-400 rounded-full animate-spin [animation-direction:reverse] [animation-duration:1.5s]"></div>
              
              <Wand2 size={32} className="text-[#C2A578] animate-pulse" />
            </div>
            
            <h2 className="text-2xl font-serif italic text-[#E0E0E0] tracking-wide mb-2 flex items-center gap-2">
              Gemini 3.5 Myśli...
            </h2>
            <p className="text-xs text-[#C2A578] animate-pulse font-mono max-w-sm text-center tracking-widest leading-relaxed">
              {uploadProgress || 'Algorytm konstruuje siatkę voxelową i nakłada tekstury fizyczne...'}
            </p>
          </div>
        )}

        {/* Floating HUD Controller Deck */}
        <div className="absolute top-5 left-5 right-5 z-20 pointer-events-none flex justify-between items-start gap-4 flex-wrap">
          
          {/* Active stats badge */}
          <div className="bg-[#111]/80 border border-white/10 px-4 py-3 rounded-2.5xl backdrop-blur-md pointer-events-auto flex items-center gap-3 shadow-xl">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 shrink-0">
              <Compass size={16} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Wybrany Wzór</div>
              <div className="text-xs font-bold text-[#E0E0E0] flex items-center gap-1.5 min-w-[120px]">
                {selectedBlueprint?.name || 'Kreatywny Plac'}
                {selectedBlueprint?.id === 'custom' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                )}
              </div>
            </div>
          </div>

          {/* Quick Setup deck */}
          <div className="flex items-center gap-2.5 pointer-events-auto flex-wrap">
            
            {/* Scenery scroller */}
            <div className="bg-[#111]/80 border border-white/10 p-1 rounded-2xl backdrop-blur-md flex gap-1 shadow-xl">
              <button
                onClick={() => setGridConfig(prev => ({ ...prev, theme: 'neon' }))}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  gridConfig.theme === 'neon' ? 'bg-[#222] text-[#C2A578]' : 'text-white/40 hover:text-[#E0E0E0]'
                }`}
              >
                Neon
              </button>
              <button
                onClick={() => setGridConfig(prev => ({ ...prev, theme: 'cozy' }))}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  gridConfig.theme === 'cozy' ? 'bg-[#222] text-[#fca34d]' : 'text-white/40 hover:text-[#E0E0E0]'
                }`}
              >
                Zmierzch
              </button>
              <button
                onClick={() => setGridConfig(prev => ({ ...prev, theme: 'light' }))}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  gridConfig.theme === 'light' ? 'bg-[#1a1c23]/10 text-white/30 bg-black/5' : 'text-white/40 hover:text-[#E0E0E0]'
                }`}
              >
                Dzień
              </button>
            </div>

            {/* Grid display toggle */}
            <button
              onClick={() => setGridConfig(prev => ({ ...prev, visible: !prev.visible }))}
              className={`p-2.5 rounded-xl border backdrop-blur-md transition-all flex items-center justify-center shadow-xl ${
                gridConfig.visible 
                  ? 'bg-[#222] border-[#C2A578]/30 text-[#C2A578]' 
                  : 'bg-[#111]/80 border-white/10 text-white/40 hover:text-[#E0E0E0]'
              }`}
              title="Pokaż siatkę"
            >
              <Grid size={15} />
            </button>

            {/* Layer isolation Toggle */}
            <button
              onClick={() => setGridConfig(prev => ({ ...prev, soloLayer: !prev.soloLayer }))}
              className={`p-2.5 rounded-xl border backdrop-blur-md transition-all flex items-center justify-center shadow-xl ${
                gridConfig.soloLayer 
                  ? 'bg-[#222] border-[#C2A578]/30 text-[#C2A578]' 
                  : 'bg-[#111]/80 border-white/10 text-white/40 hover:text-[#E0E0E0]'
              }`}
              title="Pokazuj pojedynczą warstwę solo"
            >
              <Layers size={15} />
            </button>

            {/* Sound FX Mixer Deck */}
            <div className="bg-[#111]/80 border border-white/10 p-1.5 rounded-2xl backdrop-blur-md flex items-center gap-2.5 shadow-xl">
              <button
                onClick={() => setSoundEnabled(prev => !prev)}
                className={`p-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center ${
                  soundEnabled ? 'text-green-400' : 'text-white/30 hover:text-white/50'
                }`}
              >
                {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>
              {soundEnabled && (
                <input 
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.05"
                  value={soundVolume}
                  onChange={e => setSoundVolume(parseFloat(e.target.value))}
                  className="w-14 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-green-400"
                />
              )}
            </div>

          </div>

        </div>

        {/* 3D Scene Viewport */}
        <div className="flex-grow w-full h-full relative">
          <VoxelCanvas
            activeVoxels={activeVoxels}
            setCustomVoxels={setCustomVoxels}
            currentLayer={currentLayer}
            maxLayer={maxLayer}
            setMaxLayer={setMaxLayer}
            isCustomMode={selectedBlueprint?.id === 'custom'}
            buildColorItem={buildColorItem}
            brushType={brushType}
            setBrushType={setBrushType}
            setBuildColorItem={setBuildColorItem}
            gridConfig={gridConfig}
            soundEnabled={soundEnabled}
          />
        </div>

        {/* Bottom build process slider deck */}
        <div className="h-24 bg-[#111]/95 backdrop-blur-md border-t border-white/10 flex items-center px-6 gap-6 shrink-0 relative z-10">
          
          {/* Timeline Play/Pause button */}
          <button
            title={isPlaying ? 'Zatrzymaj' : 'Odtwórz proces budowy klocków'}
            onClick={() => {
              if (currentLayer >= maxLayer) {
                setCurrentLayer(0);
              }
              setIsPlaying(!isPlaying);
            }}
            disabled={activeVoxels.length === 0}
            className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-all ${
              isPlaying 
                ? 'bg-[#ef4444] text-[#E0E0E0] shadow-lg shadow-red-500/10' 
                : 'bg-[#C2A578] hover:bg-[#A38A64] text-[#E0E0E0] shadow-lg shadow-[#C2A578]/10 disabled:opacity-45'
            }`}
          >
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            )}
          </button>

          {/* Timeline sliders scrubber details */}
          <div className="flex-grow flex flex-col justify-center">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-semibold text-white/40 flex items-center gap-1.5">
                <Sliders size={12} className="text-[#C2A578]" />
                Kolejność budowy warstw
              </span>
              <span className="text-xs text-white/50 font-mono">
                Poziom <strong className="text-[#C2A578] text-sm">{currentLayer}</strong> / {maxLayer}
              </span>
            </div>
            <input 
              type="range"
              min="0"
              max={maxLayer}
              value={currentLayer}
              onChange={e => {
                setIsPlaying(false);
                setCurrentLayer(parseInt(e.target.value));
              }}
              className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-[#C2A578]"
            />
          </div>

          {/* Core metadata details right deck */}
          <div className="hidden md:flex border-l border-white/10 pl-6 gap-4 min-w-[200px] select-none text-right shrink-0">
            <div>
              <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Metryka Budynku</div>
              <div className="text-xs font-bold font-mono text-[#E0E0E0] pt-1">
                GĘSTOŚĆ: {activeVoxels.length} voxel-sześcianów
              </div>
              <div className="text-[10px] text-white/30 font-mono">
                Rozmiar siatki: 12x12x12 (Y_Max: {maxLayer})
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
