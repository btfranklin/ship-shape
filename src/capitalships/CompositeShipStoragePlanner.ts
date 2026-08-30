import { HSBAColor, RNG } from '../greebles/common.js';
import { ComponentVariant, ShipComponent } from './ShipComponent.js';
import { ShipArchetype } from './shipTypes.js';
import type { ShipNode } from './compositeTypes.js';

export class CompositeShipStoragePlanner {
    addGlobalStorage(root: ShipNode, theme: HSBAColor, rng: RNG, archetype: ShipArchetype, shipCenterY: number, lightColors: HSBAColor[]) {
        const trunkHulls: ShipComponent[] = [];
        const collect = (node: ShipNode) => {
            if (node.component.type === 'hull' && node.component.isTrunk) {
                trunkHulls.push(node.component);
            }
            node.children.forEach(collect);
        };
        collect(root);
        trunkHulls.sort((a, b) => a.bounds.x - b.bounds.x);

        if (trunkHulls.length < 2) return;

        let i = 0;
        while (i < trunkHulls.length) {
            let chance = 0.0;
            if (archetype === 'freight') chance = 0.8;
            else if (archetype === 'industry') chance = 0.4;

            if (chance > 0 && rng.bool(chance)) {
                const spanCount = rng.intRange(1, Math.min(4, trunkHulls.length - i));
                
                const startHull = trunkHulls[i];
                const endHull = trunkHulls[i + spanCount - 1];
                
                const spanX = startHull.bounds.x;
                const spanRight = endHull.bounds.x + endHull.bounds.w;
                const spanW = spanRight - spanX;
                
                let minY = Infinity;
                let maxY = -Infinity;
                let minH = Infinity;
                
                for (let k = 0; k < spanCount; k++) {
                    const h = trunkHulls[i+k];
                    minY = Math.min(minY, h.bounds.y);
                    maxY = Math.max(maxY, h.bounds.y + h.bounds.h);
                    minH = Math.min(minH, h.bounds.h);
                }

                const isFace = archetype === 'freight' ? rng.bool(0.8) : rng.bool(0.5);
                
                if (isFace) {
                    const isVertical = rng.bool(); 
                    let storageW, storageH;
                    
                    const variant = rng.choice<ComponentVariant>([
                        'goods',
                        'liquid',
                        'default',
                        'sphere',
                    ]);

                    if (variant === 'sphere') {
                        const sizeMin = archetype === 'freight' ? 0.3 : 0.25;
                        const sizeMax = archetype === 'freight' ? 0.55 : 0.45;
                        storageH = minH * rng.range(sizeMin, sizeMax);
                        storageW = storageH * rng.range(0.9, 1.1);
                    } else if (isVertical) {
                        const sizeMin = archetype === 'freight' ? 0.6 : 0.5;
                        const sizeMax = archetype === 'freight' ? 0.95 : 0.8;
                        storageH = minH * rng.range(sizeMin, sizeMax);
                        storageW = storageH * rng.range(0.3, 0.5);
                    } else {
                        const sizeMin = archetype === 'freight' ? 0.25 : 0.2;
                        const sizeMax = archetype === 'freight' ? 0.5 : 0.4;
                        storageH = minH * rng.range(sizeMin, sizeMax);
                        storageW = storageH * rng.range(1.5, 2.5);
                    }
                    
                    if (variant === 'goods') {
                        if (isVertical) {
                            storageW = Math.max(storageW, storageH * 0.4);
                        } else {
                            storageW = Math.max(storageW, storageH * 2.0);
                        }
                    }
                    
                    const gap = storageW * 0.1;
                    let count = Math.floor((spanW + gap) / (storageW + gap));
                    
                    count = Math.min(count, 6);
                    if (count < 1) count = 1;
                    
                    const groupW = count * storageW + (count - 1) * gap;
                    const startX = spanX + (spanW - groupW) / 2;
                    const baseY = shipCenterY - storageH / 2;
                    const rowGap = storageH * 0.15;
                    const availableHeight = maxY - minY;
                    const maxRows = Math.max(1, Math.floor((availableHeight + rowGap) / (storageH + rowGap)));
                    let desiredRows = 1;
                    if (archetype === 'freight') {
                        desiredRows = rng.bool(0.1) ? 2 : 1;
                    }
                    const rowCount = Math.min(desiredRows, maxRows);

                    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
                        const offset =
                            (rowIndex - (rowCount - 1) / 2) * (storageH + rowGap);
                        const y = baseY + offset;
                        if (y < minY || y + storageH > maxY) continue;
                        this.createStorageLoop(root, count, startX, y, storageW, storageH, gap, 
                            500, 
                            theme.withBrightness(0.05), 
                            rng, archetype, 
                            variant, 
                            false, 
                            shipCenterY,
                            lightColors
                        );
                    }
                    
                } else {
                    const isTop = rng.bool();
                    
                    const storageH = rng.range(20, 40);
                    const storageW = storageH * rng.range(2.0, 4.0);
                    
                    const gap = storageW * 0.05;
                    let count = Math.floor((spanW + gap) / (storageW + gap));
                    count = Math.min(count, 4);
                    if (count < 1) count = 1;
                    
                    const groupW = count * storageW + (count - 1) * gap;
                    const startX = spanX + (spanW - groupW) / 2;
                    
                    let y;
                    if (isTop) {
                        y = minY - storageH * 0.7; 
                    } else {
                        y = maxY - storageH * 0.3;
                    }
                    
                    this.createStorageLoop(root, count, startX, y, storageW, storageH, gap,
                        10, 
                        theme.withBrightness(-0.1),
                        rng, archetype,
                        'liquid', 
                        true, 
                        shipCenterY,
                        lightColors
                    );
                }

                i += spanCount;
            } else {
                i++;
            }
        }
    }

    private createStorageLoop(root: ShipNode, count: number, startX: number, y: number, w: number, h: number, gap: number, zIndex: number, color: HSBAColor, rng: RNG, archetype: ShipArchetype, variant: ComponentVariant, isEdge: boolean, shipCenterY: number, lightColors: HSBAColor[]) {
        const sharedBands = rng.intRange(1, 3);
        for (let i = 0; i < count; i++) {
            const cx = startX + i * (w + gap);
            
            const storage = new ShipComponent({
                bounds: { x: cx, y, w, h },
                zIndex,
                type: 'storage',
                color,
                rng,
                shipArchetype: archetype,
                variant,
                invertLighting: isEdge && y > shipCenterY,
                shipCenterY: isEdge ? shipCenterY : undefined,
                lightColors,
                storageBands: sharedBands,
            });
            root.children.push({ component: storage, children: [] });
        }
    }
}
