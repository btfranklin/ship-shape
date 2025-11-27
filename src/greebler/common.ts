export class HSBAColor {
    constructor(public h: number, public s: number, public b: number, public a: number = 1.0) {}

    static fromRGBA(r: number, g: number, b: number, a: number = 1.0): HSBAColor {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, v = max;
        const d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max !== min) {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return new HSBAColor(h, s, v, a);
    }

    toCSS(): string {
        // Convert HSV (HSB) to HSL for CSS
        let l = (2 - this.s) * this.b / 2;
        let s_hsl = l && l < 1 ? this.s * this.b / (l < 0.5 ? l * 2 : 2 - l * 2) : this.s;
        
        // Re-calculate HSL from HSB manually to be safe
        const h = this.h * 360;
        const s = this.s * 100;
        const v = this.b * 100;
        
        // HSB to HSL
        const l_calc = (2 - this.s) * this.b / 2;
        let s_calc = l_calc && l_calc < 1 ? (this.s * this.b) / (l_calc < 0.5 ? l_calc * 2 : 2 - l_calc * 2) : this.s;
        
        if (isNaN(s_calc)) s_calc = 0;

        return `hsla(${h}, ${s_calc * 100}%, ${l_calc * 100}%, ${this.a})`;
    }

    toRGBAString(): string {
        // HSB to RGB
        let r = 0, g = 0, b = 0;
        const i = Math.floor(this.h * 6);
        const f = this.h * 6 - i;
        const p = this.b * (1 - this.s);
        const q = this.b * (1 - f * this.s);
        const t = this.b * (1 - (1 - f) * this.s);

        switch (i % 6) {
            case 0: r = this.b; g = t; b = p; break;
            case 1: r = q; g = this.b; b = p; break;
            case 2: r = p; g = this.b; b = t; break;
            case 3: r = p; g = q; b = this.b; break;
            case 4: r = t; g = p; b = this.b; break;
            case 5: r = this.b; g = p; b = q; break;
        }

        return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${this.a})`;
    }

    withBrightness(adjustment: number): HSBAColor {
        return new HSBAColor(this.h, this.s, Math.max(0, Math.min(1, this.b + adjustment)), this.a);
    }

    withSaturation(adjustment: number): HSBAColor {
        return new HSBAColor(this.h, Math.max(0, Math.min(1, this.s + adjustment)), this.b, this.a);
    }
    
    withAlpha(newAlpha: number): HSBAColor {
        return new HSBAColor(this.h, this.s, this.b, newAlpha);
    }

    withHueShift(shift: number): HSBAColor {
        let newH = (this.h + shift) % 1.0;
        if (newH < 0) newH += 1.0;
        return new HSBAColor(newH, this.s, this.b, this.a);
    }
}

export class RNG {
    constructor(private seed: number = Date.now()) {}

    // Mulberry32
    next(): number {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }
    
    intRange(min: number, max: number): number {
        return Math.floor(this.range(min, max + 1));
    }

    bool(probability: number = 0.5): boolean {
        return this.next() < probability;
    }
    
    choice<T>(array: T[]): T {
        return array[Math.floor(this.next() * array.length)] as T;
    }
}

export interface Drawable {
    draw(context: CanvasRenderingContext2D, rng: RNG): void;
}

export const UNIT_SCALE = 450;