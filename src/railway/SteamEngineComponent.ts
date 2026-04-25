import { HSBAColor, RNG } from '../greebles/common.js';
import type { SteamEngineComponentType, WheelStyle } from './engineTypes.js';
import { SteamEngineShapeBuilder } from './SteamEngineShapeBuilder.js';
import { SteamEngineComponentPainter } from './SteamEngineComponentPainter.js';

export interface SteamEngineComponentOptions {
    variant?: string;
    wheelStyle?: WheelStyle;
}

export class SteamEngineComponent {
    public bounds: { x: number; y: number; w: number; h: number };
    public zIndex: number;
    public type: SteamEngineComponentType;
    public color: HSBAColor;
    public variant: string;
    public wheelStyle: WheelStyle;
    public shapePath?: Path2D;

    private shapeBuilder: SteamEngineShapeBuilder;
    private painter: SteamEngineComponentPainter;

    constructor(
        x: number,
        y: number,
        w: number,
        h: number,
        zIndex: number,
        type: SteamEngineComponentType,
        color: HSBAColor,
        options: SteamEngineComponentOptions = {}
    ) {
        this.bounds = { x, y, w, h };
        this.zIndex = zIndex;
        this.type = type;
        this.color = color;
        this.variant = options.variant ?? 'default';
        this.wheelStyle = options.wheelStyle ?? 'spoked';
        this.shapeBuilder = new SteamEngineShapeBuilder(this);
        this.painter = new SteamEngineComponentPainter(this);
    }

    generateShape(rng: RNG) {
        this.shapeBuilder.generateShape(rng);
    }

    draw(ctx: CanvasRenderingContext2D, rng: RNG) {
        this.painter.draw(ctx, rng);
    }
}
