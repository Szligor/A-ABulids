import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser configuration is increased to support high-resolution photo uploads for image-to-voxel scanning
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Path to persist local custom blueprints
const BLUEPRINTS_FILE = path.join(process.cwd(), "blueprints.json");

// --- INITIAL DEFAULT BLUEPRINTS & HAND-CRAFTED GENERATORS ---
const generateMagicTower = () => {
  const voxels: any[] = [];
  const add = (x: number, y: number, z: number, color: string, type = 'stone') => 
    voxels.push({ x, y, z, color, type });
  
  const c = {
    base: '#2d2d30', wall: '#e0e0e3', wallDark: '#c4c4c8',
    wood: '#52341d', woodDark: '#382211', roof: '#8b2e33',
    roofDark: '#6e2328', magic: '#a32cc4', magicGlow: '#d85eff',
    chain: '#444444', leaves: '#3a5f2b', window: '#78a2e0'
  };

  const getWall = () => Math.random() > 0.25 ? c.wall : c.wallDark;
  const getRoof = () => Math.random() > 0.20 ? c.roof : c.roofDark;

  for(let y=0; y<=1; y++) for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) if(Math.abs(x)+Math.abs(z) <= (y===0 ? 6 : 5)) add(x,y,z,c.base, 'stone');
  for(let y=2; y<=5; y++) for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) if(Math.abs(x)+Math.abs(z) <= 4) { if(y<=4 && z===4 && x===0) continue; add(x,y,z,getWall(), 'stone'); }
  for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) { const dist = Math.abs(x)+Math.abs(z); if(dist <= 5 && dist >= 3) add(x,6,z, (x%2===0 || z%2===0)? c.wood : c.woodDark, 'wood'); }
  for(let y=7; y<=11; y++) for(let x=-3; x<=3; x++) for(let z=-3; z<=3; z++) if(Math.abs(x)+Math.abs(z) <= 3) { if(y>=8 && y<=10 && z===3 && x===0) add(x,y,z,c.magic, 'glass'); else if (y===9 && Math.abs(x)===3 && z===0) add(x,y,z,c.window, 'glass'); else add(x,y,z,getWall(), 'stone'); }
  for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) { const dist = Math.abs(x)+Math.abs(z); if(dist <= 4 && dist >= 2) add(x,12,z,c.wood, 'wood'); }
  for(let y=13; y<=15; y++) for(let x=-2; x<=2; x++) for(let z=-2; z<=2; z++) if(Math.abs(x)+Math.abs(z) <= 2) add(x,y,z,getWall(), 'stone');
  for(let y=16; y<=24; y++) { const r = 24 - y; for(let x=-r; x<=r; x++) for(let z=-r; z<=r; z++) if(Math.abs(x)+Math.abs(z) <= r) { if (y===16 && Math.random() > 0.7) continue; add(x,y,z,getRoof(), 'planks'); } }

  add(2, 11, 0, c.wood, 'wood'); add(3, 11, 0, c.wood, 'wood'); add(4, 11, 0, c.wood, 'wood'); 
  add(4, 10, 0, c.chain, 'metal'); add(4, 9, 0, c.chain, 'metal');
  add(4, 8, 0, c.magicGlow, 'glass'); add(4, 7, 0, c.magicGlow, 'glass');

  const addLeaves = (vx: number, vy: number, vz: number) => { if(Math.random()>0.3) add(vx,vy,vz,c.leaves, 'leaves'); };
  addLeaves(4,2,1); addLeaves(4,2,-1); addLeaves(-4,2,1); addLeaves(-3,3,-2);
  addLeaves(2,5,3); addLeaves(2,4,3); addLeaves(-2,5,-3); addLeaves(0,11,3); addLeaves(1,10,2);
  addLeaves(0,16,2); addLeaves(1,17,1); addLeaves(-1,16,-1);

  return voxels;
};

