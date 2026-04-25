import { RNG } from '../greebles/common.js';
import type { SteamEngineComponent } from './SteamEngineComponent.js';
import { SteamEnginePaintPrimitives } from './SteamEnginePaintPrimitives.js';

export class SteamEngineBodyPainter {
    private primitives = new SteamEnginePaintPrimitives();

    constructor(private component: SteamEngineComponent) {}

    draw(ctx: CanvasRenderingContext2D, rng: RNG) {
        if (!this.component.shapePath) return;

        const { x, y, w, h } = this.component.bounds;
        ctx.fillStyle = this.createBodyFillStyle(ctx, x, y, w, h);
        ctx.fill(this.component.shapePath);

        ctx.save();
        ctx.clip(this.component.shapePath);
        this.drawBodyHighlights(ctx, x, y, w, h);
        this.drawRailwayDetails(ctx, rng);
        ctx.restore();

        ctx.strokeStyle = this.component.color.withBrightness(-0.45).toRGBAString();
        ctx.lineWidth = 1.2;
        ctx.stroke(this.component.shapePath);
    }

    private isFlatPanelType() {
        switch (this.component.type) {
            case 'boiler':
            case 'firebox':
            case 'apron':
            case 'smokebox':
            case 'cab':
            case 'tender':
            case 'frame':
            case 'casemate':
            case 'cupola':
            case 'cowcatcher':
            case 'coupler':
                return true;
            default:
                return false;
        }
    }

