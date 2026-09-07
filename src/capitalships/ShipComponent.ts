import { HSBAColor, RNG } from '../greebles/common.js';
import { UNIT_SCALE } from '../greebles/constants.js';
import { CapitalShipSurfaceGreebles } from '../greebles/CapitalShipSurfaceGreebles.js';
import { ComponentRenderer } from './renderers/ComponentRenderer.js';
import { StandardComponentRenderer } from './renderers/StandardComponentRenderer.js';
import { EngineRenderer } from './renderers/EngineRenderer.js';
import { SphereRenderer } from './renderers/SphereRenderer.js';
import { RingRenderer } from './renderers/RingRenderer.js';
import { HullRenderer } from './renderers/HullRenderer.js';
import { TowerRenderer } from './renderers/TowerRenderer.js';
import { SensorRenderer } from './renderers/SensorRenderer.js';
import { WeaponRenderer } from './renderers/WeaponRenderer.js';
import { StorageRenderer } from './renderers/StorageRenderer.js';
import { ShipArchetype, ComponentType } from './shipTypes.js';

export type HullVariant = 'default' | 'taper-top' | 'taper-bottom' | 'taper-front';
export type SensorVariant = 'default' | 'front' | 'back';
export type WeaponVariant = 'default' | 'top-view';
export type SphereVariant = 'default' | 'nose';
export type StorageVariant = 'default' | 'goods' | 'liquid' | 'sphere';
export type EngineStyle = 'standard' | 'radiator' | 'energy';

type ShipComponentVariant =
    | HullVariant
    | SensorVariant
    | WeaponVariant
    | SphereVariant
    | StorageVariant;

export interface ShipBounds {
    x: number;
    y: number;
    w: number;
    h: number;
}

interface CommonShipComponentOptions {
    bounds: ShipBounds;
    zIndex: number;
    color: HSBAColor;
    rng: RNG;
    shipArchetype: ShipArchetype;
    isTrunk?: boolean;
    invertLighting?: boolean;
    facing?: 'forward' | 'backward';
    shipCenterY?: number;
    shipCenterX?: number;
    lightColors?: readonly HSBAColor[];
}

export type ShipComponentOptions = CommonShipComponentOptions & (
    | {
        type: 'hull';
        variant?: HullVariant;
        engineStyle?: never;
        storageBands?: never;
    }
    | {
        type: 'sensor';
        variant?: SensorVariant;
        engineStyle?: never;
        storageBands?: never;
    }
    | {
        type: 'weapon';
        variant?: WeaponVariant;
        engineStyle?: never;
        storageBands?: never;
    }
    | {
        type: 'sphere';
        variant?: SphereVariant;
        engineStyle?: never;
        storageBands?: never;
    }
    | {
        type: 'storage';
        variant?: StorageVariant;
        engineStyle?: never;
        storageBands?: number;
    }
    | {
        type: 'engine';
        variant?: 'default';
        engineStyle?: EngineStyle;
        storageBands?: never;
    }
    | {
        type: 'ring' | 'trench' | 'tower';
        variant?: 'default';
        engineStyle?: never;
        storageBands?: never;
    }
);

export class ShipComponent {
    public readonly zIndex: number;
    public readonly type: ComponentType;
    public readonly color: HSBAColor;
    public readonly engineStyle: EngineStyle;
    public readonly energyGlowHue: number;
    public readonly variant: ShipComponentVariant;
    public readonly shipArchetype: ShipArchetype;
    public readonly isTrunk: boolean;
    public readonly invertLighting: boolean;
    public readonly shipCenterY?: number;
    public readonly shipCenterX?: number;
    public readonly lightColors: readonly HSBAColor[];
    public readonly storageBands?: number;

    private _bounds: Readonly<ShipBounds>;
    private _greebles: CapitalShipSurfaceGreebles;
    private _shapePath!: Path2D;
    private _leftEdge: Readonly<{ minY: number; maxY: number }> | null = null;
    private readonly _facing: 'forward' | 'backward';
    private readonly renderer: ComponentRenderer;

