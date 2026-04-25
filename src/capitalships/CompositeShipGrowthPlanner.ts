import { HSBAColor, RNG } from '../greebles/common.js';
import { ShipComponent } from './ShipComponent.js';
import { ComponentType, ShipArchetype } from './shipTypes.js';
import type { ShipNode } from './compositeTypes.js';

export class CompositeShipGrowthPlanner {
    grow(node: ShipNode, depth: number, maxDepth: number, totalW: number, totalH: number, theme: HSBAColor, rng: RNG, archetype: ShipArchetype, shipCenterY: number, lightColors: HSBAColor[]) {
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
                    true,
                    false,
                    undefined,
                    shipCenterY,
                    undefined,
                    lightColors
                );
                childComp.generateShape(rng);
                
                const childNode = { component: childComp, children: [] };
                node.children.push(childNode);
                grownForward = true;
                
                this.grow(childNode, depth + 1, maxDepth, totalW, totalH, theme, rng, archetype, shipCenterY, lightColors);
            }
        }

        if (!grownForward && (parentComp.type === 'hull' || parentComp.type === 'engine')) {
            this.addNose(node, totalW, totalH, theme, rng, archetype, shipCenterY, lightColors);
        }

        if (rng.bool(upChance)) {
            const r = rng.next();
            let type: ComponentType = 'tower';
            let variant = 'default';
            
            const weaponThreshold = (archetype === 'combat') ? 0.3 : 0.0;
            const sensorThreshold = weaponThreshold + ((archetype === 'science' || archetype === 'combat') ? (archetype === 'combat' ? 0.2 : 0.3) : 0.05);
            const towerThreshold = sensorThreshold + 0.3; 
            const taperThreshold = towerThreshold + 0.2;
            const sphereThreshold = taperThreshold + 0.1;
            
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
                shipCenterY,
                undefined,
                lightColors
            );
            
            if (type === 'weapon' && x < totalW / 3) {
                childComp.facing = 'backward';
            }

            childComp.generateShape(rng);
            
            const childNode = { component: childComp, children: [] };
            node.children.push(childNode);
            
            if (type === 'tower') {
                this.addTowerSensors(childNode, rng, archetype, lightColors);
                this.grow(childNode, depth + 1, maxDepth, totalW, totalH, theme, rng, archetype, shipCenterY, lightColors);
            }
        }

        if (rng.bool(downChance)) {
            const r = rng.next();
            let type: ComponentType = 'sphere';
            let variant = 'default';
            
            const weaponThreshold = (archetype === 'combat') ? 0.3 : 0.0;
            const sensorThreshold = weaponThreshold + ((archetype === 'science' || archetype === 'combat') ? (archetype === 'combat' ? 0.2 : 0.3) : 0.05);
            const taperThreshold = sensorThreshold + 0.3;
            
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
                true,
                undefined,
                shipCenterY,
                undefined,
                lightColors
            );
            
            if (type === 'weapon' && x < totalW / 3) {
                childComp.facing = 'backward';
            }

            childComp.generateShape(rng);
            
            const childNode = { component: childComp, children: [] };
            node.children.push(childNode);
        }

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
                shipCenterY,
                undefined,
                lightColors
            );
            
            if (x < totalW / 3) {
                weapon.facing = 'backward';
            }

            weapon.generateShape(rng);
            node.children.push({ component: weapon, children: [] });
        }
    }

    private addNose(node: ShipNode, totalW: number, totalH: number, theme: HSBAColor, rng: RNG, archetype: ShipArchetype, shipCenterY: number, lightColors: HSBAColor[]) {
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
            
            const nose = new ShipComponent(startX, y, w, h, parent.zIndex - 1, 'hull', theme, rng, archetype, 'taper-front', true, false, undefined, shipCenterY, undefined, lightColors); 
            nose.generateShape(rng);
            node.children.push({ component: nose, children: [] });
            
        } else if (choice === 'sensor') {
            const h = pBounds.h * rng.range(0.5, 0.8);
            let w = pBounds.h * rng.range(0.4, 0.8); 
            w = Math.min(w, maxW);
            
            const y = pBounds.y + (pBounds.h - h)/2;
            const sensorOverlap = pBounds.w * 0.05; 
            const x = currentRight - sensorOverlap; 
            
            const nose = new ShipComponent(x, y, w, h, parent.zIndex - 1, 'sensor', theme, rng, archetype, 'front', false, false, undefined, shipCenterY, undefined, lightColors);
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
            
            const nose = new ShipComponent(sphereX, y, s, s, parent.zIndex - 1, 'sphere', theme, rng, archetype, 'nose', false, false, undefined, shipCenterY, undefined, lightColors);
            nose.generateShape(rng);
            node.children.push({ component: nose, children: [] });
        }
    }

    private addTowerSensors(node: ShipNode, rng: RNG, archetype: ShipArchetype, lightColors: HSBAColor[]) {
        const tower = node.component;
        const hasFrontSensor = rng.bool(0.3);
        const hasBackSensor = rng.bool(0.1);

        if (!hasFrontSensor && !hasBackSensor) return;

        const sensorH = tower.bounds.w * rng.range(0.3, 0.5);
        const sensorW = tower.bounds.w * 0.6;
        const sensorZ = tower.zIndex - 0.5;
        const shipCenterX = tower.bounds.x + tower.bounds.w / 2;

        const createSensor = (variant: 'front' | 'back', x: number, y: number) => {
            const sensor = new ShipComponent(
                x,
                y,
                sensorW,
                sensorH,
                sensorZ,
                'sensor',
                tower.color,
                rng,
                archetype,
                variant,
                false,
                false,
                undefined,
                undefined,
                shipCenterX,
                lightColors
            );
            sensor.generateShape(rng);
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
