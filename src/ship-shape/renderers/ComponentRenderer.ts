import { RNG } from '../../greebler/common.js';
import { ShipComponent } from '../ShipComponent.js';

export interface ComponentRenderer {
    draw(ctx: CanvasRenderingContext2D, component: ShipComponent, rng: RNG): void;
    generateShape(component: ShipComponent, rng: RNG): void;
}
