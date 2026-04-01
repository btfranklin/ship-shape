import { HSBAColor, RNG, getPath2D } from '../greebles/common.js';
import type { SteamEngineComponentType, WheelStyle } from './engineTypes.js';

export interface SteamEngineComponentOptions {
    variant?: string;
    wheelStyle?: WheelStyle;
}

export class SteamEngineComponent {
    public bounds: { x: number; y: number; w: number; h: number };
    public zIndex: number;
    public type: SteamEngineComponentType;
    public color: HSBAColor;
    public variant: string;
    public wheelStyle: WheelStyle;
    public shapePath?: Path2D;

    constructor(
        x: number,
        y: number,
        w: number,
        h: number,
        zIndex: number,
        type: SteamEngineComponentType,
        color: HSBAColor,
        options: SteamEngineComponentOptions = {}
    ) {
        this.bounds = { x, y, w, h };
        this.zIndex = zIndex;
        this.type = type;
        this.color = color;
        this.variant = options.variant ?? 'default';
        this.wheelStyle = options.wheelStyle ?? 'spoked';
    }

    generateShape(_rng: RNG) {
        const { x, y, w, h } = this.bounds;
        const Path2D = getPath2D();
        const p = new Path2D();

        switch (this.type) {
            case 'boiler':
                this.buildBeveledBoxPath(p, x, y, w, h, 0.12, 0.08);
                break;
            case 'firebox':
                this.buildFireboxPath(p, x, y, w, h);
                break;
            case 'apron':
                this.buildApronPath(p, x, y, w, h);
                break;
            case 'smokebox':
                this.buildNosePath(p, x, y, w, h);
                break;
            case 'cab':
                this.buildCabPath(p, x, y, w, h);
                break;
            case 'tender':
                this.buildTenderPath(p, x, y, w, h);
                break;
            case 'frame':
                this.buildFramePath(p, x, y, w, h);
                break;
            case 'chimney':
                this.buildChimneyPath(p, x, y, w, h);
                break;
            case 'dome':
                this.buildDomePath(p, x, y, w, h);
                break;
            case 'lamp':
                this.buildLampPath(p, x, y, w, h);
                break;
            case 'cowcatcher':
                this.buildCowcatcherPath(p, x, y, w, h);
                break;
            case 'wheel':
                this.buildWheelPath(p, x, y, w, h);
                break;
            case 'rod':
            case 'gun':
            case 'coupler':
                p.rect(x, y, w, h);
                break;
            case 'casemate':
                this.buildCasematePath(p, x, y, w, h);
                break;
            case 'cupola':
                this.buildCupolaPath(p, x, y, w, h);
                break;
            case 'turret':
                this.buildTurretPath(p, x, y, w, h);
                break;
            case 'cargo':
                this.buildCargoPath(p, x, y, w, h);
                break;
            default:
                p.rect(x, y, w, h);
                break;
        }

        this.shapePath = p;
    }

    draw(ctx: CanvasRenderingContext2D, rng: RNG) {
        switch (this.type) {
            case 'wheel':
                this.drawWheel(ctx, rng);
                break;
            case 'rod':
                this.drawRod(ctx);
                break;
            case 'lamp':
                this.drawLamp(ctx);
                break;
            case 'gun':
                this.drawGun(ctx);
                break;
            case 'coupler':
                this.drawCoupler(ctx);
                break;
            case 'cargo':
                this.drawCargo(ctx);
                break;
            case 'turret':
                this.drawTurret(ctx, rng);
                break;
            default:
                this.drawBody(ctx, rng);
                break;
        }
    }

    private buildBeveledBoxPath(p: Path2D, x: number, y: number, w: number, h: number, topBevelScale: number, sideBevelScale: number) {
        const topBevel = Math.min(w, h) * topBevelScale;
        const sideBevel = Math.min(w, h) * sideBevelScale;
        p.moveTo(x + sideBevel, y + h);
        p.lineTo(x + w - sideBevel, y + h);
        p.lineTo(x + w, y + h - sideBevel);
        p.lineTo(x + w, y + topBevel);
        p.lineTo(x + w - topBevel, y);
        p.lineTo(x + topBevel, y);
        p.lineTo(x, y + topBevel);
        p.lineTo(x, y + h - sideBevel);
        p.closePath();
    }

