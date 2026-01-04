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

type GreebleStyle = 'standard' | 'industrial' | 'tech' | 'clean' | 'dense' | 'structure' | 'trench' | 'unstyled';
type OccluderPlan =
    | { kind: 'electronics'; seed: number; count: number }
    | { kind: 'windows'; seeds: number[]; color: HSBAColor }
    | { kind: 'trench'; seed: number; y: number; h: number }
    | { kind: 'cutaways'; seeds: number[] }
    | { kind: 'equipment'; seed: number; count: number }
    | { kind: 'pipes'; seed: number; count: number }
    | { kind: 'hoses'; seed: number; count: number };

type EmissivePlan = {
    lightPanels?: { seeds: number[]; colors: HSBAColor[] };
    windows?: { seeds: number[]; color: HSBAColor };
    cutaways?: { seeds: number[] };
    occludersAfterLights: OccluderPlan[];
    occludersAfterWindows: OccluderPlan[];
    occludersAfterCutaways: OccluderPlan[];
};

export class CapitalShipSurfaceGreebles implements Drawable {
    private emissivePlan?: EmissivePlan;

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
        if (compType === 'sphere') return 'structure';
        if (
            compType === 'engine' ||
            compType === 'storage' ||
            compType === 'sensor' ||
            compType === 'weapon' ||
            compType === 'ring'
        ) {
            return 'unstyled';
        }
        
