import { HSBAColor, RNG } from '../greebles/common.js';
import type { ShipNode } from './compositeTypes.js';
import type { ShipComponent } from './ShipComponent.js';

export function createLightColors(rng: RNG): HSBAColor[] {
    const baseHue = rng.range(0, 1);
    const baseSat = rng.range(0.6, 1.0);
    const baseBright = rng.range(0.75, 1.0);
    const base = new HSBAColor(baseHue, baseSat, baseBright);
    const useMultiple = rng.bool(0.35);
    if (!useMultiple) return [base];

    const count = rng.bool(0.65) ? 2 : 3;
    const colors = [base];
    const hueOffsets = [0.08, 0.12, 0.18];
    for (let i = 1; i < count; i++) {
        const offset = rng.choice(hueOffsets) * (rng.bool() ? 1 : -1);
        const hue = (baseHue + offset + 1) % 1;
        const sat = Math.max(0.4, Math.min(1, baseSat + rng.range(-0.2, 0.2)));
        const bright = Math.max(0.6, Math.min(1, baseBright + rng.range(-0.15, 0.1)));
        colors.push(new HSBAColor(hue, sat, bright));
    }
    return colors;
}

export function traversePostOrder(node: ShipNode, callback: (component: ShipComponent) => void) {
    node.children.forEach(child => traversePostOrder(child, callback));
    callback(node.component);
}
