import { HSBAColor, RNG } from './common.js';
import type { Drawable } from './common.js';

type SphereWindowsOptions = {
    minRows?: number;
    maxRows?: number;
    forceFrontCrop?: boolean;
};

export class SphereWindowsGreebles implements Drawable {
    constructor(
        public xUnits: number,
        public yUnits: number,
        public themeColor: HSBAColor,
        public windowColor: HSBAColor,
        public options: SphereWindowsOptions = {}
    ) {}

    draw(context: CanvasRenderingContext2D, rng: RNG): void {
        this.drawInternal(context, rng, true, true);
    }

    drawPanels(context: CanvasRenderingContext2D, rng: RNG): void {
        this.drawInternal(context, rng, true, false);
    }

    drawLights(context: CanvasRenderingContext2D, rng: RNG): void {
        this.drawInternal(context, rng, false, true);
    }

    private drawInternal(
        context: CanvasRenderingContext2D,
        rng: RNG,
        drawPanels: boolean,
        drawLights: boolean
    ): void {
        const radius = Math.min(this.xUnits, this.yUnits) / 2;
        if (radius <= 0) return;

        const cx = this.xUnits / 2;
        const cy = this.yUnits / 2;

        const minRows = this.options.minRows ?? 1;
        const maxRows = this.options.maxRows ?? 3;
        const rowCount = Math.max(minRows, rng.intRange(minRows, maxRows));
        const forceFrontCrop = this.options.forceFrontCrop ?? false;

        const baseSize = radius * 0.1;
        const baseHeight = baseSize * 0.6;

        const thetaSpan = 0.7;
        const thetaStep = rowCount > 1 ? (thetaSpan * 2) / (rowCount + 1) : 0;
        const primaryRowIndex = Math.floor((rowCount - 1) / 2);
        const visibleLimit = Math.PI / 2;

        for (let row = 0; row < rowCount; row++) {
            let theta = 0;
            if (rowCount === 1) {
                theta = rng.range(-0.2, 0.2);
            } else {
                const baseTheta = -thetaSpan + thetaStep * (row + 1);
                theta = baseTheta + rng.range(-thetaStep * 0.2, thetaStep * 0.2);
            }

            const bandRadius = Math.max(0.0001, radius * Math.cos(theta));
            const y = cy + radius * Math.sin(theta);
            const spacing = baseSize * rng.range(1.4, 1.8);
            const deltaPhi = spacing / bandRadius;

            let phiStart = -visibleLimit * rng.range(0.6, 0.95);
            let phiEnd = visibleLimit * rng.range(0.6, 0.95);

            if (forceFrontCrop && row === primaryRowIndex) {
                phiStart = -visibleLimit * rng.range(0.4, 0.6);
                phiEnd = visibleLimit * rng.range(1.05, 1.25);
            }

            const span = phiEnd - phiStart;
            const windowCount = Math.max(1, Math.floor(span / deltaPhi));

            for (let i = 0; i < windowCount; i++) {
                const phi = phiStart + deltaPhi * (i + 0.5) + rng.range(-deltaPhi * 0.2, deltaPhi * 0.2);
                const x = cx + bandRadius * Math.sin(phi);
                const z = Math.max(0, Math.cos(theta) * Math.cos(phi));
                const scale = 0.4 + 0.6 * z;
                const width = baseSize * scale;
                const height = baseHeight * (0.7 + 0.3 * z);
                const panelW = width * 1.6;
                const panelH = height * 1.6;
                const lit = rng.bool(0.5);

                if (drawPanels) {
                    this.drawPanel(context, x, y, panelW, panelH);
                }

                if (drawLights && lit) {
                    this.drawLight(context, x, y, width, height, z);
                }
            }
        }

    }

    private drawPanel(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
        const panelColor = this.themeColor.adjustSaturation(-0.1).adjustBrightness(-0.2).toRGBAString();
        const edgeColor = this.themeColor.adjustBrightness(-0.4).toRGBAString();
        context.save();
        context.fillStyle = panelColor;
        context.strokeStyle = edgeColor;
        context.lineWidth = 0.0025;
        context.fillRect(x - w / 2, y - h / 2, w, h);
        context.strokeRect(x - w / 2, y - h / 2, w, h);
        context.restore();
    }

    private drawLight(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, depth: number): void {
        const glowRadius = Math.max(w, h) * 1.6;
        const glowAlpha = Math.min(0.5, 0.2 + depth * 0.3);
        const coreAlpha = Math.min(1.0, 0.5 + depth * 0.5);

        context.save();
        const grad = context.createRadialGradient(x, y, 0, x, y, glowRadius);
        grad.addColorStop(0, this.windowColor.withAlpha(glowAlpha).toRGBAString());
        grad.addColorStop(1, this.windowColor.withAlpha(0).toRGBAString());
        context.fillStyle = grad;
        context.beginPath();
        context.arc(x, y, glowRadius, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = this.windowColor.withAlpha(coreAlpha).toRGBAString();
        context.fillRect(x - w / 2, y - h / 2, w, h);
        context.restore();
    }
}
