import { HSBAColor, RNG } from '../greebler/common.js';
import { ShipComponent, ComponentType, ShipArchetype } from './ShipComponent.js';
import { UnifiedTrunkComponent } from './UnifiedTrunkComponent.js';

interface ShipNode {
    component: ShipComponent;
    children: ShipNode[];
}

export class CompositeShipGenerator {
    constructor() {}

    generate(width: number, height: number, themeColor: HSBAColor, rng: RNG, shipArchetype?: ShipArchetype): (ShipComponent | UnifiedTrunkComponent)[] {
        const centerY = height / 2;
        
        // Pick Random Archetype if not provided
        const archetype: ShipArchetype = shipArchetype ?? rng.choice(['freight', 'science', 'industry', 'passengers', 'combat']);

        // 1. Create Root (Engine Block)
        const engineW = width * rng.range(0.1, 0.15);
        const engineH = height * rng.range(0.25, 0.45);
        const engineX = width * 0.05;
        const engineY = centerY - engineH / 2;

        const rootComp = new ShipComponent(
            engineX, engineY, engineW, engineH, 
            100, // High Z
            'engine', 
            themeColor.withBrightness(-0.1), 
            rng,
            archetype
        );
        rootComp.generateShape(rng);

        const rootNode: ShipNode = { component: rootComp, children: [] };

        // 2. Grow the Tree
        // Pass limits to avoid infinite growth. Increased depth to allow space-filling.
        this.grow(rootNode, 0, 20, width, height, themeColor, rng, archetype);

        // 3. Add Special Components (Ring/Trench) as children of Root or specialized nodes?
        // this.addSpecialDetails(rootNode, width, height, themeColor, rng, archetype);

        // 4. Traverse Post-Order to build draw list (Leaves -> Trunk)
        const drawList: ShipComponent[] = [];
        this.traversePostOrder(rootNode, (comp) => {
            drawList.push(comp);
        });
        
        // 5. Merge Trunk Components
        const hulls = drawList.filter(c => c.type === 'hull' && c.isTrunk);
        const others = drawList.filter(c => c.type !== 'hull' || !c.isTrunk); // Keep everything else
        
        const finalComponents: (ShipComponent | UnifiedTrunkComponent)[] = [...others];
        
        if (hulls.length > 0) {
            const trunk = new UnifiedTrunkComponent(hulls, rng);
            finalComponents.push(trunk);
        }

        // 6. Sort by Z-Index
        finalComponents.sort((a, b) => a.zIndex - b.zIndex);

        return finalComponents;
    }

