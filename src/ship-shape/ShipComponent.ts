import { HSBAColor, RNG } from '../greebler/common.js';
import { UNIT_SCALE } from '../greebler/constants.js';
import { CapitalShipSurfaceGreebles } from '../greebler/CapitalShipSurfaceGreebles.js';
import { ComponentRenderer } from './renderers/ComponentRenderer.js';
import { StandardComponentRenderer } from './renderers/StandardComponentRenderer.js';
import { EngineRenderer } from './renderers/EngineRenderer.js';
import { SphereRenderer } from './renderers/SphereRenderer.js';
import { RingRenderer } from './renderers/RingRenderer.js';
import { HullRenderer } from './renderers/HullRenderer.js';
import { TowerRenderer } from './renderers/TowerRenderer.js';
import { SensorRenderer } from './renderers/SensorRenderer.js';
import { WeaponRenderer } from './renderers/WeaponRenderer.js';
import { TankRenderer } from './renderers/TankRenderer.js';
import { ShipArchetype, ComponentType } from './shipTypes.js';

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
    public invertLighting: boolean = false;
    public leftEdge: { minY: number, maxY: number } | null = null;
    public facing: 'forward' | 'backward' = 'forward';
    public shipCenterY?: number;
    public customData: Record<string, any> = {};
    
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
        isTrunk: boolean = false,
        invertLighting: boolean = false,
        forcedEngineStyle?: 'standard' | 'radiator' | 'energy',
        shipCenterY?: number
    ) {
        this.bounds = { x, y, w, h };
        this.zIndex = zIndex;
        this.type = type;
        this.color = color;
        this.shipArchetype = shipArchetype;
        this.variant = variant;
        this.isTrunk = isTrunk;
        this.invertLighting = invertLighting;
        this.shipCenterY = shipCenterY;

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
            case 'sensor':
                this.renderer = new SensorRenderer();
                break;
            case 'weapon':
                this.renderer = new WeaponRenderer();
                break;
            case 'tank':
                this.renderer = new TankRenderer();
                break;
            default:
                this.renderer = new StandardComponentRenderer();
                break;
        }

        // Engine Specific Logic
        if (type === 'engine') {
            if (forcedEngineStyle) {
                this.engineStyle = forcedEngineStyle;
                if (this.engineStyle === 'energy') {
                    this.energyGlowHue = rng.range(0.0, 1.0);
                }
            } else {
                const r = rng.next();
                if (r < 0.4) this.engineStyle = 'standard';
                else if (r < 0.7) this.engineStyle = 'radiator';
                else {
                    this.engineStyle = 'energy';
                    this.energyGlowHue = rng.range(0.0, 1.0);
                }
            }
        }

        // Configure greebles
        const skipBaseFill = (type === 'sphere' || type === 'ring' || type === 'trench');
        this.greebles = new CapitalShipSurfaceGreebles(
            w / UNIT_SCALE, 
            h / UNIT_SCALE, 
            color, 
            shipArchetype, 
            type, 
            skipBaseFill, 
            isTrunk
        );
    }

    generateShape(rng: RNG) {
        this.renderer.generateShape(this, rng);
    }

    draw(ctx: CanvasRenderingContext2D, rng: RNG) {
        this.renderer.draw(ctx, this, rng);
    }
}
