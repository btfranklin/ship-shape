import { HSBAColor, RNG, getPath2D } from '../../greebles/common.js';
import { ShipComponent } from '../ShipComponent.js';
import { ComponentRenderer, ComponentShape } from './ComponentRenderer.js';

type AntennaKind = 'pole' | 'dish' | 'array' | 'box';

interface AntennaOrientation {
    originX: number;
    originY: number;
    outwardLength: number;
    crossSpan: number;
    rotation: number;
    outwardScale: 1 | -1;
    crossScale: 1 | -1;
    tiltScale: 1 | -1;
    highlightOffset: 0.2 | 0.4;
}

const ANTENNA_KINDS: readonly AntennaKind[] = ['pole', 'dish', 'array', 'box'];

export class SensorRenderer implements ComponentRenderer {
    generateShape(component: ShipComponent, _rng: RNG): ComponentShape {
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

        return { path: p };
    }

    draw(ctx: CanvasRenderingContext2D, component: ShipComponent, rng: RNG): void {
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
             suppGrad.addColorStop(0, bc.adjustBrightness(0.1).toRGBAString());
             suppGrad.addColorStop(0.5, bc.adjustBrightness(-0.1).toRGBAString());
             suppGrad.addColorStop(1, bc.adjustBrightness(-0.3).toRGBAString());
             
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
             suppGrad.addColorStop(0, bc.adjustBrightness(0.1).toRGBAString());
             suppGrad.addColorStop(0.5, bc.adjustBrightness(-0.1).toRGBAString());
             suppGrad.addColorStop(1, bc.adjustBrightness(-0.3).toRGBAString());
             
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
             // The horizontal gradient gives the base the same side lighting as the ship hull.
             grad = ctx.createLinearGradient(x, y, x + w, y);
        }
        
        grad.addColorStop(0, baseColor.adjustBrightness(0.1).toRGBAString());
        grad.addColorStop(0.5, baseColor.adjustBrightness(-0.1).toRGBAString());
        grad.addColorStop(1, baseColor.adjustBrightness(-0.3).toRGBAString());
        
        ctx.fillStyle = grad;
        ctx.fill(component.shapePath);
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 1;
        ctx.stroke(component.shapePath);

        // 2. Draw Antennas / Scanners
        const antennaCount = rng.intRange(2, 5);
        const techColor = baseColor.adjustSaturation(-0.3).adjustBrightness(0.15);
        const orientation = this.getAntennaOrientation(component);

        ctx.save();
        ctx.translate(orientation.originX, orientation.originY);
        ctx.rotate(orientation.rotation);
        ctx.scale(orientation.outwardScale, orientation.crossScale);
        ctx.beginPath();

        for (let i = 0; i < antennaCount; i++) {
            const isThickPole = rng.bool(0.6);
            const kind: AntennaKind = isThickPole ? 'pole' : rng.choice(ANTENNA_KINDS);
            const crossPosition = orientation.crossSpan * rng.range(0.1, 0.9);
            const length = orientation.outwardLength * (
                isThickPole ? rng.range(0.6, 3.0) : rng.range(0.3, 1.0)
            );

            ctx.lineWidth = 2;
            switch (kind) {
                case 'pole':
                    this.drawPole(ctx, rng, baseColor, techColor, crossPosition, length, isThickPole);
                    break;
                case 'dish':
                    this.drawDish(ctx, rng, baseColor, techColor, orientation, crossPosition, length);
                    break;
                case 'array':
                    this.drawArray(ctx, rng, techColor, crossPosition, length);
                    break;
                case 'box':
                    this.drawBox(ctx, rng, baseColor, techColor, orientation, crossPosition, length);
                    break;
            }
        }

