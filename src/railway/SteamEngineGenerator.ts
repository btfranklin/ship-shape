import { HSBAColor, RNG } from '../greebles/common.js';
import { SteamEngineComponent } from './SteamEngineComponent.js';
import type { RailVehicleKind, WheelStyle } from './engineTypes.js';

export interface SteamEngineOptions {
    includeTender?: boolean;
    includeCowcatcher?: boolean;
    wheelStyle?: WheelStyle | 'mixed';
}

export interface RailCarOptions {
    kind?: Exclude<RailVehicleKind, 'engine'> | 'mixed';
    wheelStyle?: WheelStyle | 'mixed';
}

export interface WarTrainConsistOptions extends SteamEngineOptions, RailCarOptions {
    carCount?: number;
}

export interface RailVehicleLayout {
    kind: RailVehicleKind;
    components: SteamEngineComponent[];
    bounds: { x: number; y: number; w: number; h: number };
    couplerFront: { x: number; y: number };
    couplerRear: { x: number; y: number };
}

interface RailMetrics {
    railY: number;
    couplerY: number;
    wheelRadiusLarge: number;
    wheelRadiusSmall: number;
    frameBottom: number;
}

interface WheelSpec {
    x: number;
    y: number;
    radius: number;
    style: WheelStyle;
}

export class SteamEngineGenerator {
    generate(width: number, height: number, themeColor: HSBAColor, rng: RNG, options: SteamEngineOptions = {}): SteamEngineComponent[] {
        return this.generateLayout(width, height, themeColor, rng, options).components;
    }

    generateLayout(width: number, height: number, themeColor: HSBAColor, rng: RNG, options: SteamEngineOptions = {}): RailVehicleLayout {
        const metrics = this.createMetrics(height, rng);
        const includeTender = options.includeTender ?? rng.bool(0.85);
        const includeCowcatcher = options.includeCowcatcher ?? rng.bool(0.7);
        const scale = height / 1100;
        const length = 1180 * scale * rng.range(0.94, 1.06);
        const x = (width - length) / 2;

        return this.buildEngineLayout(x, length, themeColor, rng, metrics, {
            includeTender,
            includeCowcatcher,
            wheelStyle: options.wheelStyle ?? 'mixed'
        });
    }

    generateCar(width: number, height: number, themeColor: HSBAColor, rng: RNG, options: RailCarOptions = {}): RailVehicleLayout {
        const metrics = this.createMetrics(height, rng);
        const scale = height / 1100;
        const length = 760 * scale * rng.range(0.95, 1.05);
        const x = (width - length) / 2;
        return this.buildCarLayout(x, length, themeColor, rng, metrics, options.kind ?? 'mixed', options.wheelStyle ?? 'mixed');
    }

    generateConsist(width: number, height: number, themeColor: HSBAColor, rng: RNG, options: WarTrainConsistOptions = {}): RailVehicleLayout[] {
        const metrics = this.createMetrics(height, rng);
        const scale = height / 1100;
        const carCount = options.carCount ?? rng.intRange(2, 4);
        const couplingGap = 42 * scale;
        const engineLength = 1240 * scale * rng.range(0.95, 1.05);
        const carLengths = Array.from({ length: carCount }, () => 720 * scale * rng.range(0.96, 1.04));
        const total = engineLength + carLengths.reduce((sum, current) => sum + current, 0) + couplingGap * carCount;

        const layouts: RailVehicleLayout[] = [];
        let cursorX = Math.max(140 * scale, (width - total) / 2);
        const mixedKinds = this.createCarKindSequence(rng, carCount);
        for (let i = 0; i < carLengths.length; i++) {
            const requestedKind = options.kind ?? 'mixed';
            const resolvedKind = requestedKind === 'mixed' ? mixedKinds[i] : requestedKind;
            const carLayout = this.buildCarLayout(cursorX, carLengths[i]!, themeColor, rng, metrics, resolvedKind, options.wheelStyle ?? 'mixed');
            layouts.push(carLayout);
            cursorX = carLayout.couplerRear.x + couplingGap;
        }

        const engineLayout = this.buildEngineLayout(cursorX, engineLength, themeColor, rng, metrics, {
            includeTender: options.includeTender ?? true,
            includeCowcatcher: options.includeCowcatcher ?? true,
            wheelStyle: options.wheelStyle ?? 'mixed'
        });
        layouts.push(engineLayout);

        return layouts;
    }