const generateScannedCafe = () => {
  const voxels: any[] = [];
  const add = (x: number, y: number, z: number, color: string, type = 'stone') => 
    voxels.push({ x, y, z, color, type });

  const c = {
    base: '#555555', pillar: '#2a2a2e', wall: '#c96a34', 
    frame: '#3b2313', glassLit: '#e6d598', door: '#429e92', 
    awnG: '#85c296', awnW: '#e8ece9', leaves: '#4b7d34', roof: '#1c1c1e', planter: '#5a5a5c'
  };

  for(let x=-8; x<=8; x++) for(let z=-5; z<=5; z++) add(x, 0, z, z>2 ? c.base : c.pillar, 'stone');
  const isPillar = (x: number) => [-7, -3, 3, 7].includes(x);

  for(let y=1; y<=12; y++) {
    for(let x=-7; x<=7; x++) {
      for(let z=-4; z<=2; z++) {
        if (x===-7 || x===7 || z===-4) {
          if (x%2===0 && y%4!==0) add(x,y,z, c.wall, 'planks'); else add(x,y,z, c.pillar, 'stone');
          continue;
        }
        if (z===2) {
          if (isPillar(x)) add(x,y,z, c.pillar, 'stone');
          else {
            if (y<=3) {
              if (x>=-2 && x<=2) { if (x===0 && y<=2) add(x,y,z, c.door, 'planks'); else add(x,y,z, c.wall, 'planks'); }
              else { if (y<=2 && x!== -3 && x!== 3) add(x,y,z, c.glassLit, 'glass'); else add(x,y,z, c.wall, 'planks'); }
            } else if (y===4 || y===8) add(x,y,z, c.wall, 'planks');
            else if ((y>=5 && y<=7) || (y>=9 && y<=11)) {
              const localY = y>=9 ? y-8 : y-4; 
              if (localY === 2) {
                if ([-6, -4, -2, -1, 1, 2, 4, 6].includes(x)) add(x,y,z, c.frame, 'wood');
                else add(x,y,z, c.glassLit, 'glass');
              } else add(x,y,z, c.wall, 'planks');
            } else if (y===12) add(x,y,z, c.pillar, 'stone');
          }
        } else if (z <= 1) { if (y===4 || y===8 || y===12) add(x,y,z, c.roof, 'wood'); }
      }
    }
  }
  for(let x=-6; x<=-4; x++) add(x, 4, 3, Math.abs(x)%2===0 ? c.awnW : c.awnG, 'planks');
  for(let x=4; x<=6; x++) add(x, 4, 3, Math.abs(x)%2===0 ? c.awnW : c.awnG, 'planks');

  add(-5, 1, 4, '#a33232', 'planks'); add(-4, 1, 4, '#e6c86e', 'planks'); add(4, 1, 4, '#e6c86e', 'planks'); add(5, 1, 4, '#a33232', 'planks');
  add(-7, 1, 3, c.planter, 'stone'); add(-7, 2, 3, c.leaves, 'leaves'); add(7, 1, 3, c.planter, 'stone'); add(7, 2, 3, c.leaves, 'leaves');
  add(-4, 13, -1, c.leaves, 'leaves'); add(-4, 14, -1, c.leaves, 'leaves'); add(-3, 13, -1, c.leaves, 'leaves');
  add(4, 13, 0, c.leaves, 'leaves'); add(4, 14, 0, c.leaves, 'leaves'); add(3, 13, 0, c.leaves, 'leaves');
  for(let x=-7; x<=7; x+=2) { add(x, 13, 2, c.pillar, 'stone'); add(x, 13, -4, c.pillar, 'stone'); }
  for(let z=-4; z<=2; z+=2) { add(-7, 13, z, c.pillar, 'stone'); add(7, 13, z, c.pillar, 'stone'); }

  return voxels;
};

const generateCozyHouse = () => {
  const voxels: any[] = [];
  const add = (x: number, y: number, z: number, color: string, type = 'planks') => {
    voxels.push({ x, y, z, color, type });
  };
  // Base floor
  for (let x = -4; x <= 4; x++) {
    for (let z = -4; z <= 4; z++) {
      add(x, 0, z, '#c29b6f', 'planks'); // Spruce Floor
    }
  }
  // Walls
  for (let y = 1; y <= 4; y++) {
    for (let x = -4; x <= 4; x++) {
      for (let z = -4; z <= 4; z++) {
        const isWall = x === -4 || x === 4 || z === -4 || z === 4;
        if (isWall) {
          // Windows on sides
          if (y >= 2 && y <= 3 && ((x === 0 && Math.abs(z) === 4) || (z === 0 && Math.abs(x) === 4))) {
            add(x, y, z, '#a2d6f9', 'glass');
          } else if (x === 0 && z === 4 && y === 1) {
            // Door open area
            continue;
          } else {
            add(x, y, z, '#52341d', 'wood'); // Oak Logs at corners
          }
        }
      }
    }
  }
  // Roof pyramid
  for (let r = 0; r <= 5; r++) {
    const y = 5 + r;
    const w = 5 - r;
    for (let x = -w; x <= w; x++) {
      for (let z = -w; z <= w; z++) {
        if (Math.abs(x) === w || Math.abs(z) === w) {
          add(x, y, z, '#8b2e33', 'stone'); // Clay tiles
        }
      }
    }
  }
  return voxels;
};

