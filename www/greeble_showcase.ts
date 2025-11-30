import { HSBAColor, RNG } from '../src/greebler/common.js';
import { PanelGreebles } from '../src/greebler/PanelGreebles.js';
import { PipeGreebles } from '../src/greebler/PipeGreebles.js';
import { LightPanelGreebles } from '../src/greebler/LightPanelGreebles.js';
import { CapitalShipWindowsGreebles } from '../src/greebler/CapitalShipWindowsGreebles.js';
import { EquipmentGreebles } from '../src/greebler/EquipmentGreebles.js';
import { HoseGreebles } from '../src/greebler/HoseGreebles.js';
import { WireGreebles } from '../src/greebler/WireGreebles.js';
import { CutawaySectionGreebles } from '../src/greebler/CutawaySectionGreebles.js';

const grid = document.getElementById('grid') as HTMLDivElement;
const refreshBtn = document.getElementById('refreshBtn') as HTMLButtonElement;

// Configuration for all demos
const DEMO_SIZE = 600; // Internal resolution
let globalSeed = Date.now();

interface DemoConfig {
    title: string;
    desc: string;
    render: (ctx: CanvasRenderingContext2D, rng: RNG, theme: HSBAColor) => void;
}

const demos: DemoConfig[] = [
    {
        title: "Hull Plating (Clean)",
        desc: "Standard panel distribution.",
        render: (ctx, rng, theme) => {
            const g = new PanelGreebles(1, 1, theme, 8, false);
            g.draw(ctx, rng);
        }
    },
    {
        title: "Hull Plating (Riveted)",
        desc: "Industrial style with rivet details.",
        render: (ctx, rng, theme) => {
            const g = new PanelGreebles(1, 1, theme, 12, true);
            g.draw(ctx, rng);
        }
    },
    {
        title: "Pipes & Conduits (Sparse)",
        desc: "Simple pipe network.",
        render: (ctx, rng, theme) => {
            // Draw base first so pipes are visible
            ctx.fillStyle = theme.withBrightness(-0.2).toRGBAString();
            ctx.fillRect(0,0,1,1);
            const g = new PipeGreebles(1, 1, theme, 3);
            g.draw(ctx, rng);
        }
    },
    {
        title: "Pipes & Conduits (Dense)",
        desc: "Complex heavy machinery piping.",
        render: (ctx, rng, theme) => {
            ctx.fillStyle = theme.withBrightness(-0.2).toRGBAString();
            ctx.fillRect(0,0,1,1);
            const g = new PipeGreebles(1, 1, theme.withSaturation(0.5), 10);
            g.draw(ctx, rng);
        }
    },
    {
        title: "Active Light Panels",
        desc: "Blinking status indicators.",
        render: (ctx, rng, theme) => {
            ctx.fillStyle = '#111';
            ctx.fillRect(0,0,1,1);
            const g = new LightPanelGreebles(1, 1, theme, 6, [
                HSBAColor.fromRGBA(0, 255, 0),
                HSBAColor.fromRGBA(255, 0, 0),
                HSBAColor.fromRGBA(255, 165, 0)
            ]);
            g.draw(ctx, rng);
        }
    },
    {
        title: "Windows (Habitat)",
        desc: "Lit residential/crew sections.",
        render: (ctx, rng, theme) => {
            ctx.fillStyle = '#050505';
            ctx.fillRect(0,0,1,1);
            const g = new CapitalShipWindowsGreebles(1, 1, theme, 5, CapitalShipWindowsGreebles.BLUE_LIGHT);
            g.draw(ctx, rng);
        }
    },
    {
        title: "Windows (Industrial)",
        desc: "Amber lighting for engineering.",
        render: (ctx, rng, theme) => {
            ctx.fillStyle = '#050505';
            ctx.fillRect(0,0,1,1);
            const g = new CapitalShipWindowsGreebles(1, 1, theme, 5, CapitalShipWindowsGreebles.AMBER_LIGHT);
            g.draw(ctx, rng);
        }
    },
    {
        title: "Equipment (Scattered)",
        desc: "Vents, sensor arrays, antennae.",
        render: (ctx, rng, theme) => {
            ctx.fillStyle = theme.toRGBAString();
            ctx.fillRect(0,0,1,1);
            const g = new EquipmentGreebles(1, 1, theme, 8);
            g.draw(ctx, rng);
        }
    },

    {
        title: "Hose Connectors",
        desc: "Heavy duty fluid transfer hoses.",
        render: (ctx, rng, theme) => {
            ctx.fillStyle = theme.withBrightness(-0.1).toRGBAString();
            ctx.fillRect(0,0,1,1);
            const g = new HoseGreebles(1, 1, theme, 3);
            g.draw(ctx, rng);
        }
    },
    {
        title: "Wiring Bundles",
        desc: "Exposed technical wiring.",
        render: (ctx, rng, theme) => {
            ctx.fillStyle = theme.withBrightness(-0.2).toRGBAString();
            ctx.fillRect(0,0,1,1);
            const g = new WireGreebles(1, 1, 25, undefined, 2);
            g.draw(ctx, rng);
        }
    },
    {
        title: "Cutaway Section",
        desc: "Exposed internal components and maintenance access.",
        render: (ctx, rng, theme) => {
            ctx.fillStyle = theme.toRGBAString();
            ctx.fillRect(0,0,1,1);
            const g = new CutawaySectionGreebles(1, 1, theme, 1);
            g.draw(ctx, rng);
        }
    },
    {
        title: "Combined Layer",
        desc: "Panels + Pipes + Lights.",
        render: (ctx, rng, theme) => {
            // Background
            ctx.fillStyle = theme.toRGBAString();
            ctx.fillRect(0,0,1,1);
            
            new PanelGreebles(1, 1, theme, 6, true).draw(ctx, rng);
            new PipeGreebles(1, 1, theme, 4).draw(ctx, rng);
            new LightPanelGreebles(1, 1, theme, 3).draw(ctx, rng);
        }
    }
];