        ctx.restore();
    }

    private getAntennaOrientation(component: ShipComponent): AntennaOrientation {
        const { x, y, w, h } = component.bounds;
        if (component.variant === 'front') {
            const baseWidth = w * 0.25;
            return {
                originX: x + baseWidth,
                originY: y,
                outwardLength: w - baseWidth,
                crossSpan: h,
                rotation: 0,
                outwardScale: 1,
                crossScale: 1,
                tiltScale: 1,
                highlightOffset: 0.2,
            };
        }
        if (component.variant === 'back') {
            const baseWidth = w * 0.25;
            return {
                originX: x + w - baseWidth,
                originY: y,
                outwardLength: w - baseWidth,
                crossSpan: h,
                rotation: 0,
                outwardScale: -1,
                crossScale: 1,
                tiltScale: -1,
                highlightOffset: 0.4,
            };
        }

        const baseHeight = h * 0.25;
        if (component.invertLighting) {
            return {
                originX: x,
                originY: y + baseHeight,
                outwardLength: h - baseHeight,
                crossSpan: w,
                rotation: Math.PI / 2,
                outwardScale: 1,
                crossScale: -1,
                tiltScale: -1,
                highlightOffset: 0.2,
            };
        }
        return {
            originX: x,
            originY: y + h - baseHeight,
            outwardLength: h - baseHeight,
            crossSpan: w,
            rotation: -Math.PI / 2,
            outwardScale: 1,
            crossScale: 1,
            tiltScale: 1,
            highlightOffset: 0.4,
        };
    }

    private drawPole(
        ctx: CanvasRenderingContext2D,
        rng: RNG,
        baseColor: HSBAColor,
        techColor: HSBAColor,
        crossPosition: number,
        length: number,
        isThick: boolean
    ): void {
        if (isThick) {
            const thickLength = length * rng.range(0.3, 0.7);
            const thickWidth = rng.range(4, 8);
            const thinLength = length - thickLength;

            ctx.fillStyle = baseColor.toRGBAString();
            ctx.fillRect(0, crossPosition - thickWidth / 2, thickLength, thickWidth);
            ctx.strokeStyle = baseColor.adjustBrightness(-0.3).toRGBAString();
            ctx.strokeRect(0, crossPosition - thickWidth / 2, thickLength, thickWidth);

            if (thinLength > 0) {
                ctx.strokeStyle = techColor.toRGBAString();
                ctx.beginPath();
                ctx.moveTo(thickLength, crossPosition);
                ctx.lineTo(length, crossPosition);
                ctx.stroke();
            }
        } else {
            ctx.strokeStyle = techColor.toRGBAString();
            ctx.beginPath();
            ctx.moveTo(0, crossPosition);
            ctx.lineTo(length, crossPosition);
            ctx.stroke();
        }

        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(length, crossPosition, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawDish(
        ctx: CanvasRenderingContext2D,
        rng: RNG,
        baseColor: HSBAColor,
        techColor: HSBAColor,
        orientation: AntennaOrientation,
        crossPosition: number,
        length: number
    ): void {
        const poleLength = length * 0.6;
        ctx.strokeStyle = techColor.toRGBAString();
        ctx.beginPath();
        ctx.moveTo(0, crossPosition);
        ctx.lineTo(poleLength, crossPosition);
        ctx.stroke();

        const dishWidth = rng.range(15, 30);
        const dishHeight = dishWidth * 0.6;
        const tilt = rng.range(-0.5, 0.5) * orientation.tiltScale;
        ctx.save();
        ctx.translate(poleLength, crossPosition);
        // The cup opens and its spire points along the local outward axis.
        ctx.rotate(-Math.PI / 2 + tilt);
        ctx.fillStyle = baseColor.adjustBrightness(-0.2).toRGBAString();
        ctx.beginPath();
        ctx.arc(0, 0, dishWidth / 2, 0, Math.PI, false);
        ctx.fill();
        ctx.strokeStyle = baseColor.adjustBrightness(-0.4).toRGBAString();
        ctx.stroke();
        ctx.strokeStyle = techColor.toRGBAString();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, dishHeight * 1.5);
        ctx.stroke();
        ctx.restore();
    }

    private drawArray(
        ctx: CanvasRenderingContext2D,
        rng: RNG,
        techColor: HSBAColor,
        crossPosition: number,
        length: number
    ): void {
        ctx.strokeStyle = techColor.toRGBAString();
        ctx.beginPath();
        ctx.moveTo(0, crossPosition);
        ctx.lineTo(length, crossPosition);
        ctx.stroke();

        const bars = rng.intRange(3, 6);
        for (let index = 0; index < bars; index++) {
            const progress = 0.4 + 0.6 * (index / bars);
            const outwardPosition = length * progress;
            const barWidth = rng.range(5, 10);
            ctx.beginPath();
            ctx.moveTo(outwardPosition, crossPosition - barWidth / 2);
            ctx.lineTo(outwardPosition, crossPosition + barWidth / 2);
            ctx.stroke();
        }
    }

    private drawBox(
        ctx: CanvasRenderingContext2D,
        rng: RNG,
        baseColor: HSBAColor,
        techColor: HSBAColor,
        orientation: AntennaOrientation,
        crossPosition: number,
        length: number
    ): void {
        const poleLength = length * 0.7;
        ctx.strokeStyle = techColor.toRGBAString();
        ctx.beginPath();
        ctx.moveTo(0, crossPosition);
        ctx.lineTo(poleLength, crossPosition);
        ctx.stroke();

        const crossSize = rng.range(10, 20);
        const outwardSize = length * rng.range(0.15, 0.25);
        const crossStart = crossPosition - crossSize / 2;
        ctx.fillStyle = baseColor.adjustBrightness(-0.2).toRGBAString();
        ctx.fillRect(poleLength, crossStart, outwardSize, crossSize);
        ctx.strokeStyle = baseColor.adjustBrightness(-0.4).toRGBAString();
        ctx.strokeRect(poleLength, crossStart, outwardSize, crossSize);
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(
            poleLength + outwardSize * orientation.highlightOffset,
            crossStart + crossSize * 0.2,
            outwardSize * 0.4,
            crossSize * 0.6
        );
    }
}
