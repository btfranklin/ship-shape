import { HSBAColor, RNG } from './common.js';
import { LightPanelGreebles } from './LightPanelGreebles.js';
import { CapitalShipWindowsGreebles } from './CapitalShipWindowsGreebles.js';
import { CutawaySectionGreebles } from './CutawaySectionGreebles.js';
import { ElectronicsPanelGreebles } from './ElectronicsPanelGreebles.js';
import { EquipmentGreebles, EquipmentTrenchGreebles } from './EquipmentGreebles.js';
import { PipeGreebles } from './PipeGreebles.js';
import { HoseGreebles } from './HoseGreebles.js';

export type OccluderPlan =
    | { kind: 'electronics'; seed: number; count: number }
    | { kind: 'windows'; seeds: number[]; color: HSBAColor }
    | { kind: 'trench'; seed: number; y: number; h: number }
    | { kind: 'cutaways'; seeds: number[] }
    | { kind: 'equipment'; seed: number; count: number }
    | { kind: 'pipes'; seed: number; count: number }
    | { kind: 'hoses'; seed: number; count: number };

export type EmissivePlan = {
    lightPanels?: { seeds: number[]; colors: HSBAColor[] };
    windows?: { seeds: number[]; color: HSBAColor };
    cutaways?: { seeds: number[] };
    occludersAfterLights: OccluderPlan[];
    occludersAfterWindows: OccluderPlan[];
    occludersAfterCutaways: OccluderPlan[];
};

export class CapitalShipSurfaceEmissiveRenderer {
    constructor(
        private xUnits: number,
        private yUnits: number,
        private themeColor: HSBAColor
    ) {}

    draw(context: CanvasRenderingContext2D, plan: EmissivePlan, options?: { clipPath?: Path2D }): void {
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
        type CanvasLike = {
            width?: number;
            height?: number;
            getContext?: (
                contextId: '2d'
            ) => CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
            constructor?: new (width: number, height: number) => CanvasLike;
        };

        const baseCanvas = (context as unknown as { canvas?: CanvasLike }).canvas;
        const width = baseCanvas?.width;
        const height = baseCanvas?.height;

        if (!width || !height) return null;

        let canvas: OffscreenCanvas | HTMLCanvasElement | CanvasLike;
        if (typeof OffscreenCanvas !== 'undefined') {
            canvas = new OffscreenCanvas(width, height);
        } else if (typeof document !== 'undefined' && document.createElement) {
            canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
        } else if (baseCanvas?.constructor && typeof baseCanvas.constructor === 'function') {
            canvas = new baseCanvas.constructor(width, height);
        } else {
            return null;
        }

        const ctx = canvas.getContext?.('2d') ?? null;
        if (!ctx) return null;
        return { ctx: ctx as unknown as CanvasRenderingContext2D, canvas: canvas as CanvasImageSource };
    }
}
