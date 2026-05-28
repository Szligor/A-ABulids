import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Grid, 
  Layers, 
  Compass, 
  Hammer, 
  Pipette,
  Save,
  Library
} from 'lucide-react';
import { Voxel, PaletteItem, PaintBrushType, GridConfig } from './types';
import VoxelCanvas from './components/VoxelCanvas';
import { synths } from './utils/audio';

const buildPalette: PaletteItem[] = [
  { name: 'Grass Block', color: '#5e7c39', type: 'grass' },
  { name: 'Dirt', color: '#866043', type: 'dirt' },
  { name: 'Stone', color: '#7d7d7d', type: 'stone' },
  { name: 'Cobblestone', color: '#676767', type: 'stone' },
  { name: 'Sand', color: '#dbd3a0', type: 'sand' },
  { name: 'Gravel', color: '#8d8787', type: 'sand' },
  { name: 'End Stone', color: '#dde0a5', type: 'stone' },
  { name: 'Oak Planks', color: '#b18f5e', type: 'planks' },
  { name: 'Spruce Planks', color: '#715233', type: 'planks' },
  { name: 'Birch Planks', color: '#d0c182', type: 'planks' },
  { name: 'Jungle Planks', color: '#a07353', type: 'planks' },
  { name: 'Acacia Planks', color: '#a85b32', type: 'planks' },
  { name: 'Dark Oak Planks', color: '#422b15', type: 'planks' },
  { name: 'Oak Log', color: '#6d5533', type: 'wood' },
  { name: 'Birch Log', color: '#dbd9cf', type: 'wood' },
  { name: 'Spruce Log', color: '#3a2510', type: 'wood' },
  { name: 'Dark Oak Log', color: '#2c1b0d', type: 'wood' },
  { name: 'Oak Leaves', color: '#325a22', type: 'leaves' },
  { name: 'Spruce Leaves', color: '#2d4734', type: 'leaves' },
  { name: 'Birch Leaves', color: '#597d41', type: 'leaves' },
  { name: 'Bricks', color: '#995b42', type: 'stone' },
  { name: 'Stone Bricks', color: '#737373', type: 'stone' },
  { name: 'Obsidian', color: '#15111b', type: 'stone' },
  { name: 'Netherrack', color: '#622626', type: 'stone' },
  { name: 'Soul Sand', color: '#523e30', type: 'sand' },
  { name: 'Glowstone', color: '#cecd78', type: 'stone' },
  { name: 'Glass', color: '#c3dced', type: 'glass' },
  { name: 'Water', color: '#2b3ff3', type: 'glass' },
  { name: 'Lava', color: '#cc4600', type: 'glass' },
  { name: 'Coal Block', color: '#101010', type: 'stone' },
  { name: 'Iron Block', color: '#dedede', type: 'stone' },
  { name: 'Gold Block', color: '#fdf55f', type: 'stone' },
  { name: 'Diamond Block', color: '#6beade', type: 'stone' },
  { name: 'Emerald Block', color: '#41f384', type: 'stone' },
  { name: 'Redstone Block', color: '#aa0f00', type: 'stone' },
  { name: 'Lapis Lazuli Block', color: '#1b45b2', type: 'stone' },
  { name: 'White Wool', color: '#e9ecec', type: 'stone' },
  { name: 'Red Wool', color: '#a02722', type: 'stone' },
  { name: 'Blue Wool', color: '#35399d', type: 'stone' },
  { name: 'Black Wool', color: '#141519', type: 'stone' },
  { name: 'Green Wool', color: '#546d1b', type: 'stone' },
  { name: 'Yellow Wool', color: '#f8c527', type: 'stone' }
];

