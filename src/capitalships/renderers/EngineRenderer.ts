import { RNG, HSBAColor, getPath2D } from '../../greebles/common.js';
import { ShipComponent } from '../ShipComponent.js';
import { ComponentRenderer, ComponentShape } from './ComponentRenderer.js';

export class EngineRenderer implements ComponentRenderer {
    generateShape(component: ShipComponent, rng: RNG): ComponentShape {
        const Path2D = getPath2D();
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
        return { path: p };
    }

    draw(ctx: CanvasRenderingContext2D, component: ShipComponent, rng: RNG): void {
        ctx.save();
        ctx.clip(component.shapePath);
        
        if (component.engineStyle === 'radiator') {
            this.drawRadiatorEngine(ctx, component);
        } else if (component.engineStyle === 'energy') {
            this.drawEnergyEngine(ctx, component, rng);
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
        const { x, y, w, h } = component.bounds;

        // 1. Housing (Volumetric Metallic Gradient)
        const housingGrad = ctx.createLinearGradient(x, y, x, y + h);
        housingGrad.addColorStop(0, '#222');
        housingGrad.addColorStop(0.2, '#555');
        housingGrad.addColorStop(0.5, '#333');
        housingGrad.addColorStop(0.8, '#222');
        housingGrad.addColorStop(1, '#111');
        ctx.fillStyle = housingGrad;
        ctx.fill(component.shapePath);

        // 2. Inset for Radiator Core (Asymmetrical: Open on Left)
        const margin = Math.min(w, h) * 0.1;
        const ix = x; // Start at left edge (Open)
        const iy = y + margin;
        const iw = w - margin; // Stop before right edge
        const ih = h - margin * 2;

        // Background
        ctx.fillStyle = '#000';
        ctx.fillRect(ix, iy, iw, ih);

        // 3. Glowing Slats
        // Heat Gradient: HOT (Left) -> COOL (Right)
        const baseHeat = component.color.adjustSaturation(0.9).adjustBrightness(0.8);
        const coreHeat = component.color.adjustSaturation(0.3).adjustBrightness(1.0);

        const slatCount = Math.floor(ih / 8);
        const slatH = Math.max(3, ih / slatCount * 0.6);

        ctx.shadowBlur = 4; 
        
        for (let i = 0; i < slatCount; i++) {
            const sy = iy + (ih / slatCount) * i + (ih/slatCount - slatH)/2;
            
            // Gradient: Hot Left -> Cold Right
            const slatGrad = ctx.createLinearGradient(ix, sy, ix + iw, sy);
            slatGrad.addColorStop(0, coreHeat.toRGBAString());       // White hot output
            slatGrad.addColorStop(0.3, baseHeat.toRGBAString());
            slatGrad.addColorStop(1, baseHeat.adjustBrightness(0.2).toRGBAString()); // Darker at back

            ctx.fillStyle = slatGrad;
            ctx.shadowColor = baseHeat.toRGBAString();
            
            ctx.fillRect(ix, sy, iw - 4, slatH);
        }
        ctx.shadowBlur = 0;

        // Inner Shadow Top/Bottom
        const depthGrad = ctx.createLinearGradient(ix, iy, ix, iy + ih);
        depthGrad.addColorStop(0, 'rgba(0,0,0,0.8)');
        depthGrad.addColorStop(0.15, 'rgba(0,0,0,0)');
        depthGrad.addColorStop(0.85, 'rgba(0,0,0,0)');
        depthGrad.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = depthGrad;
        ctx.fillRect(ix, iy, iw, ih);

        // 4. Rim Highlight (Top, Bottom, Right) - No Left
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ix, iy);
        ctx.lineTo(ix + iw, iy); // Top
        ctx.lineTo(ix + iw, iy + ih); // Right
        ctx.lineTo(ix, iy + ih); // Bottom
        ctx.stroke();

        // 5. Bolts/Rivets (Right side corners only)
        ctx.fillStyle = '#111';
        const boltSize = margin * 0.4;
        const bx = margin / 2;
        const by = margin / 2;
        
        // Only Right-Top and Right-Bottom have housing corners suitable for bolts
        const bolts = [
            { bx: x + w - bx, by: y + by },       // TR
            { bx: x + w - bx, by: y + h - by },   // BR
        ];

        ctx.beginPath();
        for (const b of bolts) {
            ctx.moveTo(b.bx + boltSize, b.by);
            ctx.arc(b.bx, b.by, boltSize, 0, Math.PI*2);
        }
        ctx.fill();
        
        ctx.fillStyle = '#666';
        ctx.beginPath();
        for (const b of bolts) {
            ctx.moveTo(b.bx - 1 + boltSize*0.3, b.by - 1);
            ctx.arc(b.bx - 1, b.by - 1, boltSize*0.3, 0, Math.PI*2);
        }
        ctx.fill();
    }