    private createMetrics(height: number, rng: RNG): RailMetrics {
        const wheelRadiusLarge = height * rng.range(0.068, 0.084);
        return {
            railY: height * 0.82,
            couplerY: height * 0.745,
            wheelRadiusLarge,
            wheelRadiusSmall: wheelRadiusLarge * rng.range(0.7, 0.82),
            frameBottom: height * 0.76
        };
    }

    private buildEngineLayout(
        x: number,
        totalLength: number,
        themeColor: HSBAColor,
        rng: RNG,
        metrics: RailMetrics,
        options: Required<SteamEngineOptions>
    ): RailVehicleLayout {
        const components: SteamEngineComponent[] = [];
        const palette = this.createPalette(themeColor);
        const couplingInset = totalLength * 0.018;
        const tenderGap = totalLength * 0.012;
        const tenderLength = options.includeTender ? totalLength * rng.range(0.22, 0.28) : 0;
        const engineLength = totalLength - tenderLength - (options.includeTender ? tenderGap : 0);
        const engineX = options.includeTender ? x + tenderLength + tenderGap : x;
        const tenderX = x;

        const driveRadius = metrics.wheelRadiusLarge;
        const driveCenterY = metrics.railY - driveRadius;
        const frameY = driveCenterY - driveRadius * 0.36;
        const frameH = driveRadius * 1.12;
        const frameX = engineX + engineLength * 0.04;
        const frameW = engineLength * 0.9;

        const cabW = engineLength * rng.range(0.16, 0.2);
        const fireboxW = engineLength * rng.range(0.12, 0.16);
        const boilerW = engineLength * rng.range(0.34, 0.4);
        const smokeboxW = engineLength * rng.range(0.14, 0.17);
        const pilotW = options.includeCowcatcher ? engineLength * rng.range(0.06, 0.08) : 0;
        const frontX = engineX + engineLength - pilotW;
        const smokeboxX = frontX - smokeboxW;
        const boilerX = smokeboxX - boilerW;
        const fireboxX = boilerX - fireboxW;
        const cabX = fireboxX - cabW * rng.range(0.92, 1.0);

        const boilerH = driveRadius * rng.range(1.08, 1.18);
        const fireboxH = boilerH * rng.range(1.16, 1.28);
        const cabH = fireboxH * rng.range(1.04, 1.16);
        const smokeboxH = boilerH * rng.range(0.94, 1.02);
        const boilerY = frameY - boilerH * rng.range(0.92, 1.02);
        const fireboxY = boilerY - (fireboxH - boilerH) * 0.62;
        const cabY = fireboxY - (cabH - fireboxH) * 0.18;
        const smokeboxY = boilerY + (boilerH - smokeboxH) * 0.18;
        const apronY = frameY - driveRadius * 0.14;
        const apronH = driveRadius * 0.28;

        const chimneyW = smokeboxH * 0.18;
        const chimneyH = smokeboxH * rng.range(0.52, 0.68);
        const chimneyX = smokeboxX + smokeboxW * rng.range(0.5, 0.68);
        const chimneyY = smokeboxY - chimneyH * 1.08;

        const domeW = boilerH * 0.24;
        const domeH = boilerH * 0.24;
        const domeX = boilerX + boilerW * rng.range(0.48, 0.62);
        const domeY = boilerY - domeH * 1.02;

        const lampW = smokeboxH * 0.12;
        const lampH = lampW;
        const lampX = smokeboxX + smokeboxW * 0.88;
        const lampY = smokeboxY + smokeboxH * 0.3;

        const cowcatcherH = options.includeCowcatcher ? frameH * 0.64 : 0;
        const cowcatcherX = frontX - pilotW * 0.92;
        const cowcatcherY = metrics.frameBottom - cowcatcherH;

        components.push(new SteamEngineComponent(frameX, frameY, frameW, frameH, 20, 'frame', palette.frame));
        components.push(new SteamEngineComponent(cabX + cabW * 0.3, apronY, smokeboxX + smokeboxW * 0.9 - (cabX + cabW * 0.3), apronH, 24, 'apron', palette.body.withBrightness(-0.04)));
        components.push(new SteamEngineComponent(boilerX, boilerY, boilerW, boilerH, 34, 'boiler', palette.body, { variant: 'armored' }));
        components.push(new SteamEngineComponent(fireboxX, fireboxY, fireboxW, fireboxH, 35, 'firebox', palette.body.withBrightness(-0.04)));
        components.push(new SteamEngineComponent(smokeboxX, smokeboxY, smokeboxW, smokeboxH, 36, 'smokebox', palette.nose));
        components.push(new SteamEngineComponent(cabX, cabY, cabW, cabH, 38, 'cab', palette.cab));
        components.push(new SteamEngineComponent(chimneyX, chimneyY, chimneyW, chimneyH, 48, 'chimney', palette.trim));
        components.push(new SteamEngineComponent(domeX, domeY, domeW, domeH, 46, 'dome', palette.trim));
        components.push(new SteamEngineComponent(lampX, lampY, lampW, lampH, 54, 'lamp', palette.trim.withBrightness(0.06)));

        if (options.includeCowcatcher) {
            components.push(new SteamEngineComponent(cowcatcherX, cowcatcherY, pilotW, cowcatcherH, 28, 'cowcatcher', palette.frame));
        }

        if (options.includeTender) {
            const tenderBodyH = cabH * rng.range(0.8, 0.92);
            const tenderBodyY = frameY - tenderBodyH * rng.range(0.82, 0.9);
            const tenderFrameY = driveCenterY - driveRadius * 0.3;
            const tenderFrameH = driveRadius * 0.96;
            const tenderApronY = tenderFrameY - driveRadius * 0.08;
            components.push(new SteamEngineComponent(tenderX, tenderFrameY, tenderLength, tenderFrameH, 18, 'frame', palette.frame.withBrightness(-0.04), { variant: 'tender' }));
            components.push(new SteamEngineComponent(tenderX + tenderLength * 0.04, tenderApronY, tenderLength * 0.9, driveRadius * 0.18, 23, 'apron', palette.tender.withBrightness(-0.08)));
            components.push(new SteamEngineComponent(tenderX + tenderLength * 0.04, tenderBodyY, tenderLength * 0.92, tenderBodyH, 30, 'tender', palette.tender));
            components.push(new SteamEngineComponent(tenderX + tenderLength * 0.14, tenderBodyY - tenderBodyH * 0.18, tenderLength * 0.64, tenderBodyH * 0.3, 31, 'cargo', palette.coal, { variant: 'coal' }));
        }

        const wheels = this.buildEngineWheels(rng, engineX, engineLength, tenderX, tenderLength, metrics, options.wheelStyle);
        for (const wheel of wheels) {
            components.push(
                new SteamEngineComponent(
                    wheel.x - wheel.radius,
                    wheel.y - wheel.radius,
                    wheel.radius * 2,
                    wheel.radius * 2,
                    10,
                    'wheel',
                    palette.wheels,
                    { wheelStyle: wheel.style }
                )
            );
        }

        const driveWheels = wheels.filter((wheel) => wheel.radius === driveRadius);
        if (driveWheels.length >= 2) {
            const first = driveWheels[0];
            const last = driveWheels[driveWheels.length - 1];
            const rodY = first.y - driveRadius * 0.08;
            components.push(new SteamEngineComponent(first.x - driveRadius * 0.18, rodY, last.x - first.x + driveRadius * 0.36, driveRadius * 0.16, 58, 'rod', palette.trim.withBrightness(-0.08)));
        }

        const couplerFrontX = options.includeTender ? tenderX + couplingInset : engineX + couplingInset;
        const couplerRearX = engineX + engineLength - couplingInset;
        components.push(new SteamEngineComponent(couplerFrontX - totalLength * 0.012, metrics.couplerY - driveRadius * 0.08, totalLength * 0.024, driveRadius * 0.16, 62, 'coupler', palette.frame));
        components.push(new SteamEngineComponent(couplerRearX - totalLength * 0.012, metrics.couplerY - driveRadius * 0.08, totalLength * 0.024, driveRadius * 0.16, 62, 'coupler', palette.frame));

        return this.finalizeLayout('engine', components, couplerFrontX, couplerRearX, metrics.couplerY, rng);
    }

