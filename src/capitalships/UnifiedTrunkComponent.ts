import { CapitalShipSurfaceGreebles } from '../greebles/CapitalShipSurfaceGreebles.js';
import { HSBAColor, RNG, getPath2D } from '../greebles/common.js';
import { UNIT_SCALE } from '../greebles/constants.js';
import { ShipBounds, ShipComponent } from './ShipComponent.js';
import {
    drawClippedSurfaceGreebles,
    drawDeferredEmissiveGreebles
} from './renderers/componentPaintPasses.js';

export class UnifiedTrunkComponent {
    public readonly bounds: Readonly<ShipBounds>;
    public readonly zIndex: number;
    public readonly greebles: CapitalShipSurfaceGreebles;
    public readonly components: readonly ShipComponent[];
    public readonly color: HSBAColor;
    public readonly lightColors: readonly HSBAColor[];

    public readonly shapePath: Path2D;

    constructor(components: readonly ShipComponent[]) {
        const first = components[0];
        if (!first) {
            throw new TypeError('UnifiedTrunkComponent requires at least one ship component.');
        }

        this.components = Object.freeze([...components]);
        this.color = first.color;
        this.lightColors = Object.freeze([...first.lightColors]);

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        let maxZ = -Infinity;

        const Path2D = getPath2D();
        this.shapePath = new Path2D();
        for (const component of this.components) {
            minX = Math.min(minX, component.bounds.x);
            minY = Math.min(minY, component.bounds.y);
            maxX = Math.max(maxX, component.bounds.x + component.bounds.w);
            maxY = Math.max(maxY, component.bounds.y + component.bounds.h);
            maxZ = Math.max(maxZ, component.zIndex);
            this.shapePath.addPath(component.shapePath);
        }

        this.bounds = Object.freeze({
            x: minX,
            y: minY,
            w: maxX - minX,
            h: maxY - minY,
        });
        this.zIndex = maxZ;
        this.greebles = new CapitalShipSurfaceGreebles(
            this.bounds.w / UNIT_SCALE,
            this.bounds.h / UNIT_SCALE,
            this.color,
            first.shipArchetype,
            'hull',
            true,
            true,
            [...this.lightColors]
        );
    }

    draw(ctx: CanvasRenderingContext2D, rng: RNG): void {
        ctx.save();
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.stroke(this.shapePath);
        ctx.restore();

        const fill = ctx.createLinearGradient(
            this.bounds.x,
            this.bounds.y,
            this.bounds.x,
            this.bounds.y + this.bounds.h
        );
        fill.addColorStop(0, this.color.adjustBrightness(0.1).toRGBAString());
        fill.addColorStop(0.5, this.color.adjustBrightness(-0.2).toRGBAString());
        fill.addColorStop(1, this.color.adjustBrightness(-0.5).toRGBAString());
        ctx.fillStyle = fill;
        ctx.fill(this.shapePath);

        const preparedSurface = drawClippedSurfaceGreebles(ctx, this, rng);

        ctx.save();
        ctx.clip(this.shapePath);
        const lighting = ctx.createLinearGradient(
            this.bounds.x,
            this.bounds.y,
            this.bounds.x,
            this.bounds.y + this.bounds.h
        );
        lighting.addColorStop(0, 'rgba(255,255,255,0.25)');
        lighting.addColorStop(0.3, 'rgba(0,0,0,0)');
        lighting.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = lighting;
        ctx.fillRect(this.bounds.x, this.bounds.y, this.bounds.w, this.bounds.h);
        ctx.restore();

        drawDeferredEmissiveGreebles(ctx, this, preparedSurface);
    }
}