    private drawEnergyEngine(ctx: CanvasRenderingContext2D, component: ShipComponent, rng: RNG) {
        const { x, y, w, h } = component.bounds;

        // 1. Housing
        const housingGrad = ctx.createLinearGradient(x, y, x, y + h);
        housingGrad.addColorStop(0, '#222');
        housingGrad.addColorStop(0.2, '#555');
        housingGrad.addColorStop(0.5, '#1a1a1a');
        housingGrad.addColorStop(0.8, '#555');
        housingGrad.addColorStop(1, '#222');
        ctx.fillStyle = housingGrad;
        ctx.fill(component.shapePath);

        // 2. Inset / Channel (Open Left)
        const marginY = h * 0.15; 
        const marginX = w * 0.05; // Only for right side now
        
        const ix = x; // Start Left
        const iy = y + marginY;
        const iw = w - marginX; // Stop before right cap
        const ih = h - marginY * 2;

        ctx.fillStyle = '#000';
        ctx.fillRect(ix, iy, iw, ih);

        // 3. Plasma Stream
        const energyColor = new HSBAColor(component.energyGlowHue, 1.0, 1.0);
        
        // Stream Gradient (Hot Left -> Stable Right)
        const streamGrad = ctx.createLinearGradient(ix, iy, ix + iw, iy);
        streamGrad.addColorStop(0, '#fff'); // White hot nozzle
        streamGrad.addColorStop(0.1, energyColor.adjustBrightness(1.0).toRGBAString());
        streamGrad.addColorStop(0.5, energyColor.adjustBrightness(0.8).toRGBAString());
        streamGrad.addColorStop(1, energyColor.adjustBrightness(0.4).toRGBAString()); // Fade out back

        ctx.fillStyle = streamGrad;
        ctx.shadowColor = energyColor.toRGBAString();
        ctx.shadowBlur = 15;
        ctx.fillRect(ix, iy + ih*0.1, iw, ih*0.8);
        ctx.shadowBlur = 0;

        // Nozzle Flare
        const nozzleGrad = ctx.createRadialGradient(ix, iy + ih/2, 0, ix, iy + ih/2, ih);
        nozzleGrad.addColorStop(0, energyColor.adjustBrightness(1.0).withAlpha(0.8).toRGBAString());
        nozzleGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = nozzleGrad;
        ctx.fillRect(ix - ih/2, iy, ih, ih); // Draw flare slightly outside

        // 4. Greebles
        const segW = 15; 
        const numSegs = Math.floor(iw / segW);
        
        ctx.fillStyle = '#333';
        ctx.strokeStyle = '#111';
        
        for (let i = 0; i < numSegs; i++) {
            const cx = ix + i * segW;
            if (cx < ix + 10) continue; // Skip very front nozzle area

            if (rng.bool(0.4)) {
                const type = rng.choice(['ring', 'claw', 'box']);
                const width = segW * rng.range(0.8, 1.5);
                
                if (type === 'ring') {
                    const ringGrad = ctx.createLinearGradient(cx, iy, cx+width, iy);
                    ringGrad.addColorStop(0, '#111'); ringGrad.addColorStop(0.5, '#444'); ringGrad.addColorStop(1, '#111');
                    ctx.fillStyle = ringGrad;
                    ctx.fillRect(cx, iy - 2, width, ih + 4);
                } else if (type === 'claw') {
                    const clawH = ih * rng.range(0.2, 0.35);
                    ctx.fillStyle = '#2a2a2a';
                    // Top
                    ctx.beginPath();
                    ctx.moveTo(cx, iy); ctx.lineTo(cx + width, iy);
                    ctx.lineTo(cx + width*0.8, iy + clawH); ctx.lineTo(cx + width*0.2, iy + clawH);
                    ctx.fill();
                    // Bot
                    ctx.beginPath();
                    ctx.moveTo(cx, iy + ih); ctx.lineTo(cx + width, iy + ih);
                    ctx.lineTo(cx + width*0.8, iy + ih - clawH); ctx.lineTo(cx + width*0.2, iy + ih - clawH);
                    ctx.fill();
                } else {
                    const boxH = marginY * 0.9;
                    ctx.fillStyle = '#444';
                    if (rng.bool(0.5)) ctx.fillRect(cx, y + marginY - boxH, width, boxH);
                    if (rng.bool(0.5)) ctx.fillRect(cx, y + h - marginY, width, boxH);
                }
            }
        }
        
        // 5. Cables
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        const cableY1 = iy + ih * 0.25;
        const cableY2 = iy + ih * 0.75;
        
        ctx.beginPath(); ctx.moveTo(ix, cableY1); ctx.lineTo(ix+iw, cableY1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ix, cableY2); ctx.lineTo(ix+iw, cableY2); ctx.stroke();
        
        // End Cap (Right Only)
        ctx.fillStyle = '#333';
        ctx.fillRect(ix+iw-5, iy, 5, ih);
    }

