import { HSBAColor, RNG } from './common.js';
import type { Drawable } from './common.js';

export class EquipmentGreebles implements Drawable {
    constructor(
        public xUnits: number,
        public yUnits: number,
        public themeColor: HSBAColor,
        public equipmentCount: number
    ) {}

    draw(context: CanvasRenderingContext2D, rng: RNG): void {
        context.save();
        context.fillStyle = this.themeColor.toRGBAString();
        // Increase line width for visibility at scale (approx 1-1.5px at 450h)
        context.lineWidth = 0.003; 
        context.strokeStyle = 'black';

        for (let i = 0; i < this.equipmentCount; i++) {
            const choice = rng.intRange(0, 100);
            let w: number, h: number;

            if (choice <= 25) {
                w = rng.range(0.2, 0.5); h = rng.range(0.2, 0.5);
            } else if (choice <= 60) {
                w = rng.range(0.2, 0.7); h = rng.range(0.2, 0.7);
            } else {
                w = rng.range(0.5, 0.8); h = rng.range(0.5, 0.8);
            }

            if (this.xUnits - w < 0 || this.yUnits - h < 0) continue;

            const x = rng.range(0, this.xUnits - w);
            const y = rng.range(0, this.yUnits - h);

            if (choice <= 25) {
                this.drawCentralizedItem(context, x, y, w, h, rng);
            } else if (choice <= 60) {
                this.drawRowOfItems(context, x, y, w, h, rng);
            } else {
                this.drawScatteredItems(context, x, y, w, h, rng);
            }
        }
        context.restore();
    }

    private drawCentralizedItem(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rng: RNG) {
        ctx.save();
        // Base panel
        if (rng.bool()) {
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
        }
        
        ctx.fillStyle = this.themeColor.withBrightness(0.1).toRGBAString();
        
        // Stronger Shadow settings
        // Note: Shadows in canvas apply to fill/stroke.
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 0.01; 
        ctx.shadowOffsetX = 0.015; 
        ctx.shadowOffsetY = 0.015;

        const size = Math.min(w, h);
        const cx = x + w/2 - size/2;
        const cy = y + h/2 - size/2;
        
        this.drawItemRecursive(ctx, cx, cy, size, size, rng);
        ctx.restore();
    }

    private drawRowOfItems(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rng: RNG) {
        ctx.save();
        ctx.fillStyle = this.themeColor.withBrightness(0.1).toRGBAString();
        
        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 0.01; 
        ctx.shadowOffsetX = 0.015; 
        ctx.shadowOffsetY = 0.015;

        const count = rng.bool(0.8) ? 3 : 5;
        const horizontal = w > h;
        const size = horizontal ? w / count : h / count;
        const inset = size * 0.05;
        
        const startX = horizontal ? x : x + w/2 - size/2;
        const startY = horizontal ? y + h/2 - size/2 : y;

        for (let i = 0; i < count; i++) {
            const ix = horizontal ? startX + i*size : startX;
            const iy = horizontal ? startY : startY + i*size;
            this.drawItemRecursive(ctx, ix + inset, iy + inset, size - inset*2, size - inset*2, rng);
        }
        ctx.restore();
    }

    private drawScatteredItems(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rng: RNG) {
        ctx.save();
        if (rng.bool()) {
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
        }
        ctx.fillStyle = this.themeColor.withBrightness(0.1).toRGBAString();
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 0.01; 
        ctx.shadowOffsetX = 0.015; 
        ctx.shadowOffsetY = 0.015;
        
        const count = rng.intRange(5, 15);
        for(let i=0; i<count; i++) {
            const sx = rng.range(x, x + w);
            const sy = rng.range(y, y + h);
            let sw = rng.range(0, x + w - sx);
            let sh = rng.range(0, y + h - sy);
            
            sw = Math.min(sw, w * 0.3);
            sh = Math.min(sh, h * 0.3);
            
            if (rng.bool()) this.drawRowOfItems(ctx, sx, sy, sw, sh, rng);
            else this.drawCentralizedItem(ctx, sx, sy, sw, sh, rng);
        }
        ctx.restore();
    }

    private drawItemRecursive(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rng: RNG) {
        const round = rng.bool();
        const layers = rng.intRange(2, 4);
        let cx = x, cy = y, cw = w, ch = h;
        
        for(let i=0; i<layers; i++) {
            ctx.beginPath();
            if (round) {
                ctx.ellipse(cx + cw/2, cy + ch/2, cw/2, ch/2, 0, 0, Math.PI*2);
            } else {
                ctx.rect(cx, cy, cw, ch);
            }
            ctx.fill();
            ctx.stroke();
            
            // Remove shadow for inner layers to avoid murky buildup
            ctx.shadowColor = 'transparent';
            
            const inset = rng.range(0.05 * w, 0.1 * w);
            cx += inset; cy += inset; cw -= inset*2; ch -= inset*2;
            if (cw <= 0 || ch <= 0) break;
        }
    }
}

export class EquipmentTrenchGreebles implements Drawable {
    constructor(
        public xUnits: number,
        public yUnits: number,
        public themeColor: HSBAColor,
        public trenchYPosition: number,
        public trenchWidth: number
    ) {}

    draw(context: CanvasRenderingContext2D, rng: RNG): void {
        context.save();
        
        const scale = 0.1;
        const equipment = new EquipmentGreebles(this.xUnits / scale, this.trenchWidth, this.themeColor, Math.floor(this.trenchWidth * this.xUnits * 100));
        
        // Translate & Scale
        context.translate(0, this.trenchYPosition - (this.trenchWidth * scale)/2);
        context.scale(scale, scale);
        
        // Base fill for the trench
        const trenchX = 0;
        const trenchY = 0.05; 
        const trenchW = this.xUnits / scale;
        const trenchH = this.trenchWidth;

        context.fillStyle = this.themeColor.withBrightness(-0.3).toRGBAString();
        context.fillRect(trenchX, trenchY, trenchW, trenchH);

        // Draw equipment inside the trench
        equipment.draw(context, rng);

        // Inner Shadow (Linear Gradient for Recessed Look)
        // Drawn AFTER equipment so it casts shadow OVER the equipment
        context.save();
        // Clip to trench to ensure gradients don't bleed out
        context.beginPath();
        context.rect(trenchX, trenchY, trenchW, trenchH);
        context.clip();

        // Draw equipment inside the trench
        equipment.draw(context, rng);

        // Inner Shadow (Linear Gradient for Recessed Look)
        // Drawn AFTER equipment so it casts shadow OVER the equipment
        context.save();
        // Clip to trench to ensure gradients don't bleed out
        context.beginPath();
        context.rect(trenchX, trenchY, trenchW, trenchH);
        context.clip();

        // Top Shadow (Depth from top edge + Ambient Occlusion)
        const shadowDepth = trenchH; // Full height gradient
        
        const gradTop = context.createLinearGradient(trenchX, trenchY, trenchX, trenchY + shadowDepth);
        gradTop.addColorStop(0, 'rgba(0,0,0,0.7)'); // Deep shadow from top lip
        gradTop.addColorStop(1, 'rgba(0,0,0,0.3)'); // Ambient darkness at bottom
        context.fillStyle = gradTop;
        context.fillRect(trenchX, trenchY, trenchW, shadowDepth);

        context.restore();
        
        context.restore();
        
        context.restore();
    }
}