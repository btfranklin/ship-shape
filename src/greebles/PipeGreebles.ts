import { HSBAColor, RNG } from './common.js';
import type { Drawable } from './common.js';

export class PipeGreebles implements Drawable {
    constructor(
        public xUnits: number,
        public yUnits: number,
        public themeColor: HSBAColor,
        public pipeCount: number,
        public allowOffSide: boolean = true
    ) {}

    draw(context: CanvasRenderingContext2D, rng: RNG): void {
        context.save();
        
        // Generate pipes
        const pipes = [];
        for (let i = 0; i < this.pipeCount; i++) {
            pipes.push(this.generatePipe(rng));
        }

        // Draw Endpoints first (underneath)
        const endpointRadius = 0.008; // Normalized scale
        const endpointFill = this.themeColor.adjustSaturation(-0.25).toRGBAString();

        for (const pipe of pipes) {
            if (!pipe || pipe.length < 2) continue;
            for (const pt of [pipe[0], pipe[pipe.length-1]]) {
                context.beginPath();
                context.ellipse(pt.x, pt.y, endpointRadius, endpointRadius, 0, 0, Math.PI*2);
                context.fillStyle = endpointFill;
                context.fill();
                context.lineWidth = 0.001;
                context.strokeStyle = 'black';
                context.stroke();
                
                // Inner rivet
                context.beginPath();
                context.ellipse(pt.x, pt.y, endpointRadius * 0.3, endpointRadius * 0.3, 0, 0, Math.PI*2);
                context.stroke();
            }
        }

        // Draw Pipes
        const pipeColor = this.themeColor.adjustSaturation(0.1).toRGBAString();
        let pipeNum = 0;
        
        for (const pipe of pipes) {
            if (!pipe || pipe.length < 2) continue;
            context.save();
            
            // Shadow (increasing height for stacked feel)
            context.shadowOffsetX = 0.003 + (pipeNum % 3) * 0.001;
            context.shadowOffsetY = 0.003 + (pipeNum % 3) * 0.001;
            context.shadowBlur = 0.003;
            context.shadowColor = 'rgba(0,0,0,0.6)';
            
            context.lineCap = 'round';
            context.lineJoin = 'round';
            
            // 1. Outline
            context.lineWidth = 0.01; // Pipe Thickness
            context.strokeStyle = 'black';
            context.beginPath();
            context.moveTo(pipe[0].x, pipe[0].y);
            for (let i=1; i<pipe.length; i++) context.lineTo(pipe[i].x, pipe[i].y);
            context.stroke();
            
            // 2. Inner Fill (Stroke on top of black outline)
            context.lineWidth = 0.007;
            context.shadowColor = 'transparent'; // No shadow for inner fill
            context.strokeStyle = pipeColor;
            context.stroke();
            
            context.restore();
            pipeNum++;
        }

        context.restore();
    }

    private generatePipe(rng: RNG): {x:number, y:number}[] {
        const margin = this.allowOffSide ? -0.1 : 0.1;
        const minX = margin, maxX = this.xUnits - margin;
        const minY = margin, maxY = this.yUnits - margin;
        
        let curr = { x: rng.range(minX, maxX), y: rng.range(minY, maxY) };
        const points = [curr];
        
        // 8-way movement
        const dirs = [
            {x:0, y:-1}, {x:1, y:-1}, {x:1, y:0}, {x:1, y:1}, 
            {x:0, y:1}, {x:-1, y:1}, {x:-1, y:0}, {x:-1, y:-1}
        ];
        
        let dirIdx = rng.intRange(0, 7);
        const segments = rng.intRange(2, 5);
        
        for (let i=0; i<segments; i++) {
            let len = rng.range(0.05, 0.2);
            const d = dirs[dirIdx];
            
            // Normalize diagonal distance
            const dist = (d.x !== 0 && d.y !== 0) ? len / Math.sqrt(2) : len;
            
            const next = { x: curr.x + d.x * dist, y: curr.y + d.y * dist };
            points.push(next);
            curr = next;
            
            // Turn 45 or 90 degrees
            const change = rng.choice([-2, -1, 1, 2]);
            dirIdx = (dirIdx + change + 8) % 8;
        }
        return points;
    }
}