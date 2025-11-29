import { HSBAColor, RNG, CapitalShipSurfaceGreebles, CapitalShipWindowsGreebles, EquipmentTrenchGreebles } from '../src/greebler/index.js';
import { ShipShapeGenerator, CompositeShipGenerator } from '../src/ship-shape/index.js';
import { PanelGreebles, PipeGreebles, LightPanelGreebles } from '../src/greebler/index.js';
import { ShipArchetype } from '../src/ship-shape/shipTypes.js';
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
const rainbowCheck = document.getElementById('rainbowCheck') as HTMLInputElement;

// State
let mode = 'full';

function updateUI() {
    mode = modeSelect.value;
}

function drawChaoticBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    // Fill black base
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    
    // Draw chaotic rainbow swirls
    // Use a local RNG for consistent background pattern
    const rng = new RNG(9999);
    
    ctx.globalCompositeOperation = 'lighter'; // Additive blending
    
    for (let i = 0; i < 150; i++) {
        const x = rng.range(0, w);
        const y = rng.range(0, h);
        const radius = rng.range(100, 400);
        const hue = rng.range(0, 360);
        
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.5)`);
        grad.addColorStop(1, `hsla(${hue + 60}, 100%, 20%, 0)`);
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function generate() {
    try {
        const seed = parseInt(seedInput.value);
        const rng = new RNG(seed);
        const hue = parseInt(hueInput.value) / 360;
        
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        
        // Draw Rainbow Background if enabled
        if (rainbowCheck && rainbowCheck.checked) {
            drawChaoticBackground(ctx, WIDTH, HEIGHT);
        }
        
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
    const surf = new CapitalShipSurfaceGreebles(aspect, 1.0, theme, 'industry', 'hull');
    surf.draw(ctx, rng);
    
    ctx.restore();
}

function renderShape(rng: RNG) {
    const generator = new CompositeShipGenerator();
    const theme = new HSBAColor(0,0,0); // Dummy
    
    // Pick archetype to match renderFullShip logic/RNG usage
    let archVal = archetypeSelect.value;
    let arch: ShipArchetype;

    if (archVal === 'random') {
        arch = rng.choice(['freight', 'science', 'industry', 'passengers', 'combat']);
    } else {
        arch = archVal as ShipArchetype;
    }

    const components = generator.generate(WIDTH, HEIGHT, theme, rng, arch, 600);
    
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
if (rainbowCheck) {
    rainbowCheck.addEventListener('change', generate);
}
randomSeedBtn.addEventListener('click', () => {
    seedInput.value = Math.floor(Math.random() * 100000).toString();
    generate();
});

// Init
updateUI();
seedInput.value = Math.floor(Math.random() * 100000).toString(); // Set a random seed on load
generate();
