import { HSBAColor, RNG } from './common.js';
import type { Drawable } from './common.js';
import type { ShipArchetype, ComponentType } from '../shared/shipTypes.js';
import { CapitalShipSurfaceEmissiveRenderer } from './CapitalShipSurfaceEmissiveRenderer.js';
import type { EmissivePlan } from './CapitalShipSurfaceEmissiveRenderer.js';
import { createSurfaceLayerPlan } from './surfaceLayerPlan.js';
import { drawSurfaceLayerPlan } from './surfaceLayerRenderer.js';

export class CapitalShipSurfaceGreebles implements Drawable {
    private emissivePlan?: EmissivePlan;

    constructor(
        public xUnits: number, 
        public yUnits: number, 
        public themeColor: HSBAColor,
        public shipArchetype: ShipArchetype,
        public componentType: ComponentType,
        public skipBaseFill: boolean = false,
        public isTrunk: boolean = false,
        public lightColors?: HSBAColor[]
    ) {}

    draw(context: CanvasRenderingContext2D, rng: RNG, options?: { skipEmissive?: boolean }): void {
        const plan = createSurfaceLayerPlan({
            xUnits: this.xUnits,
            yUnits: this.yUnits,
            themeColor: this.themeColor,
            shipArchetype: this.shipArchetype,
            componentType: this.componentType,
            skipBaseFill: this.skipBaseFill,
            isTrunk: this.isTrunk,
            lightColors: this.lightColors,
            skipEmissive: options?.skipEmissive ?? false
        }, rng);

        this.emissivePlan = plan.emissivePlan;
        drawSurfaceLayerPlan(context, plan, {
            xUnits: this.xUnits,
            yUnits: this.yUnits,
            themeColor: this.themeColor,
            shipArchetype: this.shipArchetype,
            componentType: this.componentType,
            skipBaseFill: this.skipBaseFill,
            isTrunk: this.isTrunk,
            lightColors: this.lightColors,
            skipEmissive: options?.skipEmissive ?? false
        });
    }

    drawEmissive(context: CanvasRenderingContext2D, _rng: RNG, options?: { clipPath?: Path2D }): void {
        if (!this.emissivePlan) return;

        const renderer = new CapitalShipSurfaceEmissiveRenderer(
            this.xUnits,
            this.yUnits,
            this.themeColor
        );
        renderer.draw(context, this.emissivePlan, options);
    }
}