    private drawStandardEngine(ctx: CanvasRenderingContext2D, component: ShipComponent) {
        const { x, y, w, h } = component.bounds;
        
        // 1. Base Cylinder (Body)
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        const base = component.color;
        // Top/Bottom dark, Middle highlight (Cylinder volume)
        grad.addColorStop(0, base.adjustBrightness(-0.5).toRGBAString());
        grad.addColorStop(0.3, base.adjustBrightness(-0.1).toRGBAString());
        grad.addColorStop(0.5, base.adjustBrightness(0.3).toRGBAString()); // Specular highlight
        grad.addColorStop(0.8, base.adjustBrightness(-0.1).toRGBAString());
        grad.addColorStop(1, base.adjustBrightness(-0.5).toRGBAString());
        ctx.fillStyle = grad;
        ctx.fill(component.shapePath);

        // 2. Nozzle (Left side exhaust)
        const nozzleW = Math.max(4, w * 0.15); // At least 4px or 15%
        const nozzleGrad = ctx.createLinearGradient(x, y, x, y + h);
        nozzleGrad.addColorStop(0, '#222');
        nozzleGrad.addColorStop(0.4, '#444');
        nozzleGrad.addColorStop(0.6, '#444');
        nozzleGrad.addColorStop(1, '#222');
        
        ctx.fillStyle = nozzleGrad;
        ctx.fillRect(x, y, nozzleW, h);
        
        // Nozzle Heat Glow (Left edge fade)
        const exhaustGrad = ctx.createLinearGradient(x, y, x + nozzleW, y);
        exhaustGrad.addColorStop(0, 'rgba(255, 220, 150, 0.9)'); // Hot tip
        exhaustGrad.addColorStop(0.3, 'rgba(255, 100, 50, 0.4)');
        exhaustGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = exhaustGrad;
        ctx.fillRect(x, y + 1, nozzleW, h - 2);
        
        // Nozzle Rim Detail
        ctx.fillStyle = '#111';
        ctx.fillRect(x + nozzleW - 1, y, 1, h); // Seam between nozzle and body

        // 3. Progressive Coils (Right to Left)
        // Start from Right (Ship attachment) and move Left (Exhaust)
        const startX = x + w - 2; 
        const stopX = x + nozzleW; 
        
        let currentX = startX;
        // Initial spacing depends on width, but kept tight at the back
        let spacing = Math.max(2, w * 0.04); 
        const spacingGrowth = 1.25; // How fast they spread out

        while (currentX > stopX + spacing) {
            // Coil Width increases slightly with spacing?
            const coilW = Math.max(2, spacing * 0.35); 
            const cx = currentX - coilW;
            
            if (cx < stopX) break;

            // Coil Gradient (Raised metallic ring)
            const coilGrad = ctx.createLinearGradient(cx, y, cx, y + h);
            coilGrad.addColorStop(0, '#111');
            coilGrad.addColorStop(0.4, '#666'); // Upper shine
            coilGrad.addColorStop(0.5, '#aaa'); // Center highlight
            coilGrad.addColorStop(0.6, '#666'); 
            coilGrad.addColorStop(1, '#111');
            
            ctx.fillStyle = coilGrad;
            // Extend slightly outside bounds (y-1, h+2) to look like it wraps around
            ctx.fillRect(cx, y - 1, coilW, h + 2); 
            
            // Shadow on the left of the coil (casting shadow onto cylinder body)
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(cx - 1, y, 1, h); 

            // Update Position
            currentX -= spacing;
            spacing *= spacingGrowth;
        }
        
        // 4. End Cap (Right / Ship Connection)
        ctx.fillStyle = '#333';
        const capW = Math.max(2, w * 0.02);
        ctx.fillRect(x + w - capW, y, capW, h);
    }
}
