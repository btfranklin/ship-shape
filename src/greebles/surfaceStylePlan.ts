import { RNG } from './common.js';
import type { ComponentType, ShipArchetype } from '../shared/shipTypes.js';

export type GreebleStyle = 'standard' | 'industrial' | 'tech' | 'clean' | 'dense' | 'structure' | 'trench' | 'unstyled';

export function determineSurfaceStyle(
    shipArchetype: ShipArchetype,
    componentType: ComponentType,
    isTrunk: boolean,
    rng: RNG
): GreebleStyle {
    if (componentType === 'trench') return 'trench';
    if (componentType === 'sphere') return 'structure';
    if (
        componentType === 'engine' ||
        componentType === 'storage' ||
        componentType === 'sensor' ||
        componentType === 'weapon' ||
        componentType === 'ring'
    ) {
        return 'unstyled';
    }
    
    switch (shipArchetype) {
        case 'science':
            if (componentType === 'tower') return rng.bool(0.4) ? 'tech' : 'clean';
            if (componentType === 'hull') return rng.bool(0.7) ? 'clean' : 'standard';
            return 'clean';
            
        case 'industry':
            if (componentType === 'hull') return isTrunk ? 'industrial' : 'standard';
            if (componentType === 'tower') {
                if (rng.bool(0.25)) return 'tech';
                return rng.bool(0.4) ? 'clean' : 'standard';
            }
            return 'standard'; 
            
        case 'combat':
            if (componentType === 'hull') return rng.bool(0.6) ? 'dense' : 'standard'; 
            if (componentType === 'tower') return 'standard';
            return 'standard';
            
        case 'freight':
            if (componentType === 'hull') return rng.bool(0.4) ? 'clean' : 'standard';
            return 'standard';
            
        case 'passenger':
            if (componentType === 'hull') return 'clean';
            return 'clean';
            
        default:
            return 'standard';
    }
}
