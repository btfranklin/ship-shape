import { ShipComponent } from '../ShipComponent.js';
import { ComponentRenderer } from './ComponentRenderer.js';
import { HSBAColor, RNG, getPath2D } from '../../greebler/common.js';

export class StorageRenderer implements ComponentRenderer {
    generateShape(component: ShipComponent, rng: RNG): void {
        const Path2D = getPath2D();
        const path = new Path2D();
        const { x, y, w, h } = component.bounds;
        
        if (component.variant.includes('goods')) {
            // Rectangular Shipping Container
            path.rect(x, y, w, h);
        } else {
            // Capsule (Liquid/Gas)
            // Determine cap depth factor
            // Standard: 0.5 (Full semi-circle)
            // Liquid: 0.15 (Shallow dish/cap)
            const isLiquid = component.variant.includes('liquid');
            const depthFactor = isLiquid ? 0.15 : 0.5; 
            const minDim = Math.min(w, h);
            const capDepth = minDim * depthFactor;

            if (w > h) {
                // Horizontal Capsule
                // rX = capDepth, rY = h/2
                const rX = capDepth;
                const rY = h / 2;

                path.moveTo(x + rX, y);
                path.lineTo(x + w - rX, y);
                path.ellipse(x + w - rX, y + h / 2, rX, rY, 0, -Math.PI / 2, Math.PI / 2);
                path.lineTo(x + rX, y + h);
                path.ellipse(x + rX, y + h / 2, rX, rY, 0, Math.PI / 2, Math.PI * 1.5);
            } else {
                // Vertical Capsule
                // rX = w/2, rY = capDepth
                const rX = w / 2;
                const rY = capDepth;
                
                path.moveTo(x + w, y + rY);
                path.lineTo(x + w, y + h - rY);
                path.ellipse(x + w / 2, y + h - rY, rX, rY, 0, 0, Math.PI);
                path.lineTo(x, y + rY);
                path.ellipse(x + w / 2, y + rY, rX, rY, 0, Math.PI, 0);
            }
            path.closePath();
        }
        component.shapePath = path;
    }

    draw(ctx: CanvasRenderingContext2D, component: ShipComponent, rng: RNG): void {
        const { x, y, w, h } = component.bounds;
        const isHorizontal = w > h;

        // --- Support Structure (Scaffolding) ---
        if (component.shipCenterY !== undefined) {
            const centerY = y + h / 2;
            const supportTop = Math.min(centerY, component.shipCenterY);
            const supportH = Math.abs(centerY - component.shipCenterY);
            
            // Scaffolding parameters
            const strutW = w * 0.8; // Make scaffolding 80% the width of the storage unit
            const strutX = x + (w - strutW) / 2;
            const blockSize = strutW; 
            const numBlocks = Math.ceil(supportH / blockSize);

            ctx.save();
            
            // Clip to draw area
            ctx.beginPath();
            ctx.rect(strutX, supportTop, strutW, supportH);
            ctx.clip();
            
            // Draw Blocks
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 3;
            
            ctx.beginPath();
            for (let i = 0; i < numBlocks; i++) {
                const by = supportTop + i * blockSize;
                // X
                ctx.moveTo(strutX, by);
                ctx.lineTo(strutX + strutW, by + blockSize);
                
                ctx.moveTo(strutX + strutW, by);
                ctx.lineTo(strutX, by + blockSize);
                
                // Horizontal divider
                ctx.moveTo(strutX, by + blockSize);
                ctx.lineTo(strutX + strutW, by + blockSize);
            }
            ctx.stroke();
            
            ctx.restore(); // Remove clip for side rails

            // Side Rails (Unclipped)
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(strutX, supportTop);
            ctx.lineTo(strutX, supportTop + supportH);
            ctx.moveTo(strutX + strutW, supportTop);
            ctx.lineTo(strutX + strutW, supportTop + supportH);
            ctx.stroke();
        }

        // --- Drop Shadow ---
        if (component.shapePath) {
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 5;
            ctx.fillStyle = 'rgba(0, 0, 0, 1)';
            ctx.fill(component.shapePath);
            ctx.restore();
        }

        // --- Storage Body ---
        ctx.save();
        
        if (component.shapePath) {
            ctx.clip(component.shapePath);
        }

        if (component.variant.includes('goods')) {
            this.drawContainer(ctx, component);
        } else {
            this.drawCapsule(ctx, component, rng);
        }

        ctx.restore();

        // --- Outline ---
        if (component.shapePath) {
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#000';
            ctx.stroke(component.shapePath);
        }
    }

