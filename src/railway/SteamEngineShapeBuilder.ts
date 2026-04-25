import { RNG, getPath2D } from '../greebles/common.js';
import type { SteamEngineComponent } from './SteamEngineComponent.js';

export class SteamEngineShapeBuilder {
    constructor(private component: SteamEngineComponent) {}

    generateShape(_rng: RNG) {
        const { x, y, w, h } = this.component.bounds;
        const Path2D = getPath2D();
        const p = new Path2D();

        switch (this.component.type) {
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

        this.component.shapePath = p;
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
        p.lineTo(x + w, y + h * 0.1);
        p.lineTo(x + w * 0.86, y);
        p.lineTo(x + w * 0.14, y);
        p.lineTo(x, y + h * 0.1);
        p.closePath();
    }

    private buildDomePath(p: Path2D, x: number, y: number, w: number, h: number) {
        p.moveTo(x, y + h);
        p.lineTo(x + w, y + h);
        p.quadraticCurveTo(x + w * 0.88, y, x + w / 2, y);
        p.quadraticCurveTo(x + w * 0.12, y, x, y + h);
        p.closePath();
    }

    private buildLampPath(p: Path2D, x: number, y: number, w: number, h: number) {
        const r = Math.min(w, h) / 2;
        p.arc(x + r, y + r, r, 0, Math.PI * 2);
    }

    private buildCowcatcherPath(p: Path2D, x: number, y: number, w: number, h: number) {
        p.moveTo(x, y + h);
        p.lineTo(x + w, y + h);
        p.lineTo(x + w * 0.86, y);
        p.lineTo(x + w * 0.16, y + h * 0.24);
        p.closePath();
    }

    private buildWheelPath(p: Path2D, x: number, y: number, w: number, h: number) {
        const r = Math.min(w, h) / 2;
        p.arc(x + r, y + r, r, 0, Math.PI * 2);
    }

    private buildCasematePath(p: Path2D, x: number, y: number, w: number, h: number) {
        const bevel = Math.min(w, h) * 0.1;
        p.moveTo(x, y + h);
        p.lineTo(x + w, y + h);
        p.lineTo(x + w, y + bevel);
        p.lineTo(x + w - bevel, y);
        p.lineTo(x + bevel, y);
        p.lineTo(x, y + bevel);
        p.closePath();
    }

    private buildCupolaPath(p: Path2D, x: number, y: number, w: number, h: number) {
        const inset = w * 0.12;
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
}
