import { HSBAColor, RNG } from '../greebles/common.js';
import { ComponentVariant, ShipBounds, ShipComponent } from './ShipComponent.js';
import { ComponentType, ShipArchetype } from './shipTypes.js';
import type { ShipNode } from './compositeTypes.js';

interface GrowthContext {
    totalW: number;
    totalH: number;
    theme: HSBAColor;
    rng: RNG;
    archetype: ShipArchetype;
    shipCenterY: number;
    lightColors: HSBAColor[];
}

export class CompositeShipGrowthPlanner {
    grow(node: ShipNode, depth: number, maxDepth: number, context: GrowthContext): void {
        if (depth >= maxDepth) return;
        const { totalW, totalH, theme, rng, archetype, shipCenterY, lightColors } = context;

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
                const childComp = new ShipComponent({
                    bounds: { x, y, w, h },
                    zIndex: parentComp.zIndex + 10,
                    type,
                    color: theme,
                    rng,
                    shipArchetype: archetype,
                    isTrunk: true,
                    shipCenterY,
                    lightColors,
                });
                
                const childNode = { component: childComp, children: [] };
                node.children.push(childNode);
                grownForward = true;
                
                this.grow(childNode, depth + 1, maxDepth, context);
            }
        }

        if (!grownForward && (parentComp.type === 'hull' || parentComp.type === 'engine')) {
            this.addNose(node, context);
        }

        if (rng.bool(upChance)) {
            const childNode = this.addSideComponent('top', node, context);
            if (childNode.component.type === 'tower') {
                this.addTowerSensors(childNode, context);
                this.grow(childNode, depth + 1, maxDepth, context);
            }
        }

        if (rng.bool(downChance)) {
            this.addSideComponent('bottom', node, context);
        }

        if (archetype === 'combat' && parentComp.type !== 'engine' && rng.bool(0.4)) {
            let s = rng.range(60, 80);
            s = Math.min(s, pBounds.w * 0.9, pBounds.h * 0.9);
            
            const w = s;
            const h = s;
            const x = pBounds.x + (pBounds.w - w) / 2;
            const y = pBounds.y + (pBounds.h - h) / 2;
            
            const weapon = new ShipComponent({
                bounds: { x, y, w, h },
                zIndex: 500,
                type: 'weapon',
                color: theme.withBrightness(-0.15),
                rng,
                shipArchetype: archetype,
                variant: 'top-view',
                facing: x < totalW / 3 ? 'backward' : 'forward',
                shipCenterY,
                lightColors,
            });
            node.children.push({ component: weapon, children: [] });
        }
    }

    private addSideComponent(
        side: 'top' | 'bottom',
        parentNode: ShipNode,
        context: GrowthContext
    ): ShipNode {
        const { totalW, theme, rng, archetype, shipCenterY, lightColors } = context;
        const parent = parentNode.component;
        const { type, variant } = this.chooseSideComponent(side, archetype, rng);
        const { w, h } = this.sizeSideComponent(side, type, parent.bounds, rng);
        const x = parent.bounds.x + rng.range(0, parent.bounds.w - w);
        const y = this.placeSideComponent(side, type, parent.bounds, h);

        const component = new ShipComponent({
            bounds: { x, y, w, h },
            zIndex: parent.zIndex - 1,
            type,
            color: theme.withBrightness(side === 'top' ? 0.1 : -0.1),
            rng,
            shipArchetype: archetype,
            variant,
            invertLighting: side === 'bottom',
            facing: type === 'weapon' && x < totalW / 3 ? 'backward' : 'forward',
            shipCenterY,
            lightColors,
        });
        const childNode: ShipNode = { component, children: [] };
        parentNode.children.push(childNode);
        return childNode;
    }

    private chooseSideComponent(
        side: 'top' | 'bottom',
        archetype: ShipArchetype,
        rng: RNG
    ): { type: ComponentType; variant: ComponentVariant } {
        const roll = rng.next();
        const weaponThreshold = archetype === 'combat' ? 0.3 : 0;
        const sensorThreshold = weaponThreshold
            + (archetype === 'combat' ? 0.2 : archetype === 'science' ? 0.3 : 0.05);

        if (roll < weaponThreshold) return { type: 'weapon', variant: 'default' };
        if (roll < sensorThreshold) return { type: 'sensor', variant: 'default' };

        if (side === 'bottom') {
            return roll < sensorThreshold + 0.3
                ? { type: 'hull', variant: 'taper-bottom' }
                : { type: 'sphere', variant: 'default' };
        }

        const towerThreshold = sensorThreshold + 0.3;
        if (roll < towerThreshold) return { type: 'tower', variant: 'default' };
        if (roll < towerThreshold + 0.2) return { type: 'hull', variant: 'taper-top' };
        if (roll < towerThreshold + 0.3) return { type: 'sphere', variant: 'default' };
        return { type: 'hull', variant: 'default' };
    }

    private sizeSideComponent(
        side: 'top' | 'bottom',
        type: ComponentType,
        parent: Readonly<ShipBounds>,
        rng: RNG
    ): { w: number; h: number } {
        let w = parent.w * rng.range(side === 'top' ? 0.3 : 0.4, 0.6);
        let h = parent.h * rng.range(side === 'top' ? 0.5 : 0.4, side === 'top' ? 1.2 : 0.6);

        if (type === 'weapon') {
            w = Math.min(rng.range(60, 80), parent.w);
            h = w * 0.5;
        } else if (type === 'sensor') {
            w = parent.w * rng.range(0.3, 0.6);
            h = parent.h * rng.range(0.3, 0.6);
        } else if (type === 'tower') {
            w = parent.w * rng.range(0.2, 0.4);
            h = parent.h * rng.range(0.8, 1.5);
        } else if (type === 'hull') {
            w = parent.w * rng.range(0.5, 0.8);
            h = parent.h * rng.range(0.4, 0.7);
        } else if (type === 'sphere') {
            const maxScale = side === 'top' ? 0.7 : 0.6;
            const size = Math.min(parent.w, parent.h) * rng.range(0.4, maxScale);
            w = size;
            h = size;
        }

        return { w, h };
    }

    private placeSideComponent(
        side: 'top' | 'bottom',
        type: ComponentType,
        parent: Readonly<ShipBounds>,
        height: number
    ): number {
        if (side === 'top') {
            const overlap = type === 'sphere' ? 0.5 : type === 'sensor' || type === 'weapon' ? 0.9 : 0.8;
            return parent.y - height * overlap;
        }

        const overlap = type === 'sphere' ? 0.5 : type === 'sensor' || type === 'weapon' ? 0.1 : 0.2;
        return parent.y + parent.h - height * overlap;
    }

    private addNose(node: ShipNode, context: GrowthContext): void {
        const { totalW, theme, rng, archetype, shipCenterY, lightColors } = context;
        const parent = node.component;
        const pBounds = parent.bounds;
        const overlap = pBounds.w * 0.1;
        const currentRight = pBounds.x + pBounds.w;
        const startX = currentRight - overlap;
        
        const limit = totalW - (totalW * 0.02);
        const maxW = limit - startX;
        
        if (maxW < 10) return;

        const noseChoices = ['taper', 'sphere-large', 'sphere-small'];
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
            
            const nose = new ShipComponent({
                bounds: { x: startX, y, w, h },
                zIndex: parent.zIndex - 1,
                type: 'hull',
                color: theme,
                rng,
                shipArchetype: archetype,
                variant: 'taper-front',
                isTrunk: true,
                shipCenterY,
                lightColors,
            });
            node.children.push({ component: nose, children: [] });
            
        } else if (choice === 'sensor') {
            const h = pBounds.h * rng.range(0.5, 0.8);
            let w = pBounds.h * rng.range(0.4, 0.8); 
            w = Math.min(w, maxW);
            
            const y = pBounds.y + (pBounds.h - h)/2;
            const sensorOverlap = pBounds.w * 0.05; 
            const x = currentRight - sensorOverlap; 
            
            const nose = new ShipComponent({
                bounds: { x, y, w, h },
                zIndex: parent.zIndex - 1,
                type: 'sensor',
                color: theme,
                rng,
                shipArchetype: archetype,
                variant: 'front',
                shipCenterY,
                lightColors,
            });
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
            
            const nose = new ShipComponent({
                bounds: { x: sphereX, y, w: s, h: s },
                zIndex: parent.zIndex - 1,
                type: 'sphere',
                color: theme,
                rng,
                shipArchetype: archetype,
                variant: 'nose',
                shipCenterY,
                lightColors,
            });
            node.children.push({ component: nose, children: [] });
        }
    }

    private addTowerSensors(node: ShipNode, context: GrowthContext): void {
        const { rng, archetype, lightColors } = context;
        const tower = node.component;
        const hasFrontSensor = rng.bool(0.3);
        const hasBackSensor = rng.bool(0.1);

        if (!hasFrontSensor && !hasBackSensor) return;

        const sensorH = tower.bounds.w * rng.range(0.3, 0.5);
        const sensorW = tower.bounds.w * 0.6;
        const sensorZ = tower.zIndex - 0.5;
        const shipCenterX = tower.bounds.x + tower.bounds.w / 2;

        const createSensor = (variant: 'front' | 'back', x: number, y: number) => {
            const sensor = new ShipComponent({
                bounds: { x, y, w: sensorW, h: sensorH },
                zIndex: sensorZ,
                type: 'sensor',
                color: tower.color,
                rng,
                shipArchetype: archetype,
                variant,
                shipCenterX,
                lightColors,
            });
            node.children.push({ component: sensor, children: [] });
        };

        if (hasFrontSensor) {
            const sensorY = tower.bounds.y + rng.range(0, tower.bounds.h - sensorH);
            const sensorX = tower.bounds.x + tower.bounds.w - 2;
            createSensor('front', sensorX, sensorY);
        }

        if (hasBackSensor) {
            const sensorY = tower.bounds.y + rng.range(0, tower.bounds.h - sensorH);
            const sensorX = tower.bounds.x + 2 - sensorW;
            createSensor('back', sensorX, sensorY);
        }
    }
}
