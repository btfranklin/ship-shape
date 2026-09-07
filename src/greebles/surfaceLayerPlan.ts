import { HSBAColor, RNG } from './common.js';
import { UNIT_SCALE } from './constants.js';
import { CapitalShipWindowsGreebles } from './CapitalShipWindowsGreebles.js';
import type { ComponentType, ShipArchetype } from '../shared/shipTypes.js';
import type { EmissivePlan, OccluderPlan } from './CapitalShipSurfaceEmissiveRenderer.js';
import { determineSurfaceStyle } from './surfaceStylePlan.js';
import type { GreebleStyle } from './surfaceStylePlan.js';

export interface SurfaceLayerPlanConfig {
    xUnits: number;
    yUnits: number;
    themeColor: HSBAColor;
    shipArchetype: ShipArchetype;
    componentType: ComponentType;
    skipBaseFill: boolean;
    isTrunk: boolean;
    lightColors?: HSBAColor[];
    emissiveMode: EmissiveMode;
}

export type EmissiveMode = 'inline' | 'separate';

export interface SurfaceNoiseSpeck {
    x: number;
    y: number;
    w: number;
    h: number;
    color: HSBAColor;
}

export type SurfaceLayerPlanLayer =
    | { kind: 'baseFill'; color: HSBAColor }
    | { kind: 'noise'; specks: SurfaceNoiseSpeck[] }
    | { kind: 'panels'; seed: number; panelCount: number; showRivets: boolean }
    | { kind: 'lightPanels'; emissiveMode: 'inline'; count: number; colors: HSBAColor[]; seed: number }
    | { kind: 'lightPanels'; emissiveMode: 'separate'; count: number; colors: HSBAColor[]; seeds: number[] }
    | { kind: 'electronics'; seed: number; count: number }
    | { kind: 'windows'; emissiveMode: 'inline'; count: number; color: HSBAColor; seed: number }
    | { kind: 'windows'; emissiveMode: 'separate'; count: number; color: HSBAColor; seeds: number[] }
    | { kind: 'trench'; seed: number; y: number; h: number }
    | { kind: 'cutaways'; emissiveMode: 'inline'; count: number; seed: number }
    | { kind: 'cutaways'; emissiveMode: 'separate'; count: number; seeds: number[] }
    | { kind: 'equipment'; seed: number; count: number }
    | { kind: 'pipes'; seed: number; count: number }
    | { kind: 'hoses'; seed: number; count: number };

export type SurfaceLayerPlan =
    | {
        emissiveMode: 'inline';
        style: GreebleStyle;
        layers: SurfaceLayerPlanLayer[];
    }
    | {
        emissiveMode: 'separate';
        style: GreebleStyle;
        layers: SurfaceLayerPlanLayer[];
        emissivePlan: EmissivePlan;
    };

