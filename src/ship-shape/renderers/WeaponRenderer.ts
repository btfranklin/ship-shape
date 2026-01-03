import { RNG, HSBAColor, getPath2D } from '../../greebler/common.js';
import { ShipComponent } from '../ShipComponent.js';
import { ComponentRenderer } from './ComponentRenderer.js';

export class WeaponRenderer implements ComponentRenderer {
    generateShape(component: ShipComponent, rng: RNG): void {
        const Path2D = getPath2D();
        const p = new Path2D();
        const { x, y, w, h } = component.bounds;
        
        const isTopView = component.variant === 'top-view';
        const isBottom = component.invertLighting;

        if (isTopView) {
            // Top-down view (Side mounted)
            // Angular, symmetrical-ish geometric shape
            const shape = rng.choice(['hex', 'chamfer', 'oct']);
            
            // Inset slightly so it sits "on" the hull
            const inset = rng.range(5, 15); // Fixed pixel inset
            const tx = x + inset;
            const ty = y + inset;
            const tw = w - inset*2;
            const th = h - inset*2;
            
            if (shape === 'hex') {
                p.moveTo(tx + tw*0.2, ty);
                p.lineTo(tx + tw*0.8, ty);
                p.lineTo(tx + tw, ty + th*0.5);
                p.lineTo(tx + tw*0.8, ty + th);
                p.lineTo(tx + tw*0.2, ty + th);
                p.lineTo(tx, ty + th*0.5);
            } else if (shape === 'chamfer') {
                const c = rng.range(8, 15); // Fixed pixel chamfer
                p.moveTo(tx + c, ty);
                p.lineTo(tx + tw - c, ty);
                p.lineTo(tx + tw, ty + c);
                p.lineTo(tx + tw, ty + th - c);
                p.lineTo(tx + tw - c, ty + th);
                p.lineTo(tx + c, ty + th);
                p.lineTo(tx, ty + th - c);
                p.lineTo(tx, ty + c);
            } else {
                // Octagon-ish / Irregular
                p.moveTo(tx + tw*0.3, ty);
                p.lineTo(tx + tw*0.7, ty);
                p.lineTo(tx + tw, ty + th*0.3);
                p.lineTo(tx + tw, ty + th*0.7);
                p.lineTo(tx + tw*0.7, ty + th);
                p.lineTo(tx + tw*0.3, ty + th);
                p.lineTo(tx, ty + th*0.7);
                p.lineTo(tx, ty + th*0.3);
            }
            p.closePath();
            
        } else {
            // Side View (Profile) - Top/Bottom mounted
            // Angular turret profile
            // Base is on the "hull side" (bottom if upright, top if inverted)
            
            // Randomize profile
            const topW = rng.range(15, 30); // Fixed pixel width of top of turret
            const topX = x + (w - topW) * rng.range(0.2, 0.5); // Shifted slightly back usually
            
            if (isBottom) {
                // Base at Top (y)
                p.moveTo(x + w * 0.1, y); // Base Back
                p.lineTo(x + w * 0.9, y); // Base Front
                
                // Turret Body
                // Front Face
                p.lineTo(x + w, y + h * 0.5); 
                // Bottom Face (Top of turret in this view)
                p.lineTo(topX + topW, y + h); 
                p.lineTo(topX, y + h);
                // Back Face
                p.lineTo(x, y + h * 0.4); 
            } else {
                // Base at Bottom (y + h)
                p.moveTo(x + w * 0.1, y + h); // Base Back
                p.lineTo(x + w * 0.9, y + h); // Base Front
                
                // Turret Body
                // Front Face
                p.lineTo(x + w, y + h * 0.5); 
                // Top Face
                p.lineTo(topX + topW, y);
                p.lineTo(topX, y);
                // Back Face
                p.lineTo(x, y + h * 0.6);
            }
            p.closePath();
        }
        
        component.shapePath = p;
    }