const generateTreeOfLife = () => {
  const voxels: any[] = [];
  const add = (x: number, y: number, z: number, color: string, type = 'wood') => {
    voxels.push({ x, y, z, color, type });
  };
  // Mighty trunk
  for (let y = 0; y <= 7; y++) {
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        if (y === 0 || Math.abs(x) + Math.abs(z) < 2) {
          add(x, y, z, '#382211', 'wood');
        }
      }
    }
  }
  // Roots
  add(-2, 0, 0, '#382211', 'wood');
  add(2, 0, 0, '#382211', 'wood');
  add(0, 0, -2, '#382211', 'wood');
  add(0, 0, 2, '#382211', 'wood');
  
  // Magical leaves canopy
  for (let y = 6; y <= 13; y++) {
    const radius = y <= 9 ? 4 : (13 - y) + 1;
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const dist = Math.sqrt(x * x + z * z);
        if (dist <= radius + 0.5 && (Math.random() > 0.15 || dist < radius - 0.5)) {
          // Add organic glowing colors to the magical canopy
          const isMagic = Math.random() > 0.92;
          const color = isMagic ? '#d85eff' : (Math.random() > 0.5 ? '#3a5f2b' : '#4f7d3e');
          add(x, y, z, color, isMagic ? 'glass' : 'leaves');
        }
      }
    }
  }
  return voxels;
};

// Default hardcoded catalog
const defaultCatalog = [
  { id: 'magic_tower', name: 'Magiczna Wieża (Wieża Maga)', isCustom: false, generator: generateMagicTower, description: "Wspaniała pionowa wieża rzemieślnicza zwieńczona szpiczastym dachem i emanująca fioletową magią." },
  { id: 'cafe_hardcoded', name: 'Wzór Kamienicy (Kawiarnia)', isCustom: false, generator: generateScannedCafe, description: "Szczegółowa kawiarnia ze stolikami, markizami, donicami z kwiatami i stylowym dachem." },
  { id: 'cozy_house', name: 'Przytulna Chatka', isCustom: false, generator: generateCozyHouse, description: "Tradycyjny mały domek z oknami, dębowymi palami na rogach i dachem ze spadzistych cegieł." },
  { id: 'tree_of_life', name: 'Magiczne Drzewo Życia', isCustom: false, generator: generateTreeOfLife, description: "Prastary dąb o grubym pniu z korzeniami i świecącą, fioletowo-zieloną koroną z liści." },
  { id: 'custom', name: 'Kreatywny Plac Budowy', isCustom: true, generator: () => [], description: "Własna, pusta piaskownica 3D. Przejmij stery i stawiaj bloki piksel po pikselu!" }
];