export function createSurfaceLayerPlan(config: SurfaceLayerPlanConfig, rng: RNG): SurfaceLayerPlan {
    const layers: SurfaceLayerPlanLayer[] = [];
    const emissivePlan: EmissivePlan | undefined = config.emissiveMode === 'separate'
        ? { occludersAfterLights: [], occludersAfterWindows: [], occludersAfterCutaways: [] }
        : undefined;

    if (!config.skipBaseFill) {
        layers.push({ kind: 'baseFill', color: config.themeColor });
        layers.push({
            kind: 'noise',
            specks: createNoiseSpecks(config, rng)
        });
    }

    const style = determineSurfaceStyle(
        config.shipArchetype,
        config.componentType,
        config.isTrunk,
        rng
    );
    const knobs = createStyleKnobs(config, style);
    const nextSeed = () => rng.intRange(1, 0x7fffffff);

    const allowsWindows =
        (style === 'clean' || style === 'standard' || style === 'industrial') &&
        (config.componentType === 'hull' || config.componentType === 'tower');
    const hasWindows = allowsWindows && rng.bool(knobs.windowChance);
    const windowColor =
        config.shipArchetype === 'passenger' || config.shipArchetype === 'science'
            ? CapitalShipWindowsGreebles.BLUE_LIGHT
            : CapitalShipWindowsGreebles.AMBER_LIGHT;

    const hasTrench = planTrench(config, style, knobs, rng);

    if (style !== 'trench') {
        const area = Math.max(0.5, config.xUnits * config.yUnits);
        layers.push({
            kind: 'panels',
            seed: nextSeed(),
            panelCount: Math.floor(Math.max(1, area * knobs.panelDensity)),
            showRivets:
                style === 'industrial' ||
                style === 'dense' ||
                (style === 'standard' && rng.bool(0.5))
        });
    }

    if (rng.bool(knobs.lightChance)) {
        const count = rng.intRange(knobs.lightRange[0], knobs.lightRange[1]);
        const colors = config.lightColors ?? [HSBAColor.fromRGBA(0, 255, 0)];
        if (emissivePlan) {
            const seeds = Array.from({ length: count }, nextSeed);
            layers.push({ kind: 'lightPanels', emissiveMode: 'separate', count, colors, seeds });
            emissivePlan.lightPanels = { seeds, colors };
        } else {
            layers.push({
                kind: 'lightPanels',
                emissiveMode: 'inline',
                count,
                colors,
                seed: nextSeed()
            });
        }
    }

    if (rng.bool(knobs.electronicsChance)) {
        const count = rng.intRange(knobs.electronicsRange[0], knobs.electronicsRange[1]);
        const seed = nextSeed();
        layers.push({ kind: 'electronics', seed, count });
        if (emissivePlan) {
            emissivePlan.occludersAfterLights.push({ kind: 'electronics', seed, count });
        }
    }

    if (hasWindows) {
        const count = rng.intRange(knobs.windowRange[0], knobs.windowRange[1]);
        if (emissivePlan) {
            const seeds = Array.from({ length: count }, nextSeed);
            layers.push({
                kind: 'windows',
                emissiveMode: 'separate',
                count,
                color: windowColor,
                seeds
            });
            const plan = { kind: 'windows' as const, seeds, color: windowColor };
            emissivePlan.windows = { seeds, color: windowColor };
            emissivePlan.occludersAfterLights.push(plan);
        } else {
            layers.push({
                kind: 'windows',
                emissiveMode: 'inline',
                count,
                color: windowColor,
                seed: nextSeed()
            });
        }
    }

    if (hasTrench) {
        const seed = nextSeed();
        layers.push({ kind: 'trench', seed, y: hasTrench.y, h: hasTrench.h });
        pushOccluder(emissivePlan, { kind: 'trench', seed, y: hasTrench.y, h: hasTrench.h }, [
            'lights',
            'windows'
        ]);
    }

    if (config.isTrunk && rng.bool(knobs.cutawayChance)) {
        const count = rng.intRange(1, 2);
        if (emissivePlan) {
            const seeds = Array.from({ length: count }, nextSeed);
            layers.push({ kind: 'cutaways', emissiveMode: 'separate', count, seeds });
            const plan = { kind: 'cutaways' as const, seeds };
            emissivePlan.cutaways = { seeds };
            pushOccluder(emissivePlan, plan, ['lights', 'windows']);
        } else {
            layers.push({
                kind: 'cutaways',
                emissiveMode: 'inline',
                count,
                seed: nextSeed()
            });
        }
    }

    if (rng.bool(knobs.equipChance)) {
        const count = rng.intRange(knobs.equipRange[0], knobs.equipRange[1]);
        const seed = nextSeed();
        layers.push({ kind: 'equipment', seed, count });
        pushOccluder(emissivePlan, { kind: 'equipment', seed, count }, ['lights', 'windows', 'cutaways']);
    }

    if (rng.bool(knobs.pipeChance)) {
        const count = rng.intRange(knobs.pipeRange[0], knobs.pipeRange[1]);
        const seed = nextSeed();
        layers.push({ kind: 'pipes', seed, count });
        pushOccluder(emissivePlan, { kind: 'pipes', seed, count }, ['lights', 'windows', 'cutaways']);
    }

    if (rng.bool(knobs.hoseChance)) {
        const count = rng.intRange(knobs.hoseRange[0], knobs.hoseRange[1]);
        const seed = nextSeed();
        layers.push({ kind: 'hoses', seed, count });
        pushOccluder(emissivePlan, { kind: 'hoses', seed, count }, ['lights', 'windows', 'cutaways']);
    }

    if (emissivePlan) {
        return { emissiveMode: 'separate', style, layers, emissivePlan };
    }
    return { emissiveMode: 'inline', style, layers };
}

function createNoiseSpecks(config: SurfaceLayerPlanConfig, rng: RNG): SurfaceNoiseSpeck[] {
    const count = Math.floor(config.xUnits * config.yUnits * 1000);
    const specks: SurfaceNoiseSpeck[] = [];

    for (let i = 0; i < count; i++) {
        specks.push({
            color: config.themeColor.adjustSaturation(rng.range(-0.05, 0.05)),
            w: rng.range(0.01, 0.03),
            h: rng.range(0.01, 0.03),
            x: rng.range(0, config.xUnits),
            y: rng.range(0, config.yUnits)
        });
    }

    return specks;
}

interface SurfaceStyleKnobs {
    panelDensity: number;
    pipeRange: [number, number];
    pipeChance: number;
    lightRange: [number, number];
    lightChance: number;
    equipRange: [number, number];
    equipChance: number;
    hoseRange: [number, number];
    hoseChance: number;
    electronicsRange: [number, number];
    electronicsChance: number;
    windowRange: [number, number];
    windowChance: number;
    trenchHeightRange: [number, number];
    trenchChance: number;
    cutawayChance: number;
}