    private buildFireboxPath(p: Path2D, x: number, y: number, w: number, h: number) {
        const shoulder = w * 0.12;
        const roofStep = h * 0.16;
        p.moveTo(x, y + h);
        p.lineTo(x + w, y + h);
        p.lineTo(x + w, y + roofStep);
        p.lineTo(x + w - shoulder, y);
        p.lineTo(x + shoulder, y);
        p.lineTo(x, y + roofStep);
        p.closePath();
    }

    private buildNosePath(p: Path2D, x: number, y: number, w: number, h: number) {
        const taper = w * 0.22;
        const mid = y + h / 2;
        p.moveTo(x, y + h * 0.12);
        p.lineTo(x + w - taper, y);
        p.lineTo(x + w, mid - h * 0.16);
        p.lineTo(x + w, mid + h * 0.16);
        p.lineTo(x + w - taper, y + h);
        p.lineTo(x, y + h * 0.88);
        p.closePath();
    }

    private buildApronPath(p: Path2D, x: number, y: number, w: number, h: number) {
        const nose = Math.min(w, h) * 0.18;
        p.moveTo(x, y + h);
        p.lineTo(x + w - nose, y + h);
        p.lineTo(x + w, y + h * 0.7);
        p.lineTo(x + w, y);
        p.lineTo(x, y);
        p.closePath();
    }

    private buildCabPath(p: Path2D, x: number, y: number, w: number, h: number) {
        const roofInset = w * 0.14;
        const roofRise = h * 0.12;
        const frontSlope = h * 0.22;
        p.moveTo(x, y + h);
        p.lineTo(x + w, y + h);
        p.lineTo(x + w, y + frontSlope);
        p.lineTo(x + w - roofInset, y);
        p.lineTo(x + roofInset * 0.8, y + roofRise);
        p.lineTo(x, y + h * 0.18);
        p.closePath();
    }

    private buildTenderPath(p: Path2D, x: number, y: number, w: number, h: number) {
        const frontInset = w * 0.08;
        const rearInset = w * 0.14;
        const rim = h * 0.08;
        p.moveTo(x, y + h);
        p.lineTo(x + w, y + h);
        p.lineTo(x + w, y + rim);
        p.lineTo(x + w - rearInset, y);
        p.lineTo(x + frontInset, y);
        p.lineTo(x, y + rim * 1.4);
        p.closePath();
    }

    private buildFramePath(p: Path2D, x: number, y: number, w: number, h: number) {
        const nose = w * 0.05;
        const lip = h * 0.18;
        p.moveTo(x, y + h);
        p.lineTo(x + w, y + h);
        p.lineTo(x + w, y + lip);
        p.lineTo(x + w - nose, y);
        p.lineTo(x + nose, y);
        p.lineTo(x, y + lip);
        p.closePath();
    }

    private buildChimneyPath(p: Path2D, x: number, y: number, w: number, h: number) {
        const flare = w * 0.18;
        p.moveTo(x + flare, y + h);
        p.lineTo(x + w - flare, y + h);
        p.lineTo(x + w, y + h * 0.18);
        p.lineTo(x + w - flare * 0.6, y);
        p.lineTo(x + flare * 0.6, y);
        p.lineTo(x, y + h * 0.18);
        p.closePath();
    }

    private buildDomePath(p: Path2D, x: number, y: number, w: number, h: number) {
        p.moveTo(x, y + h);
        p.lineTo(x + w, y + h);
        p.lineTo(x + w, y + h * 0.42);
        p.quadraticCurveTo(x + w * 0.78, y, x + w * 0.5, y);
        p.quadraticCurveTo(x + w * 0.22, y, x, y + h * 0.42);
        p.closePath();
    }

    private buildLampPath(p: Path2D, x: number, y: number, w: number, h: number) {
        const r = Math.min(w, h) / 2;
        p.moveTo(x + r, y);
        p.arc(x + r, y + r, r, -Math.PI / 2, Math.PI * 1.5);
        p.closePath();
    }

    private buildCowcatcherPath(p: Path2D, x: number, y: number, w: number, h: number) {
        p.moveTo(x, y + h);
        p.lineTo(x + w, y + h * 0.62);
        p.lineTo(x + w, y + h * 0.12);
        p.lineTo(x, y + h * 0.36);
        p.closePath();
    }

