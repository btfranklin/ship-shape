import { getPath2D, RNG } from '../greebles/common.js';
import type { ShipComponent } from './ShipComponent.js';
import type { UnifiedTrunkComponent } from './UnifiedTrunkComponent.js';
import { withShipPower } from './renderPower.js';
import { clipOutsideDamage, drawDamageEdges, drawDamageInterior, planShipDamage } from './shipDamage.js';

export type ShipCondition = 'normal' | 'ghost' | 'derelict';

export interface ShipRenderOptions {
    condition?: ShipCondition;
    damageSeed?: number;
    /** Fraction of the ship length to cut from the forward end, from 0 to 0.95. */
    cutAway?: number;
}

/** Draw generated components in order. Damage does not change the components. */
export function drawCapitalShip(
    ctx: CanvasRenderingContext2D,
    components: readonly (ShipComponent | UnifiedTrunkComponent)[],
    rng: RNG,
    { condition = 'normal', damageSeed = 0, cutAway = 0.5 }: ShipRenderOptions = {}
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
            const x = Math.min(...components.map(c => c.bounds.x));
            const y = Math.min(...components.map(c => c.bounds.y));
            const bounds = {
                x, y,
                w: Math.max(...components.map(c => c.bounds.x + c.bounds.w)) - x,
                h: Math.max(...components.map(c => c.bounds.y + c.bounds.h)) - y
            };
            const damageRng = new RNG(damageSeed);
            const hulls = components.filter(c => !('type' in c) || c.type === 'hull').map(c => c.bounds);
            const damage = planShipDamage(bounds, hulls, damageRng, cutAway);
            const Path = getPath2D();
            const silhouette = new Path();
            for (const component of components) silhouette.addPath(component.shapePath);
            drawDamageInterior(ctx, damage, silhouette, bounds, damageRng);
            ctx.save();
            try {
                clipOutsideDamage(ctx, damage, bounds);
                for (const component of components) component.draw(ctx, rng);
            } finally {
                ctx.restore();
            }
            drawDamageEdges(ctx, damage, silhouette, bounds, damageRng);
        });
    } finally {
        ctx.restore();
    }
}
