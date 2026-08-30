import { HSBAColor, RNG } from '../greebles/common.js';
import { ShipComponent } from './ShipComponent.js';
import { UnifiedTrunkComponent } from './UnifiedTrunkComponent.js';
import type { ShipArchetype } from './shipTypes.js';

export class CompositeShipRingPlanner {
    addRings(
        finalComponents: Array<ShipComponent | UnifiedTrunkComponent>,
        drawList: ShipComponent[],
        themeColor: HSBAColor,
        rng: RNG,
        archetype: ShipArchetype,
        centerY: number,
        lightColors: HSBAColor[]
    ): void {
        if (archetype !== 'science' && archetype !== 'passenger') return;

        const trunkHulls = drawList.filter(c => c.type === 'hull' && c.isTrunk);
        const ringCount = this.chooseRingCount(rng);
        if (ringCount === 0 || trunkHulls.length === 0) return;

        const indices = new Set<number>();
        while (indices.size < ringCount && indices.size < trunkHulls.length) {
            indices.add(Math.floor(rng.range(0, trunkHulls.length)));
        }

        indices.forEach(idx => {
            const targetHull = trunkHulls[idx];
            const ringH = targetHull.bounds.h * 2.2;
            const ringW = ringH * 0.15;
            const ringX = targetHull.bounds.x + targetHull.bounds.w / 2 - ringW / 2;
            const ringY = targetHull.bounds.y + targetHull.bounds.h / 2 - ringH / 2;

            const ringComp = new ShipComponent({
                bounds: { x: ringX, y: ringY, w: ringW, h: ringH },
                zIndex: 1000,
                type: 'ring',
                color: themeColor.withBrightness(-0.2),
                rng,
                shipArchetype: archetype,
                shipCenterY: centerY,
                lightColors,
            });
            finalComponents.push(ringComp);
        });
    }

    private chooseRingCount(rng: RNG): number {
        const roll = rng.next();
        if (roll < 0.6) return 0;
        if (roll < 0.9) return 1;
        return 2;
    }
}