    private buildWheelPath(p: Path2D, x: number, y: number, w: number, h: number) {
        const r = Math.min(w, h) / 2;
        p.arc(x + r, y + r, r, 0, Math.PI * 2);
        p.closePath();
    }

    private buildCasematePath(p: Path2D, x: number, y: number, w: number, h: number) {
        const endSlope = w * 0.14;
        const roofStep = h * 0.08;
        p.moveTo(x, y + h * 0.9);
        p.lineTo(x + endSlope, y);
        p.lineTo(x + w - endSlope, y);
        p.lineTo(x + w, y + h * 0.9);
        p.lineTo(x + w, y + h);
        p.lineTo(x, y + h);
        p.closePath();
        if (roofStep > 0) {
            p.moveTo(x + w * 0.2, y);
            p.lineTo(x + w * 0.8, y);
        }
    }

    private buildCupolaPath(p: Path2D, x: number, y: number, w: number, h: number) {
        const inset = w * 0.15;
        p.moveTo(x, y + h);
        p.lineTo(x + w, y + h);
        p.lineTo(x + w - inset, y);
        p.lineTo(x + inset, y);
        p.closePath();
    }

    private buildTurretPath(p: Path2D, x: number, y: number, w: number, h: number) {
        const chamfer = Math.min(w, h) * 0.16;
        const crownInset = w * 0.2;
        p.moveTo(x + chamfer, y + h);
        p.lineTo(x + w - chamfer, y + h);
        p.lineTo(x + w, y + h * 0.56);
        p.lineTo(x + w - crownInset, y + h * 0.08);
        p.lineTo(x + crownInset, y + h * 0.08);
        p.lineTo(x, y + h * 0.56);
        p.closePath();
    }

    private buildCargoPath(p: Path2D, x: number, y: number, w: number, h: number) {
        p.moveTo(x, y + h);
        p.lineTo(x + w * 0.08, y + h * 0.24);
        p.lineTo(x + w * 0.34, y);
        p.lineTo(x + w * 0.62, y + h * 0.18);
        p.lineTo(x + w * 0.88, y + h * 0.06);
        p.lineTo(x + w, y + h);
        p.closePath();
    }

    private drawBody(ctx: CanvasRenderingContext2D, rng: RNG) {
        if (!this.shapePath) return;

        const { x, y, w, h } = this.bounds;
        const fill = this.createBodyFillStyle(ctx, x, y, w, h);
        ctx.fillStyle = fill;
        ctx.fill(this.shapePath);

        ctx.save();
        ctx.clip(this.shapePath);
        this.drawBodyHighlights(ctx, x, y, w, h);
        this.drawRailwayDetails(ctx, rng);
        ctx.restore();

        ctx.strokeStyle = this.color.withBrightness(-0.45).toRGBAString();
        ctx.lineWidth = 1.2;
        ctx.stroke(this.shapePath);
    }

    private isFlatPanelType() {
        switch (this.type) {
            case 'boiler':
            case 'firebox':
            case 'apron':
            case 'smokebox':
            case 'cab':
            case 'tender':
            case 'frame':
            case 'casemate':
            case 'cupola':
            case 'cowcatcher':
            case 'coupler':
                return true;
            default:
                return false;
        }
    }

