import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Voxel, PaletteItem, PaintBrushType, GridConfig } from '../types';
import { synths } from '../utils/audio';

interface VoxelCanvasProps {
  activeVoxels: Voxel[];
  setCustomVoxels: React.Dispatch<React.SetStateAction<Voxel[]>>;
  currentLayer: number;
  maxLayer: number;
  setMaxLayer: (val: number) => void;
  isCustomMode: boolean;
  buildColorItem: PaletteItem;
  brushType: PaintBrushType;
  setBrushType: (val: PaintBrushType) => void;
  setBuildColorItem: (item: PaletteItem) => void;
  gridConfig: GridConfig;
  soundEnabled: boolean;
}

const textureCache: Record<string, THREE.CanvasTexture> = {};

// Procedural pixel-art texture generator for voxel types
const getProceduralTexture = (colorHex: string, type: string) => {
  const key = `${colorHex}_${type}`;
  if (textureCache[key]) return textureCache[key];

  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Fill base color
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, 16, 16);

  // Apply rich visual shadows and textures depending on the block type
  if (type === 'stone') {
    // Stonework seams and heavy textures
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 0, 1, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(15, 0, 1, 16);
    // Stone speckled noise
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';
      ctx.fillRect(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), 1, 1);
    }
  } else if (type === 'wood') {
    // Horizontal tree logging rings and borders
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, 16, 2);
    ctx.fillRect(0, 14, 16, 2);
    for (let i = 2; i < 14; i += 3) {
      ctx.fillRect(i, 2, 1, 12);
    }
  } else if (type === 'planks') {
    // Horizontal wood panel slats and vertical cuts
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 5, 16, 1);
    ctx.fillRect(0, 10, 16, 1);
    ctx.fillRect(0, 15, 16, 1);
    // Slats offsets
    ctx.fillRect(4, 0, 1, 5);
    ctx.fillRect(11, 5, 1, 5);
    ctx.fillRect(6, 10, 1, 6);
  } else if (type === 'leaves') {
    // Fluffy modular leaves noise
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = Math.random() > 0.4 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)';
      ctx.fillRect(Math.floor(Math.random() * 14 + 1), Math.floor(Math.random() * 14 + 1), 2, 2);
    }
  } else if (type === 'glass') {
    // Specular glass shine
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.moveTo(3, 13);
    ctx.lineTo(13, 3);
    ctx.lineTo(13, 5);
    ctx.lineTo(5, 13);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 16, 16);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter; // Pixelated Minecraft aesthetic
  texture.minFilter = THREE.NearestFilter;
  textureCache[key] = texture;
  return texture;
};

