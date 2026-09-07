import { HSBAColor, RNG } from '../src/greebles/index.js';
import { CompositeShipGenerator, drawCapitalShip } from '../src/capitalships/index.js';
import { ShipArchetype } from '../src/capitalships/shipTypes.js';
import { UnifiedTrunkComponent } from '../src/capitalships/UnifiedTrunkComponent.js';

console.log('Ship Shape Playground Loaded');

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
const hueRefreshBtn = document.getElementById('hueRefreshBtn') as HTMLButtonElement;
const rainbowCheck = document.getElementById('rainbowCheck') as HTMLInputElement;
const rainbowControl = document.getElementById('rainbowControl') as HTMLDivElement;
const cutAwayInput = document.getElementById('cutAwayInput') as HTMLInputElement;
const cutAwayControl = document.getElementById('cutAwayControl') as HTMLDivElement;
const cutFromRearCheck = document.getElementById('cutFromRearCheck') as HTMLInputElement;
const cutFromRearControl = document.getElementById('cutFromRearControl') as HTMLDivElement;
const ARCHETYPES: readonly ShipArchetype[] = [
    'freight',
    'science',
    'industry',
    'passenger',
    'combat',
];

// State
let mode = 'full';

function updateUI() {
    mode = modeSelect.value;
    cutAwayControl.hidden = mode !== 'derelict';
    cutFromRearControl.hidden = mode !== 'derelict';
    const showRainbowControl = mode !== 'shape';
    rainbowControl.hidden = !showRainbowControl;
    if (!showRainbowControl) {
        rainbowCheck.checked = false;
    }
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

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (mode !== 'shape' && rainbowCheck.checked) {
        drawChaoticBackground(ctx, w, h);
        return;
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
}

function generate() {
    try {
        const seedValue = Number.parseInt(seedInput.value, 10);
        const seed = Number.isFinite(seedValue) ? seedValue : Date.now();
        if (!Number.isFinite(seedValue)) {
            seedInput.value = seed.toString();
        }
        const archetype = resolveArchetype(seed);
        const rng = new RNG(seed);
        const hue = parseInt(hueInput.value) / 360;
        
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        
        drawBackground(ctx, WIDTH, HEIGHT);
        
        archetypeDisplay.innerText = ""; // Clear prev

        const theme = new HSBAColor(hue, 0.1, 0.6); // Blue-ish grey default

        if (mode === 'shape') {
            renderShape(rng, archetype);
        } else {
            renderFullShip(rng, theme, archetype);
        }
    } catch (e) {
        console.error("Generation Failed:", e);
        alert("Generation Error (check console): " + e);
    }
}

function resolveArchetype(seed: number): ShipArchetype {
    const selected = archetypeSelect.value;
    if (selected !== 'random') return selected as ShipArchetype;
    return new RNG(seed).choice(ARCHETYPES);
}

function renderShape(rng: RNG, archetype: ShipArchetype) {
    const generator = new CompositeShipGenerator();
    const theme = new HSBAColor(0,0,0); // Dummy

    const components = generator.generate(WIDTH, HEIGHT, theme, rng, archetype, 600);
    
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

function renderFullShip(rng: RNG, theme: HSBAColor, archetype: ShipArchetype) {
    const generator = new CompositeShipGenerator();
    archetypeDisplay.innerText = "Archetype: " + archetype.toUpperCase();
    
    // Use 600 as the reference height for ship scaling, regardless of actual canvas height (800)
    // This keeps the ship size consistent and centered.
    const components = generator.generate(WIDTH, HEIGHT, theme, rng, archetype, 600);
    
    // Draw components (sorted by Z-Index inside generator)
    drawCapitalShip(ctx, components, rng, {
        condition: mode === 'ghost' ? 'ghost' : mode === 'derelict' ? 'derelict' : 'normal',
        damageSeed: Number.parseInt(seedInput.value, 10),
        cutAway: Number(cutAwayInput.value) / 100,
        cutFromRear: cutFromRearCheck.checked
    });
}

// Event Listeners
cutFromRearCheck.addEventListener('change', generate);
cutAwayInput.addEventListener('input', () => {
    cutAwayControl.querySelector('label')!.textContent = `Cut Away: ${cutAwayInput.value}% of Length`;
    generate();
});
modeSelect.addEventListener('change', () => { updateUI(); generate(); });
archetypeSelect.addEventListener('change', () => { generate(); });
generateBtn.addEventListener('click', generate);
hueRefreshBtn.addEventListener('click', generate);
rainbowCheck.addEventListener('change', generate);
randomSeedBtn.addEventListener('click', () => {
    seedInput.value = Math.floor(Math.random() * 100000).toString();
    generate();
});

// Init
updateUI();
seedInput.value = Math.floor(Math.random() * 100000).toString(); // Set a random seed on load
generate();
