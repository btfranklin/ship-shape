import { HSBAColor, RNG } from './common.js';
import type { Drawable } from './common.js';

type SphereLightOptions = {
    minLights?: number;
    maxLights?: number;
};

export class SphereLightGreebles implements Drawable {
    public readonly lightColors: readonly HSBAColor[];

    constructor(
        public xUnits: number,
        public yUnits: number,
        lightColors: readonly HSBAColor[] = [HSBAColor.fromRGBA(0, 255, 0)],
        public options: SphereLightOptions = {}
    ) {
        const resolvedLightColors = lightColors.length > 0
            ? lightColors
            : [HSBAColor.fromRGBA(0, 255, 0)];
        this.lightColors = Object.freeze([...resolvedLightColors]);
    }

    draw(context: CanvasRenderingContext2D, rng: RNG): void {
        const radius = Math.min(this.xUnits, this.yUnits) / 2;
        if (radius <= 0) return;

        const cx = this.xUnits / 2;
        const cy = this.yUnits / 2;

        const baseCount = Math.floor(radius * 60);
        const minLights = this.options.minLights ?? 6;
        const maxLights = this.options.maxLights;
        let lightCount = Math.max(minLights, baseCount + rng.intRange(0, 6));
        if (maxLights !== undefined) {
            const clampedMin = Math.min(minLights, maxLights);
            lightCount = rng.intRange(clampedMin, maxLights);
        }

        const visibleLimit = Math.PI / 2;
        const sizeBase = radius * 0.06;

        context.save();
        for (let i = 0; i < lightCount; i++) {
            const theta = rng.range(-0.9, 0.9);
            const phi = rng.range(-visibleLimit, visibleLimit);
            const x = cx + radius * Math.cos(theta) * Math.sin(phi);
            const y = cy + radius * Math.sin(theta);
            const depth = Math.max(0, Math.cos(theta) * Math.cos(phi));
            const size = sizeBase * (0.4 + 0.6 * depth);
            const lit = rng.bool(0.6);
            if (!lit) continue;

            const color = rng.choice(this.lightColors);
            const glowRadius = Math.max(0.003, size * 2.2);
            const glowAlpha = Math.min(0.5, 0.2 + depth * 0.25);
            const coreAlpha = Math.min(1.0, 0.5 + depth * 0.5);

            const grad = context.createRadialGradient(x, y, 0, x, y, glowRadius);
            grad.addColorStop(0, color.withAlpha(glowAlpha).toRGBAString());
            grad.addColorStop(1, color.withAlpha(0).toRGBAString());
            context.fillStyle = grad;
            context.beginPath();
            context.arc(x, y, glowRadius, 0, Math.PI * 2);
            context.fill();

            context.fillStyle = color.withAlpha(coreAlpha).toRGBAString();
            context.fillRect(x - size / 2, y - size / 2, size, size);
        }
        context.restore();
    }
}
