import { RNG } from '../greebler/common.js';

export interface Point { x: number; y: number; }

export interface ShipShapeData {
    polyPoints: Point[];
    width: number;
    height: number;
}

export class ShipShapeGenerator {
    constructor(public width: number, public height: number, private rng: RNG) {}

    generate(complexity: number): ShipShapeData {
        // We generate 'sideways' like the original logic (Left -> Right)
        // Then we can flip if needed, but let's stick to the horizontal logic requested.
        
        // Top Half (y < height/2)
        const topPoints = this.designHalf(complexity, 1);
        // Bottom Half (y > height/2)
        const bottomPoints = this.designHalf(complexity, -1);
        
        const centerY = this.height / 2;
        const points: Point[] = [];
        
        points.push({ x: 0, y: centerY });
        
        // Top
        topPoints.forEach(p => points.push({ x: p.x, y: centerY - p.y }));
        
        points.push({ x: this.width, y: centerY });
        
        // Bottom (Reverse)
        for (let i = bottomPoints.length - 1; i >= 0; i--) {
            const p = bottomPoints[i];
            if (p) {
                points.push({ x: p.x, y: centerY - p.y }); 
            }
        }
        
        return { polyPoints: points, width: this.width, height: this.height };
    }

    private designHalf(complexity: number, direction: number): Point[] {
        const points: Point[] = [];
        let currentX = 0;
        
        const minConn = (0.3 / (complexity + 1)) * this.width;
        const maxConn = (0.6 / (complexity + 1)) * this.width;
        
        for (let i = 0; i < complexity; i++) {
            // 1. Connector
            const hOffset = this.rng.range(minConn, maxConn);
            const vTarget = this.rng.range(0.1 * this.height, 0.5 * this.height) * direction;
            
            const destX = currentX + hOffset;
            
            // Add connector point
            points.push({ x: destX, y: vTarget });
            currentX = destX;
            
            // 2. Platform
            const remainingW = this.width - currentX;
            if (remainingW <= 0) break;
            
            const minPlat = (0.75 / complexity) * remainingW;
            const maxPlat = (0.95 / complexity) * remainingW;
            const platW = this.rng.range(minPlat, maxPlat);
            
            const platDestX = Math.min(this.width, currentX + platW);
            points.push({ x: platDestX, y: vTarget }); // Flat line
            
            currentX = platDestX;
        }
        
        return points;
    }
}