    private buildEngineWheels(
        rng: RNG,
        x: number,
        engineLength: number,
        tenderX: number,
        tenderLength: number,
        metrics: RailMetrics,
        wheelStyle: WheelStyle | 'mixed'
    ): WheelSpec[] {
        const wheels: WheelSpec[] = [];
        const driveRadius = metrics.wheelRadiusLarge;
        const pilotRadius = metrics.wheelRadiusSmall;
        const driveY = metrics.railY - driveRadius;
        const pilotY = metrics.railY - pilotRadius;

        const driveStart = x + engineLength * 0.42;
        const driveSpacing = engineLength * 0.16;
        for (let i = 0; i < 3; i++) {
            wheels.push({
                x: driveStart + driveSpacing * i,
                y: driveY,
                radius: driveRadius,
                style: this.pickWheelStyle(rng, wheelStyle)
            });
        }

        wheels.push({
            x: x + engineLength * 0.82,
            y: pilotY,
            radius: pilotRadius,
            style: 'solid'
        });
        wheels.push({
            x: x + engineLength * 0.16,
            y: pilotY,
            radius: pilotRadius,
            style: 'solid'
        });

        if (tenderLength > 0) {
            const tenderRadius = pilotRadius * 0.96;
            const tenderY = metrics.railY - tenderRadius;
            wheels.push({
                x: tenderX + tenderLength * 0.28,
                y: tenderY,
                radius: tenderRadius,
                style: 'solid'
            });
            wheels.push({
                x: tenderX + tenderLength * 0.72,
                y: tenderY,
                radius: tenderRadius,
                style: 'solid'
            });
        }

        return wheels;
    }