function createGalleryItem(config: DemoConfig, index: number) {
    const col = document.createElement('div');
    col.className = 'gallery-item';
    
    col.innerHTML = `
        <div class="gallery-header">
            <span class="gallery-title">${config.title}</span>
        </div>
        <div class="canvas-container">
            <canvas id="canvas-${index}" width="${DEMO_SIZE}" height="${DEMO_SIZE}"></canvas>
            <div class="overlay">${config.desc}</div>
        </div>
    `;
    
    grid.appendChild(col);
}

function renderAll() {
    // Clear grid? No, we just re-render canvases.
    // If grid empty, build it.
    if (grid.children.length === 0) {
        demos.forEach((demo, i) => createGalleryItem(demo, i));
    }

    const baseRng = new RNG(globalSeed);
    const theme = new HSBAColor(210 / 360, 0.1, 0.6); // Default Grey-Blue

    demos.forEach((demo, i) => {
        const canvas = document.getElementById(`canvas-${i}`) as HTMLCanvasElement;
        const ctx = canvas.getContext('2d')!;
        
        // Reset transform and clear
        ctx.resetTransform();
        ctx.clearRect(0, 0, DEMO_SIZE, DEMO_SIZE);
        
        // Scale to 0..1 coordinate space for normalized greebles
        ctx.scale(DEMO_SIZE, DEMO_SIZE);
        
        // Use a unique seed per item so they don't all look identical if they share logic,
        // but deterministic based on global seed.
        const itemRng = new RNG(baseRng.next() * 10000);
        
        try {
            demo.render(ctx, itemRng, theme);
        } catch (e) {
            console.error(`Error rendering ${demo.title}:`, e);
        }
    });
}

refreshBtn.addEventListener('click', () => {
    globalSeed = Date.now();
    renderAll();
});

// Init
renderAll();
