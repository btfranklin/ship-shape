import { HSBAColor, RNG, CapitalShipSurfaceGreebles, CapitalShipWindowsGreebles, EquipmentTrenchGreebles } from '../src/greebler/index.js';
import { ShipShapeGenerator, CompositeShipGenerator } from '../src/ship-shape/index.js';
import { PanelGreebles, PipeGreebles, LightPanelGreebles } from '../src/greebler/index.js';
import { ShipArchetype } from '../src/ship-shape/ShipComponent.js';
import { UnifiedTrunkComponent } from '../src/ship-shape/UnifiedTrunkComponent.js';

console.log('Greebler Playground Loaded');

// Constants
const WIDTH = 1800;
const HEIGHT = 1200; // Larger for web
const canvas = document.getElementById('appCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const archetypeDisplay = document.getElementById('archetypeDisplay') as HTMLDivElement;

// UI Elements
const seedInput = document.getElementById('seedInput') as HTMLInputElement;
const randomSeedBtn = document.getElementById('randomSeedBtn') as HTMLButtonElement;
const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
const modeSelect = document.getElementById('modeSelect') as HTMLSelectElement;
const archetypeSelect = document.getElementById('archetypeSelect') as HTMLSelectElement;
const hueInput = document.getElementById('hueInput') as HTMLInputElement;

// State
let mode = 'full';

function updateUI() {
    mode = modeSelect.value;
}

function generate() {
    try {
        const seed = parseInt(seedInput.value);
        const rng = new RNG(seed);
        const hue = parseInt(hueInput.value) / 360;
        
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        archetypeDisplay.innerText = ""; // Clear prev

        const theme = new HSBAColor(hue, 0.1, 0.6); // Blue-ish grey default

        if (mode === 'surface') {
            renderSurface(rng, theme);
        } else if (mode === 'shape') {
            renderShape(rng);
        } else {
            renderFullShip(rng, theme);
        }
    } catch (e) {
        console.error("Generation Failed:", e);
        alert("Generation Error (check console): " + e);
    }
}

function renderSurface(rng: RNG, theme: HSBAColor) {
    // Draw full canvas surface sample
    const aspect = WIDTH / HEIGHT;
    
    ctx.save();
    ctx.scale(HEIGHT, HEIGHT); // 1.0 = Height
    
    // Draw a standard industrial surface
    const surf = new CapitalShipSurfaceGreebles(aspect, 1.0, theme, 'industrial');
    surf.draw(ctx, rng);
    
    ctx.restore();
}

function renderShape(rng: RNG) {
    const generator = new CompositeShipGenerator();
    const theme = new HSBAColor(0,0,0); // Dummy
    // Archetype doesn't affect shape currently, just pass random or undefined
    const components = generator.generate(WIDTH, HEIGHT, theme, rng);
    
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2;
    
    for (const comp of components) {
        if (comp instanceof UnifiedTrunkComponent) {
            for (const child of comp.components) {
                 if (child.shapePath) {
                    ctx.stroke(child.shapePath);
                    // Draw center for debugging
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(child.bounds.x + child.bounds.w/2 - 2, child.bounds.y + child.bounds.h/2 - 2, 4, 4);
                }
            }
        } else if (comp.shapePath) {
            ctx.stroke(comp.shapePath);
            // Draw center for debugging
            ctx.fillStyle = '#fff';
            ctx.fillRect(comp.bounds.x + comp.bounds.w/2 - 2, comp.bounds.y + comp.bounds.h/2 - 2, 4, 4);
        }
    }
}

function renderFullShip(rng: RNG, theme: HSBAColor) {
    const generator = new CompositeShipGenerator();
    // Pick archetype
    let archVal = archetypeSelect.value;
    let arch: ShipArchetype;

    if (archVal === 'random') {
        arch = rng.choice(['freight', 'science', 'industry', 'passengers', 'combat']);
    } else {
        arch = archVal as ShipArchetype;
    }

    archetypeDisplay.innerText = "Archetype: " + arch.toUpperCase();
    
    // Use 600 as the reference height for ship scaling, regardless of actual canvas height (800)
    // This keeps the ship size consistent and centered.
    const components = generator.generate(WIDTH, HEIGHT, theme, rng, arch, 600);
    
    // Draw components (sorted by Z-Index inside generator)
    for (const comp of components) {
        comp.draw(ctx, rng);
    }
}

// Event Listeners
modeSelect.addEventListener('change', () => { updateUI(); generate(); });
archetypeSelect.addEventListener('change', () => { generate(); });
generateBtn.addEventListener('click', generate);
randomSeedBtn.addEventListener('click', () => {
    seedInput.value = Math.floor(Math.random() * 100000).toString();
    generate();
});

// Init
updateUI();
seedInput.value = Math.floor(Math.random() * 100000).toString(); // Set a random seed on load
generate();
