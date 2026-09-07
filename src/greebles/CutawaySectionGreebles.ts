import { HSBAColor, RNG, getPath2D } from './common.js';
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
        this.drawInternal(context, rng, {
            drawBase: true,
            drawGlow: true,
            useLegacyGlow: true
        });
    }

    drawBase(context: CanvasRenderingContext2D, rng: RNG): void {
        this.drawInternal(context, rng, {
            drawBase: true,
            drawGlow: false,
            useLegacyGlow: false
        });
    }

    drawGlow(context: CanvasRenderingContext2D, rng: RNG): void {
        this.drawInternal(context, rng, {
            drawBase: false,
            drawGlow: true,
            useLegacyGlow: false
        });
    }

    drawMask(context: CanvasRenderingContext2D, rng: RNG): void {
        context.save();
        context.fillStyle = 'black';
        for (let i = 0; i < this.cutawayCount; i++) {
            const w = rng.range(0.3, 0.7);
            const h = rng.range(0.3, 0.7);
            const x = rng.range(0, this.xUnits - w);
            const y = rng.range(0, this.yUnits - h);
            const path = this.generateClippingPath({ x, y, w, h }, rng);
            context.fill(path);
        }
        context.restore();
    }

    private drawInternal(
        context: CanvasRenderingContext2D,
        rng: RNG,
        options: { drawBase: boolean; drawGlow: boolean; useLegacyGlow: boolean }
    ): void {
        context.save();
        context.lineWidth = 0.002; // Slightly thicker outline for the breach
        context.strokeStyle = 'black';
        const Path2D = getPath2D();

        const innardsFillColor = this.themeColor.adjustBrightness(-0.35);
        const useLegacyGlow = options.drawBase && options.drawGlow && options.useLegacyGlow;
        const shouldDrawGlow = options.drawGlow || useLegacyGlow;

        for (let i = 0; i < this.cutawayCount; i++) {
            // Generate random rect for the breach area
            const w = rng.range(0.3, 0.7);
            const h = rng.range(0.3, 0.7);
            const x = rng.range(0, this.xUnits - w);
            const y = rng.range(0, this.yUnits - h);

            // 1. Generate Path
            const path = this.generateClippingPath({ x, y, w, h }, rng);

            // 2. Draw Innards (Clipped)
            context.save();
            context.clip(path);

            if (options.drawBase && !useLegacyGlow) {
                this.drawBacklight(
                    context,
                    { x, y, w, h },
                    this.backlightColor.adjustBrightness(-0.2),
                    this.backlightColor.adjustBrightness(-0.8),
                    path
                );
            }

            if (shouldDrawGlow) {
                const glowInner = this.backlightColor.adjustBrightness(0.2).withAlpha(0.4);
                const glowOuter = this.backlightColor.adjustBrightness(-0.5).withAlpha(0.0);
                this.drawBacklight(
                    context,
                    { x, y, w, h },
                    glowInner,
                    glowOuter,
                    path
                );
            }

            if (options.drawBase) {
                // Inner Shadow (Simulate Hull Thickness using Inverse Fill)
                // We create a shape that is "Everything OUTSIDE the hole" and cast a shadow from it.
                // Since we are clipped to the INSIDE, we only see the shadow falling in.
                context.save();
                const shadowCaster = new Path2D();
                const margin = 1.0;
                shadowCaster.rect(x - margin, y - margin, w + margin * 2, h + margin * 2);
                shadowCaster.addPath(path);

                context.shadowColor = 'rgba(0,0,0,0.8)';
                context.shadowBlur = 0.05; // Soft, realistic falloff
                context.shadowOffsetX = 0;
                context.shadowOffsetY = 0;
                context.fillStyle = 'black';
                context.fill(shadowCaster, 'evenodd');
                context.restore();

                // Draw Innards
                this.drawInnards(context, { x, y, w, h }, innardsFillColor, rng);
            }
            context.restore();

            // 3. Outline the Breach (Clean edge)
            if (options.drawBase) {
                context.lineWidth = 0.002;
                context.strokeStyle = 'black';
                context.stroke(path);
            }
        }

        context.restore();
    }

    private drawBacklight(
        context: CanvasRenderingContext2D,
        rect: { x: number; y: number; w: number; h: number },
        innerColor: HSBAColor,
        outerColor: HSBAColor,
        path: Path2D
    ): void {
        const centerX = rect.x + rect.w / 2;
        const centerY = rect.y + rect.h / 2;
        const radius = Math.max(rect.w, rect.h);
        const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, innerColor.toRGBAString());
        gradient.addColorStop(1, outerColor.toRGBAString());
        context.fillStyle = gradient;
        context.fill(path);
    }

    private generateClippingPath(rect: {x:number, y:number, w:number, h:number}, rng: RNG): Path2D {
        const Path2D = getPath2D();
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
