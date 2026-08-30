import { RNG, getPath2D } from '../../greebles/common.js';
import { ShipComponent } from '../ShipComponent.js';
import { ComponentRenderer, ComponentShape } from './ComponentRenderer.js';

export class RingRenderer implements ComponentRenderer {
    generateShape(component: ShipComponent, _rng: RNG): ComponentShape {
        const Path2D = getPath2D();
        const p = new Path2D();
        const { x, y, w, h } = component.bounds;
        
        // Flattened Pill Shape
        // Matches curvature of 0.2*w control point -> 0.1*w visual peak
        const capHeight = w * 0.1;
        const cpOffset = w * 0.2;

        p.moveTo(x, y + capHeight); // Top-Left of straight side
        // Top Cap (Curve Up)
        // Control point is above the baseline by cpOffset.
        // Baseline is y+capHeight. CP Y = y + capHeight - cpOffset.
        // Peak Y = y + capHeight - 0.5*cpOffset = y + 0.1w - 0.1w = y. Perfect.
        p.quadraticCurveTo(x + w/2, y + capHeight - cpOffset, x + w, y + capHeight);
        
        p.lineTo(x + w, y + h - capHeight); // Right side down
        
        // Bottom Cap (Curve Down)
        p.quadraticCurveTo(x + w/2, y + h - capHeight + cpOffset, x, y + h - capHeight);
        
        p.closePath();
        return { path: p };
    }

    draw(ctx: CanvasRenderingContext2D, component: ShipComponent, _rng: RNG): void {
        // 1. Volume Fill (Cylindrical Gradient)
        // Top Dark -> Mid Light -> Bottom Dark
        const grad = ctx.createLinearGradient(component.bounds.x, component.bounds.y, component.bounds.x, component.bounds.y + component.bounds.h);
        const base = component.color;
        
        grad.addColorStop(0, base.withBrightness(-0.4).toRGBAString()); // Top Shadow
        grad.addColorStop(0.1, base.withBrightness(-0.2).toRGBAString()); 
        grad.addColorStop(0.5, base.withBrightness(0.3).toRGBAString()); // Mid Highlight
        grad.addColorStop(0.9, base.withBrightness(-0.2).toRGBAString());
        grad.addColorStop(1, base.withBrightness(-0.4).toRGBAString()); // Bottom Shadow

        ctx.fillStyle = grad;
        ctx.fill(component.shapePath);

        // 2. Draw Segmented Pattern
        ctx.save();
        ctx.clip(component.shapePath);
        
        const { x, y, w, h } = component.bounds;
        
        const capHeight = w * 0.1;
        const centerY = y + h / 2;
        const effectiveRadius = (h - 2 * capHeight) / 2; // Radius of the straight section distribution
        
        // Draw Segments
        const segmentCount = 12;
        const angleStep = Math.PI / segmentCount;
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = base.withBrightness(-0.3).toRGBAString(); // Divider color
        
        // Iterate angles from -PI/2 (top) to PI/2 (bottom)
        for (let i = 1; i < segmentCount; i++) {
            const angle = -Math.PI / 2 + i * angleStep;
            
            // Y position of the *endpoints* (on the straight sides)
            const yOffset = effectiveRadius * Math.sin(angle);
            const drawY = centerY + yOffset;
            
            // Curvature Control Point Offset
            // Matches generateShape: 0.2 * w at max
            const curveAmount = w * 0.2 * Math.sin(angle); 

            ctx.beginPath();
            ctx.moveTo(x, drawY);
            ctx.quadraticCurveTo(x + w / 2, drawY + curveAmount, x + w, drawY);
            ctx.stroke();
            
            // Highlight
            const segHighlight = base.withBrightness(0.1).withAlpha(0.3).toRGBAString();
            ctx.beginPath();
            ctx.moveTo(x, drawY - 2);
            ctx.quadraticCurveTo(x + w / 2, drawY + curveAmount - 2, x + w, drawY - 2);
            ctx.strokeStyle = segHighlight;
            ctx.stroke();
        }

        ctx.restore();
        
        // 3. Inner Highlight/Bevel
        ctx.save();
        ctx.clip(component.shapePath);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 4;
        ctx.stroke(component.shapePath);
        ctx.restore();

        // 4. Outer Stroke
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 1;
        ctx.stroke(component.shapePath);
    }
}