    private grow(node: ShipNode, depth: number, maxDepth: number, totalW: number, totalH: number, theme: HSBAColor, rng: RNG, archetype: ShipArchetype) {
        if (depth >= maxDepth) return;

        const parentComp = node.component;
        const pBounds = parentComp.bounds;

        // Determine possible branches based on Parent Type
        // Engine -> Hull (Forward)
        // Hull -> Hull (Forward), Tower (Up), Tank (Down), Sponson (Side/Up/Down)
        
        let forwardChance = 0.0;
        let upChance = 0.0;
        let downChance = 0.0;

        const currentRight = pBounds.x + pBounds.w;
        const margin = totalW * 0.05;
        const spaceRemaining = totalW - currentRight - margin;
        
        if (parentComp.type === 'engine' || parentComp.type === 'hull') {
            // If we have significant space, grow forward
            if (spaceRemaining > totalW * 0.1) {
                forwardChance = 1.0;
                // Safety break
                if (depth >= maxDepth) forwardChance = 0.0;
            } else {
                forwardChance = 0.0;
            }
            
            // Allow branching for "trunk" nodes (hulls)
            if (parentComp.type === 'hull') {
                upChance = 0.4;
                downChance = 0.3;
            }
        } else if (parentComp.type === 'tower') {
            upChance = 0.3; // Towers on towers
        }

        // 1. Branch Forward (Extension)
        if (rng.bool(forwardChance)) {
            // Next Hull Segment
            const maxChunk = Math.min(totalW * 0.25, spaceRemaining);
            const minChunk = totalW * 0.1;
            
            let w = rng.range(minChunk, maxChunk);
            if (spaceRemaining < totalW * 0.15) {
                w = spaceRemaining;
            }
            
            let h = pBounds.h * rng.range(0.8, 1.2);
            if (h > totalH * 0.45) h = totalH * 0.45;
            if (h < totalH * 0.15) h = totalH * 0.15; 
            
            const overlap = pBounds.w * 0.1;
            const x = pBounds.x + pBounds.w - overlap;
            const y = pBounds.y + (pBounds.h - h) / 2; 
            
            if (x + w < totalW) {
                const type: ComponentType = 'hull';
                const childComp = new ShipComponent(
                    x, y, w, h, 
                    parentComp.zIndex - 1, 
                    type,
                    theme,
                    rng,
                    archetype,
                    'default',
                    true // isTrunk
                );
                childComp.generateShape(rng);
                
                const childNode = { component: childComp, children: [] };
                node.children.push(childNode);
                
                this.grow(childNode, depth + 1, maxDepth, totalW, totalH, theme, rng, archetype);
            }
        }

        // 2. Branch Up (Towers/Superstructure/Hulls)
        if (rng.bool(upChance)) {
            const r = rng.next();
            let type: ComponentType = 'tower';
            let variant = 'default';
            let w = pBounds.w * rng.range(0.3, 0.6);
            let h = pBounds.h * rng.range(0.5, 1.2);
            
            if (r < 0.4) {
                type = 'tower';
                w = pBounds.w * rng.range(0.2, 0.4);
                h = pBounds.h * rng.range(0.8, 1.5);
            } else if (r < 0.7) {
                type = 'hull';
                variant = 'taper-top';
                w = pBounds.w * rng.range(0.5, 0.8);
                h = pBounds.h * rng.range(0.4, 0.7);
            } else if (r < 0.9) {
                type = 'sphere';
                const s = Math.min(pBounds.w, pBounds.h) * rng.range(0.4, 0.7);
                w = s; h = s;
            } else {
                type = 'hull';
                variant = 'default'; 
                w = pBounds.w * rng.range(0.4, 0.7);
                h = pBounds.h * rng.range(0.3, 0.5);
            }

            const x = pBounds.x + rng.range(0, pBounds.w - w);
            let y = pBounds.y - h * 0.8; 
            if (type === 'sphere') {
                y = pBounds.y - h * 0.5;
            }
            
            const childComp = new ShipComponent(
                x, y, w, h,
                parentComp.zIndex - 1, 
                type,
                theme.withBrightness(0.1),
                rng,
                archetype,
                variant
            );
            childComp.generateShape(rng);
            
            const childNode = { component: childComp, children: [] };
            node.children.push(childNode);
            
            if (type === 'tower') {
                this.grow(childNode, depth + 1, maxDepth, totalW, totalH, theme, rng, archetype);
            }
        }

        // 3. Branch Down (Tanks/Hulls)
        if (rng.bool(downChance)) {
            const r = rng.next();
            let type: ComponentType = 'tank';
            let variant = 'default';
            let w = pBounds.w * rng.range(0.4, 0.6);
            let h = pBounds.h * rng.range(0.4, 0.6);
            
            if (r < 0.5) {
                type = 'hull';
                variant = 'taper-bottom';
                w = pBounds.w * rng.range(0.5, 0.8);
                h = pBounds.h * rng.range(0.4, 0.7);
            } else if (r < 0.8) {
                type = 'tank';
            } else {
                type = 'sphere';
                const s = Math.min(pBounds.w, pBounds.h) * rng.range(0.4, 0.6);
                w = s; h = s;
            }
            
            const x = pBounds.x + rng.range(0, pBounds.w - w);
            let y = pBounds.y + pBounds.h - h * 0.2; 
            if (type === 'sphere') {
                y = pBounds.y + pBounds.h - h * 0.5;
            }
            
            const childComp = new ShipComponent(
                x, y, w, h,
                parentComp.zIndex - 1, 
                type,
                theme.withBrightness(-0.1),
                rng,
                archetype,
                variant
            );
            childComp.generateShape(rng);
            
            const childNode = { component: childComp, children: [] };
            node.children.push(childNode);
        }
    }

    private addSpecialDetails(root: ShipNode, width: number, height: number, theme: HSBAColor, rng: RNG, archetype: ShipArchetype) {
        const centerY = height / 2;
        
        // 1. Sphere (Floating near front)
        if (rng.bool(0.4)) {
            const s = height * rng.range(0.2, 0.3);
            const x = width * rng.range(0.5, 0.7);
            const y = centerY - s/2 + rng.range(-50, 50);
            
            const sphere = new ShipComponent(x, y, s, s, 50, 'sphere', theme.withBrightness(0.05), rng, archetype);
            sphere.generateShape(rng);
            root.children.push({ component: sphere, children: [] });
        }

        // 2. Ring (Around hull)
        if (rng.bool(0.3)) {
            const h = height * rng.range(0.6, 0.8);
            const w = h * 0.25;
            const x = width * rng.range(0.3, 0.6);
            const y = centerY - h/2;
            
            const ring = new ShipComponent(x, y, w, h, 5, 'ring', theme.withBrightness(-0.2), rng, archetype);
            ring.generateShape(rng);
            root.children.push({ component: ring, children: [] });
        }
        
        // 3. Trench (Equatorial)
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

    private traversePostOrder(node: ShipNode, callback: (c: ShipComponent) => void) {
        // 1. Visit Children
        node.children.forEach(child => this.traversePostOrder(child, callback));
        // 2. Visit Self
        callback(node.component);
    }
}