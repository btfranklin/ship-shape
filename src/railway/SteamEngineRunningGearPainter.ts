import { RNG } from '../greebles/common.js';
import type { SteamEngineComponent } from './SteamEngineComponent.js';

export class SteamEngineRunningGearPainter {
    constructor(private component: SteamEngineComponent) {}

    drawWheel(ctx: CanvasRenderingContext2D, rng: RNG) {
        if (!this.component.shapePath) return;

        const { x, y, w, h } = this.component.bounds;
        const r = Math.min(w, h) / 2;
        const cx = x + r;
        const cy = y + r;
        const base = this.component.color.withBrightness(-0.08).withSaturation(-0.08);

        const grad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.18, cx, cy, r);
        grad.addColorStop(0, base.withBrightness(0.28).toRGBAString());
        grad.addColorStop(0.6, base.withBrightness(-0.04).toRGBAString());
        grad.addColorStop(1, base.withBrightness(-0.4).toRGBAString());
        ctx.fillStyle = grad;
        ctx.fill(this.component.shapePath);

        ctx.strokeStyle = 'rgba(14,14,14,0.95)';
        ctx.lineWidth = Math.max(1.2, r * 0.1);
        ctx.stroke(this.component.shapePath);

        ctx.strokeStyle = 'rgba(220,220,220,0.18)';
        ctx.lineWidth = Math.max(1, r * 0.045);
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
        ctx.stroke();

        const hubR = r * 0.2;
        ctx.fillStyle = base.withBrightness(-0.18).toRGBAString();
        ctx.beginPath();
        ctx.arc(cx, cy, hubR, 0, Math.PI * 2);
        ctx.fill();

        if (this.component.wheelStyle !== 'solid') {
            const spokeCount = rng.intRange(6, 8);
            ctx.strokeStyle = 'rgba(235,235,235,0.22)';
            ctx.lineWidth = Math.max(1, r * 0.04);
            for (let i = 0; i < spokeCount; i++) {
                const angle = (Math.PI * 2 * i) / spokeCount;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(angle) * r * 0.72, cy + Math.sin(angle) * r * 0.72);
                ctx.stroke();
            }
        }

        if (this.component.wheelStyle === 'counterweight') {
            ctx.fillStyle = base.withBrightness(-0.26).toRGBAString();
            ctx.beginPath();
            ctx.arc(cx - r * 0.15, cy + r * 0.12, r * 0.36, 0.2 * Math.PI, 1.05 * Math.PI);
            ctx.fill();
        }
    }

    drawRod(ctx: CanvasRenderingContext2D) {
        if (!this.component.shapePath) return;
        const { x, y, w, h } = this.component.bounds;
        const base = this.component.color.withBrightness(-0.18);
        const grad = ctx.createLinearGradient(x, y, x + w, y);
        grad.addColorStop(0, base.withBrightness(0.2).toRGBAString());
        grad.addColorStop(0.5, base.withBrightness(-0.05).toRGBAString());
        grad.addColorStop(1, base.withBrightness(-0.28).toRGBAString());
        ctx.fillStyle = grad;
        ctx.fill(this.component.shapePath);
        ctx.strokeStyle = 'rgba(15,15,15,0.8)';
        ctx.lineWidth = 1;
        ctx.stroke(this.component.shapePath);

        const boltR = Math.max(1.2, h * 0.45);
        ctx.fillStyle = base.withBrightness(-0.24).toRGBAString();
        ctx.beginPath();
        ctx.arc(x + boltR * 1.6, y + h / 2, boltR, 0, Math.PI * 2);
        ctx.arc(x + w - boltR * 1.6, y + h / 2, boltR, 0, Math.PI * 2);
        ctx.fill();
    }
}
