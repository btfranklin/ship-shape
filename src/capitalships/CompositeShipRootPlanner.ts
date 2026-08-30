import { HSBAColor, RNG } from '../greebles/common.js';
import { ShipComponent } from './ShipComponent.js';
import type { ShipNode } from './compositeTypes.js';
import type { ShipArchetype } from './shipTypes.js';

export class CompositeShipRootPlanner {
    createRoot(
        width: number,
        scaleH: number,
        themeColor: HSBAColor,
        rng: RNG,
        archetype: ShipArchetype,
        centerY: number,
        lightColors: HSBAColor[]
    ): ShipNode {
        const engineStyle = this.chooseEngineStyle(rng);
        const [wMultMin, wMultMax] = engineStyle === 'standard'
            ? [0.03, 0.05]
            : [0.05, 0.08];

        const engineW = width * rng.range(wMultMin, wMultMax);
        const engineH = scaleH * rng.range(0.25, 0.45);
        const engineX = width * 0.05;
        const engineY = centerY - engineH / 2;

        const rootComp = new ShipComponent({
            bounds: { x: engineX, y: engineY, w: engineW, h: engineH },
            zIndex: 10,
            type: 'engine',
            color: themeColor.withBrightness(-0.1),
            rng,
            shipArchetype: archetype,
            engineStyle,
            shipCenterY: centerY,
            lightColors,
        });

        return { component: rootComp, children: [] };
    }

    alignStandardEngineToFirstHull(rootNode: ShipNode, rng: RNG): void {
        const firstHullNode = rootNode.children.find(
            child => child.component.type === 'hull' && child.component.isTrunk
        );
        if (!firstHullNode) return;

        const engineComp = rootNode.component;
        if (engineComp.engineStyle !== 'standard') return;

        const hullComp = firstHullNode.component;
        const oldEngineH = engineComp.bounds.h;
        const oldEngineY = engineComp.bounds.y;

        let limitY = hullComp.bounds.y;
        let limitH = hullComp.bounds.h;

        if (hullComp.leftEdge) {
            limitY = hullComp.leftEdge.minY;
            limitH = hullComp.leftEdge.maxY - hullComp.leftEdge.minY;
        }

        const nextHeight = Math.min(oldEngineH, limitH);
        const nextY = limitY + (limitH - nextHeight) / 2;

        if (oldEngineH !== nextHeight || oldEngineY !== nextY) {
            engineComp.updateBounds({ h: nextHeight, y: nextY }, rng);
        }
    }

    private chooseEngineStyle(rng: RNG): 'standard' | 'radiator' | 'energy' {
        const roll = rng.next();
        if (roll < 0.75) return 'standard';
        if (roll < 0.875) return 'radiator';
        return 'energy';
    }
}
