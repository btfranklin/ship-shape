import { RNG, HSBAColor, getPath2D } from '../../greebler/common.js';
import { ShipComponent } from '../ShipComponent.js';
import { ComponentRenderer } from './ComponentRenderer.js';

export class SensorRenderer implements ComponentRenderer {
    generateShape(component: ShipComponent, rng: RNG): void {
        const Path2D = getPath2D();
        const p = new Path2D();
        const { x, y, w, h } = component.bounds;
        
        const isBottom = component.invertLighting;
        const isFront = component.variant === 'front';
        const isBack = component.variant === 'back';
        
        if (isFront) {
            // Base at Left (attached to ship), Taper towards Right (forward)
            const baseW = w * 0.25;
            const taper = h * 0.1;
            p.moveTo(x, y); // Top Left (Full Height)
            p.lineTo(x + baseW, y + taper); // Top Right (Tapered)
            p.lineTo(x + baseW, y + h - taper); // Bottom Right (Tapered)
            p.lineTo(x, y + h); // Bottom Left (Full Height)
            p.closePath();
        } else if (isBack) {
            // Base at Right (attached to ship), Taper towards Left (backward)
            const baseW = w * 0.25;
            const taper = h * 0.1;
            const baseX = x + w;
            
            p.moveTo(baseX, y); // Top Right (Full Height)
            p.lineTo(baseX - baseW, y + taper); // Top Left (Tapered)
            p.lineTo(baseX - baseW, y + h - taper); // Bottom Left (Tapered)
            p.lineTo(baseX, y + h); // Bottom Right (Full Height)
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
        const isBack = component.variant === 'back';

        // 0. Draw Support Connection
        if ((isFront || isBack) && component.shipCenterX !== undefined) {
             const centerX = component.shipCenterX;
             let suppX = 0;
             let suppW = 0;
             const suppY = y;
             const suppH = h;
             
             if (isFront) {
                 // Sensor at right. Base at x. Center is to the left.
                 // Support from centerX to x.
                 suppX = centerX;
                 suppW = x - centerX;
                 // Overlap
                 suppW += 2; 
             } else { // isBack
                 // Sensor at left. Base at x+w. Center is to the right.
                 // Support from x+w to centerX.
                 suppX = x + w;
                 suppW = centerX - (x + w);
                 // Overlap
                 suppX -= 2;
                 suppW += 2;
             }
             
             // Draw Gradient (Top-Down to match beam profile)
             const suppGrad = ctx.createLinearGradient(0, suppY, 0, suppY + suppH);
             const bc = component.color;
             suppGrad.addColorStop(0, bc.withBrightness(0.1).toRGBAString());
             suppGrad.addColorStop(0.5, bc.withBrightness(-0.1).toRGBAString());
             suppGrad.addColorStop(1, bc.withBrightness(-0.3).toRGBAString());
             
             ctx.fillStyle = suppGrad;
             ctx.fillRect(suppX, suppY, suppW, suppH);
        }
        else if (component.shipCenterY !== undefined && !isFront && !isBack) {
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
        } else if (isBack) {
             grad = ctx.createLinearGradient(x + w, y, x + w * 0.75, y); // Right to Left
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
        
        if (isFront || isBack) {
             const baseW = w * 0.25;
             const direction = isFront ? 1 : -1;
             // Start X is the outer edge of the base
             const startX = isFront ? x + baseW : x + w - baseW;
             // Antenna Length: Remaining width
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
                        // Ensure thickEndX accounts for direction
                        const thickEndX = startX + thickLen * direction;
                        
                        ctx.fillStyle = baseColor.toRGBAString();
                        // Rect coords must be top-left, so if direction is -1, we need to adjust
                        const rectX = direction === 1 ? startX : startX - thickLen;
                        ctx.fillRect(rectX, posY - thickW/2, thickLen, thickW);
                        ctx.strokeStyle = baseColor.withBrightness(-0.3).toRGBAString();
                        ctx.strokeRect(rectX, posY - thickW/2, thickLen, thickW);
                        
                        if (thinLen > 0) {
                            ctx.strokeStyle = techColor.toRGBAString();
                            ctx.beginPath();
                            ctx.moveTo(thickEndX, posY);
                            ctx.lineTo(thickEndX + thinLen * direction, posY);
                            ctx.stroke();
                        }
                        // Tip
                         ctx.fillStyle = 'red';
                         ctx.beginPath();
                         ctx.arc(startX + totalLen * direction, posY, 2, 0, Math.PI * 2);
                         ctx.fill();
                    } else {
                        ctx.strokeStyle = techColor.toRGBAString();
                        ctx.beginPath();
                        ctx.moveTo(startX, posY);
                        ctx.lineTo(startX + totalLen * direction, posY);
                        ctx.stroke();
                         ctx.fillStyle = 'red';
                         ctx.beginPath();
                         ctx.arc(startX + totalLen * direction, posY, 2, 0, Math.PI * 2);
                         ctx.fill();
                    }
                } else if (type === 'dish') {
                     const poleEnd = startX + totalLen * 0.6 * direction;
                     ctx.strokeStyle = techColor.toRGBAString();
                     ctx.beginPath();
                     ctx.moveTo(startX, posY);
                     ctx.lineTo(poleEnd, posY);
                     ctx.stroke();
                     
                     const dishW = rng.range(15, 30);
                     const dishH = dishW * 0.6;
                     ctx.save();
                     ctx.translate(poleEnd, posY);
                     // Rotation: 0 is Right. PI is Left.
                     // If Front (dir=1), we want to open Right. Code was rotate(-PI/2 to PI/2).
                     // If Back (dir=-1), we want to open Left. 
                     const baseRot = isFront ? -Math.PI/2 : Math.PI/2;
                     ctx.rotate(baseRot + rng.range(-0.5, 0.5)); 
                     
                     ctx.fillStyle = baseColor.withBrightness(-0.2).toRGBAString();
                     ctx.beginPath();
                     // Draw "C" shape. 
                     // If Front (-PI/2 base), Arc(0,0,r, PI/2, 3PI/2)? 
                     // Previous code for Front: rotate(rng - PI/2). arc(PI/2, 3PI/2).
                     // Wait, previous code was: rotate(rng - PI/2). arc(PI/2, 3PI/2).
                     // Effectively pointing Right.
                     
                     // Let's simplify. 
                     // We draw a cup facing UP relative to current rotation.
                     // Then we rotate it to face Left or Right.
                     // Arc(0,0, r, 0, PI). (Bottom half).
                     // If we rotate -PI/2 (Left turn), the Bottom Half faces Right. Correct.
                     // If we rotate +PI/2 (Right turn), the Bottom Half faces Left. Correct.
                     
                     ctx.arc(0, 0, dishW/2, 0, Math.PI, false); 
                     ctx.fill();
                     ctx.strokeStyle = baseColor.withBrightness(-0.4).toRGBAString();
                     ctx.stroke();
                     
                     // Spire (sticking out of the cup)
                     ctx.strokeStyle = techColor.toRGBAString();
                     ctx.beginPath();
                     ctx.moveTo(0,0);
                     ctx.lineTo(0, dishH * 1.5); // Stick "down" (which is Right or Left after rotation)
                     ctx.stroke();
                     ctx.restore();
                } else if (type === 'array') {
                    const endX = startX + totalLen * direction;
                    ctx.strokeStyle = techColor.toRGBAString();
                    ctx.beginPath();
                    ctx.moveTo(startX, posY);
                    ctx.lineTo(endX, posY);
                    ctx.stroke();
                    const bars = rng.intRange(3, 6);
                    for(let b=0; b<bars; b++) {
                         const progress = 0.4 + 0.6 * (b/bars);
                         const barX = startX + (totalLen * progress * direction);
                         const barH = rng.range(5, 10); 
                         ctx.beginPath();
                         ctx.moveTo(barX, posY - barH/2);
                         ctx.lineTo(barX, posY + barH/2);
                         ctx.stroke();
                    }
                } else if (type === 'box') {
                    const poleEnd = startX + totalLen * 0.7 * direction;
                    ctx.strokeStyle = techColor.toRGBAString(); 
                    ctx.beginPath();
                    ctx.moveTo(startX, posY);
                    ctx.lineTo(poleEnd, posY);
                    ctx.stroke();
                    
                    const perpSize = rng.range(10, 20);
                    const paraSize = totalLen * rng.range(0.15, 0.25);
                    
                    const rectX = direction === 1 ? poleEnd : poleEnd - paraSize;
                    const rectY = posY - perpSize/2;
                    
                    ctx.fillStyle = baseColor.withBrightness(-0.2).toRGBAString();
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
                    ctx.strokeStyle = techColor.toRGBAString(); // Fix: Ensure stroke style is set
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
