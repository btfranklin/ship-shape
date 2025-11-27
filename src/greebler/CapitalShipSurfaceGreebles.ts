import { HSBAColor, RNG } from './common.js';
import type { Drawable } from './common.js';
import { PanelGreebles } from './PanelGreebles.js';
import { PipeGreebles } from './PipeGreebles.js';
import { LightPanelGreebles } from './LightPanelGreebles.js';
import { EquipmentGreebles } from './EquipmentGreebles.js';

type SurfaceArchetype = 'standard' | 'industrial' | 'tech' | 'clean' | 'dense';

export class CapitalShipSurfaceGreebles implements Drawable {
    constructor(
        public xUnits: number, 
        public yUnits: number, 
        public themeColor: HSBAColor
    ) {}

    draw(context: CanvasRenderingContext2D, rng: RNG): void {
        context.save();
        
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

        // Pick Archetype
        const archetype: SurfaceArchetype = rng.choice(['standard', 'standard', 'industrial', 'tech', 'clean', 'dense']);
        
        let panelCount = 8;
        let pipeRange = [2, 5];
        let pipeChance = 0.7;
        let lightRange = [1, 3];
        let lightChance = 0.6;
        let equipRange = [1, 3];
        let equipChance = 0.2;

        switch (archetype) {
            case 'industrial':
                panelCount = 15;
                pipeRange = [6, 12];
                pipeChance = 1.0;
                lightRange = [0, 1];
                lightChance = 0.3;
                equipChance = 0.1;
                break;
            case 'tech':
                panelCount = 5;
                pipeRange = [1, 3];
                pipeChance = 0.5;
                lightRange = [2, 5];
                lightChance = 0.8;
                equipRange = [5, 10];
                equipChance = 0.9;
                break;
            case 'clean':
                panelCount = 4;
                pipeChance = 0.1;
                lightRange = [1, 2];
                lightChance = 0.4;
                equipChance = 0.0;
                break;
            case 'dense':
                panelCount = 20;
                pipeRange = [3, 8];
                pipeChance = 0.9;
                lightRange = [1, 4];
                lightChance = 0.5;
                equipRange = [2, 5];
                equipChance = 0.5;
                break;
        }

        // 2. Panels (Hull Plating)
        const panels = new PanelGreebles(this.xUnits, this.yUnits, this.themeColor, panelCount, archetype === 'industrial' || archetype === 'dense');
        panels.draw(context, rng);
        
        // 3. Pipes (Infrastructure)
        if (rng.bool(pipeChance)) {
            const pipes = new PipeGreebles(this.xUnits, this.yUnits, this.themeColor, rng.intRange(pipeRange[0], pipeRange[1]));
            pipes.draw(context, rng);
        }

        // 4. Equipment (Tech bits - Antennae, Vents)
        // Draw before lights so lights can be on top if needed, or interspersed.
        if (rng.bool(equipChance)) {
            const equip = new EquipmentGreebles(this.xUnits, this.yUnits, this.themeColor, rng.intRange(equipRange[0], equipRange[1]));
            equip.draw(context, rng);
        }
        
        // 5. Light Panels
        if (rng.bool(lightChance)) {
            const lights = new LightPanelGreebles(this.xUnits, this.yUnits, this.themeColor, rng.intRange(lightRange[0], lightRange[1]));
            lights.draw(context, rng);
        }

        context.restore();
    }
}