    private drawContainer(ctx: CanvasRenderingContext2D, component: ShipComponent) {
        const { x, y, w, h } = component.bounds;
        const isHorizontal = w > h;
        const color = component.color;

        // 1. Outer Frame (Main Body Color)
        ctx.fillStyle = color.toCSS();
        ctx.fillRect(x, y, w, h);

        // 2. Inset Panel Background (Darker)
        // Frame thickness: ~8% of min dimension, clamped
        const frameWidth = Math.max(2, Math.min(w, h) * 0.08); 
        const insetX = x + frameWidth;
        const insetY = y + frameWidth;
        const insetW = Math.max(0, w - frameWidth * 2);
        const insetH = Math.max(0, h - frameWidth * 2);

        // Inner Shadow / Darker Metal Gradient
        // Diagonal gradient for a flat, angular look
        const grad = ctx.createLinearGradient(insetX, insetY, insetX + insetW, insetY + insetH);
        grad.addColorStop(0, color.withBrightness(-0.05).toCSS()); // TL: Subtle shadow (almost base color)
        grad.addColorStop(1, color.withBrightness(-0.25).toCSS()); // BR: Darker shadow
        
        ctx.fillStyle = grad;
        ctx.fillRect(insetX, insetY, insetW, insetH);

        // 3. Corrugation (On Inset only)
        if (insetW > 0 && insetH > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(insetX, insetY, insetW, insetH);
            ctx.clip();

            // Density of ribs
            const ribSpacing = 8; 
            const ribCount = Math.floor((isHorizontal ? insetW : insetH) / ribSpacing);
            if (ribCount > 0) {
                const spacing = (isHorizontal ? insetW : insetH) / ribCount;
                
                ctx.lineWidth = 2;
                
                for (let i = 0; i <= ribCount; i++) {
                    const pos = (isHorizontal ? insetX : insetY) + i * spacing;
                    
                    // Rib Shadow
                    ctx.strokeStyle = color.withBrightness(-0.6).toCSS();
                    ctx.beginPath();
                    if (isHorizontal) {
                        ctx.moveTo(pos, insetY); ctx.lineTo(pos, insetY + insetH);
                    } else {
                        ctx.moveTo(insetX, pos); ctx.lineTo(insetX + insetW, pos);
                    }
                    ctx.stroke();
                    
                    // Rib Highlight (Brighter for contrast against flat background)
                    ctx.strokeStyle = color.withBrightness(0.1).toCSS();
                    ctx.beginPath();
                    if (isHorizontal) {
                        ctx.moveTo(pos + 1, insetY); ctx.lineTo(pos + 1, insetY + insetH);
                    } else {
                        ctx.moveTo(insetX, pos + 1); ctx.lineTo(insetX + insetW, pos + 1);
                    }
                    ctx.stroke();
                }
            }
            
            // 4. Structural Overlay (X-Bars and Divider)
            // Double-stroke technique: Thick dark line (border) + Thinner lighter line (fill)
            const Path2D = getPath2D();
            const structurePath = new Path2D();
            
            if (isHorizontal) {
                // Split Vertically (Left/Right)
                const midX = insetX + insetW / 2;
                
                // Divider (Vertical Line)
                structurePath.moveTo(midX, insetY);
                structurePath.lineTo(midX, insetY + insetH);
                
                // Left X
                structurePath.moveTo(insetX, insetY); structurePath.lineTo(midX, insetY + insetH);
                structurePath.moveTo(midX, insetY); structurePath.lineTo(insetX, insetY + insetH);
                
                // Right X
                structurePath.moveTo(midX, insetY); structurePath.lineTo(insetX + insetW, insetY + insetH);
                structurePath.moveTo(insetX + insetW, insetY); structurePath.lineTo(midX, insetY + insetH);

            } else { // Vertical Container
                // Split Horizontally (Top/Bottom)
                const midY = insetY + insetH / 2;
                
                // Divider (Horizontal Line)
                structurePath.moveTo(insetX, midY);
                structurePath.lineTo(insetX + insetW, midY);

                // Top X
                structurePath.moveTo(insetX, insetY); structurePath.lineTo(insetX + insetW, midY);
                structurePath.moveTo(insetX + insetW, insetY); structurePath.lineTo(insetX, midY);

                // Bottom X
                structurePath.moveTo(insetX, midY); structurePath.lineTo(insetX + insetW, insetY + insetH);
                structurePath.moveTo(insetX + insetW, midY); structurePath.lineTo(insetX, insetY + insetH);
            }

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Pass 1: Dark Border (Total Width)
            ctx.lineWidth = 6;
            ctx.strokeStyle = color.withBrightness(-0.6).toCSS();
            ctx.stroke(structurePath);

            // Pass 2: Gray Fill (Inner Width)
            ctx.lineWidth = 4;
            ctx.strokeStyle = color.withBrightness(0.0).toCSS();
            ctx.stroke(structurePath);

            ctx.restore();
        }

        // 5. Frame Bevel/Highlight
        // Outer Highlight
        ctx.lineWidth = 4; // Thicker outer frame
        ctx.strokeStyle = color.withBrightness(0.3).toCSS();
        ctx.strokeRect(x, y, w, h); 
        
        // Inner Shadow (Inset border)
        ctx.lineWidth = 2; // Thicker inner shadow
        ctx.strokeStyle = color.withBrightness(-0.6).toCSS();
        ctx.strokeRect(insetX, insetY, insetW, insetH);
    }

