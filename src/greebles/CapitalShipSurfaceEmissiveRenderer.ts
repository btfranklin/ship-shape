import { HSBAColor, RNG } from './common.js';
import { LightPanelGreebles } from './LightPanelGreebles.js';
import { CapitalShipWindowsGreebles } from './CapitalShipWindowsGreebles.js';
import { CutawaySectionGreebles } from './CutawaySectionGreebles.js';
import { ElectronicsPanelGreebles } from './ElectronicsPanelGreebles.js';
import { EquipmentGreebles, EquipmentTrenchGreebles } from './EquipmentGreebles.js';
import { PipeGreebles } from './PipeGreebles.js';
import { HoseGreebles } from './HoseGreebles.js';

type ScratchSurface = {
    ctx: CanvasRenderingContext2D;
    canvas: CanvasImageSource;
};

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
        if (!this.hasEmissiveContent(plan)) return;

        const transform = typeof context.getTransform === 'function' ? context.getTransform() : null;
        const bounds = transform ? this.getDeviceBounds(context, transform) : null;
        const offscreen = bounds
            ? this.createOffscreenContext(context, bounds.width, bounds.height)
            : null;

        if (!offscreen || !transform || !bounds) {
            this.drawEmissiveDirectWithoutOcclusion(context, plan);
            return;
        }

        const mask = this.createOffscreenContext(context, bounds.width, bounds.height);
        const temp = this.createOffscreenContext(context, bounds.width, bounds.height);

        if (!mask || !temp) {
            this.drawEmissiveDirectWithoutOcclusion(context, plan);
            return;
        }

        const { ctx: offCtx, canvas } = offscreen;

        const applyTransform = (ctx: CanvasRenderingContext2D) => {
            if (typeof ctx.setTransform === 'function') {
                ctx.setTransform(
                    transform.a,
                    transform.b,
                    transform.c,
                    transform.d,
                    transform.e - bounds.left,
                    transform.f - bounds.top
                );
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
                if (typeof ctx.setTransform === 'function') {
                    ctx.setTransform(1, 0, 0, 1, -bounds.left, -bounds.top);
                }
                ctx.clip(options.clipPath);
            }
            applyTransform(ctx);
        };

        const endCanvas = (ctx: CanvasRenderingContext2D) => {
            ctx.restore();
        };

        beginCanvas(offCtx, canvas);

        if (plan.lightPanels && plan.lightPanels.seeds.length > 0) {
            const { seeds, colors } = plan.lightPanels;
            this.compositeSeededLayer(
                offCtx,
                mask,
                temp,
                seeds,
                beginCanvas,
                endCanvas,
                (ctx, seed) => {
                    const panel = new LightPanelGreebles(
                        this.xUnits,
                        this.yUnits,
                        this.themeColor,
                        1,
                        colors
                    );
                    panel.drawLights(ctx, new RNG(seed));
                },
                (ctx, seed) => {
                    const panel = new LightPanelGreebles(
                        this.xUnits,
                        this.yUnits,
                        this.themeColor,
                        1,
                        colors
                    );
                    panel.drawPanels(ctx, new RNG(seed));
                }
            );
            this.applyOccluders(offCtx, plan.occludersAfterLights);
        }

        if (plan.windows && plan.windows.seeds.length > 0) {
            const { seeds, color } = plan.windows;
            this.compositeSeededLayer(
                offCtx,
                mask,
                temp,
                seeds,
                beginCanvas,
                endCanvas,
                (ctx, seed) => {
                    const windows = new CapitalShipWindowsGreebles(
                        this.xUnits,
                        this.yUnits,
                        this.themeColor,
                        1,
                        color
                    );
                    windows.drawLights(ctx, new RNG(seed));
                },
                (ctx, seed) => {
                    const windows = new CapitalShipWindowsGreebles(
                        this.xUnits,
                        this.yUnits,
                        this.themeColor,
                        1,
                        color
                    );
                    windows.drawPanels(ctx, new RNG(seed));
                }
            );
            this.applyOccluders(offCtx, plan.occludersAfterWindows);
        }

        if (plan.cutaways && plan.cutaways.seeds.length > 0) {
            const { seeds } = plan.cutaways;
            this.compositeSeededLayer(
                offCtx,
                mask,
                temp,
                seeds,
                beginCanvas,
                endCanvas,
                (ctx, seed) => {
                    const cutaway = new CutawaySectionGreebles(
                        this.xUnits,
                        this.yUnits,
                        this.themeColor,
                        1
                    );
                    cutaway.drawGlow(ctx, new RNG(seed));
                },
                (ctx, seed) => {
                    const cutaway = new CutawaySectionGreebles(
                        this.xUnits,
                        this.yUnits,
                        this.themeColor,
                        1
                    );
                    cutaway.drawMask(ctx, new RNG(seed));
                }
            );
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
        context.drawImage(canvas, bounds.left, bounds.top);
        context.restore();
    }

    private compositeSeededLayer(
        outputContext: CanvasRenderingContext2D,
        mask: ScratchSurface,
        temp: ScratchSurface,
        seeds: readonly number[],
        beginCanvas: (context: CanvasRenderingContext2D, target: CanvasImageSource) => void,
        endCanvas: (context: CanvasRenderingContext2D) => void,
        drawGlow: (context: CanvasRenderingContext2D, seed: number) => void,
        drawMask: (context: CanvasRenderingContext2D, seed: number) => void
    ): void {
        beginCanvas(mask.ctx, mask.canvas);

        for (let i = seeds.length - 1; i >= 0; i--) {
            const seed = seeds[i];
            beginCanvas(temp.ctx, temp.canvas);
            drawGlow(temp.ctx, seed);

            temp.ctx.save();
            temp.ctx.globalCompositeOperation = 'destination-out';
            if (typeof temp.ctx.setTransform === 'function') {
                temp.ctx.setTransform(1, 0, 0, 1, 0, 0);
            }
            temp.ctx.drawImage(mask.canvas, 0, 0);
            temp.ctx.restore();

            outputContext.save();
            if (typeof outputContext.setTransform === 'function') {
                outputContext.setTransform(1, 0, 0, 1, 0, 0);
            }
            outputContext.drawImage(temp.canvas, 0, 0);
            outputContext.restore();

            endCanvas(temp.ctx);
            drawMask(mask.ctx, seed);
        }

        endCanvas(mask.ctx);
    }

    private hasEmissiveContent(plan: EmissivePlan): boolean {
        return Boolean(
            plan.lightPanels?.seeds.length
            || plan.windows?.seeds.length
            || plan.cutaways?.seeds.length
        );
    }

    private drawEmissiveDirectWithoutOcclusion(
        context: CanvasRenderingContext2D,
        plan: EmissivePlan
    ): void {
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
        }
    }

    private getDeviceBounds(
        context: CanvasRenderingContext2D,
        transform: DOMMatrix
    ): { left: number; top: number; width: number; height: number } | null {
        const canvas = (context as unknown as { canvas?: { width?: number; height?: number } }).canvas;
        const canvasWidth = canvas?.width;
        const canvasHeight = canvas?.height;
        if (!canvasWidth || !canvasHeight) return null;

        const points = [
            [0, 0],
            [this.xUnits, 0],
            [0, this.yUnits],
            [this.xUnits, this.yUnits],
        ].map(([x, y]) => ({
            x: transform.a * x + transform.c * y + transform.e,
            y: transform.b * x + transform.d * y + transform.f,
        }));
        const padding = 2;
        const left = Math.max(0, Math.floor(Math.min(...points.map((point) => point.x))) - padding);
        const top = Math.max(0, Math.floor(Math.min(...points.map((point) => point.y))) - padding);
        const right = Math.min(
            canvasWidth,
            Math.ceil(Math.max(...points.map((point) => point.x))) + padding
        );
        const bottom = Math.min(
            canvasHeight,
            Math.ceil(Math.max(...points.map((point) => point.y))) + padding
        );

        if (right <= left || bottom <= top) return null;
        return { left, top, width: right - left, height: bottom - top };
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
        context: CanvasRenderingContext2D,
        width: number,
        height: number
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
        if (width <= 0 || height <= 0) return null;

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
