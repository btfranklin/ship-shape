import { ShipComponent } from '../ShipComponent.js';
import { ComponentRenderer } from './ComponentRenderer.js';
import { HSBAColor, RNG } from '../../greebler/common.js';

export class TankRenderer implements ComponentRenderer {
    generateShape(component: ShipComponent, rng: RNG): void {
        const path = new Path2D();
        const { x, y, w, h } = component.bounds;
        
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

            // Start at Top-Left of the "rectangular" part (which is actually the top of the left ellipse)
            // Center of left ellipse is (x + rX, y + h/2)
            // Top of left ellipse is (x + rX, y)
            
            path.moveTo(x + rX, y);
            
            // Top Line
            path.lineTo(x + w - rX, y);
            
            // Right Cap (Ellipse)
            // Center: (x + w - rX, y + h/2)
            path.ellipse(x + w - rX, y + h / 2, rX, rY, 0, -Math.PI / 2, Math.PI / 2);
            
            // Bottom Line
            path.lineTo(x + rX, y + h);
            
            // Left Cap (Ellipse)
            // Center: (x + rX, y + h/2)
            path.ellipse(x + rX, y + h / 2, rX, rY, 0, Math.PI / 2, Math.PI * 1.5);
            
        } else {
            // Vertical Capsule
            // rX = w/2, rY = capDepth
            const rX = w / 2;
            const rY = capDepth;
            
            // Start at Top-Right
            path.moveTo(x + w, y + rY);
            
            // Right Line
            path.lineTo(x + w, y + h - rY);
            
            // Bottom Cap
            path.ellipse(x + w / 2, y + h - rY, rX, rY, 0, 0, Math.PI);
            
            // Left Line
            path.lineTo(x, y + rY);
            
            // Top Cap
            path.ellipse(x + w / 2, y + rY, rX, rY, 0, Math.PI, 0);
        }
        
        path.closePath();
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
            const strutW = w * 0.8; // Make scaffolding 80% the width of the tank
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

        // --- Tank Body ---
        ctx.save();
        
        if (component.shapePath) {
            // Fill Background (clean slate)
            // ctx.fillStyle = '#000';
            // ctx.fill(component.shapePath); // Actually relies on component Z-index to cover things below, but good to be opaque.
            
            // Clip to capsule shape
            ctx.clip(component.shapePath);
        }

        // Gradient Fill (Cylindrical)
        const color = component.color;
        let grad: CanvasGradient;
        
        if (isHorizontal) {
            // Vertical Gradient for Horizontal Cylinder
            grad = ctx.createLinearGradient(x, y, x, y + h);
            grad.addColorStop(0, color.withBrightness(-0.4).toCSS()); // Dark Top (Shadow)
            grad.addColorStop(0.3, color.withBrightness(0.1).toCSS());
            grad.addColorStop(0.5, color.withBrightness(0.3).toCSS()); // Highlight
            grad.addColorStop(0.8, color.withBrightness(-0.1).toCSS());
            grad.addColorStop(1, color.withBrightness(-0.4).toCSS()); // Dark Bottom
        } else {
            // Horizontal Gradient for Vertical Cylinder
            grad = ctx.createLinearGradient(x, y, x + w, y);
            grad.addColorStop(0, color.withBrightness(-0.4).toCSS()); // Dark Left
            grad.addColorStop(0.3, color.withBrightness(0.1).toCSS());
            grad.addColorStop(0.5, color.withBrightness(0.3).toCSS()); // Highlight
            grad.addColorStop(0.8, color.withBrightness(-0.1).toCSS());
            grad.addColorStop(1, color.withBrightness(-0.4).toCSS()); // Dark Right
        }

        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h); // Fill huge rect, clipped to shape

        // --- Details (Bands/Ribs) ---
        // We use a deterministic RNG for bands to keep them consistent if redrawn
        // But `rng` passed in `draw` might change per frame if we aren't careful. 
        // Usually `draw` rng is frame-based or seeded? 
        // In this codebase, `draw` gets an RNG. Ideally, visual features should be fixed.
        // However, since `TankRenderer` doesn't store state, we rely on the passed RNG.
        // If the caller passes a different RNG every frame, the bands will jitter. 
        // But usually `ShipComponent` holds state or we assume `draw` is one-shot or stable RNG.
        // In `element_showcase`, we create `new RNG` every click.
        // In `main.ts`, we assume it's stable.
        
        // Random number of bands (1 to 3)
        // Use customData if available (for grouped consistency), otherwise RNG
        const numBands = component.customData.bands ?? rng.intRange(1, 3);
        
        if (isHorizontal) {
            const spacing = w / (numBands + 1);
            for (let i = 1; i <= numBands; i++) {
                const bx = x + spacing * i;
                // Draw band
                ctx.strokeStyle = color.withBrightness(-0.5).toCSS();
                ctx.beginPath();
                ctx.moveTo(bx, y);
                ctx.lineTo(bx, y + h);
                ctx.stroke();
                
                // Highlight/Bevel for 3D effect
                ctx.strokeStyle = color.withBrightness(0.2).toCSS();
                ctx.beginPath();
                ctx.moveTo(bx + 2, y);
                ctx.lineTo(bx + 2, y + h);
                ctx.stroke();
            }
        } else {
            const spacing = h / (numBands + 1);
            for (let i = 1; i <= numBands; i++) {
                const by = y + spacing * i;
                // Draw band
                ctx.strokeStyle = color.withBrightness(-0.5).toCSS();
                ctx.beginPath();
                ctx.moveTo(x, by);
                ctx.lineTo(x + w, by);
                ctx.stroke();
                
                // Highlight/Bevel
                ctx.strokeStyle = color.withBrightness(0.2).toCSS();
                ctx.beginPath();
                ctx.moveTo(x, by + 2);
                ctx.lineTo(x + w, by + 2);
                ctx.stroke();
            }
        }
        
        // --- Specular Glint? ---
        // Added via gradient.

        ctx.restore();

        // --- Outline ---
        if (component.shapePath) {
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#000';
            ctx.stroke(component.shapePath);
        }
    }
}
