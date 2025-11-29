import { RNG, UNIT_SCALE } from '../../greebler/common.js';
import { ShipComponent } from '../ShipComponent.js';
import { ComponentRenderer } from './ComponentRenderer.js';

export class HullRenderer implements ComponentRenderer {
    generateShape(component: ShipComponent, rng: RNG): void {
        const p = new Path2D();
        const { x, y, w, h } = component.bounds;
        
        // Check for specific variants
        if (component.variant === 'taper-top') {
            // Taper Upwards
            const taperX = w * rng.range(0.15, 0.3);
            p.moveTo(x, y + h); // Bottom Left
            p.lineTo(x + w, y + h); // Bottom Right
            p.lineTo(x + w - taperX, y); // Top Right (In)
            p.lineTo(x + taperX, y); // Top Left (In)
            p.closePath();
            component.shapePath = p;
            return;
        } 
        
        if (component.variant === 'taper-bottom') {
            // Taper Downwards
            const taperX = w * rng.range(0.15, 0.3);
            p.moveTo(x, y); // Top Left
            p.lineTo(x + w, y); // Top Right
            p.lineTo(x + w - taperX, y + h); // Bottom Right (In)
            p.lineTo(x + taperX, y + h); // Bottom Left (In)
            p.closePath();
            component.shapePath = p;
            return;
        }

        if (component.variant === 'taper-front') {
            // Taper towards the Right (Front)
            // Trapezoid
            const taperY = h * rng.range(0.15, 0.3); // Symmetrical taper
            p.moveTo(x, y); // Top Left
            p.lineTo(x + w, y + taperY); // Top Right (Down)
            p.lineTo(x + w, y + h - taperY); // Bottom Right (Up)
            p.lineTo(x, y + h); // Bottom Left
            p.closePath();
            component.shapePath = p;
            return;
        }

        // Default: Hull specific shapes - Any combination of corners can be cropped
        // Each crop can have variable depth and angle (independent X/Y cut size)
        const cutProbability = 0.5; // 50% chance for each corner to be cut
        const minDim = Math.min(w, h);
        const minCut = minDim * 0.1;
        const maxCut = minDim * 0.4; // Max 40% to prevent overlap

        // Helper to get independent X/Y cuts if corner is selected
        const getCut = (): { cx: number, cy: number } | null => {
            if (!rng.bool(cutProbability)) return null;
            const cxVal = rng.range(minCut, maxCut);
            // Bias cy to be smaller than cx for shallower angles along top/bottom edges
            const cyVal = rng.range(minCut, Math.min(maxCut, cxVal * rng.range(0.3, 0.7))); // Cy is smaller than cx
            return {
                cx: cxVal,
                cy: cyVal
            };
        };

        const cutTL = getCut(); // Top-Left
        const cutTR = getCut(); // Top-Right
        const cutBR = getCut(); // Bottom-Right
        const cutBL = getCut(); // Bottom-Left

        // Capture Left Edge Limits for Engine Alignment
        let leftMinY = y;
        let leftMaxY = y + h;
        if (cutTL) leftMinY += cutTL.cy;
        if (cutBL) leftMaxY -= cutBL.cy;
        component.leftEdge = { minY: leftMinY, maxY: leftMaxY };

        // Start from Top-Left corner
        if (cutTL) {
            p.moveTo(x, y + cutTL.cy);
            p.lineTo(x + cutTL.cx, y);
        } else {
            p.moveTo(x, y);
        }

        // Go to Top-Right
        if (cutTR) {
            p.lineTo(x + w - cutTR.cx, y);
            p.lineTo(x + w, y + cutTR.cy);
        } else {
            p.lineTo(x + w, y);
        }

        // Go to Bottom-Right
        if (cutBR) {
            p.lineTo(x + w, y + h - cutBR.cy);
            p.lineTo(x + w - cutBR.cx, y + h);
        } else {
            p.lineTo(x + w, y + h);
        }

        // Go to Bottom-Left
        if (cutBL) {
            p.lineTo(x + cutBL.cx, y + h);
            p.lineTo(x, y + h - cutBL.cy);
        } else {
            p.lineTo(x, y + h);
        }

        p.closePath();
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

        // 2b. Lighting Overlays
        // Hulls always get top-down lighting
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

        // Vertical: Top (Light) -> Bottom (Shadow)
        const shadowGrad = ctx.createLinearGradient(component.bounds.x, component.bounds.y, component.bounds.x, component.bounds.y + component.bounds.h);
        const lightGrad = ctx.createLinearGradient(component.bounds.x, component.bounds.y, component.bounds.x, component.bounds.y + component.bounds.h);

        if (component.invertLighting) {
            // Inverted: Shadow at Top, Highlight at Bottom
            shadowGrad.addColorStop(0, 'rgba(0,0,0,0.6)');
            shadowGrad.addColorStop(0.6, 'rgba(0,0,0,0)');
            
            lightGrad.addColorStop(0.6, 'rgba(255,255,255,0)');
            lightGrad.addColorStop(1, 'rgba(255,255,255,0.2)');
        } else {
            // Normal: Highlight Top, Shadow Bottom
            shadowGrad.addColorStop(0.4, 'rgba(0,0,0,0)');
            shadowGrad.addColorStop(1, 'rgba(0,0,0,0.6)');
            
            lightGrad.addColorStop(0, 'rgba(255,255,255,0.2)');
            lightGrad.addColorStop(0.4, 'rgba(255,255,255,0)');
        }

        ctx.fillStyle = shadowGrad;
        ctx.fill(component.shapePath);

        ctx.fillStyle = lightGrad;
        ctx.fill(component.shapePath);

        ctx.restore();
    }
}
