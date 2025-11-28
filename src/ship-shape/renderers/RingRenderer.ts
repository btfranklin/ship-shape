import { RNG, UNIT_SCALE } from '../../greebler/common.js';
import { ShipComponent } from '../ShipComponent.js';
import { ComponentRenderer } from './ComponentRenderer.js';

export class RingRenderer implements ComponentRenderer {
    generateShape(component: ShipComponent, rng: RNG): void {
        const p = new Path2D();
        const { x, y, w, h } = component.bounds;
        // Vertical stadium / pill shape
        const r = w / 2;
        p.arc(x + w/2, y + r, r, Math.PI, 0); // Top cap
        p.lineTo(x + w, y + h - r);
        p.arc(x + w/2, y + h - r, r, 0, Math.PI); // Bottom cap
        p.lineTo(x, y + r);
        p.closePath();
        component.shapePath = p;
    }

    draw(ctx: CanvasRenderingContext2D, component: ShipComponent, rng: RNG): void {
        if (!component.shapePath) return;

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

        // 2. Draw Greebles (Clipped)
        ctx.save();
        ctx.clip(component.shapePath);
        ctx.translate(component.bounds.x, component.bounds.y);
        ctx.scale(UNIT_SCALE, UNIT_SCALE);
        component.greebles.draw(ctx, rng);
        ctx.restore();
        
        // 3. Inner Highlight/Bevel
        ctx.save();
        ctx.clip(component.shapePath);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 4;
        ctx.stroke(component.shapePath);
        ctx.restore();

        // 4. Outer Stroke
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 1;
        ctx.stroke(component.shapePath);
    }
}
