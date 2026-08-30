import { HSBAColor, RNG } from './common.js';
import type { Drawable } from './common.js';
import type { ShipArchetype, ComponentType } from '../shared/shipTypes.js';
import { CapitalShipSurfaceEmissiveRenderer } from './CapitalShipSurfaceEmissiveRenderer.js';
import type { EmissivePlan } from './CapitalShipSurfaceEmissiveRenderer.js';
import { createSurfaceLayerPlan } from './surfaceLayerPlan.js';
import type { EmissiveMode, SurfaceLayerPlanConfig } from './surfaceLayerPlan.js';
import { drawSurfaceLayerPlan } from './surfaceLayerRenderer.js';

export class CapitalShipSurfaceGreebles implements Drawable {
    private emissivePlan?: EmissivePlan;
    public readonly lightColors: readonly HSBAColor[];

    constructor(
        public readonly xUnits: number,
        public readonly yUnits: number,
        public readonly themeColor: HSBAColor,
        public readonly shipArchetype: ShipArchetype,
        public readonly componentType: ComponentType,
        public readonly skipBaseFill: boolean = false,
        public readonly isTrunk: boolean = false,
        lightColors: readonly HSBAColor[] = [HSBAColor.fromRGBA(0, 255, 0)]
    ) {
        const resolvedLightColors = lightColors.length > 0
            ? lightColors
            : [HSBAColor.fromRGBA(0, 255, 0)];
        this.lightColors = Object.freeze([...resolvedLightColors]);
    }

    draw(context: CanvasRenderingContext2D, rng: RNG, options?: { skipEmissive?: boolean }): void {
        const emissiveMode: EmissiveMode = options?.skipEmissive ? 'separate' : 'inline';
        const config: SurfaceLayerPlanConfig = {
            xUnits: this.xUnits,
            yUnits: this.yUnits,
            themeColor: this.themeColor,
            shipArchetype: this.shipArchetype,
            componentType: this.componentType,
            skipBaseFill: this.skipBaseFill,
            isTrunk: this.isTrunk,
            lightColors: [...this.lightColors],
            emissiveMode
        };
        const plan = createSurfaceLayerPlan(config, rng);

        this.emissivePlan = plan.emissiveMode === 'separate' ? plan.emissivePlan : undefined;
        drawSurfaceLayerPlan(context, plan, config);
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
