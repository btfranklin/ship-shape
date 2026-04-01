import { HSBAColor, RNG } from '../src/greebles/common.js';
import { SteamEngineGenerator } from '../src/railway/index.js';
import type { RailCarOptions, RailVehicleLayout, SteamEngineOptions, WarTrainConsistOptions } from '../src/railway/SteamEngineGenerator.js';

console.log('War Train Foundry Loaded');

const WIDTH = 4200;
const HEIGHT = 1100;

const canvas = document.getElementById('engineCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const stage = canvas.parentElement as HTMLDivElement;

const seedInput = document.getElementById('engineSeedInput') as HTMLInputElement;
const randomSeedBtn = document.getElementById('engineRandomSeedBtn') as HTMLButtonElement;
const generateBtn = document.getElementById('engineGenerateBtn') as HTMLButtonElement;
const hueInput = document.getElementById('engineHueInput') as HTMLInputElement;
const hueRefreshBtn = document.getElementById('engineHueRefreshBtn') as HTMLButtonElement;
const wheelStyleSelect = document.getElementById('engineWheelStyleSelect') as HTMLSelectElement;
const tenderSelect = document.getElementById('engineTenderSelect') as HTMLSelectElement;
const cowcatcherSelect = document.getElementById('engineCowcatcherSelect') as HTMLSelectElement;
const viewModeSelect = document.getElementById('engineViewModeSelect') as HTMLSelectElement;
const carTypeSelect = document.getElementById('engineCarTypeSelect') as HTMLSelectElement;

function resolveToggle(select: HTMLSelectElement): boolean | undefined {
    if (select.value === 'auto') return undefined;
    return select.value === 'yes';
}

function drawBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a1a1a');
    grad.addColorStop(0.55, '#0f0f0f');
    grad.addColorStop(1, '#050505');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const railY = h * 0.82;
    ctx.strokeStyle = 'rgba(20,20,20,0.9)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, railY);
    ctx.lineTo(w, railY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
        const x = (w / 18) * i + 20;
        ctx.beginPath();
        ctx.moveTo(x, railY - 12);
        ctx.lineTo(x + 60, railY + 6);
        ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(84,72,60,0.3)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
        const x = (w / 18) * i + 50;
        ctx.beginPath();
        ctx.moveTo(x, railY - 4);
        ctx.lineTo(x + 54, railY - 4);
        ctx.stroke();
    }
}

function drawCouplingLinks(ctx: CanvasRenderingContext2D, consist: RailVehicleLayout[]) {
    ctx.save();
    ctx.strokeStyle = 'rgba(74, 64, 54, 0.95)';
    ctx.lineWidth = 3;

    for (let i = 1; i < consist.length; i++) {
        const previous = consist[i - 1];
        const current = consist[i];
        if (!previous || !current) continue;

        ctx.beginPath();
        ctx.moveTo(previous.couplerRear.x, previous.couplerRear.y);
        ctx.lineTo(current.couplerFront.x, current.couplerFront.y);
        ctx.stroke();
    }

    ctx.restore();
}

function centerStage(bounds: { x: number; y: number; w: number; h: number }) {
    const targetLeft = Math.max(0, bounds.x + bounds.w / 2 - stage.clientWidth / 2);
    const targetTop = Math.max(0, bounds.y + bounds.h / 2 - stage.clientHeight / 2);
    stage.scrollTo({ left: targetLeft, top: targetTop, behavior: 'auto' });
}

function mergeBounds(layouts: RailVehicleLayout[]) {
    const minX = Math.min(...layouts.map((layout) => layout.bounds.x));
    const minY = Math.min(...layouts.map((layout) => layout.bounds.y));
    const maxX = Math.max(...layouts.map((layout) => layout.bounds.x + layout.bounds.w));
    const maxY = Math.max(...layouts.map((layout) => layout.bounds.y + layout.bounds.h));

    return {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY
    };
}

function generate() {
    const seedValue = Number.parseInt(seedInput.value, 10);
    const seed = Number.isFinite(seedValue) ? seedValue : Date.now();
    if (!Number.isFinite(seedValue)) {
        seedInput.value = seed.toString();
    }
    const rng = new RNG(seed);
    const hue = parseInt(hueInput.value, 10) / 360;

    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.style.width = `${WIDTH}px`;
    canvas.style.height = `${HEIGHT}px`;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawBackdrop(ctx, WIDTH, HEIGHT);

    const theme = new HSBAColor(hue, 0.18, 0.55);

    const options: SteamEngineOptions = {
        includeTender: resolveToggle(tenderSelect),
        includeCowcatcher: resolveToggle(cowcatcherSelect),
        wheelStyle: wheelStyleSelect.value as SteamEngineOptions['wheelStyle']
    };

    const generator = new SteamEngineGenerator();
    const mode = viewModeSelect.value;

    if (mode === 'engine') {
        const layout = generator.generateLayout(WIDTH, HEIGHT, theme, rng, options);
        for (const component of layout.components) {
            component.draw(ctx, rng);
        }
        centerStage(layout.bounds);
    } else if (mode === 'car') {
        const carOptions: RailCarOptions = {
            kind: carTypeSelect.value as RailCarOptions['kind'],
            wheelStyle: options.wheelStyle
        };
        const layout = generator.generateCar(WIDTH, HEIGHT, theme, rng, carOptions);
        for (const component of layout.components) {
            component.draw(ctx, rng);
        }
        centerStage(layout.bounds);
    } else {
        const consistOptions: WarTrainConsistOptions = {
            ...options,
            kind: carTypeSelect.value as WarTrainConsistOptions['kind']
        };
        const consist = generator.generateConsist(WIDTH, HEIGHT, theme, rng, consistOptions);
        drawCouplingLinks(ctx, consist);
        for (const vehicle of consist) {
            for (const component of vehicle.components) {
                component.draw(ctx, rng);
            }
        }
        centerStage(mergeBounds(consist));
    }
}

document.addEventListener('tabchange', (event) => {
    const customEvent = event as CustomEvent<{ targetId?: string }>;
    if (customEvent.detail?.targetId === 'tab-steam') {
        requestAnimationFrame(() => generate());
    }
});

generateBtn.addEventListener('click', generate);
hueRefreshBtn.addEventListener('click', generate);
randomSeedBtn.addEventListener('click', () => {
    seedInput.value = Math.floor(Math.random() * 100000).toString();
    generate();
});
wheelStyleSelect.addEventListener('change', generate);
tenderSelect.addEventListener('change', generate);
cowcatcherSelect.addEventListener('change', generate);
viewModeSelect.addEventListener('change', generate);
carTypeSelect.addEventListener('change', generate);

seedInput.value = Math.floor(Math.random() * 100000).toString();
generate();
