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

                

                const safeMargin = 0.05; // Fixed small margin for internal path generation

                const innerRectX = rect.x + safeMargin;

                const innerRectY = rect.y + safeMargin;

                const innerRectW = rect.w - 2 * safeMargin;

                const innerRectH = rect.h - 2 * safeMargin;

        

                if (innerRectW <= 0 || innerRectH <= 0) { // Handle very small rects

                    path.rect(rect.x, rect.y, rect.w, rect.h);

                    path.closePath();

                    return path;

                }

        

                let xPos = innerRectX;

                let yPos = rng.range(innerRectY + innerRectH/2, innerRectY + innerRectH);

                

                // Clamp initial position to be within the safe inner rect

                yPos = Math.max(innerRectY, Math.min(innerRectY + innerRectH, yPos));

                

                path.moveTo(xPos, yPos);

        

                let phase: 'movingRight' | 'movingDown' | 'movingLeft' = 'movingRight';

                let isFinished = false;

                let iterations = 0;

                while (!isFinished && iterations < 100) {

                    iterations++;

                    

                    const midY = innerRectY + innerRectH/2;

                    const maxX = innerRectX + innerRectW;

                    const minX = innerRectX;

                    const maxY = innerRectY + innerRectH;

                    const minY = innerRectY; 

        

                    switch (phase) {

                        case 'movingRight':

                            // Clamp rng.range outputs to stay within bounds

                            const targetX_R = rng.range(xPos, maxX);

                            xPos = Math.max(innerRectX, Math.min(maxX, targetX_R));

        

                            if (yPos > midY) {

                                const newY_R = rng.range(midY, yPos);

                                yPos = Math.max(minY, Math.min(maxY, newY_R));

                            } else {

                                const newY_R = rng.range(yPos, midY);

                                yPos = Math.max(minY, Math.min(maxY, newY_R));

                            }

                            if (xPos >= maxX - 0.001) { // Small epsilon to account for float inaccuracies

                                xPos = maxX;

                                phase = 'movingDown';

                            }

                            path.lineTo(xPos, yPos);

                            break;

        

                        case 'movingDown':

                            const targetY_D = rng.range(minY, yPos);

                            yPos = Math.max(minY, Math.min(maxY, targetY_D));

                            path.lineTo(xPos, yPos);

                            phase = 'movingLeft';

                            break;

        

                        case 'movingLeft':

                            const targetX_L = rng.range(minX, xPos);

                            xPos = Math.max(minX, Math.min(maxX, targetX_L));

        

                            if (yPos > midY) {

                                const newY_L = rng.range(midY, yPos);

                                yPos = Math.max(minY, Math.min(maxY, newY_L));

                            } else {

                                const newY_L = rng.range(yPos, midY);

                                yPos = Math.max(minY, Math.min(maxY, newY_L));

                            }

                            if (xPos <= minX + 0.001) { // Small epsilon

                                xPos = minX;

                                isFinished = true; // Set flag to terminate loop

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
