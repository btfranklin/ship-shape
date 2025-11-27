import { HSBAColor, RNG } from './common.js';
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
        const fixtureColor = this.themeColor.withSaturation(-0.25).toRGBAString();
        const endpointRadius = 0.04;

        context.lineWidth = 0.003;
        context.strokeStyle = 'black';
        context.fillStyle = fixtureColor;

        for (const hose of hoses) {
            for (const pt of hose.endPoints) {
                context.beginPath();
                context.ellipse(pt.x, pt.y, endpointRadius, endpointRadius, 0, 0, Math.PI * 2);
                context.fill();
                context.stroke();
                
                // Inner detail (from Swift code implied double circle or just simple fixture)
                context.beginPath();
                context.ellipse(pt.x, pt.y, endpointRadius * 0.5, endpointRadius * 0.5, 0, 0, Math.PI * 2);
                context.stroke();
            }
        }

        // 3. Draw Hoses
        // Shadow
        context.shadowOffsetX = 0.01;
        context.shadowOffsetY = 0.01;
        context.shadowBlur = 0.01;
        context.shadowColor = 'rgba(0,0,0,0.5)';

        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.lineWidth = 0.05; // Thick hose
        context.strokeStyle = this.themeColor.withBrightness(-0.4).toRGBAString();

        for (const hose of hoses) {
            context.stroke(hose.path);
        }

        context.restore();
    }

    private generateHose(rng: RNG): { path: Path2D, endPoints: {x:number, y:number}[] } {
        const margin = this.allowOffSide ? -0.3 : 0.1;
        const minX = margin, maxX = this.xUnits - margin;
        const minY = margin, maxY = this.yUnits - margin;

        const start = { x: rng.range(minX, maxX), y: rng.range(minY, maxY) };
        const end = { x: rng.range(minX, maxX), y: rng.range(minY, maxY) };

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
