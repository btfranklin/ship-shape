import { HSBAColor, RNG } from './common.js';
import type { Drawable } from './common.js';

export class LightPanelGreebles implements Drawable {
    static LIGHT_INSET = 0.005;
    static LIGHT_PADDING = 0.0035;
    static LIGHT_SIZE = 0.01;

    constructor(
        public xUnits: number,
        public yUnits: number,
        public themeColor: HSBAColor,
        public panelCount: number,
        public lightColors: HSBAColor[] = [HSBAColor.fromRGBA(0, 255, 0)]
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
        context.lineWidth = 0.002;
        context.strokeStyle = 'black';
        const bgColor = this.themeColor.withBrightness(-0.1).toRGBAString();

        for (let i = 0; i < this.panelCount; i++) {
            const cols = rng.intRange(2, 8);
            const rows = rng.intRange(2, 8);

            const w = (cols * LightPanelGreebles.LIGHT_SIZE) + ((cols - 1) * LightPanelGreebles.LIGHT_PADDING) + (LightPanelGreebles.LIGHT_INSET * 2);
            const h = (rows * LightPanelGreebles.LIGHT_SIZE) + ((rows - 1) * LightPanelGreebles.LIGHT_PADDING) + (LightPanelGreebles.LIGHT_INSET * 2);

            if (this.xUnits - w < 0 || this.yUnits - h < 0) continue;

            const x = rng.range(0, this.xUnits - w);
            const y = rng.range(0, this.yUnits - h);

            if (drawPanels) {
                // Panel BG
                context.fillStyle = bgColor;
                context.fillRect(x, y, w, h);
                context.strokeRect(x, y, w, h);
            }

            // Lights
            for (let c = 0; c < cols; c++) {
                for (let r = 0; r < rows; r++) {
                    const lit = rng.bool(0.33);
                    if (lit) {
                        const col = rng.choice(this.lightColors);
                        
                        const lx = x + LightPanelGreebles.LIGHT_INSET + c * (LightPanelGreebles.LIGHT_SIZE + LightPanelGreebles.LIGHT_PADDING);
                        const ly = y + LightPanelGreebles.LIGHT_INSET + r * (LightPanelGreebles.LIGHT_SIZE + LightPanelGreebles.LIGHT_PADDING);
                        
                        if (drawLights) {
                            context.fillStyle = col.toRGBAString();
                            context.fillRect(lx, ly, LightPanelGreebles.LIGHT_SIZE, LightPanelGreebles.LIGHT_SIZE);
                        }
                    }
                }
            }
        }
        context.restore();
    }
}
