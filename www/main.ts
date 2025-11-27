import { HSBAColor, RNG, CapitalShipSurfaceGreebles, CapitalShipWindowsGreebles, EquipmentTrenchGreebles } from '../src/greebler/index';
import { ShipShapeGenerator, CompositeShipGenerator } from '../src/ship-shape/index';
import { PanelGreebles, PipeGreebles, LightPanelGreebles } from '../src/greebler/index';

console.log('Greebler Playground Loaded');

// Constants
const WIDTH = 1800;
const HEIGHT = 600; // Larger for web
const canvas = document.getElementById('appCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// UI Elements
const seedInput = document.getElementById('seedInput') as HTMLInputElement;
const randomSeedBtn = document.getElementById('randomSeedBtn') as HTMLButtonElement;
const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
const modeSelect = document.getElementById('modeSelect') as HTMLSelectElement;
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
    const components = generator.generate(WIDTH, HEIGHT, theme, rng);
    
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2;
    
    for (const comp of components) {
        if (comp.shapePath) {
            ctx.stroke(comp.shapePath);
            // Draw center for debugging
            ctx.fillStyle = '#fff';
            ctx.fillRect(comp.bounds.x + comp.bounds.w/2 - 2, comp.bounds.y + comp.bounds.h/2 - 2, 4, 4);
        }
    }
}

function renderFullShip(rng: RNG, theme: HSBAColor) {
    const generator = new CompositeShipGenerator();
    const components = generator.generate(WIDTH, HEIGHT, theme, rng);
    
    // Draw components (sorted by Z-Index inside generator)
    for (const comp of components) {
        comp.draw(ctx, rng);
    }
}

// Event Listeners
modeSelect.addEventListener('change', () => { updateUI(); generate(); });
generateBtn.addEventListener('click', generate);
randomSeedBtn.addEventListener('click', () => {
    seedInput.value = Math.floor(Math.random() * 100000).toString();
    generate();
});

// Inputs
[hueInput]
    .forEach(el => el?.addEventListener('input', generate));

// Init
updateUI();
generate();