    private buildCarLayout(
        x: number,
        totalLength: number,
        themeColor: HSBAColor,
        rng: RNG,
        metrics: RailMetrics,
        requestedKind: RailCarOptions['kind'],
        requestedWheelStyle: RailCarOptions['wheelStyle']
    ): RailVehicleLayout {
        const kind = requestedKind === 'mixed' || !requestedKind
            ? rng.choice(['gun-car', 'escort-car', 'supply-car', 'flatbed'] as Exclude<RailVehicleKind, 'engine'>[])
            : requestedKind;
        const palette = this.createPalette(themeColor.withSaturation(0.02));
        const couplingInset = totalLength * 0.022;
        const radius = metrics.wheelRadiusSmall * rng.range(0.92, 1.06);
        const wheelY = metrics.railY - radius;
        const frameY = wheelY - radius * 0.38;
        const frameH = radius * 1.02;
        const frameX = x + totalLength * 0.08;
        const frameW = totalLength * 0.84;
        const bodyY = frameY - radius * rng.range(0.88, 1.02);
        const bodyH = radius * rng.range(1.22, 1.42);
        const bodyX = x + totalLength * 0.12;
        const bodyW = totalLength * 0.76;
        const apronY = frameY - radius * 0.12;
        const components: SteamEngineComponent[] = [];

        components.push(new SteamEngineComponent(frameX, frameY, frameW, frameH, 18, 'frame', palette.frame));
        components.push(new SteamEngineComponent(bodyX + bodyW * 0.06, apronY, bodyW * 0.88, radius * 0.2, 22, 'apron', palette.body.withBrightness(-0.08)));
        components.push(new SteamEngineComponent(bodyX, bodyY, bodyW, bodyH, 28, 'casemate', palette.body.withBrightness(kind === 'supply-car' ? 0.04 : 0), { variant: kind }));

        if (kind === 'gun-car') {
            const turretW = bodyW * 0.18;
            const turretH = bodyH * 0.34;
            const turretX = bodyX + bodyW * 0.52 - turretW / 2;
            const turretY = bodyY - turretH * 1.02;
            const gunW = bodyW * 0.22;
            const gunH = turretH * 0.26;
            components.push(new SteamEngineComponent(turretX, turretY, turretW, turretH, 40, 'turret', palette.trim.withBrightness(-0.02)));
            components.push(new SteamEngineComponent(turretX + turretW * 0.74, turretY + turretH * 0.48, gunW, gunH, 42, 'gun', palette.trim.withBrightness(-0.08)));
        } else if (kind === 'escort-car') {
            const cupolaW = bodyW * 0.18;
            const cupolaH = bodyH * 0.2;
            const cupolaX = bodyX + bodyW * 0.54 - cupolaW / 2;
            const cupolaY = bodyY - cupolaH * 1.06;
            components.push(new SteamEngineComponent(cupolaX, cupolaY, cupolaW, cupolaH, 39, 'cupola', palette.trim));
            const gunW = bodyW * 0.12;
            const gunH = cupolaH * 0.18;
            components.push(new SteamEngineComponent(bodyX + bodyW * 0.9, bodyY + bodyH * 0.34, gunW, gunH, 41, 'gun', palette.trim.withBrightness(-0.1)));
            components.push(new SteamEngineComponent(bodyX - gunW * 0.2, bodyY + bodyH * 0.34, gunW, gunH, 41, 'gun', palette.trim.withBrightness(-0.1)));
        } else if (kind === 'supply-car') {
            components.push(new SteamEngineComponent(bodyX + bodyW * 0.2, bodyY - bodyH * 0.16, bodyW * 0.22, bodyH * 0.12, 36, 'cargo', palette.coal.withBrightness(0.02), { variant: 'cargo' }));
        } else if (kind === 'flatbed') {
            const deckY = bodyY + bodyH * 0.36;
            components.push(new SteamEngineComponent(bodyX + bodyW * 0.18, deckY, bodyW * 0.22, bodyH * 0.2, 34, 'cargo', palette.body.withBrightness(0.02), { variant: 'crate' }));
            components.push(new SteamEngineComponent(bodyX + bodyW * 0.48, bodyY - bodyH * 0.3, bodyW * 0.16, bodyH * 0.22, 38, 'turret', palette.trim));
            components.push(new SteamEngineComponent(bodyX + bodyW * 0.6, bodyY - bodyH * 0.08, bodyW * 0.16, bodyH * 0.04, 39, 'gun', palette.trim.withBrightness(-0.1)));
        }

        const wheelStyle = requestedWheelStyle ?? 'mixed';
        const wheelXs = kind === 'flatbed'
            ? [x + totalLength * 0.34, x + totalLength * 0.66]
            : [x + totalLength * 0.3, x + totalLength * 0.5, x + totalLength * 0.7];

        for (const wheelX of wheelXs) {
            components.push(new SteamEngineComponent(wheelX - radius, wheelY - radius, radius * 2, radius * 2, 10, 'wheel', palette.wheels, {
                wheelStyle: kind === 'flatbed' ? 'solid' : this.pickWheelStyle(rng, wheelStyle)
            }));
        }

        const couplerFrontX = x + couplingInset;
        const couplerRearX = x + totalLength - couplingInset;
        components.push(new SteamEngineComponent(couplerFrontX - totalLength * 0.018, metrics.couplerY - radius * 0.08, totalLength * 0.02, radius * 0.16, 60, 'coupler', palette.frame));
        components.push(new SteamEngineComponent(couplerRearX - totalLength * 0.012, metrics.couplerY - radius * 0.08, totalLength * 0.02, radius * 0.16, 60, 'coupler', palette.frame));

        if (kind !== 'flatbed') {
            components.push(new SteamEngineComponent(bodyX + bodyW * 0.08, bodyY + bodyH * 0.66, bodyW * 0.84, bodyH * 0.08, 32, 'rod', palette.trim.withBrightness(-0.12)));
        }

        return this.finalizeLayout(kind, components, couplerFrontX, couplerRearX, metrics.couplerY, rng);
    }

