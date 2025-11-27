import { HSBAColor, RNG, CapitalShipSurfaceGreebles, CapitalShipWindowsGreebles, EquipmentTrenchGreebles } from '../src/greebler/index';
import { ShipShapeGenerator } from '../src/ship-shape/index';
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
const surfaceControls = document.getElementById('surfaceControls') as HTMLDivElement;
const shapeControls = document.getElementById('shapeControls') as HTMLDivElement;
const showPanels = document.getElementById('showPanels') as HTMLInputElement;
const showPipes = document.getElementById('showPipes') as HTMLInputElement;
const showLights = document.getElementById('showLights') as HTMLInputElement;

// State
let mode = 'full';

function updateUI() {
    mode = modeSelect.value;
    surfaceControls.style.display = mode === 'surface' || mode === 'full' ? 'block' : 'none';
    shapeControls.style.display = mode === 'shape' || mode === 'full' ? 'block' : 'none';
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
    // Draw full canvas surface
    const aspect = WIDTH / HEIGHT;
    // Scale coordinates: 1 unit = HEIGHT
    // So width in units = aspect
    
    ctx.save();
    ctx.scale(HEIGHT, HEIGHT);
    
    // We construct manually to toggle layers
    // Background
    ctx.fillStyle = theme.toRGBAString();
    ctx.fillRect(0, 0, aspect, 1.0);
    
    if (showPanels.checked) {
        const panels = new PanelGreebles(aspect, 1.0, theme, 12, true);
        panels.draw(ctx, rng);
    }
    
    if (showPipes.checked) {
        const pipes = new PipeGreebles(aspect, 1.0, theme, 8);
        pipes.draw(ctx, rng);
    }
    
    if (showLights.checked) {
        const lights = new LightPanelGreebles(aspect, 1.0, theme, 5);
        lights.draw(ctx, rng);
    }
    
    // Windows?
    const wins = new CapitalShipWindowsGreebles(aspect, 1.0, theme, 5);
    wins.draw(ctx, rng);
    
    ctx.restore();
}

function renderShape(rng: RNG) {
    const complexity = parseInt((document.getElementById('complexityInput') as HTMLInputElement).value);
    const shapeGen = new ShipShapeGenerator(WIDTH, HEIGHT, rng);
    const data = shapeGen.generate(complexity);
    
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(data.polyPoints[0].x, data.polyPoints[0].y);
    for(let i=1; i<data.polyPoints.length; i++) {
        ctx.lineTo(data.polyPoints[i].x, data.polyPoints[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    
    // Draw vertices
    ctx.fillStyle = '#fff';
    for (const p of data.polyPoints) {
        ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
}

function renderFullShip(rng: RNG, theme: HSBAColor) {
    // 1. Shape
    const complexity = parseInt((document.getElementById('complexityInput') as HTMLInputElement).value);
    const shapeGen = new ShipShapeGenerator(WIDTH, HEIGHT, rng);
    const shapeData = shapeGen.generate(complexity);
    
    // 2. Texture (Offscreen)
    const texCanvas = document.createElement('canvas');
    texCanvas.width = WIDTH;
    texCanvas.height = HEIGHT;
    const texCtx = texCanvas.getContext('2d')!;
    
    const darkTheme = theme.withBrightness(-0.2);
    const aspect = WIDTH / HEIGHT;
    
    texCtx.save();
    texCtx.scale(HEIGHT, HEIGHT);
    
    // Top
    // Use the toggles? For full ship, let's enforce full detail for now, or respect toggles.
    // Let's respect toggles for experimentation.
    
    const topSurf = new CapitalShipSurfaceGreebles(aspect, 0.5, theme);
    // Monkey-patch draw if we want to hide layers? 
    // Or just redraw logic? CapitalShipSurfaceGreebles draws everything internally.
    // If we want to control layers in Full Ship mode, we should expose flags in Greebles class or recreate logic.
    // For now, just draw default full greebles.
    topSurf.draw(texCtx, rng);
    
    const topWin = new CapitalShipWindowsGreebles(aspect, 0.5, theme, 8);
    topWin.draw(texCtx, rng);
    
    // Bottom
    texCtx.save();
    texCtx.translate(0, 0.5);
    const botSurf = new CapitalShipSurfaceGreebles(aspect, 0.5, darkTheme);
    botSurf.draw(texCtx, rng);
    
    const botWin = new CapitalShipWindowsGreebles(aspect, 0.5, darkTheme, 6);
    botWin.draw(texCtx, rng);
    texCtx.restore();
    
    // Line
    texCtx.lineWidth = 0.01;
    texCtx.strokeStyle = theme.withBrightness(-0.3).toRGBAString();
    texCtx.beginPath();
    texCtx.moveTo(0, 0.5);
    texCtx.lineTo(aspect, 0.5);
    texCtx.stroke();
    
    // Trench
    const trenchH = rng.range(0.05, 0.15);
    const trenchY = rng.range(0.3, 0.7);
    const trench = new EquipmentTrenchGreebles(aspect, 1.0, theme, trenchY, trenchH * 10);
    trench.draw(texCtx, rng);
    
    texCtx.restore();
    
    // 3. Mask
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(shapeData.polyPoints[0].x, shapeData.polyPoints[0].y);
    for(let i=1; i<shapeData.polyPoints.length; i++) {
        ctx.lineTo(shapeData.polyPoints[i].x, shapeData.polyPoints[i].y);
    }
    ctx.closePath();
    ctx.clip();
    
    ctx.drawImage(texCanvas, 0, 0);
    ctx.restore();
    
    // 4. Outline
    ctx.strokeStyle = theme.withBrightness(0.3).toRGBAString();
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Event Listeners
modeSelect.addEventListener('change', () => { updateUI(); generate(); });
generateBtn.addEventListener('click', generate);
randomSeedBtn.addEventListener('click', () => {
    seedInput.value = Math.floor(Math.random() * 100000).toString();
    generate();
});

// Inputs
[hueInput, showPanels, showPipes, showLights, document.getElementById('complexityInput')!]
    .forEach(el => el?.addEventListener('input', generate));

// Init
updateUI();
generate();
