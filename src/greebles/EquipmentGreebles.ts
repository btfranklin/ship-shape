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
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 0.01; 
        ctx.shadowOffsetX = 0.015; 
        ctx.shadowOffsetY = 0.015;

        const size = Math.min(w, h);
        const cx = x + w/2 - size/2;
        const cy = y + h/2 - size/2;
        
        if (rng.bool(0.25)) {
            this.drawVents(ctx, cx, cy, size, size, rng);
        } else {
            this.drawItemRecursive(ctx, cx, cy, size, size, rng);
        }
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
            
            if (rng.bool(0.25)) {
                this.drawVents(ctx, ix + inset, iy + inset, size - inset*2, size - inset*2, rng);
            } else {
                this.drawItemRecursive(ctx, ix + inset, iy + inset, size - inset*2, size - inset*2, rng);
            }
        }
        ctx.restore();
    }

    private drawVents(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rng: RNG) {
        // 1. Base Rect
        ctx.fillStyle = this.themeColor.toRGBAString();
        ctx.lineWidth = 0.001;
        ctx.strokeStyle = 'black';
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        
        // 2. Inset Black Rect
        const inset = 0.02;
        const ix = x + inset;
        const iy = y + inset;
        const iw = w - inset*2;
        const ih = h - inset*2;
        
        if (iw <= 0 || ih <= 0) return;
        
        ctx.fillStyle = 'black';
        ctx.fillRect(ix, iy, iw, ih);
        
        // 3. Slats
        ctx.fillStyle = this.themeColor.toRGBAString();
        ctx.shadowColor = 'transparent'; // No shadow in original Swift code for slats
        
        const horizontal = rng.bool();
        const slatWidth = 0.01;
        const gap = 0.01; // Stride is 0.02 (0.01 slat + 0.01 gap)
        
        if (horizontal) {
            // Draw vertical slats across the horizontal width? 
            // Swift code: if horizontal, iterates slatX. So vertical lines.
            // Wait, Swift: `rect.orientation == .horizontal`.
            // If rect is wider than tall, usually horizontal.
            // If horizontal, it draws slats at `slatX`. `CGRect(x: slatX... width: 0.01, height: height)`.
            // So horizontal vent has VERTICAL slats (like a fence).
            
            // Ensure we cover the inset area
            for (let sx = ix; sx < ix + iw; sx += (slatWidth + gap)) {
                // Clip the last slat if it exceeds
                const curW = Math.min(slatWidth, ix + iw - sx);
                ctx.fillRect(sx, iy, curW, ih);
            }
        } else {
            // Vertical vent has HORIZONTAL slats (like a shutter)
            for (let sy = iy; sy < iy + ih; sy += (slatWidth + gap)) {
                const curH = Math.min(slatWidth, iy + ih - sy);
                ctx.fillRect(ix, sy, iw, curH);
            }
        }
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
        const trenchX = 0;
        const trenchY = this.trenchYPosition;
        const trenchW = this.xUnits;
        const trenchH = this.trenchWidth;

        if (trenchW <= 0 || trenchH <= 0) {
            context.restore();
            return;
        }

        // Base fill for the trench
        context.fillStyle = this.themeColor.withBrightness(-0.3).toRGBAString();
        context.fillRect(trenchX, trenchY, trenchW, trenchH);

        // Clip to trench area for equipment and inner shadowing
        context.save();
        context.beginPath();
        context.rect(trenchX, trenchY, trenchW, trenchH);
        context.clip();

        const detailScale = 0.1;
        const equipmentCount = Math.floor(trenchW * trenchH * 1000);
        if (equipmentCount > 0) {
            const equipment = new EquipmentGreebles(
                trenchW / detailScale,
                trenchH / detailScale,
                this.themeColor,
                equipmentCount
            );
            context.save();
            context.translate(trenchX, trenchY);
            context.scale(detailScale, detailScale);
            equipment.draw(context, rng);
            context.restore();
        }

        // Inset shading to match window panel recess
        const shadeDepth = Math.min(0.05, trenchH * 0.3);
        const gradTop = context.createLinearGradient(trenchX, trenchY, trenchX, trenchY + shadeDepth);
        gradTop.addColorStop(0, 'rgba(0,0,0,0.8)');
        gradTop.addColorStop(1, 'rgba(0,0,0,0)');
        context.fillStyle = gradTop;
        context.fillRect(trenchX, trenchY, trenchW, shadeDepth);

        const gradLeft = context.createLinearGradient(trenchX, trenchY, trenchX + shadeDepth, trenchY);
        gradLeft.addColorStop(0, 'rgba(0,0,0,0.8)');
        gradLeft.addColorStop(1, 'rgba(0,0,0,0)');
        context.fillStyle = gradLeft;
        context.fillRect(trenchX, trenchY, shadeDepth, trenchH);

        context.restore(); // End clip
        context.restore();
    }
}
