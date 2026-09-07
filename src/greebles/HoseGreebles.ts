import { HSBAColor, RNG, getPath2D } from './common.js';
import type { Drawable } from './common.js';

export class HoseGreebles implements Drawable {
    constructor(
        public xUnits: number,
        public yUnits: number,
        public themeColor: HSBAColor,
        public hoseCount: number,
        public allowOffSide: boolean = true
    ) {}

    draw(context: CanvasRenderingContext2D, rng: RNG): void {
        context.save();
        
        // 1. Generate Hoses
        const hoses = [];
        for (let i = 0; i < this.hoseCount; i++) {
            hoses.push(this.generateHose(rng));
        }

        // 2. Draw Endpoints (Fixtures)
        const fixtureColor = this.themeColor.adjustSaturation(-0.25).toRGBAString();
        const endpointRadius = 0.025;

        context.lineWidth = 0.003;
        context.strokeStyle = 'black';
        context.fillStyle = fixtureColor;

        for (const hose of hoses) {
            for (const pt of hose.endPoints) {
                context.beginPath();
                context.ellipse(pt.x, pt.y, endpointRadius, endpointRadius, 0, 0, Math.PI * 2);
                context.fill();
                context.stroke();
                
                // Add a smaller inner ring to define the fixture center.
                context.beginPath();
                context.ellipse(pt.x, pt.y, endpointRadius * 0.5, endpointRadius * 0.5, 0, 0, Math.PI * 2);
                context.stroke();
            }
        }

        // 3. Draw Hoses
        // Shadow
        context.shadowOffsetX = 0.005;
        context.shadowOffsetY = 0.005;
        context.shadowBlur = 0.005;
        context.shadowColor = 'rgba(0,0,0,0.5)';

        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.lineWidth = 0.025; // Thinner hose
        context.strokeStyle = this.themeColor.adjustBrightness(-0.4).toRGBAString();

        for (const hose of hoses) {
            context.stroke(hose.path);
        }

        context.restore();
    }

    private generateHose(rng: RNG): { path: Path2D, endPoints: {x:number, y:number}[] } {
        const Path2D = getPath2D();
        let margin = -0.3;
        if (!this.allowOffSide) {
            // Safe margin, proportional for small units
            margin = Math.min(0.1, Math.min(this.xUnits, this.yUnits) * 0.1);
        }

        const minX = margin, maxX = this.xUnits - margin;
        const minY = margin, maxY = this.yUnits - margin;

        const spanLimit = Math.min(maxX - minX, maxY - minY);
        const maxSpan = Math.min(0.45, spanLimit * 0.9);
        const minSpan = Math.min(0.12, maxSpan * 0.6);

        let start = { x: rng.range(minX, maxX), y: rng.range(minY, maxY) };
        let end = { x: rng.range(minX, maxX), y: rng.range(minY, maxY) };
        const tries = 12;

        for (let i = 0; i < tries; i++) {
            start = { x: rng.range(minX, maxX), y: rng.range(minY, maxY) };
            const angle = rng.range(0, Math.PI * 2);
            const span = rng.range(minSpan, maxSpan);
            end = { x: start.x + Math.cos(angle) * span, y: start.y + Math.sin(angle) * span };
            if (end.x >= minX && end.x <= maxX && end.y >= minY && end.y <= maxY) {
                break;
            }
        }

        end = {
            x: Math.max(minX, Math.min(maxX, end.x)),
            y: Math.max(minY, Math.min(maxY, end.y))
        };

        const path = new Path2D();
        path.moveTo(start.x, start.y);

        // Control points within the bounding box of start/end
        const cMinX = Math.min(start.x, end.x);
        const cMaxX = Math.max(start.x, end.x);
        const cMinY = Math.min(start.y, end.y);
        const cMaxY = Math.max(start.y, end.y);

        const cp1 = { x: rng.range(cMinX, cMaxX), y: rng.range(cMinY, cMaxY) };
        const cp2 = { x: rng.range(cMinX, cMaxX), y: rng.range(cMinY, cMaxY) };

        path.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);

        return { path, endPoints: [start, end] };
    }
}
