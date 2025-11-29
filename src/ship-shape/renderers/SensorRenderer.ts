import { RNG, HSBAColor } from '../../greebler/common.js';
import { ShipComponent } from '../ShipComponent.js';
import { ComponentRenderer } from './ComponentRenderer.js';

export class SensorRenderer implements ComponentRenderer {
    generateShape(component: ShipComponent, rng: RNG): void {
        const p = new Path2D();
        const { x, y, w, h } = component.bounds;
        
        // Determine direction based on position relative to some center? 
        // We don't have ship center here easily.
        // But we can assume standard orientation.
        // Let's treat the component bounds as the *entire* allocated area.
        // The "Base" will be anchored to the "hull side" of this area.
        // Usually, things are attached to a parent.
        // If it's a top attachment, the hull is at the bottom of this component.
        // If it's a bottom attachment, the hull is at the top of this component.
        
        // Heuristic: We'll assume "Up" (base at bottom) for now, 
        // unless we can detect it's a bottom component.
        // ShipComponent doesn't have "attachmentSide".
        // However, `invertLighting` is often set for bottom components in `CompositeShipGenerator`.
        // Let's use `invertLighting` as a proxy for "Bottom Component".
        
        const isBottom = component.invertLighting;
        const baseH = h * 0.25;

        if (isBottom) {
            // Base at Top
            const taper = w * 0.1;
            p.moveTo(x, y); // Top Left
            p.lineTo(x + w, y); // Top Right
            p.lineTo(x + w - taper, y + baseH); // Bottom Right (in)
            p.lineTo(x + taper, y + baseH); // Bottom Left (in)
            p.closePath();
        } else {
            // Base at Bottom (Standard)
            const taper = w * 0.1;
            p.moveTo(x + taper, y + h - baseH); // Top Left (in)
            p.lineTo(x + w - taper, y + h - baseH); // Top Right (in)
            p.lineTo(x + w, y + h); // Bottom Right
            p.lineTo(x, y + h); // Bottom Left
            p.closePath();
        }

        component.shapePath = p;
    }

