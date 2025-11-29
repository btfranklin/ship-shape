import { RNG, HSBAColor } from '../../greebler/common.js';
import { ShipComponent } from '../ShipComponent.js';
import { ComponentRenderer } from './ComponentRenderer.js';

export class SensorRenderer implements ComponentRenderer {
    generateShape(component: ShipComponent, rng: RNG): void {
        const p = new Path2D();
        const { x, y, w, h } = component.bounds;
        
        const isBottom = component.invertLighting;
        const isFront = component.variant === 'front';
        
        if (isFront) {
            // Base at Left
            const baseW = w * 0.25;
            const taper = h * 0.1;
            p.moveTo(x, y + taper);
            p.lineTo(x + baseW, y); // Top Right (in)
            p.lineTo(x + baseW, y + h); // Bottom Right (in)
            p.lineTo(x, y + h - taper); // Bottom Left
            p.closePath();
        } else {
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
        }

        component.shapePath = p;
    }

    draw(ctx: CanvasRenderingContext2D, component: ShipComponent, rng: RNG): void {
        if (!component.shapePath) return;
        
        const { x, y, w, h } = component.bounds;
        const isBottom = component.invertLighting;
        const isFront = component.variant === 'front';

        // 0. Draw Support Connection (if center provided and not front)
        if (component.shipCenterY !== undefined && !isFront) {
             const centerY = component.shipCenterY;
             
             // Match full width of the component as the base is the widest part
             const suppX = x;
             const suppW = w;
             let suppY = 0;
             let suppH = 0;
             
             if (isBottom) {
                 // Sensor is below center. Base is at y. Connect up to centerY.
                 suppY = centerY;
                 suppH = y - centerY;
                 // Add overlap
                 suppH += 2;
             } else {
                 // Sensor is above center. Base is at y+h. Connect down to centerY.
                 suppY = y + h;
                 suppH = centerY - (y + h);
                 // Add overlap
                 suppY -= 2;
                 suppH += 2;
             }
             
             // Apply gradient shading to match the base
             const suppGrad = ctx.createLinearGradient(suppX, 0, suppX + suppW, 0);
             const bc = component.color;
             suppGrad.addColorStop(0, bc.withBrightness(0.1).toRGBAString());
             suppGrad.addColorStop(0.5, bc.withBrightness(-0.1).toRGBAString());
             suppGrad.addColorStop(1, bc.withBrightness(-0.3).toRGBAString());
             
             ctx.fillStyle = suppGrad;
             ctx.fillRect(suppX, suppY, suppW, suppH);
        }

        // 1. Draw Base
        const baseColor = component.color;
        let grad;
        if (isFront) {
             grad = ctx.createLinearGradient(x, y, x + w * 0.25, y); // Left to Right
        } else {
             grad = ctx.createLinearGradient(x, y, x + w, y); // Top to Bottom (or Left-Right gradient for horizontal bar?)
             // Original code was (x,y) to (x+w, y) which is Left-Right gradient on the horizontal bar.
             // That makes sense for lighting.
        }
        
        grad.addColorStop(0, baseColor.withBrightness(0.1).toRGBAString());
        grad.addColorStop(0.5, baseColor.withBrightness(-0.1).toRGBAString());
        grad.addColorStop(1, baseColor.withBrightness(-0.3).toRGBAString());
        
        ctx.fillStyle = grad;
        ctx.fill(component.shapePath);
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 1;
        ctx.stroke(component.shapePath);

        // 2. Draw Antennas / Scanners
        ctx.save();
        ctx.beginPath();
        
        const antennaCount = rng.intRange(2, 5);
        const techColor = baseColor.withSaturation(-0.3).withBrightness(0.15); 
        
        // Shared Loop Logic?
        // No, simpler to branch the drawing coordinates.
        
        if (isFront) {
             const baseW = w * 0.25;
             const startX = x + baseW;
             const antennaL = w - baseW;
             
             for (let i = 0; i < antennaCount; i++) {
                let type: string;
                let isThickPole = false;
                if (rng.bool(0.6)) { type = 'pole'; isThickPole = true; } 
                else { type = rng.choice(['pole', 'dish', 'array', 'box']); }
                
                const posY = y + h * rng.range(0.1, 0.9); // Distribute Vertically
                ctx.lineWidth = 2;
                
                let totalLen = isThickPole ? antennaL * rng.range(0.6, 3.0) : antennaL * rng.range(0.3, 1.0);
                
                if (type === 'pole') {
                    if (isThickPole) {
                        const thickLen = totalLen * rng.range(0.3, 0.7);
                        const thickW = rng.range(4, 8);
                        const thinLen = totalLen - thickLen;
                        const thickEndX = startX + thickLen;
                        
                        ctx.fillStyle = baseColor.toRGBAString();
                        ctx.fillRect(startX, posY - thickW/2, thickLen, thickW);
                        ctx.strokeStyle = baseColor.withBrightness(-0.3).toRGBAString();
                        ctx.strokeRect(startX, posY - thickW/2, thickLen, thickW);
                        
                        if (thinLen > 0) {
                            ctx.strokeStyle = techColor.toRGBAString();
                            ctx.beginPath();
                            ctx.moveTo(thickEndX, posY);
                            ctx.lineTo(thickEndX + thinLen, posY);
                            ctx.stroke();
                        }
                        // Tip
                         ctx.fillStyle = 'red';
                         ctx.beginPath();
                         ctx.arc(startX + totalLen, posY, 2, 0, Math.PI * 2);
                         ctx.fill();
                    } else {
                        ctx.strokeStyle = techColor.toRGBAString();
                        ctx.beginPath();
                        ctx.moveTo(startX, posY);
                        ctx.lineTo(startX + totalLen, posY);
                        ctx.stroke();
                         ctx.fillStyle = 'red';
                         ctx.beginPath();
                         ctx.arc(startX + totalLen, posY, 2, 0, Math.PI * 2);
                         ctx.fill();
                    }
                } else if (type === 'dish') {
                     const poleEnd = startX + totalLen * 0.6;
                     ctx.strokeStyle = techColor.toRGBAString();
                     ctx.beginPath();
                     ctx.moveTo(startX, posY);
                     ctx.lineTo(poleEnd, posY);
                     ctx.stroke();
                     
                     const dishW = rng.range(15, 30);
                     const dishH = dishW * 0.6;
                     ctx.save();
                     ctx.translate(poleEnd, posY);
                     ctx.rotate(rng.range(-0.5, 0.5) - Math.PI/2); // Rotate to face right (Dish cup opens to right?)
                     // Original was vertical. Arc from 0 to PI.
                     // 0 is Right (0 rad). PI is Left (180 rad).
                     // To face Right (open right), we want arc from -PI/2 to PI/2?
                     // Original: Arc(0,0, r, 0, PI). shape is Half Circle.
                     // If False (CounterClockwise), it draws bottom half.
                     // If True (Clockwise), it draws top half.
                     // We want to open to the Right. The "Back" of the dish is Left.
                     // So we want the arc curve to be on the Left.
                     // Arc centered at 0,0.
                     // If we draw 0 to PI (CW), we get Bottom Half (0 to 180).
                     // We want a "C" shape. PI/2 to 3PI/2.
                     
                     ctx.fillStyle = baseColor.withBrightness(-0.2).toRGBAString();
                     ctx.beginPath();
                     ctx.arc(0, 0, dishW/2, Math.PI/2, 3*Math.PI/2, false); 
                     ctx.fill();
                     ctx.strokeStyle = baseColor.withBrightness(-0.4).toRGBAString();
                     ctx.stroke();
                     
                     // Spire
                     ctx.strokeStyle = techColor.toRGBAString();
                     ctx.beginPath();
                     ctx.moveTo(0,0);
                     ctx.lineTo(dishH * 1.5, 0); // Stick out right
                     ctx.stroke();
                     ctx.restore();
                } else if (type === 'array') {
                    const endX = startX + totalLen;
                    ctx.strokeStyle = techColor.toRGBAString();
                    ctx.beginPath();
                    ctx.moveTo(startX, posY);
                    ctx.lineTo(endX, posY);
                    ctx.stroke();
                    const bars = rng.intRange(3, 6);
                    for(let b=0; b<bars; b++) {
                         const barX = startX + (totalLen * 0.4 + totalLen * 0.6 * (b/bars));
                         const barH = rng.range(5, 10); // Height now
                         ctx.beginPath();
                         ctx.moveTo(barX, posY - barH/2);
                         ctx.lineTo(barX, posY + barH/2);
                         ctx.stroke();
                    }
                } else if (type === 'box') {
                    const poleEnd = startX + totalLen * 0.7;
                    ctx.beginPath();
                    ctx.moveTo(startX, posY);
                    ctx.lineTo(poleEnd, posY);
                    ctx.stroke();
                    
                    const boxW = rng.range(10, 20); // Size
                    const boxH = totalLen * rng.range(0.15, 0.25); // Size
                    
                    ctx.fillStyle = baseColor.withBrightness(-0.2).toRGBAString();
                    const bx = poleEnd; // Start at pole end
                    const by = posY - boxH/2;
                    
                    ctx.fillRect(bx, by, boxW, boxH); // boxW is Length here?
                    // Let's keep boxW as the "thickness" and boxH as "length"?
                    // In vertical: boxW was Width (perpendicular to pole). boxH was Height (parallel).
                    // Here: boxW should be Height (perpendicular). boxH should be Length (parallel).
                    // Variable names are confusing.
                    // boxW (rng 10-20) -> Perpendicular size.
                    // boxH -> Parallel size.
                    
                    const perpSize = rng.range(10, 20);
                    const paraSize = totalLen * rng.range(0.15, 0.25);
                    
                    const rectX = poleEnd;
                    const rectY = posY - perpSize/2;
                    
                    ctx.fillRect(rectX, rectY, paraSize, perpSize);
                    ctx.strokeStyle = baseColor.withBrightness(-0.4).toRGBAString();
                    ctx.strokeRect(rectX, rectY, paraSize, perpSize);
                    
                     ctx.fillStyle = '#00ffff';
                     ctx.fillRect(rectX + paraSize*0.2, rectY + perpSize*0.2, paraSize*0.4, perpSize*0.6);
                }
             }
             
        } else {
             // EXISTING VERTICAL LOGIC
            const baseH = h * 0.25;
            const antennaH = h - baseH;
            const startY = isBottom ? y + baseH : y + h - baseH;
            const direction = isBottom ? 1 : -1; 
            
            for (let i = 0; i < antennaCount; i++) {
                let type: string;
                let isThickPole = false;
                if (rng.bool(0.6)) { type = 'pole'; isThickPole = true; } 
                else { type = rng.choice(['pole', 'dish', 'array', 'box']); }

                const posX = x + w * rng.range(0.1, 0.9);
                ctx.lineWidth = 2;
                let totalAntennaHeight: number;
                if (isThickPole) { totalAntennaHeight = antennaH * rng.range(0.6, 3.0); } 
                else { totalAntennaHeight = antennaH * rng.range(0.3, 1.0); }
                
                if (type === 'pole') {
                    if (isThickPole) {
                        const thickH = totalAntennaHeight * rng.range(0.3, 0.7); 
                        const thickW = rng.range(4, 8); 
                        const thinH = totalAntennaHeight - thickH;
                        const thickTopY = startY + thickH * direction;
                        
                        ctx.fillStyle = baseColor.toRGBAString(); 
                        const rectX = posX - thickW/2;
                        const rectY = isBottom ? startY : thickTopY;
                        ctx.fillRect(rectX, rectY, thickW, thickH);
                        ctx.strokeStyle = baseColor.withBrightness(-0.3).toRGBAString();
                        ctx.strokeRect(rectX, rectY, thickW, thickH);

                        if (thinH > 0.0) {
                            ctx.strokeStyle = techColor.toRGBAString();
                            ctx.beginPath();
                            ctx.moveTo(posX, thickTopY);
                            ctx.lineTo(posX, thickTopY + thinH * direction);
                            ctx.stroke();
                        }
                        const endY = startY + totalAntennaHeight * direction;
                        ctx.fillStyle = 'red';
                        ctx.beginPath();
                        ctx.arc(posX, endY, 2, 0, Math.PI * 2);
                        ctx.fill();
                    } else { 
                        const endY = startY + totalAntennaHeight * direction;
                        ctx.strokeStyle = techColor.toRGBAString();
                        ctx.beginPath();
                        ctx.moveTo(posX, startY);
                        ctx.lineTo(posX, endY);
                        ctx.stroke();
                        ctx.fillStyle = 'red';
                        ctx.beginPath();
                        ctx.arc(posX, endY, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else if (type === 'dish') {
                    const poleEnd = startY + totalAntennaHeight * 0.6 * direction;
                    ctx.strokeStyle = techColor.toRGBAString();
                    ctx.beginPath();
                    ctx.moveTo(posX, startY);
                    ctx.lineTo(posX, poleEnd);
                    ctx.stroke();
                    const dishW = rng.range(15, 30);
                    const dishH = dishW * 0.6;
                    ctx.save();
                    ctx.translate(posX, poleEnd);
                    ctx.rotate(rng.range(-0.5, 0.5));
                    ctx.fillStyle = baseColor.withBrightness(-0.2).toRGBAString(); 
                    ctx.beginPath();
                    if (isBottom) { ctx.arc(0, 0, dishW/2, 0, Math.PI, false); } 
                    else { ctx.arc(0, 0, dishW/2, 0, Math.PI, true); }
                    ctx.fill();
                    ctx.strokeStyle = baseColor.withBrightness(-0.4).toRGBAString();
                    ctx.stroke();
                    ctx.strokeStyle = techColor.toRGBAString();
                    ctx.beginPath();
                    ctx.moveTo(0,0);
                    ctx.lineTo(0, -dishH * (isBottom ? -1.5 : 1.5));
                    ctx.stroke();
                    ctx.restore();
                } else if (type === 'array') {
                    const endY = startY + totalAntennaHeight * direction;
                    ctx.strokeStyle = techColor.toRGBAString();
                    ctx.beginPath();
                    ctx.moveTo(posX, startY);
                    ctx.lineTo(posX, endY);
                    ctx.stroke();
                    const bars = rng.intRange(3, 6);
                    for (let b = 0; b < bars; b++) {
                        const barY = startY + (totalAntennaHeight * 0.4 + totalAntennaHeight * 0.6 * (b/bars)) * direction;
                        const barW = rng.range(5, 10);
                        ctx.beginPath();
                        ctx.moveTo(posX - barW/2, barY);
                        ctx.lineTo(posX + barW/2, barY);
                        ctx.stroke();
                    }
                } else if (type === 'box') {
                    const poleEnd = startY + totalAntennaHeight * 0.7 * direction;
                    ctx.beginPath();
                    ctx.moveTo(posX, startY);
                    ctx.lineTo(posX, poleEnd);
                    ctx.stroke();
                    const boxW = rng.range(10, 20);
                    const boxH = totalAntennaHeight * rng.range(0.15, 0.25);
                    ctx.fillStyle = baseColor.withBrightness(-0.2).toRGBAString();
                    const bx = posX - boxW/2;
                    const by = isBottom ? poleEnd : poleEnd - boxH;
                    ctx.fillRect(bx, by, boxW, boxH);
                    ctx.strokeStyle = baseColor.withBrightness(-0.4).toRGBAString();
                    ctx.strokeRect(bx, by, boxW, boxH);
                    ctx.fillStyle = '#00ffff';
                    ctx.fillRect(bx + boxW*0.2, by + boxH*0.2, boxW*0.6, boxH*0.4);
                }
            }
        }
        
        ctx.restore();
    }
}