        // Bias based on Ship Archetype
        switch (shipArch) {
            case 'science':
                if (compType === 'tower') return rng.bool(0.4) ? 'tech' : 'clean';
                if (compType === 'hull') return rng.bool(0.7) ? 'clean' : 'standard';
                return 'clean';
                
            case 'industry':
                if (compType === 'hull') return this.isTrunk ? 'industrial' : 'standard';
                if (compType === 'tower') {
                    if (rng.bool(0.25)) return 'tech';
                    return rng.bool(0.4) ? 'clean' : 'standard';
                }
                return 'standard'; 
                
            case 'combat':
                if (compType === 'hull') return rng.bool(0.6) ? 'dense' : 'standard'; 
                if (compType === 'tower') return 'standard';
                return 'standard';
                
            case 'freight':
                if (compType === 'hull') return rng.bool(0.4) ? 'clean' : 'standard';
                return 'standard';
                
            case 'passenger':
                if (compType === 'hull') return 'clean';
                return 'clean';
                
            default:
                return 'standard';
        }
    }

    draw(context: CanvasRenderingContext2D, rng: RNG, options?: { skipEmissive?: boolean }): void {
        context.save();
        const skipEmissive = options?.skipEmissive ?? false;
        this.emissivePlan = skipEmissive
            ? { occludersAfterLights: [], occludersAfterWindows: [], occludersAfterCutaways: [] }
            : undefined;
        
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
                windowChance = 0.2;
                cutawayChance = 0.2;
                break;
            case 'standard':
                windowChance = 0.15;
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
            case 'unstyled':
                panelDensity = 0;
                pipeChance = 0.0;
                lightChance = 0.0;
                equipChance = 0.0;
                hoseChance = 0.0;
                electronicsChance = 0.0;
                windowChance = 0.0;
                trenchChance = 0.0;
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
            (style === 'clean' || style === 'standard' || style === 'industrial') &&
            (this.componentType === 'hull' || this.componentType === 'tower');
        const hasWindows = allowsWindows && rng.bool(windowChance);
        const windowColor =
            this.shipArchetype === 'passenger' || this.shipArchetype === 'science'
                ? CapitalShipWindowsGreebles.BLUE_LIGHT
                : CapitalShipWindowsGreebles.AMBER_LIGHT;
        const nextSeed = () => rng.intRange(1, 0x7fffffff);

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
        
        // 3. Light Panels - INSET SURFACE LAYER
        if (rng.bool(lightChance)) {
            const panelCount = rng.intRange(lightRange[0], lightRange[1]);
            if (skipEmissive && this.emissivePlan) {
                const lightColors = new LightPanelGreebles(
                    this.xUnits,
                    this.yUnits,
                    this.themeColor,
                    1
                ).lightColors;
                const seeds: number[] = [];
                for (let i = 0; i < panelCount; i++) {
                    const seed = nextSeed();
                    const panels = new LightPanelGreebles(
                        this.xUnits,
                        this.yUnits,
                        this.themeColor,
                        1,
                        lightColors
                    );
                    panels.drawPanels(context, new RNG(seed));
                    seeds.push(seed);
                }
                this.emissivePlan.lightPanels = { seeds, colors: lightColors };
            } else {
                const panels = new LightPanelGreebles(this.xUnits, this.yUnits, this.themeColor, panelCount);
                panels.draw(context, rng);
            }
        }

        // 4. Electronics Panels (Tech hardware) - INSET SURFACE LAYER
        if (rng.bool(electronicsChance)) {
            const boxCount = rng.intRange(electronicsRange[0], electronicsRange[1]);
            const boxes = new ElectronicsPanelGreebles(
                this.xUnits,
                this.yUnits,
                this.themeColor,
                boxCount
            );
            if (skipEmissive && this.emissivePlan) {
                const seed = nextSeed();
                boxes.draw(context, new RNG(seed));
                this.emissivePlan.occludersAfterLights.push({
                    kind: 'electronics',
                    seed,
                    count: boxCount
                });
            } else {
                boxes.draw(context, rng);
            }
        }

        // 5. Windows (Passenger rows) - INSET SURFACE LAYER
        if (hasWindows) {
            const windowCount = rng.intRange(windowRange[0], windowRange[1]);
            if (skipEmissive && this.emissivePlan) {
                const seeds: number[] = [];
                for (let i = 0; i < windowCount; i++) {
                    const seed = nextSeed();
                    const windows = new CapitalShipWindowsGreebles(
                        this.xUnits,
                        this.yUnits,
                        this.themeColor,
                        1,
                        windowColor
                    );
                    windows.drawPanels(context, new RNG(seed));
                    seeds.push(seed);
                }
                this.emissivePlan.windows = { seeds, color: windowColor };
                this.emissivePlan.occludersAfterLights.push({
                    kind: 'windows',
                    seeds,
                    color: windowColor
                });
            } else {
                const windows = new CapitalShipWindowsGreebles(
                    this.xUnits,
                    this.yUnits,
                    this.themeColor,
                    windowCount,
                    windowColor
                );
                windows.draw(context, rng);
            }
        }

        // 6. Trench (Inset access) - INSET LAYER
        if (hasTrench) {
            const trench = new EquipmentTrenchGreebles(
                this.xUnits,
                this.yUnits,
                this.themeColor,
                trenchY,
                trenchHeight
            );
            if (skipEmissive && this.emissivePlan) {
                const seed = nextSeed();
                trench.draw(context, new RNG(seed));
                const plan = { kind: 'trench' as const, seed, y: trenchY, h: trenchHeight };
                this.emissivePlan.occludersAfterLights.push(plan);
                this.emissivePlan.occludersAfterWindows.push(plan);
            } else {
                trench.draw(context, rng);
            }
        }

        // 7. Cutaway Sections (Damage/Exposed Innards) - INSET LAYER
        // Draws "into" the hull, so should be before raised elements.
        if (this.isTrunk && rng.bool(cutawayChance)) {
            const cutawayCount = rng.intRange(1, 2);
            if (skipEmissive && this.emissivePlan) {
                const seeds: number[] = [];
                for (let i = 0; i < cutawayCount; i++) {
                    const seed = nextSeed();
                    const cutaway = new CutawaySectionGreebles(
                        this.xUnits,
                        this.yUnits,
                        this.themeColor,
                        1
                    );
                    cutaway.drawBase(context, new RNG(seed));
                    seeds.push(seed);
                }
                this.emissivePlan.cutaways = { seeds };
                const plan = { kind: 'cutaways' as const, seeds };
                this.emissivePlan.occludersAfterLights.push(plan);
                this.emissivePlan.occludersAfterWindows.push(plan);
            } else {
                const cutaways = new CutawaySectionGreebles(
                    this.xUnits,
                    this.yUnits,
                    this.themeColor,
                    cutawayCount
                );
                cutaways.draw(context, rng);
            }
        }

        // 8. Equipment (Tech bits) - SURFACE LAYER
        if (rng.bool(equipChance)) {
            const equipCount = rng.intRange(equipRange[0], equipRange[1]);
            const equip = new EquipmentGreebles(
                this.xUnits,
                this.yUnits,
                this.themeColor,
                equipCount
            );
            if (skipEmissive && this.emissivePlan) {
                const seed = nextSeed();
                equip.draw(context, new RNG(seed));
                const plan = { kind: 'equipment' as const, seed, count: equipCount };
                this.emissivePlan.occludersAfterLights.push(plan);
                this.emissivePlan.occludersAfterWindows.push(plan);
                this.emissivePlan.occludersAfterCutaways.push(plan);
            } else {
                equip.draw(context, rng);
            }
        }
        
        // 9. Pipes (Infrastructure) - RAISED LAYER 1
        if (rng.bool(pipeChance)) {
            const pipeCount = rng.intRange(pipeRange[0], pipeRange[1]);
            const pipes = new PipeGreebles(this.xUnits, this.yUnits, this.themeColor, pipeCount);
            if (skipEmissive && this.emissivePlan) {
                const seed = nextSeed();
                pipes.draw(context, new RNG(seed));
                const plan = { kind: 'pipes' as const, seed, count: pipeCount };
                this.emissivePlan.occludersAfterLights.push(plan);
                this.emissivePlan.occludersAfterWindows.push(plan);
                this.emissivePlan.occludersAfterCutaways.push(plan);
            } else {
                pipes.draw(context, rng);
            }
        }

        // 10. Hoses (Heavy connectors) - RAISED LAYER 2
        if (rng.bool(hoseChance)) {
            const hoseCount = rng.intRange(hoseRange[0], hoseRange[1]);
            const hoses = new HoseGreebles(this.xUnits, this.yUnits, this.themeColor, hoseCount, false);
            if (skipEmissive && this.emissivePlan) {
                const seed = nextSeed();
                hoses.draw(context, new RNG(seed));
                const plan = { kind: 'hoses' as const, seed, count: hoseCount };
                this.emissivePlan.occludersAfterLights.push(plan);
                this.emissivePlan.occludersAfterWindows.push(plan);
                this.emissivePlan.occludersAfterCutaways.push(plan);
            } else {
                hoses.draw(context, rng);
            }
        }

        context.restore();
    }

    drawEmissive(context: CanvasRenderingContext2D, _rng: RNG, options?: { clipPath?: Path2D }): void {
        if (!this.emissivePlan) return;

        const plan = this.emissivePlan;
        const offscreen = this.createOffscreenContext(context);
        const transform = typeof context.getTransform === 'function' ? context.getTransform() : null;

        if (!offscreen || !transform) {
            this.drawEmissiveDirect(context, plan);
            return;
        }

        const mask = this.createOffscreenContext(context);
        const temp = this.createOffscreenContext(context);

        if (!mask || !temp) {
            this.drawEmissiveDirect(context, plan);
            return;
        }

        const { ctx: offCtx, canvas } = offscreen;
        const { ctx: maskCtx, canvas: maskCanvas } = mask;
        const { ctx: tempCtx, canvas: tempCanvas } = temp;

        const applyTransform = (ctx: CanvasRenderingContext2D) => {
            if (typeof ctx.setTransform === 'function') {
                ctx.setTransform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
            }
        };

        const beginCanvas = (ctx: CanvasRenderingContext2D, target: CanvasImageSource) => {
            const sized = target as { width?: number; height?: number };
            ctx.save();
            if (typeof ctx.setTransform === 'function') {
                ctx.setTransform(1, 0, 0, 1, 0, 0);
            }
            ctx.clearRect(0, 0, sized.width ?? 0, sized.height ?? 0);
            if (options?.clipPath) {
                ctx.clip(options.clipPath);
            }
            applyTransform(ctx);
        };

        const endCanvas = (ctx: CanvasRenderingContext2D) => {
            ctx.restore();
        };

        beginCanvas(offCtx, canvas);

        if (plan.lightPanels && plan.lightPanels.seeds.length > 0) {
            beginCanvas(maskCtx, maskCanvas);

            for (let i = plan.lightPanels.seeds.length - 1; i >= 0; i--) {
                const seed = plan.lightPanels.seeds[i];
                beginCanvas(tempCtx, tempCanvas);

                const panel = new LightPanelGreebles(
                    this.xUnits,
                    this.yUnits,
                    this.themeColor,
                    1,
                    plan.lightPanels.colors
                );
                panel.drawLights(tempCtx, new RNG(seed));

                tempCtx.save();
                tempCtx.globalCompositeOperation = 'destination-out';
                if (typeof tempCtx.setTransform === 'function') {
                    tempCtx.setTransform(1, 0, 0, 1, 0, 0);
                }
                tempCtx.drawImage(maskCanvas, 0, 0);
                tempCtx.restore();

                offCtx.save();
                if (typeof offCtx.setTransform === 'function') {
                    offCtx.setTransform(1, 0, 0, 1, 0, 0);
                }
                offCtx.drawImage(tempCanvas, 0, 0);
                offCtx.restore();

                endCanvas(tempCtx);

                const panelMask = new LightPanelGreebles(
                    this.xUnits,
                    this.yUnits,
                    this.themeColor,
                    1,
                    plan.lightPanels.colors
                );
                panelMask.drawPanels(maskCtx, new RNG(seed));
            }

            endCanvas(maskCtx);
            this.applyOccluders(offCtx, plan.occludersAfterLights);
        }

        if (plan.windows && plan.windows.seeds.length > 0) {
            beginCanvas(maskCtx, maskCanvas);

            for (let i = plan.windows.seeds.length - 1; i >= 0; i--) {
                const seed = plan.windows.seeds[i];
                beginCanvas(tempCtx, tempCanvas);

                const windows = new CapitalShipWindowsGreebles(
                    this.xUnits,
                    this.yUnits,
                    this.themeColor,
                    1,
                    plan.windows.color
                );
                windows.drawLights(tempCtx, new RNG(seed));

                tempCtx.save();
                tempCtx.globalCompositeOperation = 'destination-out';
                if (typeof tempCtx.setTransform === 'function') {
                    tempCtx.setTransform(1, 0, 0, 1, 0, 0);
                }
                tempCtx.drawImage(maskCanvas, 0, 0);
                tempCtx.restore();

                offCtx.save();
                if (typeof offCtx.setTransform === 'function') {
                    offCtx.setTransform(1, 0, 0, 1, 0, 0);
                }
                offCtx.drawImage(tempCanvas, 0, 0);
                offCtx.restore();

                endCanvas(tempCtx);

                const windowMask = new CapitalShipWindowsGreebles(
                    this.xUnits,
                    this.yUnits,
                    this.themeColor,
                    1,
                    plan.windows.color
                );
                windowMask.drawPanels(maskCtx, new RNG(seed));
            }

            endCanvas(maskCtx);
            this.applyOccluders(offCtx, plan.occludersAfterWindows);
        }

        if (plan.cutaways && plan.cutaways.seeds.length > 0) {
            beginCanvas(maskCtx, maskCanvas);

            for (let i = plan.cutaways.seeds.length - 1; i >= 0; i--) {
                const seed = plan.cutaways.seeds[i];
                beginCanvas(tempCtx, tempCanvas);

                const cutaway = new CutawaySectionGreebles(
                    this.xUnits,
                    this.yUnits,
                    this.themeColor,
                    1
                );
                cutaway.drawGlow(tempCtx, new RNG(seed));

                tempCtx.save();
                tempCtx.globalCompositeOperation = 'destination-out';
                if (typeof tempCtx.setTransform === 'function') {
                    tempCtx.setTransform(1, 0, 0, 1, 0, 0);
                }
                tempCtx.drawImage(maskCanvas, 0, 0);
                tempCtx.restore();

                offCtx.save();
                if (typeof offCtx.setTransform === 'function') {
                    offCtx.setTransform(1, 0, 0, 1, 0, 0);
                }
                offCtx.drawImage(tempCanvas, 0, 0);
                offCtx.restore();

                endCanvas(tempCtx);

                const cutawayMask = new CutawaySectionGreebles(
                    this.xUnits,
                    this.yUnits,
                    this.themeColor,
                    1
                );
                cutawayMask.drawMask(maskCtx, new RNG(seed));
            }

            endCanvas(maskCtx);
            this.applyOccluders(offCtx, plan.occludersAfterCutaways);
        }

        endCanvas(offCtx);

        context.save();
        if (typeof context.setTransform === 'function') {
            context.setTransform(1, 0, 0, 1, 0, 0);
        } else if (typeof context.resetTransform === 'function') {
            context.resetTransform();
        }
        context.globalCompositeOperation = 'source-over';
        context.drawImage(canvas, 0, 0);
        context.restore();
    }

    private drawEmissiveDirect(context: CanvasRenderingContext2D, plan: EmissivePlan): void {
        if (plan.lightPanels) {
            for (const seed of plan.lightPanels.seeds) {
                const panels = new LightPanelGreebles(
                    this.xUnits,
                    this.yUnits,
                    this.themeColor,
                    1,
                    plan.lightPanels.colors
                );
                panels.drawLights(context, new RNG(seed));
            }
            this.applyOccluders(context, plan.occludersAfterLights);
        }

        if (plan.windows) {
            for (const seed of plan.windows.seeds) {
                const windows = new CapitalShipWindowsGreebles(
                    this.xUnits,
                    this.yUnits,
                    this.themeColor,
                    1,
                    plan.windows.color
                );
                windows.drawLights(context, new RNG(seed));
            }
            this.applyOccluders(context, plan.occludersAfterWindows);
        }

        if (plan.cutaways) {
            for (const seed of plan.cutaways.seeds) {
                const cutaway = new CutawaySectionGreebles(
                    this.xUnits,
                    this.yUnits,
                    this.themeColor,
                    1
                );
                cutaway.drawGlow(context, new RNG(seed));
            }
            this.applyOccluders(context, plan.occludersAfterCutaways);
        }
    }

    private applyOccluders(context: CanvasRenderingContext2D, occluders: OccluderPlan[]): void {
        if (occluders.length === 0) return;
        context.save();
        context.globalCompositeOperation = 'destination-out';
        for (const occluder of occluders) {
            this.drawOccluder(context, occluder);
        }
        context.restore();
    }

    private drawOccluder(context: CanvasRenderingContext2D, occluder: OccluderPlan): void {
        switch (occluder.kind) {
            case 'electronics': {
                const boxes = new ElectronicsPanelGreebles(
                    this.xUnits,
                    this.yUnits,
                    this.themeColor,
                    occluder.count
                );
                boxes.draw(context, new RNG(occluder.seed));
                break;
            }
            case 'windows': {
                const windows = new CapitalShipWindowsGreebles(
                    this.xUnits,
                    this.yUnits,
                    this.themeColor,
                    1,
                    occluder.color
                );
                for (const seed of occluder.seeds) {
                    windows.drawPanels(context, new RNG(seed));
                }
                break;
            }
            case 'trench': {
                const trench = new EquipmentTrenchGreebles(
                    this.xUnits,
                    this.yUnits,
                    this.themeColor,
                    occluder.y,
                    occluder.h
                );
                trench.draw(context, new RNG(occluder.seed));
                break;
            }
            case 'cutaways': {
                const cutaways = new CutawaySectionGreebles(
                    this.xUnits,
                    this.yUnits,
                    this.themeColor,
                    1
                );
                for (const seed of occluder.seeds) {
                    cutaways.drawMask(context, new RNG(seed));
                }
                break;
            }
            case 'equipment': {
                const equip = new EquipmentGreebles(
                    this.xUnits,
                    this.yUnits,
                    this.themeColor,
                    occluder.count
                );
                equip.draw(context, new RNG(occluder.seed));
                break;
            }
            case 'pipes': {
                const pipes = new PipeGreebles(
                    this.xUnits,
                    this.yUnits,
                    this.themeColor,
                    occluder.count
                );
                pipes.draw(context, new RNG(occluder.seed));
                break;
            }
            case 'hoses': {
                const hoses = new HoseGreebles(
                    this.xUnits,
                    this.yUnits,
                    this.themeColor,
                    occluder.count,
                    false
                );
                hoses.draw(context, new RNG(occluder.seed));
                break;
            }
        }
    }

    private createOffscreenContext(
        context: CanvasRenderingContext2D
    ): { ctx: CanvasRenderingContext2D; canvas: CanvasImageSource } | null {
        const baseCanvas = (context as unknown as { canvas?: { width?: number; height?: number } }).canvas;
        const width = baseCanvas?.width;
        const height = baseCanvas?.height;

        if (!width || !height) return null;

        let canvas: any;
        if (typeof OffscreenCanvas !== 'undefined') {
            canvas = new OffscreenCanvas(width, height);
        } else if (typeof document !== 'undefined' && document.createElement) {
            canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
        } else if (baseCanvas && typeof (baseCanvas as any).constructor === 'function') {
            canvas = new (baseCanvas as any).constructor(width, height);
        } else {
            return null;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        return { ctx: ctx as CanvasRenderingContext2D, canvas };
    }
}