    private createBodyFillStyle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): string | CanvasGradient {
        const base = this.component.color;

        if (this.isFlatPanelType()) {
            return base.toRGBAString();
        }

        if (this.component.type === 'turret') {
            const grad = ctx.createLinearGradient(x, y, x, y + h);
            grad.addColorStop(0, base.withBrightness(0.06).toRGBAString());
            grad.addColorStop(1, base.withBrightness(-0.12).toRGBAString());
            return grad;
        }

        if (this.component.type === 'dome' || this.component.type === 'lamp') {
            const grad = ctx.createLinearGradient(x, y, x, y + h);
            grad.addColorStop(0, base.withBrightness(0.14).toRGBAString());
            grad.addColorStop(1, base.withBrightness(-0.18).toRGBAString());
            return grad;
        }

        if (this.component.type === 'chimney') {
            const grad = ctx.createLinearGradient(x, y, x + w * 0.2, y + h);
            grad.addColorStop(0, base.withBrightness(-0.02).toRGBAString());
            grad.addColorStop(0.4, base.withBrightness(0.06).toRGBAString());
            grad.addColorStop(1, base.withBrightness(-0.24).toRGBAString());
            return grad;
        }

        const grad = ctx.createLinearGradient(x, y, x + w, y + h * 0.4);
        grad.addColorStop(0, base.withBrightness(0.12).toRGBAString());
        grad.addColorStop(0.55, base.withBrightness(-0.03).toRGBAString());
        grad.addColorStop(1, base.withBrightness(-0.24).toRGBAString());
        return grad;
    }

    private drawBodyHighlights(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
        if (this.isFlatPanelType()) {
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(x, y, w, Math.max(2, h * 0.05));

            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(x, y + h * 0.82, w, h * 0.18);

            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + w * 0.04, y + h * 0.12);
            ctx.lineTo(x + w * 0.96, y + h * 0.12);
            ctx.stroke();
            return;
        }

        const highlight = ctx.createLinearGradient(x, y, x, y + h);
        highlight.addColorStop(0, 'rgba(255,255,255,0.18)');
        highlight.addColorStop(0.25, 'rgba(255,255,255,0.05)');
        highlight.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = highlight;
        ctx.fillRect(x, y, w, h * 0.46);

        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.04, y + h * 0.14);
        ctx.lineTo(x + w * 0.96, y + h * 0.14);
        ctx.stroke();
    }

    private drawRailwayDetails(ctx: CanvasRenderingContext2D, rng: RNG) {
        const { x, y, w, h } = this.component.bounds;

        switch (this.component.type) {
            case 'boiler':
                this.primitives.drawPlateBand(ctx, x + w * 0.18, y, h, true);
                this.primitives.drawPlateBand(ctx, x + w * 0.46, y, h, true);
                this.primitives.drawPlateBand(ctx, x + w * 0.74, y, h, true);
                this.primitives.drawHorizontalSeam(ctx, x + w * 0.06, x + w * 0.94, y + h * 0.52);
                this.primitives.drawInspectionDoor(ctx, x + w * 0.58, y + h * 0.26, w * 0.12, h * 0.42);
                break;
            case 'firebox':
                this.primitives.drawPlateBand(ctx, x + w * 0.22, y + h * 0.08, h * 0.9, true);
                this.primitives.drawInspectionDoor(ctx, x + w * 0.38, y + h * 0.24, w * 0.25, h * 0.54);
                this.primitives.drawRivetRow(ctx, x + w * 0.08, y + h * 0.16, x + w * 0.92, y + h * 0.16, 6);
                break;
            case 'apron':
                this.primitives.drawHorizontalSeam(ctx, x + w * 0.04, x + w * 0.92, y + h * 0.2);
                break;
            case 'smokebox':
                this.primitives.drawPlateBand(ctx, x + w * 0.24, y + h * 0.04, h * 0.9, true);
                this.primitives.drawPlateBand(ctx, x + w * 0.72, y + h * 0.12, h * 0.76, true);
                this.primitives.drawVisionSlot(ctx, x + w * 0.2, y + h * 0.38, w * 0.12, h * 0.12);
                break;
            case 'cab':
                this.primitives.drawVisionSlot(ctx, x + w * 0.18, y + h * 0.22, w * 0.18, h * 0.14);
                this.primitives.drawVisionSlot(ctx, x + w * 0.56, y + h * 0.22, w * 0.14, h * 0.14);
                this.primitives.drawInspectionDoor(ctx, x + w * 0.5, y + h * 0.44, w * 0.22, h * 0.38);
                this.primitives.drawRivetRow(ctx, x + w * 0.08, y + h * 0.12, x + w * 0.92, y + h * 0.12, 7);
                break;
            case 'tender':
                this.primitives.drawPlateBand(ctx, x + w * 0.22, y + h * 0.06, h * 0.88, true);
                this.primitives.drawPlateBand(ctx, x + w * 0.48, y + h * 0.06, h * 0.88, true);
                this.primitives.drawPlateBand(ctx, x + w * 0.74, y + h * 0.06, h * 0.88, true);
                this.primitives.drawHorizontalSeam(ctx, x + w * 0.06, x + w * 0.94, y + h * 0.22);
                this.primitives.drawInspectionDoor(ctx, x + w * 0.1, y + h * 0.58, w * 0.16, h * 0.18);
                break;
            case 'frame':
                this.drawAxleBoxes(ctx, rng);
                this.primitives.drawHorizontalSeam(ctx, x + w * 0.05, x + w * 0.95, y + h * 0.26);
                break;
            case 'cowcatcher':
                this.drawCowcatcherSlats(ctx);
                break;
            case 'casemate':
                this.drawCasemateDetails(ctx, rng);
                break;
            case 'cupola':
                this.primitives.drawVisionSlot(ctx, x + w * 0.2, y + h * 0.32, w * 0.22, h * 0.16);
                this.primitives.drawVisionSlot(ctx, x + w * 0.58, y + h * 0.32, w * 0.22, h * 0.16);
                break;
            case 'chimney':
                this.primitives.drawPlateBand(ctx, x + w * 0.5, y + h * 0.08, h * 0.86, true);
                break;
            case 'dome':
                this.primitives.drawPlateBand(ctx, x + w * 0.5, y + h * 0.26, h * 0.66, true);
                break;
            default:
                break;
        }
    }

    private drawAxleBoxes(ctx: CanvasRenderingContext2D, rng: RNG) {
        const { x, y, w, h } = this.component.bounds;
        const count = Math.max(2, Math.min(5, Math.round(w / 140)));
        const boxW = w / (count * 2.4);
        const boxH = h * 0.28;
        for (let i = 0; i < count; i++) {
            const px = x + w * 0.14 + i * ((w * 0.72) / Math.max(1, count - 1)) - boxW / 2;
            const py = y + h * rng.range(0.5, 0.58);
            ctx.strokeStyle = 'rgba(25,20,18,0.88)';
            ctx.strokeRect(px, py, boxW, boxH);
        }
    }

    private drawCowcatcherSlats(ctx: CanvasRenderingContext2D) {
        const { x, y, w, h } = this.component.bounds;
        ctx.strokeStyle = 'rgba(28,22,18,0.9)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            const t = i / 5;
            ctx.beginPath();
            ctx.moveTo(x + w * t, y + h);
            ctx.lineTo(x + w, y + h * (0.62 - t * 0.48));
            ctx.stroke();
        }
    }

    private drawCasemateDetails(ctx: CanvasRenderingContext2D, rng: RNG) {
        const { x, y, w, h } = this.component.bounds;
        const sideDoorW = w * 0.12;
        const sideDoorH = h * 0.34;
        this.primitives.drawHorizontalSeam(ctx, x + w * 0.05, x + w * 0.95, y + h * 0.62);
        this.primitives.drawInspectionDoor(ctx, x + w * 0.43, y + h * 0.26, sideDoorW, sideDoorH);
        this.primitives.drawVisionSlot(ctx, x + w * 0.16, y + h * 0.34, w * 0.06, h * 0.12);
        this.primitives.drawVisionSlot(ctx, x + w * 0.78, y + h * 0.34, w * 0.06, h * 0.12);
        this.primitives.drawArmorChevron(ctx, x + w * 0.18, y + h * 0.18, w * 0.12, h * 0.56);
        this.primitives.drawArmorChevron(ctx, x + w * 0.82, y + h * 0.18, -w * 0.12, h * 0.56);

        if (this.component.variant === 'supply-car') {
            this.primitives.drawPlateBand(ctx, x + w * 0.32, y + h * 0.06, h * 0.88, true);
            this.primitives.drawPlateBand(ctx, x + w * 0.68, y + h * 0.06, h * 0.88, true);
        } else if (this.component.variant === 'flatbed') {
            const crateW = w * 0.16;
            const crateH = h * 0.22;
            for (let i = 0; i < 3; i++) {
                const px = x + w * (0.2 + i * 0.18);
                const py = y + h * 0.44 + rng.range(-4, 4);
                ctx.strokeStyle = 'rgba(42,34,25,0.9)';
                ctx.strokeRect(px, py, crateW, crateH);
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(px + crateW, py + crateH);
                ctx.moveTo(px + crateW, py);
                ctx.lineTo(px, py + crateH);
                ctx.stroke();
            }
        }
    }
}