    private createBodyFillStyle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): string | CanvasGradient {
        const base = this.color;

        if (this.isFlatPanelType()) {
            return base.toRGBAString();
        }

        if (this.type === 'turret') {
            const grad = ctx.createLinearGradient(x, y, x, y + h);
            grad.addColorStop(0, base.withBrightness(0.06).toRGBAString());
            grad.addColorStop(1, base.withBrightness(-0.12).toRGBAString());
            return grad;
        }

        if (this.type === 'dome' || this.type === 'lamp') {
            const grad = ctx.createLinearGradient(x, y, x, y + h);
            grad.addColorStop(0, base.withBrightness(0.14).toRGBAString());
            grad.addColorStop(1, base.withBrightness(-0.18).toRGBAString());
            return grad;
        }

        if (this.type === 'chimney') {
            const grad = ctx.createLinearGradient(x, y, x + w * 0.2, y + h);
            grad.addColorStop(0, base.withBrightness(-0.02).toRGBAString());
            grad.addColorStop(0.4, base.withBrightness(0.06).toRGBAString());
            grad.addColorStop(1, base.withBrightness(-0.24).toRGBAString());
            return grad;
        }

        const grad = ctx.createLinearGradient(x, y, x + w, y + h * 0.4);
        grad.addColorStop(0, base.withBrightness(0.12).toRGBAString());
        grad.addColorStop(0.55, base.withBrightness(-0.03).toRGBAString());
        grad.addColorStop(1, base.withBrightness(-0.24).toRGBAString());
        return grad;
    }

    private drawBodyHighlights(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
        if (this.isFlatPanelType()) {
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(x, y, w, Math.max(2, h * 0.05));

            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(x, y + h * 0.82, w, h * 0.18);

            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + w * 0.04, y + h * 0.12);
            ctx.lineTo(x + w * 0.96, y + h * 0.12);
            ctx.stroke();
            return;
        }

        const highlight = ctx.createLinearGradient(x, y, x, y + h);
        highlight.addColorStop(0, 'rgba(255,255,255,0.18)');
        highlight.addColorStop(0.25, 'rgba(255,255,255,0.05)');
        highlight.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = highlight;
        ctx.fillRect(x, y, w, h * 0.46);

        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.04, y + h * 0.14);
        ctx.lineTo(x + w * 0.96, y + h * 0.14);
        ctx.stroke();
    }

    private drawRailwayDetails(ctx: CanvasRenderingContext2D, rng: RNG) {
        const { x, y, w, h } = this.bounds;

        switch (this.type) {
            case 'boiler':
                this.drawPlateBand(ctx, x + w * 0.18, y, h, true);
                this.drawPlateBand(ctx, x + w * 0.46, y, h, true);
                this.drawPlateBand(ctx, x + w * 0.74, y, h, true);
                this.drawHorizontalSeam(ctx, x + w * 0.06, x + w * 0.94, y + h * 0.52);
                this.drawInspectionDoor(ctx, x + w * 0.58, y + h * 0.26, w * 0.12, h * 0.42);
                break;
            case 'firebox':
                this.drawPlateBand(ctx, x + w * 0.22, y + h * 0.08, h * 0.9, true);
                this.drawInspectionDoor(ctx, x + w * 0.38, y + h * 0.24, w * 0.25, h * 0.54);
                this.drawRivetRow(ctx, x + w * 0.08, y + h * 0.16, x + w * 0.92, y + h * 0.16, 6);
                break;
            case 'apron':
                this.drawHorizontalSeam(ctx, x + w * 0.04, x + w * 0.92, y + h * 0.2);
                break;
            case 'smokebox':
                this.drawPlateBand(ctx, x + w * 0.24, y + h * 0.04, h * 0.9, true);
                this.drawPlateBand(ctx, x + w * 0.72, y + h * 0.12, h * 0.76, true);
                this.drawVisionSlot(ctx, x + w * 0.2, y + h * 0.38, w * 0.12, h * 0.12);
                break;
            case 'cab':
                this.drawVisionSlot(ctx, x + w * 0.18, y + h * 0.22, w * 0.18, h * 0.14);
                this.drawVisionSlot(ctx, x + w * 0.56, y + h * 0.22, w * 0.14, h * 0.14);
                this.drawInspectionDoor(ctx, x + w * 0.5, y + h * 0.44, w * 0.22, h * 0.38);
                this.drawRivetRow(ctx, x + w * 0.08, y + h * 0.12, x + w * 0.92, y + h * 0.12, 7);
                break;
            case 'tender':
                this.drawPlateBand(ctx, x + w * 0.22, y + h * 0.06, h * 0.88, true);
                this.drawPlateBand(ctx, x + w * 0.48, y + h * 0.06, h * 0.88, true);
                this.drawPlateBand(ctx, x + w * 0.74, y + h * 0.06, h * 0.88, true);
                this.drawHorizontalSeam(ctx, x + w * 0.06, x + w * 0.94, y + h * 0.22);
                this.drawInspectionDoor(ctx, x + w * 0.1, y + h * 0.58, w * 0.16, h * 0.18);
                break;
            case 'frame':
                this.drawAxleBoxes(ctx, rng);
                this.drawHorizontalSeam(ctx, x + w * 0.05, x + w * 0.95, y + h * 0.26);
                break;
            case 'cowcatcher':
                this.drawCowcatcherSlats(ctx);
                break;
            case 'casemate':
                this.drawCasemateDetails(ctx, rng);
                break;
            case 'cupola':
                this.drawVisionSlot(ctx, x + w * 0.2, y + h * 0.32, w * 0.22, h * 0.16);
                this.drawVisionSlot(ctx, x + w * 0.58, y + h * 0.32, w * 0.22, h * 0.16);
                break;
            case 'chimney':
                this.drawPlateBand(ctx, x + w * 0.5, y + h * 0.08, h * 0.86, true);
                break;
            case 'dome':
                this.drawPlateBand(ctx, x + w * 0.5, y + h * 0.26, h * 0.66, true);
                break;
            default:
                break;
        }
    }

    private drawPlateBand(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, rivets: boolean) {
        ctx.strokeStyle = 'rgba(30,24,20,0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + h);
        ctx.stroke();

        if (rivets) {
            this.drawRivetRow(ctx, x - 1, y + h * 0.08, x - 1, y + h * 0.92, Math.max(4, Math.round(h / 24)));
            this.drawRivetRow(ctx, x + 1, y + h * 0.08, x + 1, y + h * 0.92, Math.max(4, Math.round(h / 24)));
        }
    }

    private drawHorizontalSeam(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number) {
        ctx.strokeStyle = 'rgba(30,24,20,0.65)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
        this.drawRivetRow(ctx, x1, y - 2, x2, y - 2, Math.max(4, Math.round((x2 - x1) / 28)));
    }

    private drawVisionSlot(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
        ctx.fillStyle = 'rgba(15,14,12,0.92)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(210,192,164,0.2)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(x, y, w, h);
    }

    private drawInspectionDoor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
        ctx.strokeStyle = 'rgba(34,28,24,0.82)';
        ctx.lineWidth = 1.1;
        ctx.strokeRect(x, y, w, h);
        this.drawRivetRow(ctx, x + w * 0.16, y, x + w * 0.16, y + h, 4);
        this.drawRivetRow(ctx, x + w * 0.84, y, x + w * 0.84, y + h, 4);
    }

    private drawRivetRow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, count: number) {
        ctx.fillStyle = 'rgba(238,220,180,0.22)';
        for (let i = 0; i <= count; i++) {
            const t = i / Math.max(1, count);
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            ctx.beginPath();
            ctx.arc(x, y, 1.1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private drawAxleBoxes(ctx: CanvasRenderingContext2D, rng: RNG) {
        const { x, y, w, h } = this.bounds;
        const count = Math.max(2, Math.min(5, Math.round(w / 140)));
        const boxW = w / (count * 2.4);
        const boxH = h * 0.28;
        for (let i = 0; i < count; i++) {
            const px = x + w * 0.14 + i * ((w * 0.72) / Math.max(1, count - 1)) - boxW / 2;
            const py = y + h * rng.range(0.5, 0.58);
            ctx.strokeStyle = 'rgba(25,20,18,0.88)';
            ctx.strokeRect(px, py, boxW, boxH);
        }
    }

    private drawCowcatcherSlats(ctx: CanvasRenderingContext2D) {
        const { x, y, w, h } = this.bounds;
        ctx.strokeStyle = 'rgba(28,22,18,0.9)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            const t = i / 5;
            ctx.beginPath();
            ctx.moveTo(x + w * t, y + h);
            ctx.lineTo(x + w, y + h * (0.62 - t * 0.48));
            ctx.stroke();
        }
    }

    private drawCasemateDetails(ctx: CanvasRenderingContext2D, rng: RNG) {
        const { x, y, w, h } = this.bounds;
        const sideDoorW = w * 0.12;
        const sideDoorH = h * 0.34;
        this.drawHorizontalSeam(ctx, x + w * 0.05, x + w * 0.95, y + h * 0.62);
        this.drawInspectionDoor(ctx, x + w * 0.43, y + h * 0.26, sideDoorW, sideDoorH);
        this.drawVisionSlot(ctx, x + w * 0.16, y + h * 0.34, w * 0.06, h * 0.12);
        this.drawVisionSlot(ctx, x + w * 0.78, y + h * 0.34, w * 0.06, h * 0.12);
        this.drawArmorChevron(ctx, x + w * 0.18, y + h * 0.18, w * 0.12, h * 0.56);
        this.drawArmorChevron(ctx, x + w * 0.82, y + h * 0.18, -w * 0.12, h * 0.56);

        if (this.variant === 'supply-car') {
            this.drawPlateBand(ctx, x + w * 0.32, y + h * 0.06, h * 0.88, true);
            this.drawPlateBand(ctx, x + w * 0.68, y + h * 0.06, h * 0.88, true);
        } else if (this.variant === 'flatbed') {
            const crateW = w * 0.16;
            const crateH = h * 0.22;
            for (let i = 0; i < 3; i++) {
                const px = x + w * (0.2 + i * 0.18);
                const py = y + h * 0.44 + rng.range(-4, 4);
                ctx.strokeStyle = 'rgba(42,34,25,0.9)';
                ctx.strokeRect(px, py, crateW, crateH);
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(px + crateW, py + crateH);
                ctx.moveTo(px + crateW, py);
                ctx.lineTo(px, py + crateH);
                ctx.stroke();
            }
        }
    }

    private drawArmorChevron(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
        ctx.strokeStyle = 'rgba(36,28,24,0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h * 0.5);
        ctx.lineTo(x, y + h);
        ctx.stroke();
    }

    private drawWheel(ctx: CanvasRenderingContext2D, rng: RNG) {
        if (!this.shapePath) return;

        const { x, y, w, h } = this.bounds;
        const r = Math.min(w, h) / 2;
        const cx = x + r;
        const cy = y + r;
        const base = this.color.withBrightness(-0.08).withSaturation(-0.08);

        const grad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.18, cx, cy, r);
        grad.addColorStop(0, base.withBrightness(0.28).toRGBAString());
        grad.addColorStop(0.6, base.withBrightness(-0.04).toRGBAString());
        grad.addColorStop(1, base.withBrightness(-0.4).toRGBAString());
        ctx.fillStyle = grad;
        ctx.fill(this.shapePath);

        ctx.strokeStyle = 'rgba(14,14,14,0.95)';
        ctx.lineWidth = Math.max(1.2, r * 0.1);
        ctx.stroke(this.shapePath);

        ctx.strokeStyle = 'rgba(220,220,220,0.18)';
        ctx.lineWidth = Math.max(1, r * 0.045);
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
        ctx.stroke();

        const hubR = r * 0.2;
        ctx.fillStyle = base.withBrightness(-0.18).toRGBAString();
        ctx.beginPath();
        ctx.arc(cx, cy, hubR, 0, Math.PI * 2);
        ctx.fill();

        if (this.wheelStyle !== 'solid') {
            const spokeCount = rng.intRange(6, 8);
            ctx.strokeStyle = 'rgba(235,235,235,0.22)';
            ctx.lineWidth = Math.max(1, r * 0.04);
            for (let i = 0; i < spokeCount; i++) {
                const angle = (Math.PI * 2 * i) / spokeCount;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(angle) * r * 0.72, cy + Math.sin(angle) * r * 0.72);
                ctx.stroke();
            }
        }

        if (this.wheelStyle === 'counterweight') {
            ctx.fillStyle = base.withBrightness(-0.26).toRGBAString();
            ctx.beginPath();
            ctx.arc(cx - r * 0.15, cy + r * 0.12, r * 0.36, 0.2 * Math.PI, 1.05 * Math.PI);
            ctx.fill();
        }
    }

    private drawRod(ctx: CanvasRenderingContext2D) {
        if (!this.shapePath) return;
        const { x, y, w, h } = this.bounds;
        const base = this.color.withBrightness(-0.18);
        const grad = ctx.createLinearGradient(x, y, x + w, y);
        grad.addColorStop(0, base.withBrightness(0.2).toRGBAString());
        grad.addColorStop(0.5, base.withBrightness(-0.05).toRGBAString());
        grad.addColorStop(1, base.withBrightness(-0.28).toRGBAString());
        ctx.fillStyle = grad;
        ctx.fill(this.shapePath);
        ctx.strokeStyle = 'rgba(15,15,15,0.8)';
        ctx.lineWidth = 1;
        ctx.stroke(this.shapePath);

        const boltR = Math.max(1.2, h * 0.45);
        ctx.fillStyle = base.withBrightness(-0.24).toRGBAString();
        ctx.beginPath();
        ctx.arc(x + boltR * 1.6, y + h / 2, boltR, 0, Math.PI * 2);
        ctx.arc(x + w - boltR * 1.6, y + h / 2, boltR, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawLamp(ctx: CanvasRenderingContext2D) {
        if (!this.shapePath) return;

        const { x, y, w, h } = this.bounds;
        const r = Math.min(w, h) / 2;
        const cx = x + r;
        const cy = y + r;

        ctx.fillStyle = this.color.withBrightness(-0.16).toRGBAString();
        ctx.fill(this.shapePath);
        ctx.strokeStyle = 'rgba(10,10,10,0.8)';
        ctx.stroke(this.shapePath);

        const glow = HSBAColor.fromRGBA(255, 214, 128);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3.4);
        grad.addColorStop(0, glow.withAlpha(0.46).toRGBAString());
        grad.addColorStop(1, glow.withAlpha(0).toRGBAString());
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = glow.toRGBAString();
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.48, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawGun(ctx: CanvasRenderingContext2D) {
        if (!this.shapePath) return;
        const { x, y, w, h } = this.bounds;
        const grad = ctx.createLinearGradient(x, y, x + w, y);
        grad.addColorStop(0, this.color.withBrightness(0.05).toRGBAString());
        grad.addColorStop(1, this.color.withBrightness(-0.22).toRGBAString());
        ctx.fillStyle = grad;
        ctx.fill(this.shapePath);
        ctx.strokeStyle = 'rgba(18,18,18,0.84)';
        ctx.lineWidth = 1;
        ctx.stroke(this.shapePath);

        ctx.fillStyle = this.color.withBrightness(-0.28).toRGBAString();
        ctx.fillRect(x + w * 0.86, y - h * 0.2, w * 0.12, h * 1.4);
    }

    private drawCoupler(ctx: CanvasRenderingContext2D) {
        const { x, y, w, h } = this.bounds;
        const base = this.color.withBrightness(-0.18).withSaturation(-0.1);
        ctx.fillStyle = base.toRGBAString();
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(15,15,15,0.85)';
        ctx.strokeRect(x, y, w, h);

        const cx = x + w;
        const cy = y + h / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, h * 0.55, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
    }

    private drawCargo(ctx: CanvasRenderingContext2D) {
        if (!this.shapePath) return;
        const { x, y, h } = this.bounds;
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, this.color.withBrightness(0.08).toRGBAString());
        grad.addColorStop(1, this.color.withBrightness(-0.24).toRGBAString());
        ctx.fillStyle = grad;
        ctx.fill(this.shapePath);
        ctx.strokeStyle = 'rgba(26,20,16,0.72)';
        ctx.lineWidth = 1;
        ctx.stroke(this.shapePath);
    }

    private drawTurret(ctx: CanvasRenderingContext2D, rng: RNG) {
        if (!this.shapePath) return;
        const { x, y, w, h } = this.bounds;
        const cx = x + w / 2;
        const cy = y + h * 0.62;
        ctx.fillStyle = this.color.toRGBAString();
        ctx.fill(this.shapePath);

        ctx.save();
        ctx.clip(this.shapePath);
        ctx.fillStyle = this.color.withBrightness(-0.12).toRGBAString();
        ctx.beginPath();
        ctx.moveTo(x, y + h * 0.62);
        ctx.lineTo(x + w * 0.14, y + h);
        ctx.lineTo(x + w * 0.86, y + h);
        ctx.lineTo(x + w, y + h * 0.62);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(x + w * 0.12, y + h * 0.12, w * 0.76, h * 0.1);
        ctx.restore();

        ctx.strokeStyle = 'rgba(12,12,12,0.84)';
        ctx.lineWidth = 1.1;
        ctx.stroke(this.shapePath);

        ctx.strokeStyle = 'rgba(245,245,245,0.15)';
        ctx.beginPath();
        ctx.moveTo(x + w * 0.18, y + h * 0.26);
        ctx.lineTo(x + w * 0.82, y + h * 0.26);
        ctx.stroke();

        ctx.fillStyle = this.color.withBrightness(-0.08).toRGBAString();
        ctx.beginPath();
        ctx.ellipse(cx, cy, w * 0.36, h * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();

        this.drawVisionSlot(ctx, x + w * 0.37, y + h * 0.42, w * 0.16, h * 0.1);
        if (rng.bool(0.6)) {
            this.drawRivetRow(ctx, x + w * 0.18, y + h * 0.18, x + w * 0.82, y + h * 0.18, 5);
        }
    }
}
