import { HSBAColor, RNG } from './common.js';
import type { Drawable } from './common.js';

export class WireGreebles implements Drawable {
    constructor(
        public xUnits: number,
        public yUnits: number,
        public wireCount: number,
        public wireColors: HSBAColor[] = [
            HSBAColor.fromRGBA(128, 0, 0),    // Red
            HSBAColor.fromRGBA(0, 0, 128),    // Blue
            HSBAColor.fromRGBA(0, 128, 0),    // Green
            HSBAColor.fromRGBA(153, 153, 0),  // Yellow
            HSBAColor.fromRGBA(179, 102, 0),  // Orange
            HSBAColor.fromRGBA(0, 0, 0)       // Black
        ],
        public endPointPairCount: number = 1,
        public allowOffSide: boolean = true
    ) {}

    draw(context: CanvasRenderingContext2D, rng: RNG): void {
        context.save();
        
        // 1. Generate Clusters
        const margin = this.allowOffSide ? -0.3 : 0.1;
        const minX = margin, maxX = this.xUnits - margin;
        const minY = margin, maxY = this.yUnits - margin;
        
        const clusters = [];
        for (let i = 0; i < this.endPointPairCount; i++) {
            clusters.push({
                start: { x: rng.range(minX, maxX), y: rng.range(minY, maxY) },
                end: { x: rng.range(minX, maxX), y: rng.range(minY, maxY) }
            });
        }

        // 2. Generate Wires
        const wires = [];
        for (let i = 0; i < this.wireCount; i++) {
            const cluster = rng.choice(clusters);
            wires.push(this.generateWire(cluster, rng));
        }

        // 3. Draw Endpoints
        const endpointRadius = 0.005;
        context.fillStyle = 'black';
        context.strokeStyle = 'black';
        context.lineWidth = 0.003;

        for (const wire of wires) {
            for (const pt of wire.endPoints) {
                context.beginPath();
                context.ellipse(pt.x, pt.y, endpointRadius, endpointRadius, 0, 0, Math.PI * 2);
                context.fill();
                context.stroke();
            }
        }

        // 4. Draw Wires
        context.shadowOffsetX = 0.006;
        context.shadowOffsetY = -0.004;
        context.shadowBlur = 0.004;
        context.shadowColor = 'rgba(0,0,0,0.5)';
        
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.lineWidth = 0.005;

        for (const wire of wires) {
            const color = rng.choice(this.wireColors);
            context.strokeStyle = color.toRGBAString();
            context.stroke(wire.path);
        }

        context.restore();
    }

    private generateWire(cluster: {start:{x:number, y:number}, end:{x:number, y:number}}, rng: RNG): { path: Path2D, endPoints: {x:number, y:number}[] } {
        const jitter = 0.05;
        const start = { 
            x: cluster.start.x + rng.range(-jitter, jitter), 
            y: cluster.start.y + rng.range(-jitter, jitter) 
        };
        const end = { 
            x: cluster.end.x + rng.range(-jitter, jitter), 
            y: cluster.end.y + rng.range(-jitter, jitter) 
        };

        const path = new Path2D();
        path.moveTo(start.x, start.y);

        const cMinX = Math.min(cluster.start.x, cluster.end.x);
        const cMaxX = Math.max(cluster.start.x, cluster.end.x);
        const cMinY = Math.min(cluster.start.y, cluster.end.y);
        const cMaxY = Math.max(cluster.start.y, cluster.end.y);

        const cp = { x: rng.range(cMinX, cMaxX), y: rng.range(cMinY, cMaxY) };

        path.quadraticCurveTo(cp.x, cp.y, end.x, end.y);

        return { path, endPoints: [start, end] };
    }
}