export default function VoxelCanvas({
  activeVoxels,
  setCustomVoxels,
  currentLayer,
  maxLayer,
  setMaxLayer,
  isCustomMode,
  buildColorItem,
  brushType,
  setBrushType,
  setBuildColorItem,
  gridConfig,
  soundEnabled
}: VoxelCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const voxelGroupRef = useRef<THREE.Group | null>(null);
  const groundRef = useRef<THREE.Mesh | null>(null);
  const previewVoxelRef = useRef<THREE.Mesh | null>(null);
  const isPointerDownRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });

  // Grid references for config changes
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Synchronize Scene Background & Lights based on Theme config
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (gridConfig.theme === 'neon') {
      scene.background = new THREE.Color('#0b0b0d');
      if (dirLightRef.current) {
        dirLightRef.current.color.setHex(0x9146ff);
        dirLightRef.current.intensity = 0.8;
      }
    } else if (gridConfig.theme === 'light') {
      scene.background = new THREE.Color('#f3f4f6');
      if (dirLightRef.current) {
        dirLightRef.current.color.setHex(0xffffff);
        dirLightRef.current.intensity = 0.9;
      }
    } else {
      // cozy
      scene.background = new THREE.Color('#13111c');
      if (dirLightRef.current) {
        dirLightRef.current.color.setHex(0xffd59a); // warm orange sun
        dirLightRef.current.intensity = 1.0;
      }
    }
  }, [gridConfig.theme]);

  // Handle layer visibility filters
  useEffect(() => {
    const group = voxelGroupRef.current;
    if (!group) return;

    group.children.forEach(mesh => {
      const y = mesh.position.y;
      if (gridConfig.soloLayer) {
        // Show ONLY the active layer slice
        mesh.visible = y === currentLayer;
      } else {
        // Show everything up to the selected layer
        mesh.visible = y <= currentLayer;
      }
    });
  }, [currentLayer, gridConfig.soloLayer, activeVoxels]);

  // Initial ThreeJS scene initialization
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    // Cinematic default angle looking down at the construction plate
    camera.position.set(16, 12, 16);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.01; // Avoid going fully underground
    controls.minDistance = 5;
    controls.maxDistance = 60;
    controls.target.set(0, 3, 0);
    controlsRef.current = controls;

    // Ambient light - full bounce light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    // Directional Sunshine with beautiful soft shadows
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.82);
    dirLight.position.set(15, 25, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;
    
    // Expand shadow frustum for wider view
    const d = 15;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // Grid System
    const gridHelper = new THREE.GridHelper(30, 30, 0x808080, 0x4a4a55);
    // Move grid slightly above the ground plane (-0.5) to prevent z-fighting / occlusion
    gridHelper.position.set(0.5, -0.49, 0.5);
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // Invisible mouse collider plane for ground raycasting
    const groundGeo = new THREE.PlaneGeometry(30, 30);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x1f1f23, side: THREE.DoubleSide });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);
    groundRef.current = ground;

    // Hover wireframe box indicating grid bounds placement
    const previewGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const previewMat = new THREE.MeshBasicMaterial({
      color: 0x9146ff,
      transparent: true,
      opacity: 0.35,
      wireframe: false
    });
    const previewVoxel = new THREE.Mesh(previewGeo, previewMat);
    previewVoxel.visible = false;
    scene.add(previewVoxel);
    previewVoxelRef.current = previewVoxel;

    // Group to contain active 3D blocks
    const voxelGroup = new THREE.Group();
    scene.add(voxelGroup);
    voxelGroupRef.current = voxelGroup;

    // Main render/update loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (controls.update) controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Responsive dimension handling
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width: entryW, height: entryH } = entry.contentRect;
        const targetW = entryW || 800;
        const targetH = entryH || 500;
        camera.aspect = targetW / targetH;
        camera.updateProjectionMatrix();
        renderer.setSize(targetW, targetH);
      }
    });
    
    resizeObserver.observe(containerRef.current);

    // Initial theme update
    scene.background = new THREE.Color('#0b0b0d');

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // Update voxel geometry on data changes
  useEffect(() => {
    const group = voxelGroupRef.current;
    if (!group || !sceneRef.current) return;

    // Clean up older blocks
    while (group.children.length > 0) {
      const child = group.children[0] as THREE.Mesh;
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    // Build the grid mesh array
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    
    // Thin charcoal outer borders around the blocks so borders are crisp
    const edgeGeo = new THREE.EdgesGeometry(boxGeo);
    const edgeMat = new THREE.LineBasicMaterial({ 
      color: 0x000000, 
      transparent: true, 
      opacity: 0.23 
    });

    let currentMaxY = 0;

    activeVoxels.forEach(v => {
      if (v.y > currentMaxY) currentMaxY = v.y;

      const texture = getProceduralTexture(v.color, v.type);
      const isGlass = v.type === 'glass';

      const mat = new THREE.MeshLambertMaterial({
        map: texture,
        transparent: isGlass,
        opacity: isGlass ? 0.72 : 1.0,
        bumpScale: 0.05
      });

      const mesh = new THREE.Mesh(boxGeo, mat);
      mesh.position.set(v.x, v.y, v.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = v; // Attach voxel spec for query sampling

      // Add neat lines around the cubes
      const wire = new THREE.LineSegments(edgeGeo, edgeMat);
      mesh.add(wire);

      group.add(mesh);
    });

    setMaxLayer(Math.max(currentMaxY, 0));
  }, [activeVoxels]);

  // Sync Grid Configurations
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = gridConfig.visible;
    }
  }, [gridConfig.visible]);

  // Raycaster hover preview
  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCustomMode || !cameraRef.current || !sceneRef.current || !previewVoxelRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mX = ((e.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
    const mY = -((e.clientY - rect.top) / canvas.clientHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mX, mY), cameraRef.current);

    const group = voxelGroupRef.current;
    const ground = groundRef.current;
    if (!group || !ground) return;

    // Filter list to only target voxel meshes that are currently visible (filtered by layer slides)
    const visibleBlocks = group.children.filter(child => child.visible);
    const targets = [ground, ...visibleBlocks];

    const intersections = raycaster.intersectObjects(targets, false);

    if (intersections.length > 0) {
      const isect = intersections[0];
      const preview = previewVoxelRef.current;

      if (brushType === 'pipette') {
        preview.visible = false;
        canvas.style.cursor = "copy";
        return;
      } else if (brushType === 'delete') {
        canvas.style.cursor = "default";
        if (isect.object === ground) {
          preview.visible = false;
          return;
        }
        preview.visible = true;
        preview.position.copy(isect.object.position);
        (preview.material as THREE.MeshBasicMaterial).color.setHex(0xef4444);
        return;
      }

      // regular pencils or brush squares
      canvas.style.cursor = "crosshair";
      preview.visible = true;
      (preview.material as THREE.MeshBasicMaterial).color.setHex(0x9146ff);

      if (isect.object === ground) {
        const pointY = Math.round(isect.point.y);
        preview.position.set(
          Math.max(-10, Math.min(10, Math.round(isect.point.x))),
          Math.max(0, pointY >= 0 ? pointY : 0),
          Math.max(-10, Math.min(10, Math.round(isect.point.z)))
        );
      } else if (isect.face) {
        const normal = isect.face.normal;
        const placedPos = isect.object.position.clone().add(normal);
        
        // Block coordinate boundaries safeguard
        if (placedPos.y >= 0 && placedPos.y <= 12 && Math.abs(placedPos.x) <= 10 && Math.abs(placedPos.z) <= 10) {
          preview.position.copy(placedPos);
        } else {
          preview.visible = false;
        }
      }
    } else {
      previewVoxelRef.current.visible = false;
    }
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isPointerDownRef.current = true;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  };

  // Perform builders brush execution based on normal face matrices
  const handlePointerUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isPointerDownRef.current = false;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    // Don't draw if the user was just dragging to rotate the camera around
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) return;

    if (!isCustomMode || !cameraRef.current || !groundRef.current || !voxelGroupRef.current) return;
    if (e.button !== 0 && e.button !== 2) return; // Only process left click (draw) or right click (delete)

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mX = ((e.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
    const mY = -((e.clientY - rect.top) / canvas.clientHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mX, mY), cameraRef.current);

    const group = voxelGroupRef.current;
    const ground = groundRef.current;
    const visibleBlocks = group.children.filter(c => c.visible);
    const targets = [ground, ...visibleBlocks];

    const intersections = raycaster.intersectObjects(targets, false);

    if (intersections.length > 0) {
      const isect = intersections[0];

      // --- PIPETTE MODE ---
      if (brushType === 'pipette' && isect.object !== ground) {
        const item = isect.object.userData as Voxel;
        if (item) {
          setBuildColorItem({
            name: item.type.toUpperCase(),
            color: item.color,
            type: item.type
          });
          setBrushType('pencil');
          if (soundEnabled) synths.playPlace(0.15);
        }
        return;
      }

      // Define coordinates offsets based on brush sizes
      let radiusOffsetStart = 0;
      let radiusOffsetEnd = 0;
      
      if (brushType === 'brush2x2') {
        radiusOffsetStart = 0;
        radiusOffsetEnd = 1;
      } else if (brushType === 'brush3x3') {
        radiusOffsetStart = -1;
        radiusOffsetEnd = 1;
      }

      const normal = isect.face ? isect.face.normal : new THREE.Vector3(0, 1, 0);

      // --- DELETE ACTIONS (Right click or Delete brush) ---
      if (e.button === 2 || brushType === 'delete') {
        if (isect.object === ground) return;
        const targetPos = isect.object.position;

        // Collect all blocks to delete within brush bounds
        setCustomVoxels(prev => {
          let targetsToDelete = [{ x: targetPos.x, y: targetPos.y, z: targetPos.z }];

          if (radiusOffsetEnd > 0) {
            // Remove adjacent neighbors in horizontal square relative to orientation normals
            targetsToDelete = []; // reset so we get all in the brush area
            for (let i = radiusOffsetStart; i <= radiusOffsetEnd; i++) {
              for (let j = radiusOffsetStart; j <= radiusOffsetEnd; j++) {
                if (normal.y !== 0) {
                  targetsToDelete.push({ x: targetPos.x + i, y: targetPos.y, z: targetPos.z + j });
                } else if (normal.x !== 0) {
                  targetsToDelete.push({ x: targetPos.x, y: targetPos.y + i, z: targetPos.z + j });
                } else {
                  targetsToDelete.push({ x: targetPos.x + i, y: targetPos.y + j, z: targetPos.z });
                }
              }
            }
          }

          const filtered = prev.filter(v => 
            !targetsToDelete.some(t => t.x === v.x && t.y === v.y && t.z === v.z)
          );

          if (filtered.length !== prev.length && soundEnabled) {
            synths.playDelete();
          }
          return filtered;
        });
        return;
      }

      // --- DRAW BLOCKS ACTIONS (Left Click) ---
      let startPos = new THREE.Vector3();
      if (isect.object === ground) {
        startPos.set(Math.round(isect.point.x), 0, Math.round(isect.point.z));
      } else {
        startPos.copy(isect.object.position).add(normal);
      }

      // Build coordinates stack
      const additions: Voxel[] = [];
      const brushBounds = (normal.y !== 0) ? { u: 'x', v: 'z' } : (normal.x !== 0) ? { u: 'y', v: 'z' } : { u: 'x', v: 'y' };

      for (let offsetU = radiusOffsetStart; offsetU <= radiusOffsetEnd; offsetU++) {
        for (let offsetV = radiusOffsetStart; offsetV <= radiusOffsetEnd; offsetV++) {
          const pt = startPos.clone();
          
          if (brushBounds.u === 'x') pt.x += offsetU;
          if (brushBounds.u === 'y') pt.y += offsetU;
          if (brushBounds.v === 'y') pt.y += offsetV;
          if (brushBounds.v === 'z') pt.z += offsetV;
          if (brushBounds.u === 'x' && brushBounds.v === 'z') {
            // Horizontal tile offsets
            pt.x = startPos.x + offsetU;
            pt.z = startPos.z + offsetV;
          }

          // Bound checks
          if (pt.y >= 0 && pt.y <= 12 && Math.abs(pt.x) <= 6 && Math.abs(pt.z) <= 6) {
            additions.push({
              x: pt.x,
              y: pt.y,
              z: pt.z,
              color: buildColorItem.color,
              type: buildColorItem.type
            });
          }
        }
      }

      setCustomVoxels(prev => {
        const merged = [...prev];
        let placedAny = false;

        additions.forEach(add => {
          const exists = merged.some(v => v.x === add.x && v.y === add.y && v.z === add.z);
          if (!exists) {
            merged.push(add);
            placedAny = true;
          }
        });

        if (placedAny && soundEnabled) {
          synths.playPlace();
        }
        return merged;
      });
    }
  };

  const handleMouseLeave = () => {
    if (previewVoxelRef.current) previewVoxelRef.current.visible = false;
  };

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-crosshair">
      <canvas
        ref={canvasRef}
        onMouseMove={handlePointerMove}
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onMouseLeave={handleMouseLeave}
        className="w-full h-full outline-none block bg-transparent"
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
