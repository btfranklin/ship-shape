import { HSBAColor, RNG, UNIT_SCALE } from '../greebler/common.js';
import { CapitalShipSurfaceGreebles, SurfaceArchetype } from '../greebler/CapitalShipSurfaceGreebles.js';
import { ComponentRenderer } from './renderers/ComponentRenderer.js';
import { StandardComponentRenderer } from './renderers/StandardComponentRenderer.js';
import { EngineRenderer } from './renderers/EngineRenderer.js';
import { SphereRenderer } from './renderers/SphereRenderer.js';
import { RingRenderer } from './renderers/RingRenderer.js';
import { HullRenderer } from './renderers/HullRenderer.js';
import { TowerRenderer } from './renderers/TowerRenderer.js';

export type ComponentType = 'hull' | 'engine' | 'weapon' | 'sensor' | 'tank' | 'sphere' | 'ring' | 'trench' | 'tower';
export type ShipArchetype = 'freight' | 'science' | 'industry' | 'passengers' | 'combat';

export class ShipComponent {
    public bounds: { x: number, y: number, w: number, h: number };
    public zIndex: number;
    public type: ComponentType;
    public color: HSBAColor;
    public engineStyle: 'standard' | 'radiator' | 'energy' = 'standard';
    public greebles: CapitalShipSurfaceGreebles;
    public shapePath?: Path2D;

    public energyGlowHue: number = 0.0;
    public variant: string = 'default';
    public shipArchetype: ShipArchetype;
    public isTrunk: boolean = false;
    
    private renderer: ComponentRenderer;

    constructor(
        x: number,
        y: number,
        w: number,
        h: number,
        zIndex: number,
        type: ComponentType,
        color: HSBAColor,
        rng: RNG,
        shipArchetype: ShipArchetype,
        variant: string = 'default',
        isTrunk: boolean = false
    ) {
        this.bounds = { x, y, w, h };
        this.zIndex = zIndex;
        this.type = type;
        this.color = color;
        this.shipArchetype = shipArchetype;
        this.variant = variant;
        this.isTrunk = isTrunk;

        // Select Renderer
        switch (type) {
            case 'engine':
                this.renderer = new EngineRenderer();
                break;
            case 'sphere':
                this.renderer = new SphereRenderer();
                break;
            case 'ring':
                this.renderer = new RingRenderer();
                break;
            case 'hull':
                this.renderer = new HullRenderer();
                break;
            case 'tower':
                this.renderer = new TowerRenderer();
                break;
            default:
                this.renderer = new StandardComponentRenderer();
                break;
        }

        // Engine Specific Logic
        if (type === 'engine') {
            const r = rng.next();
            if (r < 0.4) this.engineStyle = 'standard';
            else if (r < 0.7) this.engineStyle = 'radiator';
            else {
                this.engineStyle = 'energy';
                this.energyGlowHue = rng.range(0.0, 1.0);
            }
        }

        // Determine Surface Archetype
        const archetype = this.determineSurfaceArchetype(shipArchetype, type, rng);

        // Configure greebles
        const skipBaseFill = (type === 'sphere' || type === 'ring' || type === 'trench');
        this.greebles = new CapitalShipSurfaceGreebles(w / UNIT_SCALE, h / UNIT_SCALE, color, archetype, skipBaseFill);
    }

    private determineSurfaceArchetype(shipArch: ShipArchetype, compType: ComponentType, rng: RNG): SurfaceArchetype {
        // Hard overrides
        if (compType === 'trench') return 'trench';
        if (compType === 'ring') return 'structure';
        if (compType === 'sphere') return 'structure'; // Spheres are now 'structure' (Basic panels only)
        
        // Bias based on Ship Archetype
        switch (shipArch) {
            case 'science':
                // Clean, high-tech
                if (compType === 'engine') return rng.bool(0.5) ? 'clean' : 'tech';
                if (compType === 'sensor') return 'tech';
                if (compType === 'hull') return rng.bool(0.7) ? 'clean' : 'standard';
                return 'clean';
                
            case 'industry':
                // Dirty, pipes, heavy
                // Only use heavy industrial (hoses) on the main trunk or tanks/engines
                if (compType === 'hull') return this.isTrunk ? 'industrial' : 'standard';
                if (compType === 'tank') return 'industrial';
                if (compType === 'engine') return 'industrial';
                if (compType === 'tower') return 'standard'; // No hoses on towers
                return 'standard'; // Default to standard for others
                
            case 'combat':
                // Armored, dense
                if (compType === 'hull') return rng.bool(0.6) ? 'dense' : 'standard'; // Dense = Armor plates?
                if (compType === 'weapon') return 'dense';
                if (compType === 'tower') return 'standard';
                return 'standard';
                
            case 'freight':
                // Functional, standard
                if (compType === 'tank') return 'clean'; // Containers
                if (compType === 'hull') return 'standard';
                return 'standard';
                
            case 'passengers':
                // Luxury, windows, clean
                if (compType === 'hull') return 'clean';
                return 'clean';
                
            default:
                return 'standard';
        }
    }

    generateShape(rng: RNG) {
        this.renderer.generateShape(this, rng);
    }

    draw(ctx: CanvasRenderingContext2D, rng: RNG) {
        this.renderer.draw(ctx, this, rng);
    }
}