    draw(ctx: CanvasRenderingContext2D, component: ShipComponent, rng: RNG): void {
        if (!component.shapePath) return;
        
        const { x, y, w, h } = component.bounds;
        const isBottom = component.invertLighting;
        const baseH = h * 0.25;

        // 1. Draw Base
        const baseColor = component.color;
        const grad = ctx.createLinearGradient(x, y, x + w, y);
        grad.addColorStop(0, baseColor.withBrightness(0.1).toRGBAString());
        grad.addColorStop(0.5, baseColor.withBrightness(-0.1).toRGBAString());
        grad.addColorStop(1, baseColor.withBrightness(-0.3).toRGBAString());
        
        ctx.fillStyle = grad;
        ctx.fill(component.shapePath);
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 1;
        ctx.stroke(component.shapePath);

        // 2. Draw Antennas / Scanners
        // Area for antennas is the remaining height
        const antennaH = h - baseH;
        const startY = isBottom ? y + baseH : y + h - baseH;
        const direction = isBottom ? 1 : -1; // 1 = Down, -1 = Up

        ctx.save();
        // Removed clipping to allow antennas to extend beyond bounds
        ctx.beginPath();

        const antennaCount = rng.intRange(2, 5);
        const techColor = baseColor.withSaturation(-0.3).withBrightness(0.15); // Moderate brightness
        
        for (let i = 0; i < antennaCount; i++) {
            let type: string;
            let isThickPole = false;
            
            // 60% chance of a thick pole, otherwise random other type
            if (rng.bool(0.6)) {
                type = 'pole';
                isThickPole = true;
            } else {
                type = rng.choice(['pole', 'dish', 'array', 'box']);
            }

            const posX = x + w * rng.range(0.1, 0.9);
            
            ctx.lineWidth = 2;
            
            let totalAntennaHeight: number;

            // Determine totalAntennaHeight based on type and thickness
            if (isThickPole) {
                totalAntennaHeight = antennaH * rng.range(0.6, 3.0); // 2-3x taller
            } else {
                totalAntennaHeight = antennaH * rng.range(0.3, 1.0); // Normal height variation
            }
            
            // --- Draw Antennas based on Type ---
            if (type === 'pole') {
                if (isThickPole) {
                    const thickH = totalAntennaHeight * rng.range(0.3, 0.7); // Portion of height that is thick
                    const thickW = rng.range(4, 8); // Fixed pixel width, slightly thicker than lines
                    const thinH = totalAntennaHeight - thickH;

                    const thickTopY = startY + thickH * direction;
                    
                    // Draw thick base (rectangle) with component's base color
                    ctx.fillStyle = baseColor.toRGBAString(); 
                    const rectX = posX - thickW/2;
                    const rectY = isBottom ? startY : thickTopY;
                    ctx.fillRect(rectX, rectY, thickW, thickH);
                    ctx.strokeStyle = baseColor.withBrightness(-0.3).toRGBAString(); // Darker stroke for base
                    ctx.strokeRect(rectX, rectY, thickW, thickH);

                    // Draw thin extension (line) using tech color
                    if (thinH > 0.0) {
                        ctx.strokeStyle = techColor.toRGBAString(); // Brighter stroke
                        ctx.beginPath();
                        ctx.moveTo(posX, thickTopY);
                        ctx.lineTo(posX, thickTopY + thinH * direction);
                        ctx.stroke();
                    }
                    
                    // Tip light for the thin part
                    const endY = startY + totalAntennaHeight * direction;
                    ctx.fillStyle = 'red';
                    ctx.beginPath();
                    ctx.arc(posX, endY, 2, 0, Math.PI * 2);
                    ctx.fill();

                } else { // Simple pole (not thick)
                    const endY = startY + totalAntennaHeight * direction;
                    ctx.strokeStyle = techColor.toRGBAString(); // Brighter stroke
                    ctx.beginPath();
                    ctx.moveTo(posX, startY);
                    ctx.lineTo(posX, endY);
                    ctx.stroke();
                    
                    // Tip light
                    ctx.fillStyle = 'red'; // blinking light?
                    ctx.beginPath();
                    ctx.arc(posX, endY, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            } 
            else if (type === 'dish') {
                // Pole + Dish
                const poleEnd = startY + totalAntennaHeight * 0.6 * direction;
                ctx.strokeStyle = techColor.toRGBAString(); // Brighter stroke for pole part
                ctx.beginPath();
                ctx.moveTo(posX, startY);
                ctx.lineTo(posX, poleEnd);
                ctx.stroke();
                
                // Dish
                const dishW = rng.range(15, 30); // Fixed pixel width
                const dishH = dishW * 0.6;
                
                ctx.save();
                ctx.translate(posX, poleEnd);
                // Random angle
                ctx.rotate(rng.range(-0.5, 0.5));
                
                ctx.fillStyle = baseColor.withBrightness(-0.2).toRGBAString(); // 2 shades darker
                ctx.beginPath();
                if (isBottom) {
                     ctx.arc(0, 0, dishW/2, 0, Math.PI, false); 
                } else {
                     ctx.arc(0, 0, dishW/2, 0, Math.PI, true); 
                }
                ctx.fill();
                ctx.strokeStyle = baseColor.withBrightness(-0.4).toRGBAString(); // 4 shades darker
                ctx.stroke();
                
                // Center spire
                ctx.strokeStyle = techColor.toRGBAString(); // Brighter stroke for spire
                ctx.beginPath();
                ctx.moveTo(0,0);
                ctx.lineTo(0, -dishH * (isBottom ? -1.5 : 1.5));
                ctx.stroke();
                
                ctx.restore();
            }
            else if (type === 'array') {
                // Yagi-style array
                const endY = startY + totalAntennaHeight * direction;
                ctx.strokeStyle = techColor.toRGBAString(); // Brighter stroke
                ctx.beginPath();
                ctx.moveTo(posX, startY);
                ctx.lineTo(posX, endY);
                ctx.stroke();
                
                // Crossbars
                const bars = rng.intRange(3, 6);
                for (let b = 0; b < bars; b++) {
                    const barY = startY + (totalAntennaHeight * 0.4 + totalAntennaHeight * 0.6 * (b/bars)) * direction;
                    const barW = rng.range(5, 10); // Fixed pixel width
                    
                    ctx.beginPath();
                    ctx.moveTo(posX - barW/2, barY);
                    ctx.lineTo(posX + barW/2, barY);
                    ctx.stroke();
                }
            }
            else if (type === 'box') {
                // Boxy sensor head
                const poleEnd = startY + totalAntennaHeight * 0.7 * direction;
                ctx.beginPath();
                ctx.moveTo(posX, startY);
                ctx.lineTo(posX, poleEnd);
                ctx.stroke();
                
                const boxW = rng.range(10, 20); // Fixed pixel width
                const boxH = totalAntennaHeight * rng.range(0.15, 0.25); // Also adjust boxH to be a bit more controlled
                
                ctx.fillStyle = baseColor.withBrightness(-0.2).toRGBAString(); // 2 shades darker
                const bx = posX - boxW/2;
                const by = isBottom ? poleEnd : poleEnd - boxH;
                
                ctx.fillRect(bx, by, boxW, boxH);
                ctx.strokeStyle = baseColor.withBrightness(-0.4).toRGBAString(); // 4 shades darker
                ctx.strokeRect(bx, by, boxW, boxH);
                
                // Lens/detail
                ctx.fillStyle = '#00ffff'; // Glowing blue eye
                ctx.fillRect(bx + boxW*0.2, by + boxH*0.2, boxW*0.6, boxH*0.4);
            }
        }
        
        ctx.restore();
    }
}
