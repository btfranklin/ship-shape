import { HSBAColor, RNG, UNIT_SCALE } from '../greebler/common.js';
import { ShipComponent } from './ShipComponent.js';
import { CapitalShipSurfaceGreebles } from '../greebler/CapitalShipSurfaceGreebles.js';
import { ShipArchetype } from './shipTypes.js';

export class UnifiedTrunkComponent {
        public bounds: { x: number, y: number, w: number, h: number };
        public zIndex: number;
        public greebles: CapitalShipSurfaceGreebles;
        public trenchGreebles?: CapitalShipSurfaceGreebles;
        public hasTrench: boolean = false;
        public trenchY: number = 0; // In Units relative to top
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
            const shipArchetype = components[0].shipArchetype;
            
            this.greebles = new CapitalShipSurfaceGreebles(
                this.bounds.w / UNIT_SCALE, 
                this.bounds.h / UNIT_SCALE, 
                this.color, 
                shipArchetype,
                'hull'
            );
    
            // 3. Setup Trench (if tall enough)
            if (this.bounds.h > 150 && rng.bool(0.6)) {
                this.hasTrench = true;
                const trenchHeightPx = rng.range(30, 60);
                const trenchHeightUnits = trenchHeightPx / UNIT_SCALE;
                
                // Position trench somewhere in the middle 60% of the ship
                const minY = 0.2 * (this.bounds.h / UNIT_SCALE);
                const maxY = 0.8 * (this.bounds.h / UNIT_SCALE) - trenchHeightUnits;
                this.trenchY = rng.range(minY, maxY);
    
                this.trenchGreebles = new CapitalShipSurfaceGreebles(
                    this.bounds.w / UNIT_SCALE,
                    trenchHeightUnits,
                    this.color,
                    shipArchetype,
                    'trench'
                );
            }
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

                // 3. Draw Unified Fill (Gradient) WITH Shadow
                // The shadow applies only to this fill operation
                ctx.save();
                
                // Removed Drop Shadow per user request (it was casting onto background/other parts)
                
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
                ctx.fill(unifiedPath); 
                ctx.restore(); // Restore context to clear shadow settings
        
                        // 4. Draw Greebles & Trench (Clipped to Union)
                        // No shadow here, clean render on top of the fill
                        ctx.save();
                        ctx.clip(unifiedPath); // Clip future draws to the union shape
                        
                        // Transform to align the greeble texture
                        ctx.translate(this.bounds.x, this.bounds.y);
                        ctx.scale(UNIT_SCALE, UNIT_SCALE);
                        
                        this.greebles.draw(ctx, rng);
                        
                        // 5. Draw Trench (if exists)
                        if (this.hasTrench && this.trenchGreebles) {
                            ctx.save();
                            ctx.translate(0, this.trenchY);
                            this.trenchGreebles.draw(ctx, rng);
                            ctx.restore();
                        }
                        
                        ctx.restore(); // Restore clip & transform from Step 4
                
                        // 6. Lighting Overlay (Global Volume)
                        // Applies a top-down light/shadow gradient to simulate the 3D curvature of the hull
                        // This ensures the trunk doesn't look flat despite the opaque greebles
                        ctx.save();
                        ctx.clip(unifiedPath);
                        
                        const lightGrad = ctx.createLinearGradient(
                            this.bounds.x, this.bounds.y, 
                            this.bounds.x, this.bounds.y + this.bounds.h
                        );
                        lightGrad.addColorStop(0, 'rgba(255,255,255,0.25)'); // Stronger Highlight
                        lightGrad.addColorStop(0.3, 'rgba(0,0,0,0)');      // Mid (Neutral)
                        lightGrad.addColorStop(1, 'rgba(0,0,0,0.85)');      // Darker Shadow (Fall upwards)
                        
                        ctx.fillStyle = lightGrad;
                        ctx.fillRect(this.bounds.x, this.bounds.y, this.bounds.w, this.bounds.h);
                        
                        ctx.restore();
                    }
                }