export default function App() {
  const [customVoxels, setCustomVoxels] = useState<Voxel[]>([]);
  const [currentLayer, setCurrentLayer] = useState<number>(0);
  const [maxLayer, setMaxLayer] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [soundVolume, setSoundVolume] = useState<number>(0.3);
  const [gridConfig, setGridConfig] = useState<GridConfig>({
    size: 30, // doubled from 30 width
    visible: true,
    soloLayer: false,
    theme: 'neon'
  });
  const [buildColorItem, setBuildColorItem] = useState<PaletteItem>(buildPalette[0]);
  const [brushType, setBrushType] = useState<PaintBrushType>('pencil');
  const [isConfirmingClear, setIsConfirmingClear] = useState<boolean>(false);

  // Load from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("minecraft_sandbox_voxels");
      if (saved) {
        const parsed = JSON.parse(saved);
        setCustomVoxels(parsed);
        const maxY = parsed.length > 0 ? Math.max(...parsed.map((v: Voxel) => v.y), 0) : 0;
        setMaxLayer(maxY);
        setCurrentLayer(maxY);
      }
    } catch(e) {}
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem("minecraft_sandbox_voxels", JSON.stringify(customVoxels));
    const maxY = customVoxels.length > 0 ? Math.max(...customVoxels.map(v => v.y), 0) : 0;
    setMaxLayer(maxY);
  }, [customVoxels]);

  useEffect(() => {
    synths.volumeValue = soundVolume;
  }, [soundVolume]);

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

  const clearSandboxGrid = () => {
    if (!isConfirmingClear) {
      setIsConfirmingClear(true);
      setTimeout(() => setIsConfirmingClear(false), 3000);
      return;
    }
    setCustomVoxels([]);
    setCurrentLayer(0);
    setMaxLayer(0);
    setIsConfirmingClear(false);
    if (soundEnabled) synths.playDelete();
  };

  const visibleVoxels = customVoxels.filter(v => {
    if (gridConfig.soloLayer) {
      return v.y === currentLayer;
    }
    return v.y <= currentLayer;
  });

  const getMaterialCounts = () => {
    const counts: Record<string, number> = {};
    visibleVoxels.forEach(v => {
      counts[v.color] = (counts[v.color] || 0) + 1;
    });
    return Object.entries(counts).map(([color, count]) => {
      const paletteMatch = buildPalette.find(p => p.color === color);
      return {
        color,
        name: paletteMatch ? paletteMatch.name : "Inny",
        count
      };
    }).sort((a, b) => b.count - a.count);
  };

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-[#E0E0E0] font-sans overflow-hidden select-none">
      <aside className="w-85 bg-[#111] border-r border-white/10 flex flex-col z-10 shadow-2xl overflow-y-auto shrink-0">
        <div className="p-5 border-b border-white/10 bg-[#0A0A0A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#C2A578] rounded-xl flex items-center justify-center text-[#E0E0E0] shadow-xl shadow-[#C2A578]/30">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
            <div>
              <h1 className="font-serif italic text-xl tracking-widest text-[#E0E0E0] flex items-center gap-1.5 uppercase">
                Plac Budowy
                <span className="text-[10px] uppercase font-bold text-[#C2A578] bg-[#C2A578]/10 px-1.5 py-0.5 rounded tracking-widest font-mono not-italic">3D</span>
              </h1>
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 mt-1">Manual Voxel Sculpting</p>
            </div>
          </div>
        </div>

        <div className="flex-grow p-4 overflow-y-auto flex flex-col">
          <div className="space-y-4 flex-grow flex flex-col">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 px-1">Typ Pędzla</h3>
              </div>
              <div className="grid grid-cols-5 gap-2.5">
                <button
                  onClick={() => setBrushType("pencil")}
                  title="Ołówek 1x1"
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${brushType === "pencil" ? "bg-[#C2A578]/15 text-[#C2A578] border-[#C2A578]/30 shadow" : "bg-[#111] hover:bg-white/5 text-white/40 border-white/10"}`}
                >
                  <Hammer size={15} />
                  <span className="text-[9px] font-bold">1x1</span>
                </button>
                <button
                  onClick={() => setBrushType("brush2x2")}
                  title="Matryca 2x2"
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${brushType === "brush2x2" ? "bg-[#C2A578]/15 text-[#C2A578] border-[#C2A578]/30 shadow" : "bg-[#111] hover:bg-white/5 text-white/40 border-white/10"}`}
                >
                  <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5">
                    <div className="bg-current rounded-[1px]"></div><div className="bg-current rounded-[1px]"></div>
                    <div className="bg-current rounded-[1px]"></div><div className="bg-current rounded-[1px]"></div>
                  </div>
                  <span className="text-[9px] font-bold">2x2</span>
                </button>
                <button
                  onClick={() => setBrushType("brush3x3")}
                  title="Matryca 3x3"
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${brushType === "brush3x3" ? "bg-[#C2A578]/15 text-[#C2A578] border-[#C2A578]/30 shadow" : "bg-[#111] hover:bg-white/5 text-white/40 border-white/10"}`}
                >
                  <div className="grid grid-cols-3 gap-0.5 w-4 h-4">
                    {[...Array(9)].map((_, i) => <div key={i} className="bg-current rounded-[1px]"></div>)}
                  </div>
                  <span className="text-[9px] font-bold">3x3</span>
                </button>
                <button
                  onClick={() => setBrushType("pipette")}
                  title="Pipeta pobierania koloru"
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${brushType === "pipette" ? "bg-[#C2A578]/15 text-[#C2A578] border-[#C2A578]/30 shadow" : "bg-[#111] hover:bg-white/5 text-white/40 border-white/10"}`}
                >
                  <Pipette size={14} />
                  <span className="text-[9px] font-bold">Pipeta</span>
                </button>
                <button
                  onClick={() => setBrushType("delete")}
                  title="Gumka (PPM)"
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${brushType === "delete" ? "bg-red-500/10 text-red-400 border-red-500/35 shadow" : "bg-[#111] hover:bg-white/5 text-white/40 border-white/10"}`}
                >
                  <Trash2 size={15} />
                  <span className="text-[9px] font-bold">Gumka</span>
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 px-1 mb-2 mt-4">Paleta Teksturowana</h3>
              <div className="grid grid-cols-4 gap-2.5">
                {buildPalette.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setBuildColorItem(item);
                      if (brushType === "delete" || brushType === "pipette") setBrushType("pencil");
                    }}
                    title={`${item.name} (${item.type})`}
                    className={`p-2 rounded-xl bg-[#111] border text-[10px] text-left transition-all ${buildColorItem.color === item.color ? "border-white text-[#E0E0E0] shadow" : "border-white/10 text-white/30 hover:border-white/10 hover:text-white/50"}`}
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

            <div className="pt-4 border-t border-white/10 mt-auto flex flex-col gap-2">
              <button 
                onClick={clearSandboxGrid}
                disabled={customVoxels.length === 0}
                className={`w-full font-bold text-xs py-3 rounded-xl transition-colors disabled:opacity-50 border ${
                  isConfirmingClear 
                    ? "bg-red-500/20 hover:bg-red-500/30 border-red-500/50 text-red-500" 
                    : "bg-[#C2A578]/10 hover:bg-[#C2A578]/20 border-[#C2A578]/30 hover:border-[#C2A578]/50 text-[#C2A578]"
                }`}
              >
                <Trash2 size={13} className="inline mr-1" />
                {isConfirmingClear ? "Na pewno? (Kliknij)" : "Wyczyść planszę"}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#080808] border-t border-white/5 flex flex-col gap-2.5 shrink-0 text-center">
          <span className="text-[10px] text-white/30 font-light font-serif italic">© 2026 Sandbox Studio.</span>
        </div>
      </aside>

      <main className="flex-grow flex flex-col relative bg-[#0A0A0A]">
        <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex justify-between items-start gap-4 flex-wrap">
          <div className="bg-[#111]/80 border border-white/10 rounded-2.5xl backdrop-blur-md pointer-events-auto flex items-center shadow-xl overflow-hidden min-h-[56px]">
            <div className="px-5 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#C2A578]/10 flex items-center justify-center text-[#C2A578] shrink-0 border border-[#C2A578]/20">
                <Compass size={16} />
              </div>
              <div className="min-w-[140px]">
                <div className="text-[9px] uppercase font-bold text-white/40 tracking-widest">Projekt</div>
                <div className="text-sm font-serif italic text-[#E0E0E0] flex items-center gap-1.5 mt-0.5">
                  Sandbox 30x30
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0 ml-1 shadow-[0_0_5px_#4ade80]" />
                </div>
              </div>
            </div>

            <div className="border-l border-white/5 py-2 pl-4 pr-5 hidden lg:flex flex-col justify-center h-full bg-[#080808]/50">
              <div className="text-[8px] uppercase font-bold text-white/30 tracking-[0.2em] mb-1.5 flex items-center gap-1.5">
                Materiały {gridConfig.soloLayer ? `(Tylko poziom Y=${currentLayer + 1})` : '(Cała Bryła)'}
              </div>
              <div className="flex gap-1 overflow-visible max-w-[280px] flex-wrap items-center">
                {visibleVoxels.length === 0 && <span className="text-[10px] text-white/20 italic font-serif">Brak bloków</span>}
                {getMaterialCounts().slice(0, 5).map(m => (
                  <div key={m.color} className="flex items-center gap-1 bg-[#111] px-1.5 py-0.5 rounded border border-white/10" title={m.name}>
                    <div className="w-2.5 h-2.5 rounded-[1px] border border-white/10 shadow-sm" style={{backgroundColor: m.color}}></div>
                    <span className="text-[10px] font-mono text-[#E0E0E0]">{m.count}</span>
                  </div>
                ))}
                {getMaterialCounts().length > 5 && (
                  <div className="flex items-center gap-1 bg-[#111] px-1.5 py-0.5 rounded border border-white/10">
                    <span className="text-[10px] font-mono text-white/40">+{getMaterialCounts().length - 5}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-l border-white/5 py-2 px-5 hidden sm:flex flex-col justify-center h-full">
               <div className="text-[8px] uppercase font-bold text-white/30 tracking-[0.2em] text-right">Liczba Bloków</div>
               <div className="text-sm font-bold font-mono text-[#C2A578] pt-1 text-right leading-none">
                 {visibleVoxels.length} <span className="text-[9px] text-white/30">/ {customVoxels.length}</span>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pointer-events-auto flex-wrap">
            <div className="bg-[#111]/80 border border-white/10 p-1 rounded-2xl backdrop-blur-md flex gap-1 shadow-xl">
              <button
                onClick={() => setGridConfig(prev => ({ ...prev, theme: "neon" }))}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${gridConfig.theme === "neon" ? "bg-[#222] text-[#C2A578] shadow" : "text-white/30 hover:text-[#E0E0E0] hover:bg-white/5"}`}
              >Jasny</button>
              <button
                onClick={() => setGridConfig(prev => ({ ...prev, theme: "void" }))}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${gridConfig.theme === "void" ? "bg-[#222] text-[#C2A578] shadow" : "text-white/30 hover:text-[#E0E0E0] hover:bg-white/5"}`}
              >Pustka</button>
            </div>

            <div className="bg-[#111]/80 border border-white/10 p-1 rounded-2xl backdrop-blur-md flex gap-1 shadow-xl">
              <button
                onClick={() => setSoundEnabled(s => !s)}
                className={`w-9 h-9 flex justify-center items-center rounded-xl transition-all ${soundEnabled ? "bg-[#C2A578]/10 text-[#C2A578]" : "text-white/40 hover:text-white"}`}
              >{soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}</button>
            </div>

            <div className="bg-[#111]/80 border border-white/10 p-1.5 px-3 rounded-2xl backdrop-blur-md flex items-center gap-3 shadow-xl">
              <div className="text-[9px] font-bold uppercase text-white/30 tracking-widest shrink-0">Wys.</div>
              <input 
                type="range" 
                min={0} max={maxLayer} step={1}
                value={currentLayer}
                onChange={e => setCurrentLayer(Number(e.target.value))}
                className="w-24 accent-[#C2A578] bg-white/10 h-1.5 rounded-full appearance-none cursor-ew-resize"
              />
              <div className="text-xs font-mono font-bold text-[#E0E0E0] w-6 text-right">
                {currentLayer}
              </div>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={visibleVoxels.length === 0}
                className="w-7 h-7 bg-[#222] ml-1 rounded-lg flex items-center justify-center text-[#C2A578] hover:bg-[#333] transition-colors disabled:opacity-30 disabled:hover:bg-[#222]"
              >{isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}</button>
            </div>

            <button
              onClick={() => setGridConfig(prev => ({ ...prev, soloLayer: !prev.soloLayer }))}
              className={`h-11 px-4 rounded-2xl border flex items-center gap-2 font-semibold text-[10px] uppercase tracking-wider transition-all backdrop-blur-md shadow-xl ${gridConfig.soloLayer ? "bg-amber-500/10 border-amber-500/30 text-amber-500" : "bg-[#111]/80 border-white/10 text-white/30 hover:text-white"}`}
            ><Layers size={14} />{gridConfig.soloLayer ? "Izolacja" : "Izoluj Y"}</button>
          </div>
        </div>

        <div className="flex-grow w-full h-full relative cursor-crosshair">
          <VoxelCanvas
            activeVoxels={visibleVoxels}
            setCustomVoxels={setCustomVoxels}
            currentLayer={currentLayer}
            maxLayer={maxLayer}
            setMaxLayer={setMaxLayer}
            isCustomMode={true}
            buildColorItem={buildColorItem}
            brushType={brushType}
            setBrushType={setBrushType}
            setBuildColorItem={setBuildColorItem}
            gridConfig={gridConfig}
            soundEnabled={soundEnabled}
          />
        </div>
      </main>
    </div>
  );
}
