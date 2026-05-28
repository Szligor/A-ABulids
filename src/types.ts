export interface Voxel {
  x: number;
  y: number;
  z: number;
  color: string;
  type: 'stone' | 'wood' | 'planks' | 'leaves' | 'glass';
}

export interface PresetBlueprint {
  id: string;
  name: string;
  isCustom: boolean;
  description?: string;
  voxels: Voxel[];
  createdAt?: string;
}

export interface PaletteItem {
  name: string;
  color: string;
  type: 'stone' | 'wood' | 'planks' | 'leaves' | 'glass';
}

export type PaintBrushType = 'pencil' | 'brush2x2' | 'brush3x3' | 'pipette' | 'delete';

export interface GridConfig {
  size: number;
  visible: boolean;
  soloLayer: boolean;
  theme: 'neon' | 'light' | 'cozy';
}
