import { HSBAColor, RNG } from '../greebler/common.js';
import { CapitalShipSurfaceGreebles, SurfaceArchetype } from '../greebler/CapitalShipSurfaceGreebles.js';

export type ComponentType = 'hull' | 'superstructure' | 'engine' | 'weapon' | 'sensor' | 'tank';

export class ShipComponent {
    public bounds: { x: number, y: number, w: number, h: number };
        public engineStyle: 'standard' | 'radiator' | 'energy' = 'standard';
    
        constructor(
            x: number, 
            y: number, 
            w: number, 
            h: number, 
            zIndex: number, 
            type: ComponentType, 
            color: HSBAColor
        ) {
            this.bounds = { x, y, w, h };
            this.zIndex = zIndex;
            this.type = type;
            this.color = color;
            
            // Normalize units for Greeblers
            // We treat 450px as roughly 1.0 unit of detail density
            const UNIT_SCALE = 450;
            
            // Select Archetype & Style
            let archetype: SurfaceArchetype = 'standard';
            
            switch (type) {
                case 'engine':
                    archetype = 'industrial'; 
                    // Random Engine Style (Simple Hash-based RNG)
                    const seed = x + y + w;
                    const r = Math.abs(Math.sin(seed * 9999));
                    if (r < 0.4) this.engineStyle = 'standard';
                    else if (r < 0.7) this.engineStyle = 'radiator';
                    else this.engineStyle = 'energy';
                    break;
                case 'hull':
                    archetype = 'standard'; // Balanced
                    break;
                case 'superstructure':
                    archetype = 'tech'; // Lots of lights/antennas
                    break;
                case 'sensor':
                    archetype = 'tech'; // High tech
                    break;
                case 'tank':
                    archetype = 'clean'; // Smooth, few greebles
                    break;
                case 'weapon':
                    archetype = 'dense'; // Busy
                    break;
            }
            
            // Configure greebles
            this.greebles = new CapitalShipSurfaceGreebles(w / UNIT_SCALE, h / UNIT_SCALE, color, archetype);
        }
    
        generateShape(rng: RNG) {
            // Generate interesting polygonal shapes
            const p = new Path2D();
            const { x, y, w, h } = this.bounds;
            
            // Pick shape based on Type
            let shapeType = 'rect';
            const isTall = h > w * 1.2;
            
            switch (this.type) {
                case 'engine':
                    // Engines are blocky or tapered at back
                    if (this.engineStyle === 'radiator') shapeType = 'rect';
                    else if (this.engineStyle === 'energy') shapeType = rng.choice(['rect', 'chamfer']);
                    else shapeType = rng.choice(['rect', 'taper-back', 'chamfer']);
                    break;
                case 'hull':
                    // Hulls are main structural blocks (Horizontal)
                    shapeType = rng.choice(['rect', 'cut-corner', 'taper-front']);
                    break;
                case 'superstructure':
                    // Decks (Horizontal) or Towers (Vertical)
                    if (isTall) {
                         shapeType = rng.choice(['taper-top', 'rect', 'cut-corner']);
                    } else {
                         shapeType = rng.choice(['taper-front', 'chamfer', 'rect']);
                    }
                    break;
                case 'sensor':
                    // Towers (Vertical)
                    shapeType = rng.choice(['taper-top', 'rect', 'cut-corner']);
                    break;
                case 'tank':
                    // Fuel pods
                    shapeType = 'chamfer'; // Approximate capsule
                    break;
                default:
                    shapeType = rng.choice(['rect', 'chamfer', 'taper-front', 'taper-back', 'cut-corner']);
            }
            
            // Helper to add points
            // We build absolute coords
            
            switch (shapeType) {
                case 'rect':
                    p.rect(x, y, w, h);
                    break;
                    
                case 'taper-top': // Vertical Trapezoid (Pyramid-like)
                    const taperX = w * 0.25; // Taper in from both sides
                    p.moveTo(x, y + h); // Bottom Left
                    p.lineTo(x + w, y + h); // Bottom Right
                    p.lineTo(x + w - taperX, y); // Top Right (in)
                    p.lineTo(x + taperX, y); // Top Left (in)
                    p.closePath();
                    break;
    
                case 'chamfer':
                    const cSize = Math.min(w, h) * 0.2;
                    p.moveTo(x + cSize, y);
                    p.lineTo(x + w - cSize, y);
                    p.lineTo(x + w, y + cSize);
                    p.lineTo(x + w, y + h - cSize);
                    p.lineTo(x + w - cSize, y + h);
                    p.lineTo(x + cSize, y + h);
                    p.lineTo(x, y + h - cSize);
                    p.lineTo(x, y + cSize);
                    p.closePath();
                    break;
                    
                case 'taper-front': // Taper right side (front)
                    const taper = h * 0.3;
                    p.moveTo(x, y);
                    p.lineTo(x + w, y + taper);
                    p.lineTo(x + w, y + h - taper);
                    p.lineTo(x, y + h);
                    p.closePath();
                    break;
    
                case 'taper-back': // Taper left side (rear)
                    const taperB = h * 0.2;
                    p.moveTo(x, y + taperB);
                    p.lineTo(x + w, y);
                    p.lineTo(x + w, y + h);
                    p.lineTo(x, y + h - taperB);
                    p.closePath();
                    break;
                    
                case 'cut-corner': // Sci-fi angled cut
                    const cut = Math.min(w, h) * 0.3;
                    p.moveTo(x, y);
                    p.lineTo(x + w - cut, y);
                    p.lineTo(x + w, y + cut);
                    p.lineTo(x + w, y + h);
                    p.lineTo(x + cut, y + h); 
                    p.lineTo(x, y + h - cut);
                    p.closePath();
                    break;
            }
            
            this.shapePath = p;
        }
    
