import type { RNG } from '../../greebles/common.js';
import { UNIT_SCALE } from '../../greebles/constants.js';
import type {
    CapitalShipSurfaceGreebles,
    PreparedCapitalShipSurface
} from '../../greebles/CapitalShipSurfaceGreebles.js';

interface SurfaceGreebleComponent {
    readonly bounds: Readonly<{ x: number; y: number; w: number; h: number }>;
    readonly shapePath: Path2D;
    readonly greebles: CapitalShipSurfaceGreebles;
}

export function drawClippedSurfaceGreebles(
    context: CanvasRenderingContext2D,
    component: SurfaceGreebleComponent,
    rng: RNG
): PreparedCapitalShipSurface {
    const preparedSurface = component.greebles.prepare(rng);
    context.save();
    context.clip(component.shapePath);
    context.translate(component.bounds.x, component.bounds.y);
    context.scale(UNIT_SCALE, UNIT_SCALE);
    preparedSurface.drawBase(context);
    context.restore();
    return preparedSurface;
}

export function drawDeferredEmissiveGreebles(
    context: CanvasRenderingContext2D,
    component: SurfaceGreebleComponent,
    preparedSurface: PreparedCapitalShipSurface
): void {
    context.save();
    context.clip(component.shapePath);
    context.translate(component.bounds.x, component.bounds.y);
    context.scale(UNIT_SCALE, UNIT_SCALE);
    preparedSurface.drawEmissive(context, { clipPath: component.shapePath });
    context.restore();
}

export function drawInnerBevel(
    context: CanvasRenderingContext2D,
    component: SurfaceGreebleComponent
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
    component: SurfaceGreebleComponent
): void {
    context.strokeStyle = 'rgba(0,0,0,0.8)';
    context.lineWidth = 1;
    context.stroke(component.shapePath);
}
