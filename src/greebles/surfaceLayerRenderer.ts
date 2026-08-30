import { RNG } from './common.js';
import { PanelGreebles } from './PanelGreebles.js';
import { PipeGreebles } from './PipeGreebles.js';
import { LightPanelGreebles } from './LightPanelGreebles.js';
import { EquipmentGreebles, EquipmentTrenchGreebles } from './EquipmentGreebles.js';
import { HoseGreebles } from './HoseGreebles.js';
import { ElectronicsPanelGreebles } from './ElectronicsPanelGreebles.js';
import { CapitalShipWindowsGreebles } from './CapitalShipWindowsGreebles.js';
import { CutawaySectionGreebles } from './CutawaySectionGreebles.js';
import type { SurfaceLayerPlan } from './surfaceLayerPlan.js';
import type { SurfaceLayerPlanConfig } from './surfaceLayerPlan.js';

export function drawSurfaceLayerPlan(
    context: CanvasRenderingContext2D,
    plan: SurfaceLayerPlan,
    config: SurfaceLayerPlanConfig
): void {
    context.save();

    for (const layer of plan.layers) {
        switch (layer.kind) {
            case 'baseFill':
                context.fillStyle = layer.color.toRGBAString();
                context.fillRect(0, 0, config.xUnits, config.yUnits);
                break;

            case 'noise':
                for (const speck of layer.specks) {
                    context.fillStyle = speck.color.toRGBAString();
                    context.fillRect(speck.x, speck.y, speck.w, speck.h);
                }
                break;

            case 'panels':
                new PanelGreebles(
                    config.xUnits,
                    config.yUnits,
                    config.themeColor,
                    layer.panelCount,
                    layer.showRivets,
                    config.skipBaseFill
                ).draw(context, new RNG(layer.seed));
                break;

            case 'lightPanels':
                if (layer.emissiveMode === 'separate') {
                    for (const seed of layer.seeds) {
                        new LightPanelGreebles(
                            config.xUnits,
                            config.yUnits,
                            config.themeColor,
                            1,
                            layer.colors
                        ).drawPanels(context, new RNG(seed));
                    }
                } else {
                    new LightPanelGreebles(
                        config.xUnits,
                        config.yUnits,
                        config.themeColor,
                        layer.count,
                        layer.colors
                    ).draw(context, new RNG(layer.seed));
                }
                break;

            case 'electronics':
                new ElectronicsPanelGreebles(
                    config.xUnits,
                    config.yUnits,
                    config.themeColor,
                    layer.count
                ).draw(context, new RNG(layer.seed));
                break;

            case 'windows':
                if (layer.emissiveMode === 'separate') {
                    for (const seed of layer.seeds) {
                        new CapitalShipWindowsGreebles(
                            config.xUnits,
                            config.yUnits,
                            config.themeColor,
                            1,
                            layer.color
                        ).drawPanels(context, new RNG(seed));
                    }
                } else {
                    new CapitalShipWindowsGreebles(
                        config.xUnits,
                        config.yUnits,
                        config.themeColor,
                        layer.count,
                        layer.color
                    ).draw(context, new RNG(layer.seed));
                }
                break;

            case 'trench':
                new EquipmentTrenchGreebles(
                    config.xUnits,
                    config.yUnits,
                    config.themeColor,
                    layer.y,
                    layer.h
                ).draw(context, new RNG(layer.seed));
                break;

            case 'cutaways':
                if (layer.emissiveMode === 'separate') {
                    for (const seed of layer.seeds) {
                        new CutawaySectionGreebles(
                            config.xUnits,
                            config.yUnits,
                            config.themeColor,
                            1
                        ).drawBase(context, new RNG(seed));
                    }
                } else {
                    new CutawaySectionGreebles(
                        config.xUnits,
                        config.yUnits,
                        config.themeColor,
                        layer.count
                    ).draw(context, new RNG(layer.seed));
                }
                break;

            case 'equipment':
                new EquipmentGreebles(
                    config.xUnits,
                    config.yUnits,
                    config.themeColor,
                    layer.count
                ).draw(context, new RNG(layer.seed));
                break;

            case 'pipes':
                new PipeGreebles(
                    config.xUnits,
                    config.yUnits,
                    config.themeColor,
                    layer.count
                ).draw(context, new RNG(layer.seed));
                break;

            case 'hoses':
                new HoseGreebles(
                    config.xUnits,
                    config.yUnits,
                    config.themeColor,
                    layer.count,
                    false
                ).draw(context, new RNG(layer.seed));
                break;
        }
    }

    context.restore();
}
