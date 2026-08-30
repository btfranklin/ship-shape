import { HSBAColor, RNG } from '../greebles/common.js';
import { ShipComponent } from './ShipComponent.js';
import { UnifiedTrunkComponent } from './UnifiedTrunkComponent.js';
import { ShipArchetype } from './shipTypes.js';
import { CompositeShipGrowthPlanner } from './CompositeShipGrowthPlanner.js';
import { CompositeShipRingPlanner } from './CompositeShipRingPlanner.js';
import { CompositeShipRootPlanner } from './CompositeShipRootPlanner.js';
import { CompositeShipStoragePlanner } from './CompositeShipStoragePlanner.js';
import { createLightColors, traversePostOrder } from './compositePlanning.js';

export class CompositeShipGenerator {
    constructor() {}

    generate(width: number, height: number, themeColor: HSBAColor, rng: RNG, shipArchetype?: ShipArchetype, referenceHeight?: number): (ShipComponent | UnifiedTrunkComponent)[] {
        const centerY = height / 2;
        const scaleH = referenceHeight ?? height;
        
        // Pick Random Archetype if not provided
        const archetype: ShipArchetype = shipArchetype ?? rng.choice(['freight', 'science', 'industry', 'passenger', 'combat']);
        const lightColors = createLightColors(rng);

        // 1. Create Root (Engine Block)
        const rootPlanner = new CompositeShipRootPlanner();
        const rootNode = rootPlanner.createRoot(width, scaleH, themeColor, rng, archetype, centerY, lightColors);

        // 2. Grow the Tree
        const growthPlanner = new CompositeShipGrowthPlanner();
        growthPlanner.grow(rootNode, 0, 20, {
            totalW: width,
            totalH: scaleH,
            theme: themeColor,
            rng,
            archetype,
            shipCenterY: centerY,
            lightColors,
        });

        // Post-process engine
        rootPlanner.alignStandardEngineToFirstHull(rootNode, rng);

        // 3. Add Global Storage Details (Spanning multiple sections)
        const storagePlanner = new CompositeShipStoragePlanner();
        storagePlanner.addGlobalStorage(rootNode, themeColor, rng, archetype, centerY, lightColors);

        // 4. Traverse Post-Order
        const drawList: ShipComponent[] = [];
        traversePostOrder(rootNode, (comp) => {
            drawList.push(comp);
        });
        
        // 5. Merge Trunk Components
        const hulls = drawList.filter(c => c.type === 'hull' && c.isTrunk);
        const others = drawList.filter(c => c.type !== 'hull' || !c.isTrunk);
        
        const finalComponents: (ShipComponent | UnifiedTrunkComponent)[] = [...others];
        
        if (hulls.length > 0) {
            const trunk = new UnifiedTrunkComponent(hulls);
            finalComponents.push(trunk);
        }

        // 6. Post-Process: Add Rings
        const ringPlanner = new CompositeShipRingPlanner();
        ringPlanner.addRings(finalComponents, drawList, themeColor, rng, archetype, centerY, lightColors);

        // 7. Sort by Z-Index
        finalComponents.sort((a, b) => a.zIndex - b.zIndex);

        return finalComponents;
    }

}
