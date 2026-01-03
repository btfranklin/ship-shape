import { HSBAColor, RNG } from './common.js';
import type { Drawable } from './common.js';
import { PanelGreebles } from './PanelGreebles.js';
import { PipeGreebles } from './PipeGreebles.js';
import { LightPanelGreebles } from './LightPanelGreebles.js';
import { EquipmentGreebles, EquipmentTrenchGreebles } from './EquipmentGreebles.js';
import { HoseGreebles } from './HoseGreebles.js';
import { ElectronicsPanelGreebles } from './ElectronicsPanelGreebles.js';
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
                if (compType === 'tower') return rng.bool(0.25) ? 'tech' : 'standard';
                return 'standard'; 
                
            case 'combat':
                if (compType === 'hull') return rng.bool(0.6) ? 'dense' : 'standard'; 
                if (compType === 'weapon') return 'dense';
                if (compType === 'tower') return 'standard';
                return 'standard';
                
            case 'freight':
                if (compType === 'storage') return 'clean'; // Containers
                if (compType === 'hull') return 'standard';
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
                pipeChance = 0.1;
                lightRange = [1, 2];
                lightChance = 0.4;
                equipChance = 0.0;
                hoseChance = 0.0;
                electronicsChance = 0.08;
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

        // 2. Panels OR Trench - BASE LAYER
        if (style === 'trench') {
            // EquipmentTrenchGreebles has a hardcoded internal scale of 0.1. 
            // To make it fill the component height (this.yUnits), we must pass a width scaled up by 10.
            const trenchWidth = this.yUnits * 10;
            const trench = new EquipmentTrenchGreebles(this.xUnits, this.yUnits, this.themeColor, this.yUnits / 2, trenchWidth);
            trench.draw(context, rng);
        } else {
            const area = Math.max(0.5, this.xUnits * this.yUnits); // Ensure tiny components don't break
            const panelCount = Math.floor(Math.max(1, area * panelDensity));
            const showRivets = style === 'industrial' || style === 'dense' || (style === 'standard' && rng.bool(0.5));
            
            const panels = new PanelGreebles(this.xUnits, this.yUnits, this.themeColor, panelCount, showRivets, this.skipBaseFill);
            panels.draw(context, rng);
        }
        
        // 3. Cutaway Sections (Damage/Exposed Innards) - INSET LAYER
        // Draws "into" the hull, so should be before raised elements.
        if (this.isTrunk && rng.bool(cutawayChance)) {
            const cutaways = new CutawaySectionGreebles(this.xUnits, this.yUnits, this.themeColor, rng.intRange(1, 2));
            cutaways.draw(context, rng);
        }

        // 4. Electronics Panels (Tech hardware) - INSET SURFACE LAYER
        if (rng.bool(electronicsChance)) {
            const boxes = new ElectronicsPanelGreebles(
                this.xUnits,
                this.yUnits,
                this.themeColor,
                rng.intRange(electronicsRange[0], electronicsRange[1])
            );
            boxes.draw(context, rng);
        }

        // 5. Equipment (Tech bits) - SURFACE LAYER
        if (rng.bool(equipChance)) {
            const equip = new EquipmentGreebles(this.xUnits, this.yUnits, this.themeColor, rng.intRange(equipRange[0], equipRange[1]));
            equip.draw(context, rng);
        }
        
        // 6. Pipes (Infrastructure) - RAISED LAYER 1
        if (rng.bool(pipeChance)) {
            const pipes = new PipeGreebles(this.xUnits, this.yUnits, this.themeColor, rng.intRange(pipeRange[0], pipeRange[1]));
            pipes.draw(context, rng);
        }

        // 7. Light Panels - OVERLAY
        if (rng.bool(lightChance)) {
            const lights = new LightPanelGreebles(this.xUnits, this.yUnits, this.themeColor, rng.intRange(lightRange[0], lightRange[1]));
            lights.draw(context, rng);
        }

        // 8. Hoses (Heavy connectors) - RAISED LAYER 2
        if (rng.bool(hoseChance)) {
            const hoses = new HoseGreebles(this.xUnits, this.yUnits, this.themeColor, rng.intRange(hoseRange[0], hoseRange[1]), false);
            hoses.draw(context, rng);
        }

        context.restore();
    }
}
