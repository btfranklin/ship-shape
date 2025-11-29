import { HSBAColor, RNG } from '../greebler/common.js';
import { ShipComponent } from './ShipComponent.js';
import { CapitalShipSurfaceGreebles } from '../greebler/CapitalShipSurfaceGreebles.js';
import { UnifiedTrunkComponent } from './UnifiedTrunkComponent.js';
import { ShipArchetype, ComponentType } from './shipTypes.js';

interface ShipNode {
    component: ShipComponent;
    children: ShipNode[];
}

export class CompositeShipGenerator {
    constructor() {}

    generate(width: number, height: number, themeColor: HSBAColor, rng: RNG, shipArchetype?: ShipArchetype, referenceHeight?: number): (ShipComponent | UnifiedTrunkComponent)[] {
        const centerY = height / 2;
        const scaleH = referenceHeight ?? height;
        
        // Pick Random Archetype if not provided
        const archetype: ShipArchetype = shipArchetype ?? rng.choice(['freight', 'science', 'industry', 'passengers', 'combat']);

        // 1. Create Root (Engine Block)
        let engineStyle: 'standard' | 'radiator' | 'energy' = 'standard';
        const rStyle = rng.next();
        if (rStyle < 0.75) engineStyle = 'standard';
        else if (rStyle < 0.875) engineStyle = 'radiator';
        else engineStyle = 'energy';

        let wMultMin = 0.1;
        let wMultMax = 0.15;
        
        if (engineStyle === 'standard') {
            wMultMin = 0.03;
            wMultMax = 0.05;
        } else {
            wMultMin = 0.05;
            wMultMax = 0.08;
        }

        const engineW = width * rng.range(wMultMin, wMultMax);
        const engineH = scaleH * rng.range(0.25, 0.45);
        const engineX = width * 0.05;
        const engineY = centerY - engineH / 2;

        const rootComp = new ShipComponent(
            engineX, engineY, engineW, engineH, 
            10, // Low Z (Background)
            'engine', 
            themeColor.withBrightness(-0.1), 
            rng,
            archetype,
            'default',
            false,
            false,
            engineStyle,
            centerY
        );
        rootComp.generateShape(rng);

        const rootNode: ShipNode = { component: rootComp, children: [] };

        // 2. Grow the Tree
        this.grow(rootNode, 0, 20, width, scaleH, themeColor, rng, archetype, centerY);

        // Post-process engine
        const firstHullNode = rootNode.children.find(child => child.component.type === 'hull' && child.component.isTrunk);
        if (firstHullNode) {
            const engineComp = rootNode.component;
            const hullComp = firstHullNode.component;

            if (engineComp.engineStyle === 'standard') {
                const oldEngineH = engineComp.bounds.h;
                const oldEngineY = engineComp.bounds.y;

                let limitY = hullComp.bounds.y;
                let limitH = hullComp.bounds.h;
                
                if (hullComp.leftEdge) {
                    limitY = hullComp.leftEdge.minY;
                    limitH = hullComp.leftEdge.maxY - hullComp.leftEdge.minY;
                }

                engineComp.bounds.h = Math.min(oldEngineH, limitH); 
                engineComp.bounds.y = limitY + (limitH - engineComp.bounds.h) / 2;
                
                if (oldEngineH !== engineComp.bounds.h || oldEngineY !== engineComp.bounds.y) {
                    engineComp.generateShape(rng);
                }
            }
        }

        // 3. Add Global Tank Details (Spanning multiple sections)
        this.addGlobalTanks(rootNode, themeColor, rng, archetype, centerY);

        // 4. Traverse Post-Order
        const drawList: ShipComponent[] = [];
        this.traversePostOrder(rootNode, (comp) => {
            drawList.push(comp);
        });
        
        // 5. Merge Trunk Components
        const hulls = drawList.filter(c => c.type === 'hull' && c.isTrunk);
        const others = drawList.filter(c => c.type !== 'hull' || !c.isTrunk);
        
        const finalComponents: (ShipComponent | UnifiedTrunkComponent)[] = [...others];
        
        if (hulls.length > 0) {
            const trunk = new UnifiedTrunkComponent(hulls, rng);
            finalComponents.push(trunk);
        }

        // 5b. Post-Process: Add Rings
        if (archetype === 'science' || archetype === 'passengers') {
            const trunkHulls = drawList.filter(c => c.type === 'hull' && c.isTrunk);
            const rRing = rng.next();
            let ringCount = 0;
            if (rRing < 0.6) ringCount = 0;
            else if (rRing < 0.9) ringCount = 1;
            else ringCount = 2;

            if (ringCount > 0 && trunkHulls.length > 0) {
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

                    const ringComp = new ShipComponent(
                        ringX, ringY, ringW, ringH,
                        1000, 
                        'ring',
                        themeColor.withBrightness(-0.2),
                        rng,
                        archetype,
                        'default',
                        false,
                        false,
                        undefined,
                        centerY
                    );
                    ringComp.generateShape(rng);
                    finalComponents.push(ringComp);
                });
            }
        }

        // 6. Sort by Z-Index
        finalComponents.sort((a, b) => a.zIndex - b.zIndex);

        return finalComponents;
    }

    private grow(node: ShipNode, depth: number, maxDepth: number, totalW: number, totalH: number, theme: HSBAColor, rng: RNG, archetype: ShipArchetype, shipCenterY: number) {
        if (depth >= maxDepth) return;

        const parentComp = node.component;
        const pBounds = parentComp.bounds;

        let forwardChance = 0.0;
        let upChance = 0.0;
        let downChance = 0.0;

        const currentRight = pBounds.x + pBounds.w;
        const margin = totalW * 0.05;
        const spaceRemaining = totalW - currentRight - margin;
        
        if (parentComp.type === 'engine' || parentComp.type === 'hull') {
            if (spaceRemaining > totalW * 0.1) {
                forwardChance = 1.0;
                if (depth >= maxDepth) forwardChance = 0.0;
            } else {
                forwardChance = 0.0;
            }
            
            if (parentComp.type === 'hull') {
                upChance = 0.4;
                downChance = 0.3;
            }
        } else if (parentComp.type === 'tower') {
            upChance = 0.3;
        }

        // 1. Branch Forward
        let grownForward = false;
        if (rng.bool(forwardChance)) {
            const maxChunk = Math.min(totalW * 0.25, spaceRemaining);
            const minChunk = totalW * 0.1;
            
            let w = rng.range(minChunk, maxChunk);
            if (spaceRemaining < totalW * 0.15) {
                w = spaceRemaining;
            }
            
            let h = pBounds.h * rng.range(0.6, 1.5);
            if (h > totalH * 0.55) h = totalH * 0.55;
            if (h < totalH * 0.1) h = totalH * 0.1; 
            
            const overlap = pBounds.w * 0.1;
            const x = pBounds.x + pBounds.w - overlap;
            const y = pBounds.y + (pBounds.h - h) / 2; 
            
            if (x + w < totalW) {
                const type: ComponentType = 'hull';
                const childComp = new ShipComponent(
                    x, y, w, h, 
                    parentComp.zIndex + 10, 
                    type,
                    theme,
                    rng,
                    archetype,
                    'default',
                    true, // isTrunk
                    false,
                    undefined,
                    shipCenterY
                );
                childComp.generateShape(rng);
                
                const childNode = { component: childComp, children: [] };
                node.children.push(childNode);
                grownForward = true;
                
                this.grow(childNode, depth + 1, maxDepth, totalW, totalH, theme, rng, archetype, shipCenterY);
            }
        }

        if (!grownForward && (parentComp.type === 'hull' || parentComp.type === 'engine')) {
            this.addNose(node, totalW, totalH, theme, rng, archetype, shipCenterY);
        }

        // 2. Branch Up (Towers/Sensors/Weapons - NO TANKS)
        if (rng.bool(upChance)) {
            const r = rng.next();
            let type: ComponentType = 'tower';
            let variant = 'default';
            
            let weaponThreshold = (archetype === 'combat') ? 0.3 : 0.0;
            let sensorThreshold = weaponThreshold + ((archetype === 'science' || archetype === 'combat') ? (archetype === 'combat' ? 0.2 : 0.3) : 0.05);
            let towerThreshold = sensorThreshold + 0.3; 
            let taperThreshold = towerThreshold + 0.2;
            let sphereThreshold = taperThreshold + 0.1;
            
            if (r < weaponThreshold) {
                type = 'weapon';
            } else if (r < sensorThreshold) {
                type = 'sensor';
            } else if (r < towerThreshold) {
                type = 'tower';
            } else if (r < taperThreshold) {
                type = 'hull';
                variant = 'taper-top';
            } else if (r < sphereThreshold) {
                type = 'sphere';
            } else {
                type = 'hull';
                variant = 'default'; 
            }

            let w = pBounds.w * rng.range(0.3, 0.6);
            let h = pBounds.h * rng.range(0.5, 1.2);

            if (type === 'weapon') {
                w = rng.range(60, 80);
                if (w > pBounds.w) w = pBounds.w;
                h = w * 0.5;
            } else if (type === 'sensor') {
                w = pBounds.w * rng.range(0.3, 0.6);
                h = pBounds.h * rng.range(0.3, 0.6);
            } else if (type === 'tower') {
                w = pBounds.w * rng.range(0.2, 0.4);
                h = pBounds.h * rng.range(0.8, 1.5);
            } else if (type === 'hull') {
                w = pBounds.w * rng.range(0.5, 0.8);
                h = pBounds.h * rng.range(0.4, 0.7);
            } else if (type === 'sphere') {
                const s = Math.min(pBounds.w, pBounds.h) * rng.range(0.4, 0.7);
                w = s; h = s;
            }

            const x = pBounds.x + rng.range(0, pBounds.w - w);
            let y = pBounds.y - h * 0.8; 
            if (type === 'sphere') {
                y = pBounds.y - h * 0.5;
            } else if (type === 'sensor') {
                 y = pBounds.y - h * 0.9;
            } else if (type === 'weapon') {
                 y = pBounds.y - h * 0.9;
            }
            
            const childComp = new ShipComponent(
                x, y, w, h,
                parentComp.zIndex - 1,
                type,
                theme.withBrightness(0.1),
                rng,
                archetype,
                variant,
                false,
                false,
                undefined,
                shipCenterY
            );
            
            if (type === 'weapon' && x < totalW / 3) {
                childComp.facing = 'backward';
            }

            childComp.generateShape(rng);
            
            const childNode = { component: childComp, children: [] };
            node.children.push(childNode);
            
            if (type === 'tower') {
                this.grow(childNode, depth + 1, maxDepth, totalW, totalH, theme, rng, archetype, shipCenterY);
            }
        }

        // 3. Branch Down (Sensors/Weapons - NO TANKS)
        if (rng.bool(downChance)) {
            const r = rng.next();
            let type: ComponentType = 'sphere';
            let variant = 'default';
            
            let weaponThreshold = (archetype === 'combat') ? 0.3 : 0.0;
            let sensorThreshold = weaponThreshold + ((archetype === 'science' || archetype === 'combat') ? (archetype === 'combat' ? 0.2 : 0.3) : 0.05);
            let taperThreshold = sensorThreshold + 0.3;
            
            if (r < weaponThreshold) {
                type = 'weapon';
            } else if (r < sensorThreshold) {
                type = 'sensor';
            } else if (r < taperThreshold) {
                type = 'hull';
                variant = 'taper-bottom';
            } else {
                type = 'sphere';
            }

            let w = pBounds.w * rng.range(0.4, 0.6);
            let h = pBounds.h * rng.range(0.4, 0.6);
            
            if (type === 'weapon') {
                w = rng.range(60, 80);
                if (w > pBounds.w) w = pBounds.w;
                h = w * 0.5;
            } else if (type === 'sensor') {
                w = pBounds.w * rng.range(0.3, 0.6);
                h = pBounds.h * rng.range(0.3, 0.6);
            } else if (type === 'hull') {
                w = pBounds.w * rng.range(0.5, 0.8);
                h = pBounds.h * rng.range(0.4, 0.7);
            } else if (type === 'sphere') {
                const s = Math.min(pBounds.w, pBounds.h) * rng.range(0.4, 0.6);
                w = s; h = s;
            }
            
            const x = pBounds.x + rng.range(0, pBounds.w - w);
            let y = pBounds.y + pBounds.h - h * 0.2; 
            if (type === 'sphere') {
                y = pBounds.y + pBounds.h - h * 0.5;
            } else if (type === 'sensor') {
                y = pBounds.y + pBounds.h - h * 0.1;
            } else if (type === 'weapon') {
                y = pBounds.y + pBounds.h - h * 0.1;
            }
            
            const childComp = new ShipComponent(
                x, y, w, h,
                parentComp.zIndex - 1,
                type,
                theme.withBrightness(-0.1),
                rng,
                archetype,
                variant,
                false,
                true, // invertLighting
                undefined,
                shipCenterY
            );
            
            if (type === 'weapon' && x < totalW / 3) {
                childComp.facing = 'backward';
            }

            childComp.generateShape(rng);
            
            const childNode = { component: childComp, children: [] };
            node.children.push(childNode);
        }

        // 4. Face Attachments (Weapons Only)
        if (archetype === 'combat' && parentComp.type !== 'engine' && rng.bool(0.4)) {
            let s = rng.range(60, 80);
            s = Math.min(s, pBounds.w * 0.9, pBounds.h * 0.9);
            
            const w = s;
            const h = s;
            const x = pBounds.x + (pBounds.w - w) / 2;
            const y = pBounds.y + (pBounds.h - h) / 2;
            
            const weapon = new ShipComponent(
                x, y, w, h,
                500, 
                'weapon',
                theme.withBrightness(-0.15),
                rng,
                archetype,
                'top-view',
                false,
                false,
                undefined,
                shipCenterY
            );
            
            if (x < totalW / 3) {
                weapon.facing = 'backward';
            }

            weapon.generateShape(rng);
            node.children.push({ component: weapon, children: [] });
        }
    }

    private addNose(node: ShipNode, totalW: number, totalH: number, theme: HSBAColor, rng: RNG, archetype: ShipArchetype, shipCenterY: number) {
        const parent = node.component;
        const pBounds = parent.bounds;
        const overlap = pBounds.w * 0.1;
        const currentRight = pBounds.x + pBounds.w;
        const startX = currentRight - overlap;
        
        const limit = totalW - (totalW * 0.02);
        const maxW = limit - startX;
        
        if (maxW < 10) return;

        let noseChoices = ['taper', 'sphere-large', 'sphere-small'];
        if (archetype === 'science' || archetype === 'combat') {
            noseChoices.push('sensor');
            noseChoices.push('sensor'); 
        }

        let choice = rng.choice(noseChoices);
        
        if (maxW < 50 && choice !== 'sensor') choice = 'taper';

        if (choice === 'taper') {
            let w = pBounds.w * rng.range(0.5, 0.8);
            w = Math.min(w, maxW);

            const h = pBounds.h * 0.9; 
            const y = pBounds.y + (pBounds.h - h)/2;
            
            const nose = new ShipComponent(startX, y, w, h, parent.zIndex - 1, 'hull', theme, rng, archetype, 'taper-front', true, false, undefined, shipCenterY); 
            nose.generateShape(rng);
            node.children.push({ component: nose, children: [] });
            
        } else if (choice === 'sensor') {
            const h = pBounds.h * rng.range(0.5, 0.8);
            let w = pBounds.h * rng.range(0.4, 0.8); 
            w = Math.min(w, maxW);
            
            const y = pBounds.y + (pBounds.h - h)/2;
            const sensorOverlap = pBounds.w * 0.05; 
            const x = currentRight - sensorOverlap; 
            
            const nose = new ShipComponent(x, y, w, h, parent.zIndex - 1, 'sensor', theme, rng, archetype, 'front', false, false, undefined, shipCenterY);
            nose.generateShape(rng);
            node.children.push({ component: nose, children: [] });

        } else {
            const maxExtension = limit - currentRight;
            const maxS = Math.max(10, maxExtension * 2);

            let s = 0;
            if (choice === 'sphere-large') {
                s = pBounds.h * rng.range(0.9, 1.3);
            } else {
                s = pBounds.h * rng.range(0.6, 0.8);
            }
            
            s = Math.min(s, maxS);

            const y = pBounds.y + pBounds.h/2 - s/2;
            const sphereX = currentRight - s * 0.5; 
            
            const nose = new ShipComponent(sphereX, y, s, s, parent.zIndex - 1, 'sphere', theme, rng, archetype, 'default', false, false, undefined, shipCenterY);
            nose.generateShape(rng);
            node.children.push({ component: nose, children: [] });
        }
    }

    private addSpecialDetails(root: ShipNode, width: number, height: number, theme: HSBAColor, rng: RNG, archetype: ShipArchetype) {
        const centerY = height / 2;
        
        if (rng.bool(0.4)) {
            const s = height * rng.range(0.2, 0.3);
            const x = width * rng.range(0.5, 0.7);
            const y = centerY - s/2 + rng.range(-50, 50);
            
            const sphere = new ShipComponent(x, y, s, s, 50, 'sphere', theme.withBrightness(0.05), rng, archetype);
            sphere.generateShape(rng);
            root.children.push({ component: sphere, children: [] });
        }

        if (rng.bool(0.3)) {
            const h = height * rng.range(0.6, 0.8);
            const w = h * 0.25;
            const x = width * rng.range(0.3, 0.6);
            const y = centerY - h/2;
            
            const ring = new ShipComponent(x, y, w, h, 5, 'ring', theme.withBrightness(-0.2), rng, archetype);
            ring.generateShape(rng);
            root.children.push({ component: ring, children: [] });
        }
        
        if (rng.bool(0.5)) {
            const h = height * 0.08;
            const w = width * 0.6;
            const x = width * 0.15;
            const y = centerY - h/2;
            
            const trench = new ShipComponent(x, y, w, h, 105, 'trench', theme.withBrightness(-0.3), rng, archetype);
            trench.generateShape(rng);
            root.children.push({ component: trench, children: [] });
        }
    }

    private addGlobalTanks(root: ShipNode, theme: HSBAColor, rng: RNG, archetype: ShipArchetype, shipCenterY: number) {
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
            let chance = 0.1;
            if (archetype === 'freight') chance = 0.5;
            else if (archetype === 'industry') chance = 0.4;
            else if (archetype === 'science') chance = 0.2;

            if (rng.bool(chance)) {
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

                const isFace = rng.bool(0.5); 
                
                if (isFace) {
                    const isVertical = rng.bool(); 
                    let tankW, tankH;
                    
                    if (isVertical) {
                         tankH = minH * rng.range(0.5, 0.8);
                         tankW = tankH * rng.range(0.3, 0.5);
                    } else {
                         tankH = minH * rng.range(0.2, 0.4);
                         tankW = tankH * rng.range(1.5, 2.5);
                    }
                    
                    const gap = tankW * 0.1;
                    let count = Math.floor((spanW + gap) / (tankW + gap));
                    
                    count = Math.min(count, 6);
                    if (count < 1) count = 1;
                    
                    const groupW = count * tankW + (count - 1) * gap;
                    const startX = spanX + (spanW - groupW) / 2;
                    const y = shipCenterY - tankH / 2;

                    this.createTankLoop(root, count, startX, y, tankW, tankH, gap, 
                        500, 
                        theme.withBrightness(0.05), 
                        rng, archetype, 
                        (isVertical ? 'default' : 'liquid'), 
                        false, 
                        shipCenterY
                    );
                    
                } else {
                    const isTop = rng.bool();
                    
                    const tankH = rng.range(20, 40);
                    const tankW = tankH * rng.range(2.0, 4.0);
                    
                    const gap = tankW * 0.05;
                    let count = Math.floor((spanW + gap) / (tankW + gap));
                    count = Math.min(count, 4);
                    if (count < 1) count = 1;
                    
                    const groupW = count * tankW + (count - 1) * gap;
                    const startX = spanX + (spanW - groupW) / 2;
                    
                    let y;
                    if (isTop) {
                        y = minY - tankH * 0.7; 
                    } else {
                        y = maxY - tankH * 0.3;
                    }
                    
                    this.createTankLoop(root, count, startX, y, tankW, tankH, gap,
                        10, 
                        theme.withBrightness(-0.1),
                        rng, archetype,
                        'liquid', 
                        true, 
                        shipCenterY
                    );
                }

                i += spanCount;
            } else {
                i++;
            }
        }
    }

    private createTankLoop(root: ShipNode, count: number, startX: number, y: number, w: number, h: number, gap: number, zIndex: number, color: HSBAColor, rng: RNG, archetype: ShipArchetype, variant: string, isEdge: boolean, shipCenterY: number) {
        const sharedBands = rng.intRange(1, 3);
        let firstTankGreebles: CapitalShipSurfaceGreebles | undefined;
        
        for (let i = 0; i < count; i++) {
            const cx = startX + i * (w + gap);
            
            const tank = new ShipComponent(
                cx, y, w, h,
                zIndex,
                'tank',
                color,
                rng,
                archetype,
                variant,
                false,
                isEdge && y > shipCenterY,
                undefined,
                isEdge ? shipCenterY : undefined
            );

            tank.customData.bands = sharedBands;
            
            if (i === 0) firstTankGreebles = tank.greebles;
            else if (firstTankGreebles) tank.greebles = firstTankGreebles;
            
            tank.generateShape(rng);
            root.children.push({ component: tank, children: [] });
        }
    }

    private traversePostOrder(node: ShipNode, callback: (c: ShipComponent) => void) {
        node.children.forEach(child => this.traversePostOrder(child, callback));
        callback(node.component);
    }
}
