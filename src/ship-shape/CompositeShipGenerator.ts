import { HSBAColor, RNG } from '../greebler/common.js';
import { ShipComponent } from './ShipComponent.js';
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
        // Decide engine style early to size it correctly
        let engineStyle: 'standard' | 'radiator' | 'energy' = 'standard';
        const rStyle = rng.next();
        if (rStyle < 0.75) engineStyle = 'standard';
        else if (rStyle < 0.875) engineStyle = 'radiator';
        else engineStyle = 'energy';

        // Sizing based on style (stubby engines)
        // Original base was 0.1 to 0.15
        let wMultMin = 0.1;
        let wMultMax = 0.15;
        
        if (engineStyle === 'standard') {
            // ~1/3rd of original
            wMultMin = 0.03;
            wMultMax = 0.05;
        } else {
            // ~1/2 of original
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
        // Pass limits to avoid infinite growth. Increased depth to allow space-filling.
        // Use scaleH for logic limits
        this.grow(rootNode, 0, 20, width, scaleH, themeColor, rng, archetype, centerY);

        // Post-process engine to fit first hull segment if it exists and is a standard cylindrical engine
        const firstHullNode = rootNode.children.find(child => child.component.type === 'hull' && child.component.isTrunk);
        if (firstHullNode) {
            const engineComp = rootNode.component;
            const hullComp = firstHullNode.component;

            if (engineComp.engineStyle === 'standard') {
                const oldEngineH = engineComp.bounds.h;
                const oldEngineY = engineComp.bounds.y;

                // Determine constraint range (prefer precise left edge, fallback to bounds)
                let limitY = hullComp.bounds.y;
                let limitH = hullComp.bounds.h;
                
                if (hullComp.leftEdge) {
                    limitY = hullComp.leftEdge.minY;
                    limitH = hullComp.leftEdge.maxY - hullComp.leftEdge.minY;
                }

                // Ensure engine's right side does not vertically exceed the hull's left edge
                engineComp.bounds.h = Math.min(oldEngineH, limitH); 
                // Center the engine vertically within the limit range
                engineComp.bounds.y = limitY + (limitH - engineComp.bounds.h) / 2;
                
                // If bounds changed, regenerate engine shape
                if (oldEngineH !== engineComp.bounds.h || oldEngineY !== engineComp.bounds.y) {
                    engineComp.generateShape(rng);
                }
            }
        }

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

        // 5b. Post-Process: Add Rings (Science/Passengers only)
        if (archetype === 'science' || archetype === 'passengers') {
            const trunkHulls = drawList.filter(c => c.type === 'hull' && c.isTrunk);
            
            // Probability: 60% None, 30% One, 10% Two
            const rRing = rng.next();
            let ringCount = 0;
            if (rRing < 0.6) ringCount = 0;
            else if (rRing < 0.9) ringCount = 1;
            else ringCount = 2;

            if (ringCount > 0 && trunkHulls.length > 0) {
                // Pick unique indices
                const indices = new Set<number>();
                while (indices.size < ringCount && indices.size < trunkHulls.length) {
                    indices.add(Math.floor(rng.range(0, trunkHulls.length)));
                }

                indices.forEach(idx => {
                    const targetHull = trunkHulls[idx];
                    
                    // Ring Dimensions
                    const ringH = targetHull.bounds.h * 2.2;
                    const ringW = ringH * 0.15;
                    
                    // Center on Hull
                    const ringX = targetHull.bounds.x + targetHull.bounds.w / 2 - ringW / 2;
                    const ringY = targetHull.bounds.y + targetHull.bounds.h / 2 - ringH / 2;

                    const ringComp = new ShipComponent(
                        ringX, ringY, ringW, ringH,
                        1000, // Always render last (closest)
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

        // Determine possible branches based on Parent Type
        
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
        let grownForward = false;
        if (rng.bool(forwardChance)) {
            // Next Hull Segment
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
                    parentComp.zIndex + 10, // Forward growth: Significantly higher Z to cover previous
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

        // If we stopped growing forward, add a Nose Cap
        if (!grownForward && (parentComp.type === 'hull' || parentComp.type === 'engine')) {
            this.addNose(node, totalW, totalH, theme, rng, archetype, shipCenterY);
        }

        // 2. Branch Up (Towers/Superstructure/Hulls/Sensors/Weapons)
        if (rng.bool(upChance)) {
            const r = rng.next();
            let type: ComponentType = 'tower';
            let variant = 'default';
            let w = pBounds.w * rng.range(0.3, 0.6);
            let h = pBounds.h * rng.range(0.5, 1.2);
            
            // Probability Weights
            let weaponThreshold = (archetype === 'combat') ? 0.3 : 0.0;
            let sensorThreshold = weaponThreshold + ((archetype === 'science' || archetype === 'combat') ? (archetype === 'combat' ? 0.2 : 0.3) : 0.05);
            let towerThreshold = sensorThreshold + 0.3; 
            let taperThreshold = towerThreshold + 0.2;
            let sphereThreshold = taperThreshold + 0.1;
            
            if (r < weaponThreshold) {
                type = 'weapon';
                // Fixed size: 2:1 aspect ratio, range 60-80 width
                w = rng.range(60, 80);
                if (w > pBounds.w) w = pBounds.w; // Clamp to parent width
                h = w * 0.5;
            } else if (r < sensorThreshold) {
                type = 'sensor';
                w = pBounds.w * rng.range(0.3, 0.6);
                h = pBounds.h * rng.range(0.3, 0.6);
            } else if (r < towerThreshold) {
                type = 'tower';
                w = pBounds.w * rng.range(0.2, 0.4);
                h = pBounds.h * rng.range(0.8, 1.5);
            } else if (r < taperThreshold) {
                type = 'hull';
                variant = 'taper-top';
                w = pBounds.w * rng.range(0.5, 0.8);
                h = pBounds.h * rng.range(0.4, 0.7);
            } else if (r < sphereThreshold) {
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
            } else if (type === 'sensor') {
                 y = pBounds.y - h * 0.9; // Sit mostly on top
            } else if (type === 'weapon') {
                 y = pBounds.y - h * 0.9; // Sit mostly on top
            }
            
            const childComp = new ShipComponent(
                x, y, w, h,
                parentComp.zIndex - 1, // Surface details inset/behind parent
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

        // 3. Branch Down (Tanks/Hulls/Sensors/Weapons)
        if (rng.bool(downChance)) {
            const r = rng.next();
            let type: ComponentType = 'tank';
            let variant = 'default';
            let w = pBounds.w * rng.range(0.4, 0.6);
            let h = pBounds.h * rng.range(0.4, 0.6);
            
            // Probability Weights
            let weaponThreshold = (archetype === 'combat') ? 0.3 : 0.0;
            let sensorThreshold = weaponThreshold + ((archetype === 'science' || archetype === 'combat') ? (archetype === 'combat' ? 0.2 : 0.3) : 0.05);
            let taperThreshold = sensorThreshold + 0.3;
            let tankThreshold = taperThreshold + 0.3;

            if (r < weaponThreshold) {
                type = 'weapon';
                // Fixed size: 2:1 aspect ratio, range 60-80 width
                w = rng.range(60, 80);
                if (w > pBounds.w) w = pBounds.w;
                h = w * 0.5;
            } else if (r < sensorThreshold) {
                type = 'sensor';
                w = pBounds.w * rng.range(0.3, 0.6);
                h = pBounds.h * rng.range(0.3, 0.6);
            } else if (r < taperThreshold) {
                type = 'hull';
                variant = 'taper-bottom';
                w = pBounds.w * rng.range(0.5, 0.8);
                h = pBounds.h * rng.range(0.4, 0.7);
            } else if (r < tankThreshold) {
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
            } else if (type === 'sensor') {
                y = pBounds.y + pBounds.h - h * 0.1; // Hang slightly lower
            } else if (type === 'weapon') {
                y = pBounds.y + pBounds.h - h * 0.1; // Hang slightly lower
            }
            
            const childComp = new ShipComponent(
                x, y, w, h,
                parentComp.zIndex - 1, // Underslung/Inset details
                type,
                theme.withBrightness(-0.1),
                rng,
                archetype,
                variant,
                false, // isTrunk
                true,   // invertLighting
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

        // 4. Face Attachments (Weapons) - Combat Only
        if (archetype === 'combat' && parentComp.type !== 'engine' && rng.bool(0.4)) {
            // Side-mounted turret (Top-down view)
            // Fixed size: Square, range 60-80
            let s = rng.range(60, 80);
            // Ensure it fits inside parent
            s = Math.min(s, pBounds.w * 0.9, pBounds.h * 0.9);
            
            const w = s;
            const h = s;
            const x = pBounds.x + (pBounds.w - w) / 2;
            const y = pBounds.y + (pBounds.h - h) / 2;
            
            const weapon = new ShipComponent(
                x, y, w, h,
                500, // Sit on top of hull (UnifiedTrunk can be high Z, so boost this)
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
        
        // Safety Margin
        const limit = totalW - (totalW * 0.02);
        const maxW = limit - startX;
        
        if (maxW < 10) return; // No room

        // Choice: Taper Hull, Large Sphere, or Small Sphere (Round Cap)
        // If Science/Combat, also allow Sensor Array
        let noseChoices = ['taper', 'sphere-large', 'sphere-small'];
        if (archetype === 'science' || archetype === 'combat') {
            noseChoices.push('sensor');
            noseChoices.push('sensor'); // Weight it a bit higher
        }

        let choice = rng.choice(noseChoices);
        
        // If very limited space, force taper as it handles arbitrary width best
        if (maxW < 50 && choice !== 'sensor') choice = 'taper'; // Sensors can be small? Let's allow small sensors

        if (choice === 'taper') {
            // Trapezoid Hull (Merged into Trunk)
            let w = pBounds.w * rng.range(0.5, 0.8);
            w = Math.min(w, maxW); // Clamp width

            const h = pBounds.h * 0.9; 
            const y = pBounds.y + (pBounds.h - h)/2;
            
            const nose = new ShipComponent(startX, y, w, h, parent.zIndex - 1, 'hull', theme, rng, archetype, 'taper-front', true, false, undefined, shipCenterY); 
            nose.generateShape(rng);
            node.children.push({ component: nose, children: [] });
            
        } else if (choice === 'sensor') {
            const h = pBounds.h * rng.range(0.5, 0.8);
            // Length sticking out
            let w = pBounds.h * rng.range(0.4, 0.8); 
            w = Math.min(w, maxW);
            
            const y = pBounds.y + (pBounds.h - h)/2;
            // Adjust overlap for sensors to make them less embedded
            const sensorOverlap = pBounds.w * 0.05; // Smaller overlap
            const x = currentRight - sensorOverlap; // Attach to end, but less deeply
            
            const nose = new ShipComponent(x, y, w, h, parent.zIndex - 1, 'sensor', theme, rng, archetype, 'front', false, false, undefined, shipCenterY);
            nose.generateShape(rng);
            node.children.push({ component: nose, children: [] });

        } else {
            // Spheres extend past currentRight by s/2
            // We need currentRight + s/2 <= limit
            // s/2 <= limit - currentRight
            // s <= (limit - currentRight) * 2
            const maxExtension = limit - currentRight;
            const maxS = Math.max(10, maxExtension * 2);

            let s = 0;
            if (choice === 'sphere-large') {
                s = pBounds.h * rng.range(0.9, 1.3);
            } else {
                s = pBounds.h * rng.range(0.6, 0.8);
            }
            
            // Clamp Sphere Size
            s = Math.min(s, maxS);

            const y = pBounds.y + pBounds.h/2 - s/2;
            const sphereX = currentRight - s * 0.5; // Center on edge
            
            const nose = new ShipComponent(sphereX, y, s, s, parent.zIndex - 1, 'sphere', theme, rng, archetype, 'default', false, false, undefined, shipCenterY);
            nose.generateShape(rng);
            node.children.push({ component: nose, children: [] });
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