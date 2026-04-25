import { RNG } from '../greebles/common.js';
import type { SteamEngineComponent } from './SteamEngineComponent.js';
import { SteamEngineAccessoryPainter } from './SteamEngineAccessoryPainter.js';
import { SteamEngineBodyPainter } from './SteamEngineBodyPainter.js';
import { SteamEngineRunningGearPainter } from './SteamEngineRunningGearPainter.js';

export class SteamEngineComponentPainter {
    private accessoryPainter: SteamEngineAccessoryPainter;
    private bodyPainter: SteamEngineBodyPainter;
    private runningGearPainter: SteamEngineRunningGearPainter;

    constructor(private component: SteamEngineComponent) {
        this.accessoryPainter = new SteamEngineAccessoryPainter(component);
        this.bodyPainter = new SteamEngineBodyPainter(component);
        this.runningGearPainter = new SteamEngineRunningGearPainter(component);
    }

    draw(ctx: CanvasRenderingContext2D, rng: RNG) {
        switch (this.component.type) {
            case 'wheel':
                this.runningGearPainter.drawWheel(ctx, rng);
                break;
            case 'rod':
                this.runningGearPainter.drawRod(ctx);
                break;
            case 'lamp':
                this.accessoryPainter.drawLamp(ctx);
                break;
            case 'gun':
                this.accessoryPainter.drawGun(ctx);
                break;
            case 'coupler':
                this.accessoryPainter.drawCoupler(ctx);
                break;
            case 'cargo':
                this.accessoryPainter.drawCargo(ctx);
                break;
            case 'turret':
                this.accessoryPainter.drawTurret(ctx, rng);
                break;
            default:
                this.bodyPainter.draw(ctx, rng);
                break;
        }
    }
}