// Helper to load/save custom blueprints
const loadBlueprints = () => {
  try {
    if (fs.existsSync(BLUEPRINTS_FILE)) {
      const data = fs.readFileSync(BLUEPRINTS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading custom blueprints:", error);
  }
  return [];
};

const saveBlueprints = (blueprints: any[]) => {
  try {
    fs.writeFileSync(BLUEPRINTS_FILE, JSON.stringify(blueprints, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing custom blueprints:", error);
  }
};

// API Endpoint to get all blueprints (including dynamic presets + persisted custom ones)
app.get("/api/blueprints", (req, res) => {
  const customItems = loadBlueprints();
  // We map generators to their evaluated static lists so the frontend gets complete grids
  const formattedCatalog = defaultCatalog.map(item => ({
    id: item.id,
    name: item.name,
    isCustom: item.isCustom,
    description: item.description,
    voxels: item.generator()
  }));

  res.json({
    presets: formattedCatalog,
    custom: customItems
  });
});

app.post("/api/blueprints", (req, res) => {
  const { name, voxels, description } = req.body;
  if (!name || !Array.isArray(voxels)) {
    return res.status(400).json({ error: "Nazwa projektu oraz lista voxeli (tablica) są wymagane." });
  }

  const newBlueprint = {
    id: "custom_" + Date.now(),
    name,
    isCustom: true,
    description: description || "Własny model voxelowy 3D stworzony w edytorze.",
    voxels,
    createdAt: new Date().toISOString()
  };

  const currentCustom = loadBlueprints();
  currentCustom.unshift(newBlueprint);
  saveBlueprints(currentCustom);

  res.status(201).json({ success: true, blueprint: newBlueprint });
});

// DELETE endpoint to clear custom blueprints
app.delete("/api/blueprints/:id", (req, res) => {
  const { id } = req.params;
  let currentCustom = loadBlueprints();
  currentCustom = currentCustom.filter((bp: any) => bp.id !== id);
  saveBlueprints(currentCustom);
  res.json({ success: true });
});

// --- API ENDPOINT FOR GEMINI SERVER-SIDE COGNITIVE VOXEL ART GENERATOR ---
app.post("/api/voxels/generate", async (req, res) => {
  const { prompt, image } = req.body;
  
  if (!prompt && !image) {
    return res.status(400).json({ error: "Proszę podać opis tekstowy lub wgrać obrazek do analizy AI." });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return res.status(500).json({ 
      error: "Brak skonfigurowanego klucza GEMINI_API_KEY w panelu konfiguracji secrets lub pliku .env." 
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const parts: any[] = [];
    
    // Determine instructions according to whether there's an image scan or purely text query
    let userMessage = "";
    if (image) {
      const base64Clean = image.split(",")[1] || image;
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Clean
        }
      });
      userMessage = `Przeanalizuj to zdjęcie i stwórz jego uproszczoną interpretację voxelową 3D (podobną do stylistyki Minecraft). Skup się na głównym obiekcie, jego kształcie i barwach. Wynik zbilansuj w siatce 12x12x12.`;
    } else {
      userMessage = `Stwórz trójwymiarowy model voxelowy dla opisu: "${prompt}". Zaprojektuj go w estetyce pixel-art 3D (styl Minecraft), gęsty i kompletny.`;
    }
    
    parts.push({ text: userMessage });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts },
      config: {
        systemInstruction: `Jesteś genialnym architektem i mistrzem 3D voxel-artu miejskiego i fantastycznego (stylystyka Minecraft, trójwymiarowy voxel art).
Tworzysz gęste, spójne, piękne obiekty voxelowe w ograniczonej przestrzeni.

Maksymalna siatka to 12x12x12 voxeli:
- X (szerokość): od -6 do 6
- Y (wysokość): od 0 do 12 (0 to poziom gruntu, buduj od dołu w górę, nie wieszaj voxelów w powietrzu bez podparcia)
- Z (głębokość): od -6 do 6

Zwróć odpowiedź w czystej postaci tablicy JSON modeli obiektów o następującej strukturze:
{
  x: liczba (od -6 do 6),
  y: liczba (od 0 do 12),
  z: liczba (od -6 do 6),
  color: ciąg znaków (kolor hex rozpoczynający się od #, np. '#4A7D3E'),
  type: ciąg znaków (materiał bloku: 'stone' | 'wood' | 'planks' | 'leaves' | 'glass')
}

WAŻNE ZASADY PROJEKTOWANIA:
- Stwarzaj gęste struktury o zdefiniowanym motywie (np. miecz, zamek, grzyb leśny, krzesło, kaktus, auto).
- Unikaj rzadkich, losowych pojedynczych klocków rozsianych chaotycznie. Twoje modele muszą wyglądać jak starannie ułożona budowla lub statuetka.
- Pamiętaj, aby postawione bloki miały logiczny pionowy ciąg (np. fundament, ściany, dach), tak aby dało się je budować od poziomu 0 w górę.
- Zwróć WYŁĄCZNIE tablicę JSON bez żadnych znaczników markdown typu \`\`\`json czy komentarzy wstępnych. Czysty kod JSON, który można natychmiast sparsować przez JSON.parse().`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "Lista voxelowych sześcianów tworzących obiekt 3D w osiach XYZ",
          items: {
            type: Type.OBJECT,
            properties: {
              x: { type: Type.INTEGER, description: "Współrzędna X układu (-6 do 6)" },
              y: { type: Type.INTEGER, description: "Współrzędna Y układu (0 do 12, grzbiet gruntu startuje od 0)" },
              z: { type: Type.INTEGER, description: "Współrzędna Z układu (-6 do 6)" },
              color: { type: Type.STRING, description: "Kolor Hex (np. '#52341d')" },
              type: { 
                type: Type.STRING, 
                enum: ["stone", "wood", "planks", "leaves", "glass"],
                description: "Typ fizycznego materiału do nałożenia tekstury" 
              }
            },
            required: ["x", "y", "z", "color", "type"]
          }
        }
      }
    });

    const parsedText = response.text;
    if (!parsedText) {
      throw new Error("Otrzymano pusty ciąg generacji z modelu Gemini.");
    }

    // Try parsing generated string
    const voxels = JSON.parse(parsedText.trim());
    res.json({ success: true, voxels });

  } catch (err: any) {
    console.error("Gemini server-side error:", err);
    res.status(500).json({ 
      error: `Nie udało się przetworzyć modelu przez AI: ${err.message || err}`
    });
  }
});

// --- VITE MIDDLEWARE SETUP AND STATIC SERVING ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[A&Acast Server] Backend running at http://localhost:${PORT}`);
  });
}

startServer();
