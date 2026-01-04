import { HSBAColor, RNG } from './common.js';
import type { Drawable } from './common.js';

export class CapitalShipWindowsGreebles implements Drawable {
    static BLUE_LIGHT = HSBAColor.fromRGBA(171, 232, 255);
    static AMBER_LIGHT = HSBAColor.fromRGBA(247, 199, 88);

    private static WINDOW_ZONE_INSET = 0.01;
    private static WINDOW_SPACING = 0.005;
    private static FLOOR_SPACING = 0.02;
    private static WINDOW_SIZE = 0.01;

    constructor(
        public xUnits: number,
        public yUnits: number,
        public themeColor: HSBAColor,
        public windowZoneCount: number = 3,
        public windowColor: HSBAColor = CapitalShipWindowsGreebles.BLUE_LIGHT
    ) {}

    draw(context: CanvasRenderingContext2D, rng: RNG): void {
        this.drawInternal(context, rng, true, true);
    }

    drawPanels(context: CanvasRenderingContext2D, rng: RNG): void {
        this.drawInternal(context, rng, true, false);
    }

    drawLights(context: CanvasRenderingContext2D, rng: RNG): void {
        this.drawInternal(context, rng, false, true);
    }

    private drawInternal(
        context: CanvasRenderingContext2D,
        rng: RNG,
        drawPanels: boolean,
        drawLights: boolean
    ): void {
        context.save();

        for (let i = 0; i < this.windowZoneCount; i++) {
            const cols = rng.intRange(3, Math.max(4, Math.floor(60 * this.xUnits)));
            const rows = rng.choice([1, 1, 1, 2, 2, 3, 3, 3, 4, 5]);

            const w = (cols * CapitalShipWindowsGreebles.WINDOW_SIZE) + 
                      ((cols - 1) * CapitalShipWindowsGreebles.WINDOW_SPACING) + 
                      (CapitalShipWindowsGreebles.WINDOW_ZONE_INSET * 2);
            const h = (rows * CapitalShipWindowsGreebles.WINDOW_SIZE) + 
                      ((rows - 1) * CapitalShipWindowsGreebles.FLOOR_SPACING) + 
                      (CapitalShipWindowsGreebles.WINDOW_ZONE_INSET * 2);

            if (this.xUnits - w < 0 || this.yUnits - h < 0) continue;

            const x = rng.range(0, this.xUnits - w);
            const y = rng.range(0, this.yUnits - h);

            const style = rng.choice(['flat', 'recessed']);
            if (drawPanels) {
                if (style === 'flat') {
                    this.drawFlat(context, x, y, w, h);
                } else {
                    this.drawRecessed(context, x, y, w, h);
                }
            }

            context.save();
            
            // Glow Configuration
            // We use a radial gradient for smooth falloff (Round Bloom)
            
            for (let c = 0; c < cols; c++) {
                for (let r = 0; r < rows; r++) {
                    const lit = rng.bool(0.33);
                    if (lit) {
                        const wx = x + CapitalShipWindowsGreebles.WINDOW_ZONE_INSET + c * (CapitalShipWindowsGreebles.WINDOW_SIZE + CapitalShipWindowsGreebles.WINDOW_SPACING);
                        const wy = y + CapitalShipWindowsGreebles.WINDOW_ZONE_INSET + r * (CapitalShipWindowsGreebles.WINDOW_SIZE + CapitalShipWindowsGreebles.FLOOR_SPACING);
                        
                        const cx = wx + CapitalShipWindowsGreebles.WINDOW_SIZE / 2;
                        const cy = wy + CapitalShipWindowsGreebles.WINDOW_SIZE / 2;
                        const radius = CapitalShipWindowsGreebles.WINDOW_SIZE * 1.5;

                        if (drawLights) {
                            // 1. Soft Bloom (Radial Gradient)
                            // Use normal blending for a subtle diffuse look, instead of additive
                            context.globalCompositeOperation = 'source-over'; 
                            const grad = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
                            grad.addColorStop(0, this.windowColor.withAlpha(0.25).toRGBAString());
                            grad.addColorStop(1, this.windowColor.withAlpha(0).toRGBAString());
                            
                            context.fillStyle = grad;
                            context.beginPath();
                            context.arc(cx, cy, radius, 0, Math.PI * 2);
                            context.fill();

                            // 2. Core (Solid)
                            // Switch back to normal blend for core to preserve color
                            context.save();
                            context.globalCompositeOperation = 'source-over'; 
                            context.globalAlpha = 1.0;
                            context.shadowBlur = 0; 
                            context.fillStyle = this.windowColor.toRGBAString();
                            context.fillRect(wx, wy, CapitalShipWindowsGreebles.WINDOW_SIZE, CapitalShipWindowsGreebles.WINDOW_SIZE);
                            context.restore();
                        }
                    }
                }
            }
            context.restore();
        }

        context.restore();
    }

    private drawFlat(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
        ctx.save();
        ctx.lineWidth = 0.002;
        ctx.strokeStyle = this.themeColor.withBrightness(-0.1).toRGBAString();
        ctx.fillStyle = this.themeColor.toRGBAString();
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
    }

    private drawRecessed(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
        ctx.save();
        ctx.fillStyle = this.themeColor.withSaturation(-0.2).withBrightness(-0.2).toRGBAString();
        ctx.fillRect(x, y, w, h);
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        
        const gradTop = ctx.createLinearGradient(x, y, x, y + 0.05);
        gradTop.addColorStop(0, 'rgba(0,0,0,0.8)');
        gradTop.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradTop;
        ctx.fillRect(x, y, w, 0.05);
        
        const gradLeft = ctx.createLinearGradient(x, y, x + 0.05, y);
        gradLeft.addColorStop(0, 'rgba(0,0,0,0.8)');
        gradLeft.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradLeft;
        ctx.fillRect(x, y, 0.05, h);
        
        ctx.restore();
        ctx.restore();
    }
}