    constructor(options: ShipComponentOptions) {
        const {
            bounds,
            zIndex,
            type,
            color,
            rng,
            shipArchetype,
            variant = 'default',
            isTrunk = false,
            invertLighting = false,
            facing = 'forward',
            shipCenterY,
            shipCenterX,
            lightColors,
        } = options;
        const forcedEngineStyle = options.type === 'engine' ? options.engineStyle : undefined;
        const storageBands = options.type === 'storage' ? options.storageBands : undefined;

        this._bounds = Object.freeze({ ...bounds });
        this.zIndex = zIndex;
        this.type = type;
        this.color = color;
        this.shipArchetype = shipArchetype;
        this.variant = variant;
        this.isTrunk = isTrunk;
        this.invertLighting = invertLighting;
        this.shipCenterY = shipCenterY;
        this.shipCenterX = shipCenterX;
        const resolvedLightColors = lightColors && lightColors.length > 0
            ? lightColors
            : [HSBAColor.fromRGBA(0, 255, 0)];
        this.lightColors = Object.freeze([...resolvedLightColors]);
        this.storageBands = storageBands;
        this._facing = facing;

        let engineStyle: EngineStyle = 'standard';
        let energyGlowHue = 0;

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
            case 'storage':
                this.renderer = new StorageRenderer();
                break;
            default:
                this.renderer = new StandardComponentRenderer();
                break;
        }

        // Engine Specific Logic
        if (type === 'engine') {
            if (forcedEngineStyle) {
                engineStyle = forcedEngineStyle;
                if (engineStyle === 'energy') {
                    energyGlowHue = rng.range(0.0, 1.0);
                }
            } else {
                const r = rng.next();
                if (r < 0.4) engineStyle = 'standard';
                else if (r < 0.7) engineStyle = 'radiator';
                else {
                    engineStyle = 'energy';
                    energyGlowHue = rng.range(0.0, 1.0);
                }
            }
        }
        this.engineStyle = engineStyle;
        this.energyGlowHue = energyGlowHue;

        this._greebles = this.createGreebles();
        this.generateShape(rng);
    }

    get bounds(): Readonly<ShipBounds> {
        return this._bounds;
    }

    get greebles(): CapitalShipSurfaceGreebles {
        return this._greebles;
    }

    get shapePath(): Path2D {
        return this._shapePath;
    }

    get leftEdge(): Readonly<{ minY: number; maxY: number }> | null {
        return this._leftEdge;
    }

    get facing(): 'forward' | 'backward' {
        return this._facing;
    }

    updateBounds(
        changes: Partial<ShipBounds>,
        rng: RNG
    ): void {
        const previous = this._bounds;
        this._bounds = Object.freeze({ ...previous, ...changes });
        if (previous.w !== this._bounds.w || previous.h !== this._bounds.h) {
            this._greebles = this.createGreebles();
        }
        this.generateShape(rng);
    }

    private generateShape(rng: RNG): void {
        const shape = this.renderer.generateShape(this, rng);
        this._shapePath = shape.path;
        this._leftEdge = shape.leftEdge ? Object.freeze({ ...shape.leftEdge }) : null;
    }

    draw(ctx: CanvasRenderingContext2D, rng: RNG): void {
        this.renderer.draw(ctx, this, rng);
    }

    private createGreebles(): CapitalShipSurfaceGreebles {
        const skipBaseFill = this.type === 'sphere' || this.type === 'ring' || this.type === 'trench';
        return new CapitalShipSurfaceGreebles(
            this._bounds.w / UNIT_SCALE,
            this._bounds.h / UNIT_SCALE,
            this.color,
            this.shipArchetype,
            this.type,
            skipBaseFill,
            this.isTrunk,
            [...this.lightColors]
        );
    }
}
