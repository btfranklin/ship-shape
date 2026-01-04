import { HSBAColor, RNG, getPath2D } from './common.js';
import type { Drawable } from './common.js';
import { WireGreebles } from './WireGreebles.js';

type ElectronicsPanelShape = 'rect' | 'parallelogram' | 'trapezoid' | 'trapezoid-invert';

export class ElectronicsPanelGreebles implements Drawable {
    public readonly type = 'tech' as const;

    constructor(
        public xUnits: number,
        public yUnits: number,
        public themeColor: HSBAColor,
        public boxCount: number = 1
    ) {}

    draw(context: CanvasRenderingContext2D, rng: RNG): void {
        context.save();
        for (let i = 0; i < this.boxCount; i++) {
            this.drawBox(context, rng);
        }
        context.restore();
    }

    private drawBox(context: CanvasRenderingContext2D, rng: RNG): void {
        const shape = this.createShape(rng);
        if (!shape) return;

        context.save();
        context.translate(shape.offset.x, shape.offset.y);

        const baseColor = this.themeColor.withBrightness(-0.25).toRGBAString();
        context.fillStyle = baseColor;
        context.strokeStyle = 'black';
        context.lineWidth = 0.003;
        context.fill(shape.path);
        context.stroke(shape.path);

        context.save();
        context.clip(shape.path);
        this.drawBaseLayer(context, shape.bounds, rng);
        this.drawWires(context, shape.bounds, rng);
        context.restore();

        context.restore();
    }

    private createShape(rng: RNG): {
        path: Path2D;
        bounds: { w: number; h: number };
        offset: { x: number; y: number };
    } | null {
        const span = Math.min(this.xUnits, this.yUnits);
        const minSize = span * 0.2625;
        const maxSize = span * 0.525;
        if (maxSize <= 0) return null;

        let w = rng.range(minSize, maxSize);
        let h = rng.range(minSize, maxSize);

        const shape = rng.choice<ElectronicsPanelShape>([
            'rect',
            'parallelogram',
            'trapezoid',
            'trapezoid-invert'
        ]);

        let slant = 0;
        let inset = 0;
        let shapeW = w;

        if (shape === 'parallelogram') {
            slant = rng.range(-0.25, 0.25) * w;
            shapeW = w + Math.abs(slant);
        } else if (shape === 'trapezoid') {
            inset = w * rng.range(0.1, 0.25);
            shapeW = w;
        } else if (shape === 'trapezoid-invert') {
            inset = w * rng.range(0.1, 0.25);
            shapeW = w + inset * 2;
        }

        const scale = Math.min(
            1,
            Math.min(this.xUnits / shapeW, this.yUnits / h) * 0.95
        );
        w *= scale;
        h *= scale;
        slant *= scale;
        inset *= scale;
        shapeW *= scale;

        if (shapeW <= 0 || h <= 0) return null;

        const offsetX = rng.range(0, Math.max(0, this.xUnits - shapeW));
        const offsetY = rng.range(0, Math.max(0, this.yUnits - h));

        const Path2D = getPath2D();
        const path = new Path2D();

        if (shape === 'rect') {
            path.moveTo(0, 0);
            path.lineTo(w, 0);
            path.lineTo(w, h);
            path.lineTo(0, h);
        } else if (shape === 'parallelogram') {
            if (slant >= 0) {
                path.moveTo(slant, 0);
                path.lineTo(slant + w, 0);
                path.lineTo(w, h);
                path.lineTo(0, h);
            } else {
                const offset = -slant;
                path.moveTo(0, 0);
                path.lineTo(w, 0);
                path.lineTo(w + offset, h);
                path.lineTo(offset, h);
            }
        } else if (shape === 'trapezoid') {
            path.moveTo(inset, 0);
            path.lineTo(w - inset, 0);
            path.lineTo(w, h);
            path.lineTo(0, h);
        } else {
            path.moveTo(0, 0);
            path.lineTo(w + inset * 2, 0);
            path.lineTo(w + inset, h);
            path.lineTo(inset, h);
        }

        path.closePath();

        return {
            path,
            bounds: { w: shapeW, h },
            offset: { x: offsetX, y: offsetY }
        };
    }

    private drawBaseLayer(context: CanvasRenderingContext2D, bounds: { w: number; h: number }, rng: RNG): void {
        const area = bounds.w * bounds.h;
        const rectCount = Math.max(6, Math.min(20, Math.floor(area * 80)));

        for (let i = 0; i < rectCount; i++) {
            const w = rng.range(bounds.w * 0.08, bounds.w * 0.35);
            const h = rng.range(bounds.h * 0.08, bounds.h * 0.35);
            const x = rng.range(0, Math.max(0, bounds.w - w));
            const y = rng.range(0, Math.max(0, bounds.h - h));

            const tone = this.themeColor
                .withBrightness(rng.range(-0.35, -0.05))
                .withSaturation(rng.range(-0.1, 0.05))
                .toRGBAString();
            context.fillStyle = tone;
            context.fillRect(x, y, w, h);
        }
    }

    private drawWires(context: CanvasRenderingContext2D, bounds: { w: number; h: number }, rng: RNG): void {
        const clusterCount = rng.intRange(3, 5);
        const wireCount = Math.max(6, Math.floor(bounds.w * bounds.h * 60));
        const wires = new WireGreebles(bounds.w, bounds.h, wireCount, undefined, clusterCount, false);
        wires.draw(context, rng);
    }
}
