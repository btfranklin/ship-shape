import { ShipComponent } from './ShipComponent.js';

export interface ShipNode {
    component: ShipComponent;
    children: ShipNode[];
}
