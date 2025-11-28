import { RNG, UNIT_SCALE } from '../../greebler/common.js';
import { ShipComponent } from '../ShipComponent.js';
import { ComponentRenderer } from './ComponentRenderer.js';

export class StandardComponentRenderer implements ComponentRenderer {
    generateShape(component: ShipComponent, rng: RNG): void {
        const p = new Path2D();
        const { x, y, w, h } = component.bounds;
        // const isTall = h > w; // Unused now

        let shapeType = 'rect';

        switch (component.type) {
            case 'trench':
                shapeType = 'rect';
                break;
            // case 'superstructure': REMOVED
            case 'sensor':
                shapeType = rng.choice(['taper-top', 'rect', 'cut-corner']);
                break;
            case 'tank':
                shapeType = 'chamfer';
                break;
            case 'weapon':
            default:
                shapeType = rng.choice(['rect', 'chamfer', 'taper-front', 'taper-back', 'cut-corner']);
                break;
        }

        switch (shapeType) {
            case 'rect':
                p.rect(x, y, w, h);
                break;
            case 'taper-top':
                const taperX = w * 0.25;
                p.moveTo(x, y + h);
                p.lineTo(x + w, y + h);
                p.lineTo(x + w - taperX, y);
                p.lineTo(x + taperX, y);
                p.closePath();
                break;
            case 'chamfer':
                const cSize = Math.min(w, h) * 0.2;
                p.moveTo(x + cSize, y);
                p.lineTo(x + w - cSize, y);
                p.lineTo(x + w, y + cSize);
                p.lineTo(x + w, y + h - cSize);
                p.lineTo(x + w - cSize, y + h);
                p.lineTo(x + cSize, y + h);
                p.lineTo(x, y + h - cSize);
                p.lineTo(x, y + cSize);
                p.closePath();
                break;
            case 'taper-front':
                const taper = h * 0.3;
                p.moveTo(x, y);
                p.lineTo(x + w, y + taper);
                p.lineTo(x + w, y + h - taper);
                p.lineTo(x, y + h);
                p.closePath();
                break;
            case 'taper-back':
                const taperB = h * 0.2;
                p.moveTo(x, y + taperB);
                p.lineTo(x + w, y);
                p.lineTo(x + w, y + h);
                p.lineTo(x, y + h - taperB);
                p.closePath();
                break;
            case 'cut-corner':
                const cut = Math.min(w, h) * 0.3;
                p.moveTo(x, y);
                p.lineTo(x + w - cut, y);
                p.lineTo(x + w, y + cut);
                p.lineTo(x + w, y + h);
                p.lineTo(x + cut, y + h);
                p.lineTo(x, y + h - cut);
                p.closePath();
                break;
        }
        component.shapePath = p;
    }

    draw(ctx: CanvasRenderingContext2D, component: ShipComponent, rng: RNG): void {
        if (!component.shapePath) return;

        // 1. Volume Fill (Gradient)
        // Light Top-Left to Dark Bottom-Right
        const grad = ctx.createLinearGradient(component.bounds.x, component.bounds.y, component.bounds.x + component.bounds.w, component.bounds.y + component.bounds.h);
        const base = component.color;

        grad.addColorStop(0, base.withBrightness(0.1).toRGBAString()); // Highlight
        grad.addColorStop(0.5, base.withBrightness(-0.2).toRGBAString()); // Mid
        grad.addColorStop(1, base.withBrightness(-0.5).toRGBAString()); // Shadow

        ctx.fillStyle = grad;
        ctx.fill(component.shapePath);

        // 2. Draw Greebles (Clipped)
        ctx.save();
        ctx.clip(component.shapePath);
        ctx.translate(component.bounds.x, component.bounds.y);
        ctx.scale(UNIT_SCALE, UNIT_SCALE);
        component.greebles.draw(ctx, rng);
        ctx.restore();

        // 2b. Lighting Overlays (Post-Greeble Volume)
        this.drawLightingOverlay(ctx, component);

        // 3. Inner Highlight (Bevel)
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

    private drawLightingOverlay(ctx: CanvasRenderingContext2D, component: ShipComponent) {
        if (!component.shapePath) return;
        ctx.save();
        ctx.clip(component.shapePath);

        // Determine Lighting Direction
        // Towers (Tall) get side lighting (Shadow Right)
        // Hulls (Wide) get top-down lighting (Shadow Bottom)
        // StandardComponentRenderer is mostly for Sensors/Weapons now
        const isTall = component.bounds.h > component.bounds.w;
        let shadowGrad, lightGrad;

        if (isTall) {
            // Horizontal: Left (Light) -> Right (Shadow)
            shadowGrad = ctx.createLinearGradient(component.bounds.x, component.bounds.y, component.bounds.x + component.bounds.w, component.bounds.y);
            lightGrad = ctx.createLinearGradient(component.bounds.x, component.bounds.y, component.bounds.x + component.bounds.w, component.bounds.y);
        } else {
            // Vertical: Top (Light) -> Bottom (Shadow)
            shadowGrad = ctx.createLinearGradient(component.bounds.x, component.bounds.y, component.bounds.x, component.bounds.y + component.bounds.h);
            lightGrad = ctx.createLinearGradient(component.bounds.x, component.bounds.y, component.bounds.x, component.bounds.y + component.bounds.h);
        }

        // Shadow (End of gradient)
        shadowGrad.addColorStop(0.4, 'rgba(0,0,0,0)');
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