function createStyleKnobs(config: SurfaceLayerPlanConfig, style: GreebleStyle): SurfaceStyleKnobs {
    const knobs: SurfaceStyleKnobs = {
        panelDensity: 8,
        pipeRange: [2, 5],
        pipeChance: 0.7,
        lightRange: [1, 3],
        lightChance: 0.6,
        equipRange: [1, 3],
        equipChance: 0.2,
        hoseRange: [1, 2],
        hoseChance: 0.1,
        electronicsRange: [1, 2],
        electronicsChance: 0.0,
        windowRange: [2, 6],
        windowChance: 0.0,
        trenchHeightRange: [30 / UNIT_SCALE, 60 / UNIT_SCALE],
        trenchChance: 0.1,
        cutawayChance: 0.05
    };

    switch (style) {
        case 'industrial':
            knobs.panelDensity = 15;
            knobs.pipeRange = [6, 12];
            knobs.pipeChance = 1.0;
            knobs.lightRange = [0, 1];
            knobs.lightChance = 0.3;
            knobs.equipChance = 0.1;
            knobs.hoseChance = 0.8;
            knobs.hoseRange = [2, 5];
            knobs.electronicsChance = 0.35;
            knobs.windowChance = 0.2;
            knobs.cutawayChance = 0.2;
            break;
        case 'standard':
            knobs.windowChance = 0.15;
            break;
        case 'tech':
            knobs.panelDensity = 5;
            knobs.pipeRange = [1, 3];
            knobs.pipeChance = 0.5;
            knobs.lightRange = [2, 5];
            knobs.lightChance = 0.8;
            knobs.equipRange = [5, 10];
            knobs.equipChance = 0.9;
            knobs.electronicsChance = 0.6;
            knobs.cutawayChance = 0.1;
            break;
        case 'clean':
            knobs.panelDensity = 4;
            knobs.pipeChance = 0.0;
            knobs.lightRange = [1, 2];
            knobs.lightChance = 0.4;
            knobs.equipChance = 0.0;
            knobs.hoseChance = 0.0;
            knobs.electronicsChance = 0.08;
            knobs.windowChance = 0.6;
            knobs.cutawayChance = 0.0;
            break;
        case 'dense':
            knobs.panelDensity = 20;
            knobs.pipeRange = [3, 8];
            knobs.pipeChance = 0.9;
            knobs.lightRange = [1, 4];
            knobs.lightChance = 0.5;
            knobs.equipRange = [2, 5];
            knobs.equipChance = 0.5;
            knobs.hoseChance = 0.6;
            knobs.electronicsChance = 0.2;
            knobs.cutawayChance = 0.1;
            break;
        case 'structure':
            knobs.panelDensity = 6;
            knobs.pipeChance = 0.0;
            knobs.lightChance = 0.0;
            knobs.equipChance = 0.0;
            knobs.hoseChance = 0.0;
            knobs.electronicsChance = 0.0;
            knobs.cutawayChance = 0.0;
            break;
        case 'trench':
            knobs.panelDensity = 0;
            knobs.pipeChance = 0.0;
            knobs.lightChance = 0.0;
            knobs.equipChance = 0.0;
            knobs.hoseChance = 0.0;
            knobs.electronicsChance = 0.0;
            knobs.trenchChance = 1.0;
            knobs.trenchHeightRange = [config.yUnits, config.yUnits];
            knobs.cutawayChance = 0.0;
            break;
        case 'unstyled':
            knobs.panelDensity = 0;
            knobs.pipeChance = 0.0;
            knobs.lightChance = 0.0;
            knobs.equipChance = 0.0;
            knobs.hoseChance = 0.0;
            knobs.electronicsChance = 0.0;
            knobs.windowChance = 0.0;
            knobs.trenchChance = 0.0;
            knobs.cutawayChance = 0.0;
            break;
    }

    const allowsElectronics =
        config.shipArchetype === 'science' ||
        config.shipArchetype === 'industry' ||
        config.shipArchetype === 'freight';

    if (!allowsElectronics) {
        knobs.electronicsChance = 0.0;
    }

    return knobs;
}

function planTrench(
    config: SurfaceLayerPlanConfig,
    style: GreebleStyle,
    knobs: SurfaceStyleKnobs,
    rng: RNG
): { y: number; h: number } | null {
    const isTrenchStyle = style === 'trench';
    const allowsTrench =
        isTrenchStyle ||
        (config.isTrunk &&
            config.shipArchetype !== 'passenger' &&
            config.yUnits * UNIT_SCALE > 150);

    if (!allowsTrench) return null;
    if (!isTrenchStyle && !rng.bool(knobs.trenchChance)) return null;

    if (isTrenchStyle) {
        return { y: 0, h: config.yUnits };
    }

    const maxHeight = Math.min(knobs.trenchHeightRange[1], config.yUnits);
    const minHeight = Math.min(knobs.trenchHeightRange[0], maxHeight);
    const h = minHeight === maxHeight ? minHeight : rng.range(minHeight, maxHeight);

    const minY = config.yUnits * 0.2;
    const maxY = Math.max(minY, config.yUnits * 0.8 - h);
    return { y: rng.range(minY, maxY), h };
}

function pushOccluder(
    emissivePlan: EmissivePlan | undefined,
    occluder: OccluderPlan,
    targets: Array<'lights' | 'windows' | 'cutaways'>
): void {
    if (!emissivePlan) return;
    if (targets.includes('lights')) emissivePlan.occludersAfterLights.push(occluder);
    if (targets.includes('windows')) emissivePlan.occludersAfterWindows.push(occluder);
    if (targets.includes('cutaways')) emissivePlan.occludersAfterCutaways.push(occluder);
}
