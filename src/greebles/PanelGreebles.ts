import { HSBAColor, RNG } from './common.js';
import type { Drawable } from './common.js';

export class PanelGreebles implements Drawable {
    constructor(
        public xUnits: number,
        public yUnits: number,
        public themeColor: HSBAColor,
        public panelCount: number,
        public showRivets: boolean = false,
        public skipBaseFill: boolean = false
    ) {}

    draw(context: CanvasRenderingContext2D, rng: RNG): void {
        context.save();
        context.lineWidth = 0.001;
        context.strokeStyle = 'black';

        if (this.skipBaseFill) {
            context.globalCompositeOperation = 'multiply';
        }

        const rects = this.divideRect({ x: 0, y: 0, w: this.xUnits, h: this.yUnits }, this.panelCount, rng);

        for (const rect of rects) {
            if (this.skipBaseFill) {
                // Use simple semi-transparent overlays for variation, preserving underlying gradient
                const lightnessVar = rng.range(-0.1, 0.1);
                const overlayColor = lightnessVar > 0 ? `rgba(255,255,255,${lightnessVar})` : `rgba(0,0,0,${-lightnessVar})`;
                context.fillStyle = overlayColor;
            } else {
                const panelColor = this.themeColor.adjustSaturation(rng.range(-0.1, 0.1));
                context.fillStyle = panelColor.toRGBAString();
            }
            
            context.fillRect(rect.x, rect.y, rect.w, rect.h);
            
            // Always stroke
            context.globalCompositeOperation = 'source-over';
            context.strokeRect(rect.x, rect.y, rect.w, rect.h);
            if (this.skipBaseFill) context.globalCompositeOperation = 'multiply';

            if (this.showRivets && rect.w > 0.1 && rect.h > 0.1) {
                context.save();
                context.globalCompositeOperation = 'source-over';
                // Rivets - dashed line inset?
                context.lineWidth = 0.005;
                context.setLineDash([0.005, 0.1]);
                const inset = 0.02;
                context.strokeRect(rect.x + inset, rect.y + inset, rect.w - inset*2, rect.h - inset*2);
                context.restore();
            }
        }
        context.restore();
    }

    private divideRect(rect: {x:number, y:number, w:number, h:number}, count: number, rng: RNG): {x:number, y:number, w:number, h:number}[] {
        if (count <= 1) return [rect];

        const splitVert = rect.w > rect.h ? true : (rect.h > rect.w ? false : rng.bool());
        
        if (splitVert) {
            const splitX = rect.w * rng.range(0.3, 0.7);
            const r1 = { ...rect, w: splitX };
            const r2 = { ...rect, x: rect.x + splitX, w: rect.w - splitX };
            const c1 = Math.floor(count / 2);
            return [...this.divideRect(r1, c1, rng), ...this.divideRect(r2, count - c1, rng)];
        } else {
            const splitY = rect.h * rng.range(0.3, 0.7);
            const r1 = { ...rect, h: splitY };
            const r2 = { ...rect, y: rect.y + splitY, h: rect.h - splitY };
            const c1 = Math.floor(count / 2);
            return [...this.divideRect(r1, c1, rng), ...this.divideRect(r2, count - c1, rng)];
        }
    }
}