        draw(ctx: CanvasRenderingContext2D, rng: RNG) {
            if (!this.shapePath) return;
    
            const UNIT_SCALE = 450;
    
            ctx.save();
    
            // 1. ENGINE SPECIAL RENDERING
            if (this.type === 'engine') {
                 ctx.save();
                 ctx.clip(this.shapePath);
                 const base = this.color;
    
                 if (this.engineStyle === 'radiator') {
                     // Dark Heatsink
                     ctx.fillStyle = '#1a1a1a'; 
                     ctx.fill(this.shapePath);
                     
                     // Glowing Slats
                     const glowColor = base.withSaturation(1.0).withBrightness(0.5).toRGBAString(); // Hot!
                     ctx.fillStyle = glowColor;
                     ctx.shadowColor = glowColor;
                     ctx.shadowBlur = 5;
                     
                     const slatCount = Math.floor(this.bounds.h / 15);
                     const slatH = 4;
                     for (let i=1; i<slatCount; i++) {
                         const sy = this.bounds.y + (this.bounds.h / slatCount) * i;
                         // Draw slat inside
                         ctx.fillRect(this.bounds.x + 5, sy, this.bounds.w - 10, slatH);
                     }
    
                 } else if (this.engineStyle === 'energy') {
                     // Energy Core
                     ctx.fillStyle = '#111'; // Dark frame
                     ctx.fill(this.shapePath);
                     
                     // Glowing Core Gradient
                     const cx = this.bounds.x + this.bounds.w/2;
                     const cy = this.bounds.y + this.bounds.h/2;
                     const r = Math.min(this.bounds.w, this.bounds.h) * 0.6;
                     
                     const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                     const energyColor = base.withHueShift(0.5).withSaturation(1.0); 
                     grad.addColorStop(0, energyColor.withBrightness(0.8).toRGBAString()); // White hot center
                     grad.addColorStop(0.5, energyColor.toRGBAString());
                     grad.addColorStop(1, 'rgba(0,0,0,0)');
                     
                     ctx.fillStyle = grad;
                     ctx.globalCompositeOperation = 'lighter'; // Additive glow
                     ctx.fillRect(this.bounds.x, this.bounds.y, this.bounds.w, this.bounds.h);
                     ctx.globalCompositeOperation = 'source-over';
                 } else {
                     // Standard Cylinder
                     const grad = ctx.createLinearGradient(this.bounds.x, this.bounds.y, this.bounds.x, this.bounds.y + this.bounds.h);
                     grad.addColorStop(0, base.withBrightness(-0.4).toRGBAString());
                     grad.addColorStop(0.2, base.withBrightness(-0.1).toRGBAString());
                     grad.addColorStop(0.5, base.withBrightness(0.2).toRGBAString()); // Highlight
                     grad.addColorStop(0.8, base.withBrightness(-0.1).toRGBAString());
                     grad.addColorStop(1, base.withBrightness(-0.4).toRGBAString());
                     ctx.fillStyle = grad;
                     ctx.fill(this.shapePath);
                     
                     // Rings
                     ctx.strokeStyle = base.withBrightness(-0.5).toRGBAString();
                     ctx.lineWidth = 2;
                     const ringCount = Math.floor(this.bounds.w / 40) || 2;
                     for(let i=1; i<ringCount; i++) {
                         const rx = this.bounds.x + (this.bounds.w / ringCount) * i;
                         ctx.beginPath();
                         ctx.moveTo(rx, this.bounds.y);
                         ctx.lineTo(rx, this.bounds.y + this.bounds.h);
                         ctx.stroke();
                     }
                 }
                 
                 ctx.restore();
                 
                 // Outer Stroke
                 ctx.strokeStyle = 'rgba(0,0,0,0.8)';
                 ctx.lineWidth = 1;
                 ctx.stroke(this.shapePath);
                 
                 ctx.restore();
                 return; // Done for engine
            }
    
            // STANDARD COMPONENT DRAWING
    

            ctx.fillStyle = this.color.withBrightness(-0.3).toRGBAString(); 

            ctx.fill(this.shapePath);

    

            // 2. Draw Greebles (Clipped)

            ctx.save();

            ctx.clip(this.shapePath);

            

            ctx.translate(this.bounds.x, this.bounds.y);

            ctx.scale(UNIT_SCALE, UNIT_SCALE);

            

            this.greebles.draw(ctx, rng);

            

            ctx.restore(); 

    

            // 3. Inner Highlight (Bevel)

            ctx.save();

            ctx.clip(this.shapePath);

            ctx.strokeStyle = 'rgba(255,255,255,0.15)';

            ctx.lineWidth = 4;

            ctx.stroke(this.shapePath); 

            ctx.restore();

    

            // 4. Outer Stroke

            ctx.strokeStyle = 'rgba(0,0,0,0.8)';

            ctx.lineWidth = 1;

            ctx.stroke(this.shapePath);

    

            ctx.restore();

        }

    }

    