    private drawCapsule(ctx: CanvasRenderingContext2D, component: ShipComponent, rng: RNG) {
        const { x, y, w, h } = component.bounds;
        const isHorizontal = w > h;
        const color = component.color;

        // Gradient Fill (Cylindrical)
        let grad: CanvasGradient;
        if (isHorizontal) {
            grad = ctx.createLinearGradient(x, y, x, y + h);
            grad.addColorStop(0, color.withBrightness(-0.4).toCSS());
            grad.addColorStop(0.3, color.withBrightness(0.1).toCSS());
            grad.addColorStop(0.5, color.withBrightness(0.3).toCSS());
            grad.addColorStop(0.8, color.withBrightness(-0.1).toCSS());
            grad.addColorStop(1, color.withBrightness(-0.4).toCSS());
        } else {
            grad = ctx.createLinearGradient(x, y, x + w, y);
            grad.addColorStop(0, color.withBrightness(-0.4).toCSS());
            grad.addColorStop(0.3, color.withBrightness(0.1).toCSS());
            grad.addColorStop(0.5, color.withBrightness(0.3).toCSS());
            grad.addColorStop(0.8, color.withBrightness(-0.1).toCSS());
            grad.addColorStop(1, color.withBrightness(-0.4).toCSS());
        }

        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);

        // Details (Bands/Ribs)
        const numBands = component.customData.bands ?? rng.intRange(1, 3);
        
        if (isHorizontal) {
            const spacing = w / (numBands + 1);
            for (let i = 1; i <= numBands; i++) {
                const bx = x + spacing * i;
                ctx.strokeStyle = color.withBrightness(-0.5).toCSS();
                ctx.beginPath();
                ctx.moveTo(bx, y); ctx.lineTo(bx, y + h); ctx.stroke();
                
                ctx.strokeStyle = color.withBrightness(0.2).toCSS();
                ctx.beginPath();
                ctx.moveTo(bx + 2, y); ctx.lineTo(bx + 2, y + h); ctx.stroke();
            }
        } else {
            const spacing = h / (numBands + 1);
            for (let i = 1; i <= numBands; i++) {
                const by = y + spacing * i;
                ctx.strokeStyle = color.withBrightness(-0.5).toCSS();
                ctx.beginPath();
                ctx.moveTo(x, by); ctx.lineTo(x + w, by); ctx.stroke();
                
                ctx.strokeStyle = color.withBrightness(0.2).toCSS();
                ctx.beginPath();
                ctx.moveTo(x, by + 2); ctx.lineTo(x + w, by + 2); ctx.stroke();
            }
        }
    }
}
