import { HSBAColor, RNG } from './common.js';
import type { Drawable } from './common.js';
import { UNIT_SCALE } from './constants.js';
import { PanelGreebles } from './PanelGreebles.js';
import { PipeGreebles } from './PipeGreebles.js';
import { LightPanelGreebles } from './LightPanelGreebles.js';
import { EquipmentGreebles, EquipmentTrenchGreebles } from './EquipmentGreebles.js';
import { HoseGreebles } from './HoseGreebles.js';
import { ElectronicsPanelGreebles } from './ElectronicsPanelGreebles.js';
import { CapitalShipWindowsGreebles } from './CapitalShipWindowsGreebles.js';
import { CutawaySectionGreebles } from './CutawaySectionGreebles.js';
import { ShipArchetype, ComponentType } from '../ship-shape/shipTypes.js';

type GreebleStyle = 'standard' | 'industrial' | 'tech' | 'clean' | 'dense' | 'structure' | 'trench';

export class CapitalShipSurfaceGreebles implements Drawable {
    constructor(
        public xUnits: number, 
        public yUnits: number, 
        public themeColor: HSBAColor,
        public shipArchetype: ShipArchetype,
        public componentType: ComponentType,
        public skipBaseFill: boolean = false,
        public isTrunk: boolean = false
    ) {}

    private determineStyle(shipArch: ShipArchetype, compType: ComponentType, rng: RNG): GreebleStyle {
        // Hard overrides
        if (compType === 'trench') return 'trench';
        if (compType === 'ring') return 'structure';
        if (compType === 'sphere') return 'structure'; 
        
        // Bias based on Ship Archetype
        switch (shipArch) {
            case 'science':
                if (compType === 'engine') return rng.bool(0.5) ? 'clean' : 'tech';
                if (compType === 'sensor') return 'tech';
                if (compType === 'tower') return rng.bool(0.4) ? 'tech' : 'clean';
                if (compType === 'hull') return rng.bool(0.7) ? 'clean' : 'standard';
                return 'clean';
                
            case 'industry':
                if (compType === 'hull') return this.isTrunk ? 'industrial' : 'standard';
                if (compType === 'storage') return 'industrial';
                if (compType === 'engine') return 'industrial';
                if (compType === 'tower') {
                    if (rng.bool(0.25)) return 'tech';
                    return rng.bool(0.4) ? 'clean' : 'standard';
                }
                return 'standard'; 
                
            case 'combat':
                if (compType === 'hull') return rng.bool(0.6) ? 'dense' : 'standard'; 
                if (compType === 'weapon') return 'dense';
                if (compType === 'tower') return 'standard';
                return 'standard';
                
            case 'freight':
                if (compType === 'storage') return 'clean'; // Containers
                if (compType === 'hull') return rng.bool(0.4) ? 'clean' : 'standard';
                return 'standard';
                
            case 'passenger':
                if (compType === 'hull') return 'clean';
                return 'clean';
                
            default:
                return 'standard';
        }
    }

