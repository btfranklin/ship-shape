import type { RNG } from '../../greebles/common.js';
import { UNIT_SCALE } from '../../greebles/constants.js';
import type { ShipComponent } from '../ShipComponent.js';

export function drawClippedSurfaceGreebles(
    context: CanvasRenderingContext2D,
    component: ShipComponent,
    rng: RNG
): void {
    context.save();
    context.clip(component.shapePath);
    context.translate(component.bounds.x, component.bounds.y);
    context.scale(UNIT_SCALE, UNIT_SCALE);
    component.greebles.draw(context, rng, { skipEmissive: true });
    context.restore();
}

export function drawDeferredEmissiveGreebles(
    context: CanvasRenderingContext2D,
    component: ShipComponent,
    rng: RNG
): void {
    context.save();
    context.clip(component.shapePath);
    context.translate(component.bounds.x, component.bounds.y);
    context.scale(UNIT_SCALE, UNIT_SCALE);
    component.greebles.drawEmissive(context, rng, { clipPath: component.shapePath });
    context.restore();
}

export function drawInnerBevel(
    context: CanvasRenderingContext2D,
    component: ShipComponent
): void {
    context.save();
    context.clip(component.shapePath);
    context.strokeStyle = 'rgba(255,255,255,0.15)';
    context.lineWidth = 4;
    context.stroke(component.shapePath);
    context.restore();
}

export function drawOuterOutline(
    context: CanvasRenderingContext2D,
    component: ShipComponent
): void {
    context.strokeStyle = 'rgba(0,0,0,0.8)';
    context.lineWidth = 1;
    context.stroke(component.shapePath);
}
