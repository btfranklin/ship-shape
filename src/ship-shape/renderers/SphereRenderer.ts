import { RNG, getPath2D } from '../../greebler/common.js';
import { UNIT_SCALE } from '../../greebler/constants.js';
import { ShipComponent } from '../ShipComponent.js';
import { ComponentRenderer } from './ComponentRenderer.js';
import { SphereWindowsGreebles } from '../../greebler/SphereWindowsGreebles.js';
import { SphereLightGreebles } from '../../greebler/SphereLightGreebles.js';
import { CapitalShipWindowsGreebles } from '../../greebler/CapitalShipWindowsGreebles.js';

export class SphereRenderer implements ComponentRenderer {
    generateShape(component: ShipComponent, rng: RNG): void {
        const Path2D = getPath2D();
        const p = new Path2D();
        const { x, y, w, h } = component.bounds;
        // Assume w = diameter
        const radius = Math.min(w, h) / 2;
        p.arc(x + w/2, y + h/2, radius, 0, Math.PI * 2);
        component.shapePath = p;
    }

    draw(ctx: CanvasRenderingContext2D, component: ShipComponent, rng: RNG): void {
        if (!component.shapePath) return;
        
        const { x, y, w, h } = component.bounds;
        const cx = x + w/2;
        const cy = y + h/2;
        const r = Math.min(w, h) / 2;
        const isNose = component.variant === 'nose';
        const windowChance = 0.6;
        const hasRows = isNose || rng.bool(windowChance);
        const hasDots = rng.bool(isNose ? 0.6 : 0.45);
        const windowSeed = hasRows ? rng.intRange(1, 0x7fffffff) : 0;
        const dotSeed = hasDots ? rng.intRange(1, 0x7fffffff) : 0;
        const windowColor =
            component.shipArchetype === 'passenger' || component.shipArchetype === 'science'
                ? CapitalShipWindowsGreebles.BLUE_LIGHT
                : CapitalShipWindowsGreebles.AMBER_LIGHT;
        const windows = hasRows
            ? new SphereWindowsGreebles(
                w / UNIT_SCALE,
                h / UNIT_SCALE,
                component.color,
                windowColor,
                {
                    minRows: 1,
                    maxRows: 3,
                    forceFrontCrop: isNose
                }
            )
            : null;
        const lights = hasDots
            ? new SphereLightGreebles(
                w / UNIT_SCALE,
                h / UNIT_SCALE,
                component.lightColors,
                hasRows ? { minLights: 0, maxLights: 3 } : undefined
            )
            : null;

        // 1. Base Fill (Radial)
        const grad = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, r*0.1, cx, cy, r);
        const base = component.color;
        grad.addColorStop(0, base.withBrightness(0.3).toRGBAString()); 
        grad.addColorStop(0.5, base.withBrightness(-0.1).toRGBAString()); 
        grad.addColorStop(1, base.withBrightness(-0.2).toRGBAString()); 
        
        ctx.fillStyle = grad;
        ctx.fill(component.shapePath);
        
        // 2. Greebles (Clipped to sphere)
        ctx.save();
        ctx.clip(component.shapePath);
        ctx.translate(x, y);
        ctx.scale(UNIT_SCALE, UNIT_SCALE);
        component.greebles.draw(ctx, rng, { skipEmissive: true });
        if (windows) {
            windows.drawPanels(ctx, new RNG(windowSeed));
        }
        ctx.restore();
        
        // 3. Lighting Overlay (Radial Shadow/Highlight to reinforce 3D)
        ctx.save();
        ctx.clip(component.shapePath);
        
        const overlayGrad = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, r*0.1, cx, cy, r);
        // Light source top-left
        overlayGrad.addColorStop(0, 'rgba(255,255,255,0.2)'); 
        overlayGrad.addColorStop(0.5, 'rgba(0,0,0,0)'); 
        overlayGrad.addColorStop(1, 'rgba(0,0,0,0.3)'); // Deep shadow at edges
        
        ctx.fillStyle = overlayGrad;
        ctx.fill(component.shapePath);
        ctx.restore();
        
        ctx.save();
        ctx.clip(component.shapePath);
        ctx.translate(x, y);
        ctx.scale(UNIT_SCALE, UNIT_SCALE);
        component.greebles.drawEmissive(ctx, rng, { clipPath: component.shapePath });
        if (lights) {
            lights.draw(ctx, new RNG(dotSeed));
        }
        if (windows) {
            windows.drawLights(ctx, new RNG(windowSeed));
        }
        ctx.restore();
        
        // 4. Rim Stroke
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 1;
        ctx.stroke(component.shapePath);
    }
}
