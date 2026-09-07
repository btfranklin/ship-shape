import { drawDamagedRings, drawRingBacks } from './ringDamage.js';
import { getPath2D, RNG } from '../greebles/common.js';
import type { ShipComponent } from './ShipComponent.js';
import type { UnifiedTrunkComponent } from './UnifiedTrunkComponent.js';
import { withShipPower } from './renderPower.js';
import { clipOutsideDamage, drawDamageEdges, drawDamageInterior, planShipDamage } from './shipDamage.js';

export type ShipCondition = 'normal' | 'ghost' | 'derelict';

export interface ShipRenderOptions {
    condition?: ShipCondition;
    damageSeed?: number;
    /** Fraction of the ship length to cut from the selected end, from 0 to 0.95. */
    cutAway?: number;
    /** Start at the rear engine end instead of the forward end. */
    cutFromRear?: boolean;
}

/** Draw generated components in order. Damage does not change the components. */
export function drawCapitalShip(
    ctx: CanvasRenderingContext2D,
    components: readonly (ShipComponent | UnifiedTrunkComponent)[],
    rng: RNG,
    { condition = 'normal', damageSeed = 0, cutAway = 0.5, cutFromRear = false }: ShipRenderOptions = {}
): void {
    if (!Number.isFinite(cutAway) || cutAway < 0 || cutAway > 0.95) {
        throw new RangeError('cutAway must be between 0 and 0.95.');
    }
    if (components.length === 0) return;
    ctx.save();
    try {
        withShipPower(ctx, condition === 'normal', () => {
            if (condition !== 'derelict') {
                for (const component of components) component.draw(ctx, rng);
                return;
            }
            const rings = components.filter((component): component is ShipComponent => 'type' in component && component.type === 'ring');
            const body = components.filter(component => !('type' in component) || component.type !== 'ring');
            if (body.length === 0) return;
            const x = Math.min(...body.map(c => c.bounds.x));
            const y = Math.min(...body.map(c => c.bounds.y));
            const bounds = {
                x, y,
                w: Math.max(...body.map(c => c.bounds.x + c.bounds.w)) - x,
                h: Math.max(...body.map(c => c.bounds.y + c.bounds.h)) - y
            };
            const damageRng = new RNG(damageSeed);
            const supportHulls = body.filter(c => !('type' in c) || c.type === 'hull');
            const hulls = supportHulls.map(c => c.bounds);
            const damage = planShipDamage(bounds, hulls, damageRng, cutAway, cutFromRear);
            const Path = getPath2D();
            const silhouette = new Path();
            for (const component of body) silhouette.addPath(component.shapePath);
            drawRingBacks(ctx, rings, supportHulls, damage, rng);
            drawDamageInterior(ctx, damage, silhouette, bounds, damageRng);
            ctx.save();
            try {
                clipOutsideDamage(ctx, damage, bounds);
                for (const component of body) component.draw(ctx, rng);
            } finally {
                ctx.restore();
            }
            drawDamageEdges(ctx, damage, silhouette, bounds, damageRng);
            drawDamagedRings(ctx, rings, supportHulls, damage, bounds, damageRng, rng);
        });
    } finally {
        ctx.restore();
    }
}
