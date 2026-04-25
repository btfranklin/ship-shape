import { HSBAColor, RNG } from '../greebles/common.js';
import type { SteamEngineComponent } from './SteamEngineComponent.js';
import { SteamEnginePaintPrimitives } from './SteamEnginePaintPrimitives.js';

export class SteamEngineAccessoryPainter {
    private primitives = new SteamEnginePaintPrimitives();

    constructor(private component: SteamEngineComponent) {}

    drawLamp(ctx: CanvasRenderingContext2D) {
        if (!this.component.shapePath) return;

        const { x, y, w, h } = this.component.bounds;
        const r = Math.min(w, h) / 2;
        const cx = x + r;
        const cy = y + r;

        ctx.fillStyle = this.component.color.withBrightness(-0.16).toRGBAString();
        ctx.fill(this.component.shapePath);
        ctx.strokeStyle = 'rgba(10,10,10,0.8)';
        ctx.stroke(this.component.shapePath);

        const glow = HSBAColor.fromRGBA(255, 214, 128);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3.4);
        grad.addColorStop(0, glow.withAlpha(0.46).toRGBAString());
        grad.addColorStop(1, glow.withAlpha(0).toRGBAString());
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = glow.toRGBAString();
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.48, 0, Math.PI * 2);
        ctx.fill();
    }

    drawGun(ctx: CanvasRenderingContext2D) {
        if (!this.component.shapePath) return;
        const { x, y, w, h } = this.component.bounds;
        const grad = ctx.createLinearGradient(x, y, x + w, y);
        grad.addColorStop(0, this.component.color.withBrightness(0.05).toRGBAString());
        grad.addColorStop(1, this.component.color.withBrightness(-0.22).toRGBAString());
        ctx.fillStyle = grad;
        ctx.fill(this.component.shapePath);
        ctx.strokeStyle = 'rgba(18,18,18,0.84)';
        ctx.lineWidth = 1;
        ctx.stroke(this.component.shapePath);

        ctx.fillStyle = this.component.color.withBrightness(-0.28).toRGBAString();
        ctx.fillRect(x + w * 0.86, y - h * 0.2, w * 0.12, h * 1.4);
    }

    drawCoupler(ctx: CanvasRenderingContext2D) {
        const { x, y, w, h } = this.component.bounds;
        const base = this.component.color.withBrightness(-0.18).withSaturation(-0.1);
        ctx.fillStyle = base.toRGBAString();
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(15,15,15,0.85)';
        ctx.strokeRect(x, y, w, h);

        const cx = x + w;
        const cy = y + h / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, h * 0.55, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
    }

    drawCargo(ctx: CanvasRenderingContext2D) {
        if (!this.component.shapePath) return;
        const { x, y, h } = this.component.bounds;
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, this.component.color.withBrightness(0.08).toRGBAString());
        grad.addColorStop(1, this.component.color.withBrightness(-0.24).toRGBAString());
        ctx.fillStyle = grad;
        ctx.fill(this.component.shapePath);
        ctx.strokeStyle = 'rgba(26,20,16,0.72)';
        ctx.lineWidth = 1;
        ctx.stroke(this.component.shapePath);
    }

    drawTurret(ctx: CanvasRenderingContext2D, rng: RNG) {
        if (!this.component.shapePath) return;
        const { x, y, w, h } = this.component.bounds;
        const cx = x + w / 2;
        const cy = y + h * 0.62;
        ctx.fillStyle = this.component.color.toRGBAString();
        ctx.fill(this.component.shapePath);

        ctx.save();
        ctx.clip(this.component.shapePath);
        ctx.fillStyle = this.component.color.withBrightness(-0.12).toRGBAString();
        ctx.beginPath();
        ctx.moveTo(x, y + h * 0.62);
        ctx.lineTo(x + w * 0.14, y + h);
        ctx.lineTo(x + w * 0.86, y + h);
        ctx.lineTo(x + w, y + h * 0.62);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(x + w * 0.12, y + h * 0.12, w * 0.76, h * 0.1);
        ctx.restore();

        ctx.strokeStyle = 'rgba(12,12,12,0.84)';
        ctx.lineWidth = 1.1;
        ctx.stroke(this.component.shapePath);

        ctx.strokeStyle = 'rgba(245,245,245,0.15)';
        ctx.beginPath();
        ctx.moveTo(x + w * 0.18, y + h * 0.26);
        ctx.lineTo(x + w * 0.82, y + h * 0.26);
        ctx.stroke();

        ctx.fillStyle = this.component.color.withBrightness(-0.08).toRGBAString();
        ctx.beginPath();
        ctx.ellipse(cx, cy, w * 0.36, h * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();

        this.primitives.drawVisionSlot(ctx, x + w * 0.37, y + h * 0.42, w * 0.16, h * 0.1);
        if (rng.bool(0.6)) {
            this.primitives.drawRivetRow(ctx, x + w * 0.18, y + h * 0.18, x + w * 0.82, y + h * 0.18, 5);
        }
    }
}
