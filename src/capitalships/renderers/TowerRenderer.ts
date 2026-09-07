import { RNG, getPath2D } from '../../greebles/common.js';
import { ShipComponent } from '../ShipComponent.js';
import { ComponentRenderer, ComponentShape } from './ComponentRenderer.js';
import {
    drawClippedSurfaceGreebles,
    drawDeferredEmissiveGreebles,
    drawInnerBevel,
    drawOuterOutline,
} from './componentPaintPasses.js';

export class TowerRenderer implements ComponentRenderer {
    generateShape(component: ShipComponent, rng: RNG): ComponentShape {
        const Path2D = getPath2D();
        const p = new Path2D();
        const { x, y, w, h } = component.bounds;
        
        // Towers are vertical structures.
        // Shapes: Rect, Taper-Top (Pyramid/Spire), Taper-Top-Right/Left (Angled)
        
        const shapeType = rng.choice(['rect', 'taper-top', 'cut-top']);
        
        switch (shapeType) {
            case 'rect':
                p.rect(x, y, w, h);
                break;
            case 'taper-top':
                // Symmetrical Taper
                const taperX = w * rng.range(0.1, 0.3); 
                p.moveTo(x, y + h); // Bottom Left
                p.lineTo(x + w, y + h); // Bottom Right
                p.lineTo(x + w - taperX, y); // Top Right
                p.lineTo(x + taperX, y); // Top Left
                p.closePath();
                break;
            case 'cut-top':
                // Cut corners at top
                const cut = w * 0.2;
                p.moveTo(x, y + h);
                p.lineTo(x + w, y + h);
                p.lineTo(x + w, y + cut);
                p.lineTo(x + w - cut, y);
                p.lineTo(x + cut, y);
                p.lineTo(x, y + cut);
                p.closePath();
                break;
        }
        return { path: p };
    }

    draw(ctx: CanvasRenderingContext2D, component: ShipComponent, rng: RNG): void {
        // 1. Volume Fill (Side Gradient)
        // Left (Light) -> Right (Shadow)
        const grad = ctx.createLinearGradient(component.bounds.x, component.bounds.y, component.bounds.x + component.bounds.w, component.bounds.y);
        const base = component.color;

        grad.addColorStop(0, base.adjustBrightness(0.2).toRGBAString()); // Highlight
        grad.addColorStop(0.6, base.adjustBrightness(-0.1).toRGBAString()); // Mid
        grad.addColorStop(1, base.adjustBrightness(-0.4).toRGBAString()); // Shadow

        ctx.fillStyle = grad;
        ctx.fill(component.shapePath);

        // 2. Draw Greebles (Clipped)
        const preparedSurface = drawClippedSurfaceGreebles(ctx, component, rng);

        // 2b. Lighting Overlays
        // Towers get Side Lighting (Shadow Right)
        this.drawLightingOverlay(ctx, component);
        drawDeferredEmissiveGreebles(ctx, component, preparedSurface);

        // 3. Inner Highlight (Bevel)
        drawInnerBevel(ctx, component);

        // 4. Outer Stroke
        drawOuterOutline(ctx, component);
    }

    private drawLightingOverlay(ctx: CanvasRenderingContext2D, component: ShipComponent) {
        ctx.save();
        ctx.clip(component.shapePath);

        // Horizontal: Left (Light) -> Right (Shadow)
        const shadowGrad = ctx.createLinearGradient(component.bounds.x, component.bounds.y, component.bounds.x + component.bounds.w, component.bounds.y);
        const lightGrad = ctx.createLinearGradient(component.bounds.x, component.bounds.y, component.bounds.x + component.bounds.w, component.bounds.y);

        // Shadow (End of gradient)
        shadowGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
        shadowGrad.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = shadowGrad;
        ctx.fill(component.shapePath);

        // Highlight (Start of gradient)
        lightGrad.addColorStop(0, 'rgba(255,255,255,0.2)');
        lightGrad.addColorStop(0.4, 'rgba(255,255,255,0)');
        ctx.fillStyle = lightGrad;
        ctx.fill(component.shapePath);

        ctx.restore();
    }
}
