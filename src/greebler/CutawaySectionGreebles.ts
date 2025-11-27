import { HSBAColor, RNG } from './common.js';
import type { Drawable } from './common.js';
import { EquipmentGreebles } from './EquipmentGreebles.js';
import { PipeGreebles } from './PipeGreebles.js';

export class CutawaySectionGreebles implements Drawable {
    constructor(
        public xUnits: number,
        public yUnits: number,
        public themeColor: HSBAColor,
        public cutawayCount: number,
        public backlightColor: HSBAColor = HSBAColor.fromRGBA(204, 0, 0) // Default red
    ) {}

    draw(context: CanvasRenderingContext2D, rng: RNG): void {
        context.save();
        context.lineWidth = 0.002; // Slightly thicker outline for the breach
        context.strokeStyle = 'black';

        const innardsFillColor = this.themeColor.withBrightness(-0.2);

        for (let i = 0; i < this.cutawayCount; i++) {
            // Generate random rect for the breach area
            const w = rng.range(0.3, 0.7);
            const h = rng.range(0.3, 0.7);
            const x = rng.range(0, this.xUnits - w);
            const y = rng.range(0, this.yUnits - h);

            // 1. Generate Path
            const path = this.generateClippingPath({x, y, w, h}, rng);

            // 2. Draw Innards (Clipped)
            context.save();
            context.clip(path);
            
            // Background: Radial Gradient for "Glow" effect
            const centerX = x + w/2;
            const centerY = y + h/2;
            const radius = Math.max(w, h);
            const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            gradient.addColorStop(0, this.backlightColor.withBrightness(0.2).toRGBAString()); // Bright center
            gradient.addColorStop(1, this.backlightColor.withBrightness(-0.5).toRGBAString()); // Dark edges
            context.fillStyle = gradient;
            context.fill(path); 
            
            // Inner Shadow (Simulate Hull Thickness using Inverse Fill)
            // We create a shape that is "Everything OUTSIDE the hole" and cast a shadow from it.
            // Since we are clipped to the INSIDE, we only see the shadow falling in.
            
            context.save();
            const shadowCaster = new Path2D();
            // Add a large rectangle surrounding the breach
            const margin = 1.0;
            shadowCaster.rect(x - margin, y - margin, w + margin*2, h + margin*2);
            // Add the breach path itself
            shadowCaster.addPath(path);
            
            context.shadowColor = 'rgba(0,0,0,0.8)';
            context.shadowBlur = 0.05; // Soft, realistic falloff
            context.shadowOffsetX = 0;
            context.shadowOffsetY = 0;
            context.fillStyle = 'black';
            
            // 'evenodd' fill rule: Points inside Rect (1) and inside Path (2) are EVEN -> Empty (Hole).
            // Points inside Rect (1) but outside Path (0) are ODD -> Filled (Solid).
            // So this fills the "Outside", casting a shadow onto the "Inside".
            context.fill(shadowCaster, 'evenodd');
            context.restore();
            
            // Draw Innards
            this.drawInnards(context, {x, y, w, h}, innardsFillColor, rng);
            context.restore();

            // 3. Outline the Breach (Clean edge)
            context.lineWidth = 0.002;
            context.strokeStyle = 'black';
            context.stroke(path);
        }

        context.restore();
    }

    private generateClippingPath(rect: {x:number, y:number, w:number, h:number}, rng: RNG): Path2D {
        const path = new Path2D();
        
        let xPos = rect.x;
        let yPos = rng.range(rect.y + rect.h/2, rect.y + rect.h);
        
        path.moveTo(xPos, yPos);

        let phase: 'movingRight' | 'movingDown' | 'movingLeft' = 'movingRight';
        let isFinished = false;
        
        let iterations = 0;
        while (!isFinished && iterations < 100) {
            iterations++;
            
            const midY = rect.y + rect.h/2;
            const maxX = rect.x + rect.w;
            const minX = rect.x;

            switch (phase) {
                case 'movingRight':
                    if (yPos > midY) { 
                        if (rng.bool()) {
                            xPos = rng.range(xPos, maxX);
                        } else {
                            const newY = rng.range(midY, yPos);
                            const delta = yPos - newY;
                            yPos = newY;
                            xPos += delta;
                        }
                    } else { 
                         if (rng.bool()) {
                            xPos = rng.range(xPos, maxX);
                        } else {
                            const newY = rng.range(yPos, midY);
                            const delta = newY - yPos;
                            yPos = newY;
                            xPos += delta;
                        }
                    }
                    if (xPos >= maxX) {
                        xPos = maxX;
                        phase = 'movingDown';
                    }
                    path.lineTo(xPos, yPos);
                    break;

                case 'movingDown':
                    yPos = rng.range(rect.y, yPos);
                    path.lineTo(xPos, yPos);
                    phase = 'movingLeft';
                    break;

                case 'movingLeft':
                    if (yPos > midY) {
                         if (rng.bool()) {
                            xPos = rng.range(minX, xPos);
                        } else {
                            const newY = rng.range(midY, yPos);
                            const delta = yPos - newY;
                            yPos = newY;
                            xPos -= delta;
                        }
                    } else {
                        if (rng.bool()) {
                            xPos = rng.range(minX, xPos);
                        } else {
                            const newY = rng.range(yPos, midY);
                            const delta = newY - yPos;
                            yPos = newY;
                            xPos -= delta;
                        }
                    }
                    if (xPos <= minX) {
                        xPos = minX;
                        isFinished = true;
                    }
                    path.lineTo(xPos, yPos);
                    break;
            }
        }
        
        path.closePath();
        return path;
    }

    private drawInnards(context: CanvasRenderingContext2D, rect: {x:number, y:number, w:number, h:number}, color: HSBAColor, rng: RNG) {
        context.save();
        context.translate(rect.x, rect.y);
        const scale = Math.min(rect.w, rect.h);
        context.scale(scale, scale);
        
        const wUnits = rect.w / scale;
        const hUnits = rect.h / scale;

        // Draw Innards
        const equip = new EquipmentGreebles(wUnits, hUnits, color, 4);
        equip.draw(context, rng);
        
        const pipes = new PipeGreebles(wUnits, hUnits, color, 40, true);
        pipes.draw(context, rng);

        context.restore();
    }
}