    draw(ctx: CanvasRenderingContext2D, component: ShipComponent, rng: RNG): void {
        if (!component.shapePath) return;

        const { x, y, w, h } = component.bounds;
        const isTopView = component.variant === 'top-view';
        const isBottom = component.invertLighting;
        const baseColor = component.color;
        
        const isBackward = component.facing === 'backward';
        
        ctx.save();
        if (isBackward) {
            const cx = x + w / 2;
            const cy = y + h / 2;
            ctx.translate(cx, cy);
            ctx.scale(-1, 1);
            ctx.translate(-cx, -cy);
        }

        // Apply random rotation for top-view turrets
        if (isTopView) {
            ctx.save(); // Save context before component rotation
            const rotDegrees = rng.range(-20, 20);
            const rotRadians = rotDegrees * (Math.PI / 180);
            const cx = x + w / 2;
            const cy = y + h / 2;
            ctx.translate(cx, cy);
            ctx.rotate(rotRadians);
            ctx.translate(-cx, -cy);
        }

        // 0. Draw Connection Base (if side view and center provided)
        if (!isTopView && component.shipCenterY !== undefined) {
             const centerY = component.shipCenterY;
             
             // Match width to the turret base (inset 0.1 on each side = 0.8 width)
             const connX = x + w * 0.1; 
             const connW = w * 0.8;
             
             let connY = 0;
             let connH = 0;
             
             if (isBottom) {
                 // Turret is below center. Base is at y. Connect up to centerY.
                 connY = centerY;
                 connH = y - centerY;
             } else {
                 // Turret is above center. Base is at y+h. Connect down to centerY.
                 connY = y + h;
                 connH = centerY - (y + h);
             }
             
             // Only draw if there's a gap to fill (plus a bit of overlap to be safe)
             // Always draw, as gaps are hard to predict due to complex hull shapes
             // Add overlap
             if (isBottom) { connH += 2; } // Overlap into turret base
             else { connY -= 2; connH += 2; } // Overlap into turret base
             
             // Apply gradient shading similar to turret body, but horizontal for cylindrical look
             const connGrad = ctx.createLinearGradient(connX, connY, connX + connW, connY);
             connGrad.addColorStop(0, baseColor.withBrightness(0.1).toRGBAString());
             connGrad.addColorStop(0.5, baseColor.toRGBAString());
             connGrad.addColorStop(1, baseColor.withBrightness(-0.2).toRGBAString());
             
             ctx.fillStyle = connGrad;
             ctx.fillRect(connX, connY, connW, connH);
        }

        // 1. Draw Barrels (First, so they are behind the turret body if needed, 
        //    but wait, if side view, barrels stick out front. If top view, same.
        //    Usually barrels are attached to the body.
        //    Let's draw barrels FIRST so the body covers their root.)
        
        const barrelCount = rng.intRange(1, 3);
        const barrelLen = w * rng.range(1.0, 1.4); // Extend at least the length of the turret
        const barrelW = rng.range(3, 8); // Fixed pixel width
        // Cannon color: Similar to turret, but slightly darker
        const barrelColor = baseColor.withBrightness(-0.3).toRGBAString(); 
        
        ctx.fillStyle = barrelColor;
        
        const barrelYStart = isTopView ? y + h * 0.3 : (isBottom ? y + h * 0.5 : y + h * 0.4);
        const barrelYRange = isTopView ? h * 0.4 : h * 0.2; // Spread
        
        // Barrels extend to Right
        // Root X depends on view. Roughly middle of component?
        const rootX = x + w * 0.5;
        
        for (let i = 0; i < barrelCount; i++) {
            // Distribute barrels
            let by = barrelYStart;
            if (barrelCount > 1) {
                by += (i / (barrelCount - 1)) * barrelYRange;
            } else if (barrelCount === 1 && isTopView) {
                // Center single cannon for top-view turrets
                by = barrelYStart + barrelYRange / 2;
            }
            
            ctx.save();
            ctx.translate(rootX, by); // Move origin to barrel root
            
            if (!isTopView) {
                // Side-view turrets tilt away from the ship body
                const angleMag = rng.range(0.1, 0.25);
                const angle = isBottom ? angleMag : -angleMag; // Bottom tilts down (+), Top tilts up (-)
                ctx.rotate(angle);
            }

            // Draw Barrel (relative to new origin)
            ctx.fillRect(0, -barrelW/2, barrelLen, barrelW);
            // Outline
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, -barrelW/2, barrelLen, barrelW);
            
            ctx.restore(); // Restore context after barrel drawing
        }

        // 2. Draw Turret Body
        // Gradient Fill
        const grad = ctx.createLinearGradient(x, y, x+w, y+h);
        grad.addColorStop(0, baseColor.withBrightness(0.1).toRGBAString());
        grad.addColorStop(0.5, baseColor.toRGBAString());
        grad.addColorStop(1, baseColor.withBrightness(-0.2).toRGBAString());
        
        ctx.fillStyle = grad;
        ctx.fill(component.shapePath);
        
        // Panel lines / Detail
        ctx.strokeStyle = baseColor.withBrightness(-0.3).toRGBAString();
        ctx.lineWidth = 1;
        ctx.stroke(component.shapePath);
        
        // Internal detail line (panel break)
        ctx.beginPath();
        if (isTopView) {
            ctx.moveTo(x + w*0.5, y + h*0.2);
            ctx.lineTo(x + w*0.5, y + h*0.8);
        } else {
            ctx.moveTo(x + w*0.5, y);
            ctx.lineTo(x + w*0.5, y + h);
        }
        ctx.stroke();

        // 3. Highlights
        ctx.save();
        ctx.clip(component.shapePath);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.stroke(component.shapePath);
        ctx.restore();
        
        // Restore flipping context if applied
        if (isTopView) {
            ctx.restore(); // Restore context after component rotation
        }
        ctx.restore();
    }
}
