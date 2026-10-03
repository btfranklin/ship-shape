import { HSBAColor, RNG } from './common.js';
import type { Drawable } from './common.js';
import type { ShipArchetype, ComponentType } from '../shared/shipTypes.js';
import { CapitalShipSurfaceEmissiveRenderer } from './CapitalShipSurfaceEmissiveRenderer.js';
import { createSurfaceLayerPlan } from './surfaceLayerPlan.js';
import type { EmissiveMode, SurfaceLayerPlanConfig } from './surfaceLayerPlan.js';
import { drawSurfaceLayerPlan } from './surfaceLayerRenderer.js';

export interface PreparedCapitalShipSurface {
    drawBase(context: CanvasRenderingContext2D, options?: { darkWindows?: boolean }): void;
    drawEmissive(
        context: CanvasRenderingContext2D,
        options?: { clipPath?: Path2D }
    ): void;
}

export class CapitalShipSurfaceGreebles implements Drawable {
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

    draw(context: CanvasRenderingContext2D, rng: RNG): void {
        const config = this.createPlanConfig('inline');
        const plan = createSurfaceLayerPlan(config, rng);
        drawSurfaceLayerPlan(context, plan, config);
    }

    prepare(rng: RNG): PreparedCapitalShipSurface {
        const config = this.createPlanConfig('separate');
        const plan = createSurfaceLayerPlan(config, rng);
        if (plan.emissiveMode !== 'separate') {
            throw new Error('Prepared capital ship surfaces require a separate emissive plan.');
        }
        const emissiveRenderer = new CapitalShipSurfaceEmissiveRenderer(
            this.xUnits,
            this.yUnits,
            config.themeColor
        );

        return {
            drawBase(context: CanvasRenderingContext2D, options?: { darkWindows?: boolean }): void {
                drawSurfaceLayerPlan(context, plan, config, options?.darkWindows);
            },
            drawEmissive(
                context: CanvasRenderingContext2D,
                options?: { clipPath?: Path2D }
            ): void {
                emissiveRenderer.draw(context, plan.emissivePlan, options);
            }
        };
    }

    private createPlanConfig(emissiveMode: EmissiveMode): SurfaceLayerPlanConfig {
        return {
            xUnits: this.xUnits,
            yUnits: this.yUnits,
            themeColor: new HSBAColor(
                this.themeColor.h,
                this.themeColor.s,
                this.themeColor.b,
                this.themeColor.a
            ),
            shipArchetype: this.shipArchetype,
            componentType: this.componentType,
            skipBaseFill: this.skipBaseFill,
            isTrunk: this.isTrunk,
            lightColors: this.lightColors.map(({ h, s, b, a }) => new HSBAColor(h, s, b, a)),
            emissiveMode
        };
    }
}
