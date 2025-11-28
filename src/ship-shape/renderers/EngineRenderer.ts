import { RNG, HSBAColor } from '../../greebler/common.js';
import { ShipComponent } from '../ShipComponent.js';
import { ComponentRenderer } from './ComponentRenderer.js';

export class EngineRenderer implements ComponentRenderer {
    generateShape(component: ShipComponent, rng: RNG): void {
        const p = new Path2D();
        const { x, y, w, h } = component.bounds;
        let shapeType = 'rect';

        // Engines are blocky or tapered at back
        if (component.engineStyle === 'radiator') shapeType = 'rect';
        else if (component.engineStyle === 'energy') shapeType = rng.choice(['rect', 'chamfer']);
        else shapeType = rng.choice(['rect', 'taper-back', 'chamfer']);

        switch (shapeType) {
            case 'rect':
                p.rect(x, y, w, h);
                break;
            case 'chamfer':
                const cSize = Math.min(w, h) * 0.2;
                p.moveTo(x + cSize, y);
                p.lineTo(x + w - cSize, y);
                p.lineTo(x + w, y + cSize);
                p.lineTo(x + w, y + h - cSize);
                p.lineTo(x + w - cSize, y + h);
                p.lineTo(x + cSize, y + h);
                p.lineTo(x, y + h - cSize);
                p.lineTo(x, y + cSize);
                p.closePath();
                break;
            case 'taper-back':
                const taperB = h * 0.2;
                p.moveTo(x, y + taperB);
                p.lineTo(x + w, y);
                p.lineTo(x + w, y + h);
                p.lineTo(x, y + h - taperB);
                p.closePath();
                break;
        }
        component.shapePath = p;
    }

    draw(ctx: CanvasRenderingContext2D, component: ShipComponent, rng: RNG): void {
        if (!component.shapePath) return;
        
        ctx.save();
        ctx.clip(component.shapePath);
        
        if (component.engineStyle === 'radiator') {
            this.drawRadiatorEngine(ctx, component);
        } else if (component.engineStyle === 'energy') {
            this.drawEnergyEngine(ctx, component);
        } else {
            this.drawStandardEngine(ctx, component);
        }

        ctx.restore();

        // Outer Stroke
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 1;
        ctx.stroke(component.shapePath);
    }

    private drawRadiatorEngine(ctx: CanvasRenderingContext2D, component: ShipComponent) {
        if (!component.shapePath) return;
        // Dark Heatsink
        ctx.fillStyle = '#1a1a1a';
        ctx.fill(component.shapePath);

        // Glowing Slats
        const glowColor = component.color.withSaturation(1.0).withBrightness(0.5).toRGBAString(); // Hot!
        ctx.fillStyle = glowColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 5;

        const slatCount = Math.floor(component.bounds.h / 15);
        const slatH = 4;
        for (let i = 1; i < slatCount; i++) {
            const sy = component.bounds.y + (component.bounds.h / slatCount) * i;
            // Draw slat inside
            ctx.fillRect(component.bounds.x + 5, sy, component.bounds.w - 10, slatH);
        }
    }

    private drawEnergyEngine(ctx: CanvasRenderingContext2D, component: ShipComponent) {
        if (!component.shapePath) return;
        // 1. Draw Housing (Chassis)
        // Dark metallic block to hold the core
        const housingGrad = ctx.createLinearGradient(component.bounds.x, component.bounds.y, component.bounds.x, component.bounds.y + component.bounds.h);
        housingGrad.addColorStop(0, '#2a2a2a');
        housingGrad.addColorStop(0.5, '#444');
        housingGrad.addColorStop(1, '#2a2a2a');

        ctx.fillStyle = housingGrad;
        ctx.fill(component.shapePath);

        // 2. Inset for Core
        const inset = Math.min(component.bounds.w, component.bounds.h) * 0.15;
        const innerX = component.bounds.x + inset;
        const innerY = component.bounds.y + inset;
        const innerW = component.bounds.w - inset * 2;
        const innerH = component.bounds.h - inset * 2;

        // Dark background for core area
        ctx.fillStyle = '#050505';
        ctx.fillRect(innerX, innerY, innerW, innerH);

        // 3. Glowing Core Gradient
        const cx = innerX + innerW / 2;
        const cy = innerY + innerH / 2;
        const r = Math.min(innerW, innerH) * 0.7;

        const grad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
        // component.energyGlowHue is private? 
        // Wait, I need to access energyGlowHue. It is private in ShipComponent.
        // I should make it public or accessible.
        // I'll check ShipComponent again.
        // It is `private energyGlowHue: number = 0.0;`.
        // I need to fix this in ShipComponent.ts first or just cast to any for now, or add getter.
        // I'll add getter or make public in ShipComponent.ts step.
        // For now I'll assume it is public.
        const energyColor = new HSBAColor((component as any).energyGlowHue, 1.0, 1.0);
        grad.addColorStop(0, energyColor.withBrightness(1.0).toRGBAString()); // White hot
        grad.addColorStop(0.4, energyColor.toRGBAString());
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = grad;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillRect(innerX, innerY, innerW, innerH);
        ctx.globalCompositeOperation = 'source-over';

        // 4. Containment Brackets (Over the core, attached to housing)
        ctx.fillStyle = '#333'; // Darker metal
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1;

        const clampH = innerH * 0.25;
        const clampW = innerW * 0.5;

        // Top Clamp (extending down from housing top)
        ctx.beginPath();
        ctx.moveTo(cx - clampW / 2, innerY);
        ctx.lineTo(cx + clampW / 2, innerY);
        ctx.lineTo(cx + clampW / 3, innerY + clampH);
        ctx.lineTo(cx - clampW / 3, innerY + clampH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Bottom Clamp
        ctx.beginPath();
        ctx.moveTo(cx - clampW / 2, innerY + innerH);
        ctx.lineTo(cx + clampW / 2, innerY + innerH);
        ctx.lineTo(cx + clampW / 3, innerY + innerH - clampH);
        ctx.lineTo(cx - clampW / 3, innerY + innerH - clampH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Rivet details on clamps
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(cx, innerY + clampH / 2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, innerY + innerH - clampH / 2, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawStandardEngine(ctx: CanvasRenderingContext2D, component: ShipComponent) {
        if (!component.shapePath) return;
        // Standard Cylinder
        const grad = ctx.createLinearGradient(component.bounds.x, component.bounds.y, component.bounds.x, component.bounds.y + component.bounds.h);
        const base = component.color;
        grad.addColorStop(0, base.withBrightness(-0.4).toRGBAString());
        grad.addColorStop(0.2, base.withBrightness(-0.1).toRGBAString());
        grad.addColorStop(0.5, base.withBrightness(0.2).toRGBAString()); // Highlight
        grad.addColorStop(0.8, base.withBrightness(-0.1).toRGBAString());
        grad.addColorStop(1, base.withBrightness(-0.4).toRGBAString());
        ctx.fillStyle = grad;
        ctx.fill(component.shapePath);

        // Rings
        ctx.strokeStyle = base.withBrightness(-0.5).toRGBAString();
        ctx.lineWidth = 2;
        const ringCount = Math.floor(component.bounds.w / 40) || 2;
        for (let i = 1; i < ringCount; i++) {
            const rx = component.bounds.x + (component.bounds.w / ringCount) * i;
            ctx.beginPath();
            ctx.moveTo(rx, component.bounds.y);
            ctx.lineTo(rx, component.bounds.y + component.bounds.h);
            ctx.stroke();
        }
    }
}
