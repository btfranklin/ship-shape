import { HSBAColor, RNG } from '../greebler/common.js';
import { CapitalShipSurfaceGreebles, SurfaceArchetype } from '../greebler/CapitalShipSurfaceGreebles.js';

export type ComponentType = 'hull' | 'superstructure' | 'engine' | 'weapon' | 'sensor' | 'tank';

export class ShipComponent {
    public bounds: { x: number, y: number, w: number, h: number };
    public _energyGlowHue: number = 0.0;
    public engineStyle: 'standard' | 'radiator' | 'energy' = 'standard';
    
            constructor(
                x: number, 
                y: number, 
                w: number, 
                h: number, 
                zIndex: number, 
                type: ComponentType, 
                color: HSBAColor,
                rng: RNG
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
                        // Random Engine Style
                        const r = rng.next();
                        if (r < 0.4) this.engineStyle = 'standard';
                        else if (r < 0.7) this.engineStyle = 'radiator';
                        else {
                            this.engineStyle = 'energy';
                            this._energyGlowHue = rng.range(0.0, 1.0);
                        }
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
            
                    const isTall = h > w; // Simple verticality check
            
                    
            
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
            
                                 // Tall towers should point UP
            
                                 shapeType = rng.choice(['taper-top', 'taper-top', 'rect']); 
            
                            } else {
            
                                 // Decks point forward/flat
            
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
    
                                               // 1. Draw Housing (Chassis)
    
                                               // Dark metallic block to hold the core
    
                                               const housingGrad = ctx.createLinearGradient(this.bounds.x, this.bounds.y, this.bounds.x, this.bounds.y + this.bounds.h);
    
                                               housingGrad.addColorStop(0, '#2a2a2a');
    
                                               housingGrad.addColorStop(0.5, '#444');
    
                                               housingGrad.addColorStop(1, '#2a2a2a');
    
                                               ctx.fillStyle = housingGrad;
    
                                               ctx.fill(this.shapePath);
    
                                               
    
                                               // 2. Inset for Core
    
                                               const inset = Math.min(this.bounds.w, this.bounds.h) * 0.15;
    
                                               const innerX = this.bounds.x + inset;
    
                                               const innerY = this.bounds.y + inset;
    
                                               const innerW = this.bounds.w - inset*2;
    
                                               const innerH = this.bounds.h - inset*2;
    
                                               
    
                                               // Dark background for core area
    
                                               ctx.fillStyle = '#050505';
    
                                               ctx.fillRect(innerX, innerY, innerW, innerH);
    
                                               
    
                                               // 3. Glowing Core Gradient
    
                                               const cx = innerX + innerW/2;
    
                                               const cy = innerY + innerH/2;
    
                                               const r = Math.min(innerW, innerH) * 0.7;
    
                                               
    
                                               const grad = ctx.createRadialGradient(cx, cy, r*0.2, cx, cy, r);
    
                                               const energyColor = new HSBAColor(this._energyGlowHue, 1.0, 1.0); 
    
                                               grad.addColorStop(0, energyColor.withBrightness(1.0).toRGBAString()); // White hot
    
                                               grad.addColorStop(0.4, energyColor.toRGBAString());
    
                                               grad.addColorStop(1, 'rgba(0,0,0,0)');
    
                                               
    
                                               ctx.fillStyle = grad;
    
                                               ctx.globalCompositeOperation = 'lighter';
    
                                               ctx.fillRect(innerX, innerY, innerW, innerH);
    
                                               ctx.globalCompositeOperation = 'source-over';
    
                                               
    
                                               // 4. Containment Brackets (Over the core, attached to housing)
    
                                               ctx.fillStyle = '#333'; // Darker metal
    
                                               ctx.strokeStyle = '#111';
    
                                               ctx.lineWidth = 1;
    
                                               
    
                                               const clampH = innerH * 0.25;
    
                                               const clampW = innerW * 0.5;
    
                                               
    
                                               // Top Clamp (extending down from housing top)
    
                                               ctx.beginPath();
    
                                               ctx.moveTo(cx - clampW/2, innerY);
    
                                               ctx.lineTo(cx + clampW/2, innerY);
    
                                               ctx.lineTo(cx + clampW/3, innerY + clampH); 
    
                                               ctx.lineTo(cx - clampW/3, innerY + clampH);
    
                                               ctx.closePath();
    
                                               ctx.fill();
    
                                               ctx.stroke();
    
                              
    
                                               // Bottom Clamp
    
                                               ctx.beginPath();
    
                                               ctx.moveTo(cx - clampW/2, innerY + innerH);
    
                                               ctx.lineTo(cx + clampW/2, innerY + innerH);
    
                                               ctx.lineTo(cx + clampW/3, innerY + innerH - clampH);
    
                                               ctx.lineTo(cx - clampW/3, innerY + innerH - clampH);
    
                                               ctx.closePath();
    
                                               ctx.fill();
    
                                               ctx.stroke();
    
                                               
    
                                               // Rivet details on clamps
    
                                               ctx.fillStyle = '#0f0'; // tiny indicator lights? No, simple rivets.
    
                                               ctx.fillStyle = '#555';
    
                                               ctx.beginPath();
    
                                               ctx.arc(cx, innerY + clampH/2, 2, 0, Math.PI*2);
    
                                               ctx.fill();
    
                                               ctx.beginPath();
    
                                               ctx.arc(cx, innerY + innerH - clampH/2, 2, 0, Math.PI*2);
    
                                               ctx.fill();
    
                              
    
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
    
                    
    
                    // 1. Volume Fill (Gradient)
    
                    // Light Top-Left to Dark Bottom-Right
    
                    const grad = ctx.createLinearGradient(this.bounds.x, this.bounds.y, this.bounds.x + this.bounds.w, this.bounds.y + this.bounds.h);
    
                    const base = this.color;
    
                    grad.addColorStop(0, base.withBrightness(0.1).toRGBAString()); // Highlight
    
                    grad.addColorStop(0.5, base.withBrightness(-0.2).toRGBAString()); // Mid
    
                    grad.addColorStop(1, base.withBrightness(-0.5).toRGBAString()); // Shadow
    
                    
    
                    ctx.fillStyle = grad;
    
                    ctx.fill(this.shapePath);
    
            
    
                    // 2. Draw Greebles (Clipped)
    
            

            ctx.save();

            ctx.clip(this.shapePath);

            

            ctx.translate(this.bounds.x, this.bounds.y);

            ctx.scale(UNIT_SCALE, UNIT_SCALE);

            

                    this.greebles.draw(ctx, rng);

            

                    

            

                    ctx.restore(); 

            

            

            

                            // 2b. Lighting Overlays (Post-Greeble Volume)

            

            

            

                            ctx.save();

            

            

            

                            ctx.clip(this.shapePath);

            

            

            

                            

            

            

            

                            // Determine Lighting Direction

            

            

            

                            // Towers (Tall) get side lighting (Shadow Right)

            

            

            

                            // Hulls (Wide) get top-down lighting (Shadow Bottom)

            

            

            

                            const isTall = this.bounds.h > this.bounds.w;

            

            

            

                            

            

            

            

                            let shadowGrad, lightGrad;

            

            

            

                            

            

            

            

                            if (isTall) {

            

            

            

                                // Horizontal: Left (Light) -> Right (Shadow)

            

            

            

                                shadowGrad = ctx.createLinearGradient(this.bounds.x, this.bounds.y, this.bounds.x + this.bounds.w, this.bounds.y);

            

            

            

                                lightGrad = ctx.createLinearGradient(this.bounds.x, this.bounds.y, this.bounds.x + this.bounds.w, this.bounds.y);

            

            

            

                            } else {

            

            

            

                                // Vertical: Top (Light) -> Bottom (Shadow)

            

            

            

                                shadowGrad = ctx.createLinearGradient(this.bounds.x, this.bounds.y, this.bounds.x, this.bounds.y + this.bounds.h);

            

            

            

                                lightGrad = ctx.createLinearGradient(this.bounds.x, this.bounds.y, this.bounds.x, this.bounds.y + this.bounds.h);

            

            

            

                            }

            

            

            

                            

            

            

            

                            // Shadow (End of gradient)

            

            

            

                            shadowGrad.addColorStop(0.4, 'rgba(0,0,0,0)');

            

            

            

                            shadowGrad.addColorStop(1, 'rgba(0,0,0,0.6)');

            

            

            

                            ctx.fillStyle = shadowGrad;

            

            

            

                            ctx.fill(this.shapePath);

            

            

            

                            

            

            

            

                            // Highlight (Start of gradient)

            

            

            

                            lightGrad.addColorStop(0, 'rgba(255,255,255,0.2)');

            

            

            

                            lightGrad.addColorStop(0.4, 'rgba(255,255,255,0)');

            

            

            

                            ctx.fillStyle = lightGrad;

            

            

            

                            ctx.fill(this.shapePath);

            

            

            

                            

            

            

            

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

    