    draw(context: CanvasRenderingContext2D, rng: RNG): void {
        context.save();
        
        if (!this.skipBaseFill) {
            // Base fill
            context.fillStyle = this.themeColor.toRGBAString();
            context.fillRect(0, 0, this.xUnits, this.yUnits);

            // 1. Noise (Texture)
            const area = this.xUnits * this.yUnits;
            const count = Math.floor(area * 1000); 

            for (let i = 0; i < count; i++) {
                const panelColor = this.themeColor.withSaturation(rng.range(-0.05, 0.05));
                context.fillStyle = panelColor.toRGBAString();
                const w = rng.range(0.01, 0.03);
                const h = rng.range(0.01, 0.03);
                const x = rng.range(0, this.xUnits);
                const y = rng.range(0, this.yUnits);
                context.fillRect(x, y, w, h);
            }
        }

        // Pick Archetype (Style)
        const style: GreebleStyle = this.determineStyle(this.shipArchetype, this.componentType, rng);
        const isTrenchStyle = style === 'trench';
        
        let panelDensity = 8;
        let pipeRange = [2, 5];
        let pipeChance = 0.7;
        let lightRange = [1, 3];
        let lightChance = 0.6;
        let equipRange = [1, 3];
        let equipChance = 0.2;
        
        let hoseChance = 0.1;
        let hoseRange = [1, 2];
        let electronicsChance = 0.0;
        let electronicsRange = [1, 2];
        let windowChance = 0.0;
        let windowRange = [2, 6];
        let trenchChance = 0.1;
        let trenchHeightRange = [30 / UNIT_SCALE, 60 / UNIT_SCALE];
        
        let cutawayChance = 0.05; // Rare by default

        switch (style) {
            case 'industrial':
                panelDensity = 15;
                pipeRange = [6, 12];
                pipeChance = 1.0;
                lightRange = [0, 1];
                lightChance = 0.3;
                equipChance = 0.1;
                hoseChance = 0.8;
                hoseRange = [2, 5];
                electronicsChance = 0.35;
                cutawayChance = 0.2;
                break;
            case 'tech':
                panelDensity = 5;
                pipeRange = [1, 3];
                pipeChance = 0.5;
                lightRange = [2, 5];
                lightChance = 0.8;
                equipRange = [5, 10];
                equipChance = 0.9;
                electronicsChance = 0.6;
                cutawayChance = 0.1;
                break;
            case 'clean':
                panelDensity = 4;
                pipeChance = 0.0;
                lightRange = [1, 2];
                lightChance = 0.4;
                equipChance = 0.0;
                hoseChance = 0.0;
                electronicsChance = 0.08;
                windowChance = 0.6;
                cutawayChance = 0.0;
                break;
            case 'dense':
                panelDensity = 20;
                pipeRange = [3, 8];
                pipeChance = 0.9;
                lightRange = [1, 4];
                lightChance = 0.5;
                equipRange = [2, 5];
                equipChance = 0.5;
                hoseChance = 0.6;
                electronicsChance = 0.2;
                cutawayChance = 0.1;
                break;
            case 'structure':
                panelDensity = 6;
                pipeChance = 0.0;
                lightChance = 0.0;
                equipChance = 0.0;
                hoseChance = 0.0;
                electronicsChance = 0.0;
                cutawayChance = 0.0;
                break;
            case 'trench':
                panelDensity = 0;
                pipeChance = 0.0;
                lightChance = 0.0;
                equipChance = 0.0;
                hoseChance = 0.0;
                electronicsChance = 0.0;
                trenchChance = 1.0;
                trenchHeightRange = [this.yUnits, this.yUnits];
                cutawayChance = 0.0;
                break;
        }

        const allowsElectronics =
            this.shipArchetype === 'science' ||
            this.shipArchetype === 'industry' ||
            this.shipArchetype === 'freight';

        if (!allowsElectronics) {
            electronicsChance = 0.0;
        }

        const allowsWindows =
            style === 'clean' &&
            (this.componentType === 'hull' || this.componentType === 'tower');
        const hasWindows = allowsWindows && rng.bool(windowChance);
        const windowColor =
            this.shipArchetype === 'industry'
                ? CapitalShipWindowsGreebles.AMBER_LIGHT
                : CapitalShipWindowsGreebles.BLUE_LIGHT;

        const allowsTrench =
            isTrenchStyle ||
            (this.isTrunk &&
                this.shipArchetype !== 'passenger' &&
                this.yUnits * UNIT_SCALE > 150);
        if (!allowsTrench) {
            trenchChance = 0.0;
        }

        const hasTrench = allowsTrench && (isTrenchStyle || rng.bool(trenchChance));
        let trenchHeight = 0;
        let trenchY = 0;

        if (hasTrench) {
            if (isTrenchStyle) {
                trenchHeight = this.yUnits;
                trenchY = 0;
            } else {
                const maxHeight = Math.min(trenchHeightRange[1], this.yUnits);
                const minHeight = Math.min(trenchHeightRange[0], maxHeight);
                trenchHeight = minHeight === maxHeight ? minHeight : rng.range(minHeight, maxHeight);

                const minY = this.yUnits * 0.2;
                const maxY = Math.max(minY, this.yUnits * 0.8 - trenchHeight);
                trenchY = rng.range(minY, maxY);
            }
        }

        // 2. Panels - BASE LAYER
        if (!isTrenchStyle) {
            const area = Math.max(0.5, this.xUnits * this.yUnits); // Ensure tiny components don't break
            const panelCount = Math.floor(Math.max(1, area * panelDensity));
            const showRivets = style === 'industrial' || style === 'dense' || (style === 'standard' && rng.bool(0.5));
            
            const panels = new PanelGreebles(this.xUnits, this.yUnits, this.themeColor, panelCount, showRivets, this.skipBaseFill);
            panels.draw(context, rng);
        }
        
        // 3. Electronics Panels (Tech hardware) - INSET SURFACE LAYER
        if (rng.bool(electronicsChance)) {
            const boxes = new ElectronicsPanelGreebles(
                this.xUnits,
                this.yUnits,
                this.themeColor,
                rng.intRange(electronicsRange[0], electronicsRange[1])
            );
            boxes.draw(context, rng);
        }

        // 4. Windows (Passenger rows) - INSET SURFACE LAYER
        if (hasWindows) {
            const windows = new CapitalShipWindowsGreebles(
                this.xUnits,
                this.yUnits,
                this.themeColor,
                rng.intRange(windowRange[0], windowRange[1]),
                windowColor
            );
            windows.draw(context, rng);
        }

        // 5. Trench (Inset access) - INSET LAYER
        if (hasTrench) {
            const trench = new EquipmentTrenchGreebles(
                this.xUnits,
                this.yUnits,
                this.themeColor,
                trenchY,
                trenchHeight
            );
            trench.draw(context, rng);
        }

        // 6. Cutaway Sections (Damage/Exposed Innards) - INSET LAYER
        // Draws "into" the hull, so should be before raised elements.
        if (this.isTrunk && rng.bool(cutawayChance)) {
            const cutaways = new CutawaySectionGreebles(this.xUnits, this.yUnits, this.themeColor, rng.intRange(1, 2));
            cutaways.draw(context, rng);
        }

        // 7. Equipment (Tech bits) - SURFACE LAYER
        if (rng.bool(equipChance)) {
            const equip = new EquipmentGreebles(this.xUnits, this.yUnits, this.themeColor, rng.intRange(equipRange[0], equipRange[1]));
            equip.draw(context, rng);
        }
        
        // 8. Pipes (Infrastructure) - RAISED LAYER 1
        if (rng.bool(pipeChance)) {
            const pipes = new PipeGreebles(this.xUnits, this.yUnits, this.themeColor, rng.intRange(pipeRange[0], pipeRange[1]));
            pipes.draw(context, rng);
        }

        // 9. Light Panels - OVERLAY
        if (rng.bool(lightChance)) {
            const lights = new LightPanelGreebles(this.xUnits, this.yUnits, this.themeColor, rng.intRange(lightRange[0], lightRange[1]));
            lights.draw(context, rng);
        }

        // 10. Hoses (Heavy connectors) - RAISED LAYER 2
        if (rng.bool(hoseChance)) {
            const hoses = new HoseGreebles(this.xUnits, this.yUnits, this.themeColor, rng.intRange(hoseRange[0], hoseRange[1]), false);
            hoses.draw(context, rng);
        }

        context.restore();
    }
}
