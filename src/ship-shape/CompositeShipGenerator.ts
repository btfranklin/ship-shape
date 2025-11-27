import { HSBAColor, RNG } from '../greebler/common.js';
import { ShipComponent, ComponentType } from './ShipComponent.js';

export class CompositeShipGenerator {
    constructor() {}

    generate(width: number, height: number, themeColor: HSBAColor, rng: RNG): ShipComponent[] {
        const components: ShipComponent[] = [];
        
        // Design parameters
        // 1.0 Aspect Ratio ships (web) are 1800x600.
        // 3:1 aspect ratio.
        const centerY = height / 2;
        const unitH = height * 0.2; // Standard block height
        
        // SECTION 1: ENGINES (Rear / Left)
        // A massive block at the back
        const engineW = width * rng.range(0.05, 0.12); // Significantly shorter width
        const engineH = height * rng.range(0.2, 0.4);  // Height remains (tall)
        const engineX = width * 0.05;
        const engineY = centerY - engineH/2;
        
        const engine = new ShipComponent(engineX, engineY, engineW, engineH, 10, 'engine', themeColor.withBrightness(-0.1), rng);
        engine.generateShape(rng);
        components.push(engine);
        
        // Engine Nozzles? (Just cylinders sticking out back? Or leave for greebles?)
        // Let's add a "Thrust block" behind
        const nozzleW = engineW * 0.3;
        const nozzleH = engineH * 0.8;
        const nozzle = new ShipComponent(engineX - nozzleW*0.8, centerY - nozzleH/2, nozzleW, nozzleH, 9, 'engine', themeColor.withBrightness(-0.2), rng);
        nozzle.generateShape(rng); // likely rect
        components.push(nozzle);

        // SECTION 2: MAIN HULL (Spine)
        // Extends from Engine to Front
        // Composed of 2-4 segments
        let currentX = engineX + engineW * 0.8; // Overlap
        const remainingW = width * 0.9 - currentX;
        const segments = rng.intRange(2, 4);
        
        for (let i = 0; i < segments; i++) {
            const segW = (remainingW / segments) * rng.range(0.8, 1.2);
            // Taper height as we go forward
            const progress = i / segments;
            const segH = (engineH * 0.8) * (1.0 - (progress * 0.5)); 
            const segY = centerY - segH/2; // Centered vertically
            
            // Hull Spine is Z=10 (Base)
            // To ensure segments layer correctly front-to-back or back-to-front?
            // Usually rear segments are behind front segments visually? 
            // Or front overlaps rear? Let's say Front overlaps Rear -> Higher Z.
            const hullZ = 10 + i;
            
            const hull = new ShipComponent(currentX, segY, segW, segH, hullZ, 'hull', themeColor, rng);
            hull.generateShape(rng);
            components.push(hull);
            
            // Add Top Structures (Turrets / Sensors)
            // These sit ON TOP of the hull. In side view, they are "above" Y-wise.
            // Z-wise? They are on the centerline, so same depth as hull? 
            // Or if the hull is sloped, they might be slightly behind or in front.
            // Let's put them slightly BEHIND (Z=9) if they are "Far side" towers, 
            // or slightly IN FRONT (Z=15) if they are "Near side".
            // Let's go with Z = hullZ + 5 (In front/On top).
            if (rng.bool(0.6)) {
                // Decide between Low Deck or Tall Tower
                const isTower = rng.bool(0.4);
                
                let topW, topH;
                
                if (isTower) {
                    // Tall and narrow
                    topW = segW * rng.range(0.15, 0.3);
                    topH = segH * rng.range(0.8, 1.5); 
                    
                    // Enforce verticality for shape logic
                    if (topW >= topH) topW = topH * 0.8;
                } else {
                    // Low and wide (Deck)
                    topW = segW * rng.range(0.5, 0.8);
                    topH = segH * rng.range(0.2, 0.4);
                }
                
                const topX = currentX + rng.range(0, segW - topW);
                const topY = segY - topH * 0.9; // Sit on top, slightly embedded (0.9)
                
                // If tower, use 'sensor' type for high-tech look
                const type = isTower ? 'sensor' : 'superstructure';
                
                // Render order: Towers slightly BEHIND hull look better? 
                // No, if they grow out of hull, they should be masked by hull if they are "behind".
                // But here we want them visible.
                // If I put Tower Z < Hull Z: Hull draws over Tower bottom. Good for integration.
                const z = hullZ - 1; 
                
                const topStruct = new ShipComponent(topX, topY, topW, topH, z, type, themeColor.withBrightness(0.1), rng);
                topStruct.generateShape(rng);
                components.push(topStruct);
            }
            
            // Add Bottom Structures (Cargo / Bays)
            // Hang below.
            if (rng.bool(0.4)) {
                const botW = segW * rng.range(0.4, 0.7);
                const botH = segH * rng.range(0.3, 0.6);
                const botX = currentX + rng.range(0, segW - botW);
                const botY = segY + segH * 0.8; // Hang below
                
                // Tanks behind hull?
                const z = hullZ - 1;
                
                const botStruct = new ShipComponent(botX, botY, botW, botH, z, 'tank', themeColor.withBrightness(-0.15), rng);
                botStruct.generateShape(rng);
                components.push(botStruct);
            }
            
            currentX += segW * 0.85; // Overlap
        }
        
        // SECTION 3: BRIDGE (Command Tower)
        // Usually sits high on the rear-mid section
        // Make it TALL and Commanding
        if (rng.bool(0.9)) {
            const bridgeW = width * rng.range(0.05, 0.08); // Narrower
            const bridgeH = height * rng.range(0.2, 0.35); // Taller
            
            // Position near rear
            const bridgeX = engineX + engineW * 0.4; 
            const bridgeY = centerY - engineH/2 - bridgeH * 0.8; // Sit on top of engine
            
            // Bridge BEHIND engine looks securely attached?
            // Or In Front?
            // Let's try BEHIND (Z=5) so Engine overlaps its base.
            
            const bridge = new ShipComponent(bridgeX, bridgeY, bridgeW, bridgeH, 5, 'superstructure', themeColor.withBrightness(0.2), rng);
            bridge.generateShape(rng);
            components.push(bridge);
        }
        
        // SECTION 4: FOREGROUND DETAILS (Near Side)
        // Pipes, structural ribs, pods that float in front of the main hull.
        // Z = 30+
        // Add a "Side Pod" to a random segment
        
        // SPHERE (High Z, floating near front/mid)
        if (rng.bool(0.4)) {
            const sphereSize = height * rng.range(0.2, 0.35);
            // Position: Randomly along the mid-to-front section
            const sphereX = width * rng.range(0.4, 0.8);
            const sphereY = centerY + rng.range(-height * 0.1, height * 0.1) - sphereSize/2; // Roughly centered
            
            const sphere = new ShipComponent(sphereX, sphereY, sphereSize, sphereSize, 50, 'sphere', themeColor.withBrightness(0.05), rng);
            sphere.generateShape(rng);
            components.push(sphere);
        }

        // RING (Centered vertically, around hull)
        if (rng.bool(0.3)) {
            const ringH = height * rng.range(0.5, 0.8); // Tall
            const ringW = ringH * rng.range(0.2, 0.3); // Narrow width relative to height
            
            const ringX = width * rng.range(0.3, 0.7);
            const ringY = centerY - ringH/2;
            
            // Ring should be behind some foreground details but definitely distinct
            const ring = new ShipComponent(ringX, ringY, ringW, ringH, 100, 'ring', themeColor.withBrightness(-0.2), rng);
            ring.generateShape(rng);
            components.push(ring);
        }

        // EQUATORIAL TRENCH
        // Runs along the side/middle of the hull
        if (rng.bool(0.5)) {
            const trenchH = height * rng.range(0.05, 0.1); // Narrow strip
            const trenchW = width * rng.range(0.5, 0.8);
            const trenchX = engineX + engineW; // Start after engine
            const trenchY = centerY - trenchH/2;
            
            // High Z to draw on top of hull segments
            const trench = new ShipComponent(trenchX, trenchY, trenchW, trenchH, 20, 'trench', themeColor.withBrightness(-0.3), rng);
            trench.generateShape(rng);
            components.push(trench);
        }
        
        // Sort components by Z-Index so they draw correctly (Painter's Algorithm)
        components.sort((a, b) => a.zIndex - b.zIndex);
        
        return components;
    }
}