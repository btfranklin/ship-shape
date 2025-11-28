import { HSBAColor, RNG, UNIT_SCALE } from '../greebler/common.js';
import { ShipComponent } from './ShipComponent.js';
import { CapitalShipSurfaceGreebles } from '../greebler/CapitalShipSurfaceGreebles.js';

export class UnifiedTrunkComponent {
    public bounds: { x: number, y: number, w: number, h: number };
    public zIndex: number;
    public greebles: CapitalShipSurfaceGreebles;
    public components: ShipComponent[];
    public color: HSBAColor;

    constructor(components: ShipComponent[], rng: RNG) {
        this.components = components;
        
        // 1. Calculate Union Bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let maxZ = -Infinity; 
        
        this.color = components[0].color; // Assume uniform theme

        for (const c of components) {
            if (c.bounds.x < minX) minX = c.bounds.x;
            if (c.bounds.y < minY) minY = c.bounds.y;
            if (c.bounds.x + c.bounds.w > maxX) maxX = c.bounds.x + c.bounds.w;
            if (c.bounds.y + c.bounds.h > maxY) maxY = c.bounds.y + c.bounds.h;
            if (c.zIndex > maxZ) maxZ = c.zIndex;
        }
        
        this.bounds = {
            x: minX,
            y: minY,
            w: maxX - minX,
            h: maxY - minY
        };
        this.zIndex = maxZ;

        // 2. Create Unified Greebles
        const rootArchetype = components[0].greebles.forcedArchetype;
        
        this.greebles = new CapitalShipSurfaceGreebles(
            this.bounds.w / UNIT_SCALE, 
            this.bounds.h / UNIT_SCALE, 
            this.color, 
            rootArchetype
        );
    }

    draw(ctx: CanvasRenderingContext2D, rng: RNG) {
        // 1. Create Unified Path
        const unifiedPath = new Path2D();
        for (const c of this.components) {
            if (c.shapePath) {
                unifiedPath.addPath(c.shapePath);
            }
        }

        // 2. Draw Outline BEHIND Fill
        // This ensures that internal strokes (where components overlap) are covered by the opaque fill,
        // leaving only the true outer silhouette visible.
        ctx.save();
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 4; // Thicker line, as half will be covered by the fill
        ctx.lineJoin = 'round';
        ctx.stroke(unifiedPath);
        ctx.restore();

        // 3. Draw Unified Fill (Gradient)
        ctx.save();
        
        const grad = ctx.createLinearGradient(
            this.bounds.x, 
            this.bounds.y, 
            this.bounds.x + this.bounds.w, 
            this.bounds.y + this.bounds.h
        );
        grad.addColorStop(0, this.color.withBrightness(0.1).toRGBAString());
        grad.addColorStop(0.5, this.color.withBrightness(-0.2).toRGBAString());
        grad.addColorStop(1, this.color.withBrightness(-0.5).toRGBAString());
        
        ctx.fillStyle = grad;
        ctx.fill(unifiedPath); // Fills the union shape, covering internal strokes
        
        // 4. Draw Greebles (Clipped to Union)
        ctx.save();
        ctx.clip(unifiedPath); // Clip future draws to the union shape
        
        // Transform to align the greeble texture
        ctx.translate(this.bounds.x, this.bounds.y);
        ctx.scale(UNIT_SCALE, UNIT_SCALE);
        
        this.greebles.draw(ctx, rng);
        
        ctx.restore(); // Restore clip
        ctx.restore(); // Restore fill style
    }
}