    private finalizeLayout(
        kind: RailVehicleKind,
        components: SteamEngineComponent[],
        couplerFrontX: number,
        couplerRearX: number,
        couplerY: number,
        rng: RNG
    ): RailVehicleLayout {
        components.forEach((component) => component.generateShape(rng));
        components.sort((a, b) => a.zIndex - b.zIndex);

        const minX = Math.min(...components.map((component) => component.bounds.x));
        const minY = Math.min(...components.map((component) => component.bounds.y));
        const maxX = Math.max(...components.map((component) => component.bounds.x + component.bounds.w));
        const maxY = Math.max(...components.map((component) => component.bounds.y + component.bounds.h));

        return {
            kind,
            components,
            bounds: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
            couplerFront: { x: couplerFrontX, y: couplerY },
            couplerRear: { x: couplerRearX, y: couplerY }
        };
    }

    private pickWheelStyle(rng: RNG, wheelStyle: WheelStyle | 'mixed'): WheelStyle {
        if (wheelStyle === 'mixed') return rng.choice(['spoked', 'solid', 'counterweight'] as WheelStyle[]);
        return wheelStyle;
    }

    private createCarKindSequence(rng: RNG, count: number): Exclude<RailVehicleKind, 'engine'>[] {
        const pool: Exclude<RailVehicleKind, 'engine'>[] = ['gun-car', 'escort-car', 'supply-car', 'flatbed'];
        const rotated = pool.slice();
        for (let i = rotated.length - 1; i > 0; i--) {
            const j = Math.floor(rng.next() * (i + 1));
            const current = rotated[i]!;
            rotated[i] = rotated[j]!;
            rotated[j] = current;
        }

        const sequence: Exclude<RailVehicleKind, 'engine'>[] = [];
        for (let i = 0; i < count; i++) {
            sequence.push(rotated[i % rotated.length]!);
        }
        return sequence;
    }

    private createPalette(theme: HSBAColor) {
        const base = theme.withSaturation(-0.08).withBrightness(-0.02);
        return {
            body: base.withBrightness(0.02),
            cab: base.withBrightness(-0.02).withSaturation(-0.02),
            nose: base.withBrightness(-0.06),
            tender: base.withBrightness(-0.1),
            frame: base.withBrightness(-0.22).withSaturation(-0.04),
            trim: base.withBrightness(0.08).withSaturation(-0.02),
            wheels: base.withBrightness(-0.28).withSaturation(-0.06),
            coal: HSBAColor.fromRGBA(48, 40, 34)
        };
    }
}
