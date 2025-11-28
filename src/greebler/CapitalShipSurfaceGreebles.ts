import { HSBAColor, RNG } from './common.js';
import type { Drawable } from './common.js';
import { PanelGreebles } from './PanelGreebles.js';
import { PipeGreebles } from './PipeGreebles.js';
import { LightPanelGreebles } from './LightPanelGreebles.js';
import { EquipmentGreebles, EquipmentTrenchGreebles } from './EquipmentGreebles.js';
import { HoseGreebles } from './HoseGreebles.js';
import { WireGreebles } from './WireGreebles.js';
import { CutawaySectionGreebles } from './CutawaySectionGreebles.js';

export type SurfaceArchetype = 'standard' | 'industrial' | 'tech' | 'clean' | 'dense' | 'structure' | 'trench';

export class CapitalShipSurfaceGreebles implements Drawable {
    constructor(
        public xUnits: number, 
        public yUnits: number, 
        public themeColor: HSBAColor,
        public forcedArchetype?: SurfaceArchetype,
        public skipBaseFill: boolean = false
    ) {}

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

        // Pick Archetype
        const archetype: SurfaceArchetype = this.forcedArchetype ?? rng.choice(['standard', 'standard', 'industrial', 'tech', 'clean', 'dense']);
        
        let panelCount = 8;
        let pipeRange = [2, 5];
        let pipeChance = 0.7;
        let lightRange = [1, 3];
        let lightChance = 0.6;
        let equipRange = [1, 3];
        let equipChance = 0.2;
        
        let hoseChance = 0.1;
        let hoseRange = [1, 2];
        let wireChance = 0.0; // Default to 0, only tech archetypes should have wires
        let wireRange = [5, 10];
        
        let cutawayChance = 0.05; // Rare by default

        switch (archetype) {
            case 'industrial':
                panelCount = 15;
                pipeRange = [6, 12];
                pipeChance = 1.0;
                lightRange = [0, 1];
                lightChance = 0.3;
                equipChance = 0.1;
                hoseChance = 0.8;
                hoseRange = [2, 5];
                wireChance = 0.0;
                cutawayChance = 0.2;
                break;
            case 'tech':
                panelCount = 5;
                pipeRange = [1, 3];
                pipeChance = 0.5;
                lightRange = [2, 5];
                lightChance = 0.8;
                equipRange = [5, 10];
                equipChance = 0.9;
                wireChance = 0.8;
                wireRange = [10, 20];
                cutawayChance = 0.1;
                break;
            case 'clean':
                panelCount = 4;
                pipeChance = 0.1;
                lightRange = [1, 2];
                lightChance = 0.4;
                equipChance = 0.0;
                hoseChance = 0.0;
                wireChance = 0.0;
                cutawayChance = 0.0;
                break;
            case 'dense':
                panelCount = 20;
                pipeRange = [3, 8];
                pipeChance = 0.9;
                lightRange = [1, 4];
                lightChance = 0.5;
                equipRange = [2, 5];
                equipChance = 0.5;
                hoseChance = 0.6;
                wireChance = 0.0;
                cutawayChance = 0.1;
                break;
            case 'structure':
                panelCount = 6;
                pipeChance = 0.0;
                lightChance = 0.0;
                equipChance = 0.0;
                hoseChance = 0.0;
                wireChance = 0.0;
                cutawayChance = 0.0;
                break;
            case 'trench':
                panelCount = 0;
                pipeChance = 0.0;
                lightChance = 0.0;
                equipChance = 0.0;
                hoseChance = 0.0;
                wireChance = 0.0;
                cutawayChance = 0.0;
                break;
        }

        // 2. Panels OR Trench - BASE LAYER
        if (archetype === 'trench') {
            // EquipmentTrenchGreebles has a hardcoded internal scale of 0.1. 
            // To make it fill the component height (this.yUnits), we must pass a width scaled up by 10.
            const trenchWidth = this.yUnits * 10;
            const trench = new EquipmentTrenchGreebles(this.xUnits, this.yUnits, this.themeColor, this.yUnits / 2, trenchWidth);
            trench.draw(context, rng);
        } else {
            const panels = new PanelGreebles(this.xUnits, this.yUnits, this.themeColor, panelCount, archetype === 'industrial' || archetype === 'dense', this.skipBaseFill);
            panels.draw(context, rng);
        }
        
        // 3. Cutaway Sections (Damage/Exposed Innards) - INSET LAYER
        // Draws "into" the hull, so should be before raised elements.
        if (rng.bool(cutawayChance)) {
            const cutaways = new CutawaySectionGreebles(this.xUnits, this.yUnits, this.themeColor, rng.intRange(1, 2));
            cutaways.draw(context, rng);
        }

        // 4. Equipment (Tech bits) - SURFACE LAYER
        if (rng.bool(equipChance)) {
            const equip = new EquipmentGreebles(this.xUnits, this.yUnits, this.themeColor, rng.intRange(equipRange[0], equipRange[1]));
            equip.draw(context, rng);
        }
        
        // 5. Pipes (Infrastructure) - RAISED LAYER 1
        if (rng.bool(pipeChance)) {
            const pipes = new PipeGreebles(this.xUnits, this.yUnits, this.themeColor, rng.intRange(pipeRange[0], pipeRange[1]));
            pipes.draw(context, rng);
        }

        // 6. Light Panels - OVERLAY
        if (rng.bool(lightChance)) {
            const lights = new LightPanelGreebles(this.xUnits, this.yUnits, this.themeColor, rng.intRange(lightRange[0], lightRange[1]));
            lights.draw(context, rng);
        }

        // 7. Hoses (Heavy connectors) - RAISED LAYER 2
        if (rng.bool(hoseChance)) {
            const hoses = new HoseGreebles(this.xUnits, this.yUnits, this.themeColor, rng.intRange(hoseRange[0], hoseRange[1]), false);
            hoses.draw(context, rng);
        }
        
        // 8. Wires (Messy cables) - RAISED LAYER 3 (Topmost messy stuff)
        if (rng.bool(wireChance)) {
            const wires = new WireGreebles(this.xUnits, this.yUnits, rng.intRange(wireRange[0], wireRange[1]), undefined, rng.intRange(1, 3), false);
            wires.draw(context, rng);
        }

        context.restore();
    }
}
