import { HSBAColor, RNG } from '../src/greebles/common.js';
import { ShipComponent } from '../src/capitalships/ShipComponent.js';
import type { ShipComponentOptions } from '../src/capitalships/ShipComponent.js';
import { ShipArchetype } from '../src/capitalships/shipTypes.js';

type ComponentIdentity<Options extends ShipComponentOptions = ShipComponentOptions> =
    Options extends ShipComponentOptions ? Pick<Options, 'type' | 'variant'> : never;

type TypeDef = ComponentIdentity & {
    desc: string;
    greebles: string[];
    allowedArchetypes?: ShipArchetype[];
    orientation?: 'horizontal' | 'vertical';
};

const types: TypeDef[] = [
    {
        type: 'engine',
        desc: "Propulsion units. Blocky or tapered rear sections.",
        greebles: [
            "Visual Style: Standard (Cylinder), Radiator (Vented), or Energy (Core)",
            "Custom Render: Gradients & Rings/Glows (No standard panels)"
        ]
    },
    {
        type: 'hull',
        desc: "Main structural spine blocks. Rectangular or trapezoidal.",
        greebles: [
            "Style-driven: Clean adds windows + light panels, no pipes/hoses",
            "Extras: Electronics panels on Science/Industry/Freight",
            "Shapes: Rect, Chamfer, Cut-Corner (Original & Flipped)"
        ]
    },
    {
        type: 'sensor',
        desc: "Standard Sensor Platforms (Top/Bottom Mount).",
        greebles: [
            "Greebles: Dense details, lights, and equipment",
            "Science sensors skew tech-heavy",
            "Shapes: Taper-Top (Pyramid/Spire) or Cut-Corner"
        ]
    },
    {
        type: 'sensor',
        variant: 'front',
        desc: "Nose-mounted Sensor Arrays.",
        greebles: [
            "Geometry: Tapered forward",
            "Features: Forward-facing antennas"
        ]
    },
    {
        type: 'storage',
        desc: "Gas Storage (Standard Capsule).",
        greebles: [
            "Shape: Pill/Capsule",
            "Shading: Cylindrical Gradient (Vertical)"
        ],
        allowedArchetypes: ['freight', 'industry']
    },
    {
        type: 'storage',
        variant: 'liquid',
        desc: "Liquid Storage (Flatter ends).",
        greebles: [
            "Shape: Flattened Capsule",
            "Shading: Cylindrical Gradient (Vertical)"
        ],
        allowedArchetypes: ['freight', 'industry']
    },
    {
        type: 'storage',
        variant: 'goods',
        desc: "Goods Container (Rectangular).",
        greebles: [
            "Shape: Box/Crate",
            "Shading: Corrugated Metal"
        ],
        allowedArchetypes: ['freight', 'industry']
    },
    {
        type: 'storage',
        variant: 'goods',
        orientation: 'vertical',
        desc: "Goods Container (Vertical Rectangular).",
        greebles: [
            "Shape: Tall Box/Crate",
            "Shading: Corrugated Metal"
        ],
        allowedArchetypes: ['freight', 'industry']
    },
    {
        type: 'storage',
        orientation: 'vertical',
        desc: "Gas Storage (Vertical).",
        greebles: [
            "Shape: Pill/Capsule",
            "Shading: Cylindrical Gradient (Horizontal)"
        ],
        allowedArchetypes: ['freight', 'industry']
    },
    {
        type: 'storage',
        variant: 'liquid',
        orientation: 'vertical',
        desc: "Liquid Storage (Vertical Capsule, flatter ends).",
        greebles: [
            "Shape: Flattened Capsule",
            "Shading: Cylindrical Gradient (Horizontal)"
        ],
        allowedArchetypes: ['freight', 'industry']
    },
    {
        type: 'storage',
        variant: 'sphere',
        desc: "Gas Storage (Spherical Tanks).",
        greebles: [
            "Shape: Sphere tank",
            "Shading: Spherical highlight"
        ],
        allowedArchetypes: ['freight', 'industry']
    },
    {
        type: 'weapon',
        desc: "Side-View Turrets (Top/Bottom Mount).",
        greebles: [
            "Features: Rotatable barrels, connection base",
        ],
        allowedArchetypes: ['combat']
    },
    {
        type: 'weapon',
        variant: 'top-view',
        desc: "Top-View Turrets (Face Mount).",
        greebles: [
            "Features: Hex/Octagon shapes, centered barrels",
            "Placement: On top of hull sections"
        ],
        allowedArchetypes: ['combat']
    },
    {
        type: 'sphere',
        desc: "Spherical modules, often containing reactors or gravity drives.",
        greebles: [
            "Visual Style: Radial 3D Shading + Clipped Greebles",
            "Overlay: Lighting gradients to reinforce volume"
        ]
    },
    {
        type: 'ring',
        desc: "Large structural rings encircling the hull.",
        greebles: [
            "Visual Style: Cylindrical Gradient (Harsh shadows)",
            "Greebles: Panels only, with multiply blending"
        ],
        allowedArchetypes: ['science', 'passenger']
    },
    {
        type: 'trench',
        desc: "Recessed equatorial trench filled with heavy equipment.",
        greebles: [
            "Visual Style: Inset / recessed with panel-like shadowing",
            "Greebles: Dense equipment clutter, no panels"
        ]
    },
    {
        type: 'tower',
        desc: "Vertical observation or command spires.",
        greebles: [
            "Visual Style: Side-Lit (Shadow Right)",
            "Clean towers can include windows; tech towers possible on Science/Industry",
            "Shapes: Taper-Top (Spire) or Rect"
        ]
    }
];

const listDiv = document.getElementById('list') as HTMLDivElement;
const archetypeSelect = document.getElementById('archetypeSelect') as HTMLSelectElement;

function render() {
    listDiv.innerHTML = ''; // Clear list
    const theme = new HSBAColor(0.6, 0.1, 0.5); // Blue-ish default
    const selectedArchetype = archetypeSelect.value as ShipArchetype;
    
    types.forEach(def => {
        // Filter based on allowed archetypes
        if (def.allowedArchetypes && !def.allowedArchetypes.includes(selectedArchetype)) {
            return;
        }

        const row = document.createElement('div');
        row.className = 'element-row';
        
        // Info
        const info = document.createElement('div');
        info.className = 'element-info';
        info.innerHTML = `
            <h2>${def.type.toUpperCase()} ${def.variant ? '(' + def.variant + ')' : ''}${def.orientation === 'vertical' ? ' (vertical)' : ''}</h2>
            <span class="archetype">${def.desc}</span>
            <ul class="greeble-list">
                ${def.greebles.map(g => `<li>${g}</li>`).join('')}
            </ul>
        `;
        
        // Visual
        const visual = document.createElement('div');
        visual.className = 'element-visual';
        visual.style.display = 'flex';
        visual.style.flexDirection = 'column';
        visual.style.gap = '10px';
        
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 200;
        const ctx = canvas.getContext('2d')!;
        
        const btn = document.createElement('button');
        btn.innerText = "Regenerate";
        btn.style.padding = "5px 10px";
        btn.style.background = "#444";
        btn.style.color = "#fff";
        btn.style.border = "1px solid #555";
        btn.style.cursor = "pointer";
        
        // Draw Function
        const draw = () => {
            ctx.save();
            ctx.clearRect(0,0,300,200);
            ctx.fillStyle = '#111';
            ctx.fillRect(0,0,300,200); // Background
            
            // Base size
            let w = 200;
            let h = 120;
            
            // Sizing logic based on type
            if (def.type === 'sensor') {
                if (def.variant === 'front') {
                    w = 100;
                    h = 80;
                } else {
                    h *= 1.5;
                    w *= 0.6;
                }
            } else if (def.type === 'tower') {
                // Tall towers
                h *= 1.5;
                w *= 0.6;
            } else if (def.type === 'ring') {
                // Very tall, somewhat narrow
                h = 180;
                w = 60;
            } else if (def.type === 'sphere') {
                // Square aspect ratio
                const s = 140;
                w = s;
                h = s;
            } else if (def.type === 'trench') {
                // Wide and short
                w = 280;
                h = 40;
            } else if (def.type === 'weapon') {
                if (def.variant === 'top-view') {
                    w = 100; h = 100;
                } else {
                    // Side view turret
                    w = 120; h = 60;
                }
            } else if (def.type === 'storage') {
                if (def.variant === 'sphere') {
                    w = 140; h = 140;
                } else if (def.orientation === 'vertical') {
                    w = 80; h = 160;
                } else if (def.variant === 'goods') {
                    w = 160; h = 80;
                } else {
                    w = 180; h = 90;
                }
            }
            
            const finalX = (300 - w)/2;
            const finalY = (200 - h)/2;

            // New RNG every click
            const localRng = new RNG(Math.random() * 10000);
            
            // Update button text to indicate action
            btn.innerText = "Regenerate";
            
            // Randomly invert lighting for side items to show top/bottom mounting
            const invert = localRng.bool(); 
            
            const comp = new ShipComponent({
                ...def,
                bounds: { x: finalX, y: finalY, w, h },
                zIndex: 10,
                color: theme,
                rng: localRng,
                shipArchetype: selectedArchetype,
                invertLighting: invert,
            });
            comp.draw(ctx, localRng);
            
            ctx.restore();
        };
        
        btn.onclick = draw;
        
        // Initial Draw
        draw();
        
        visual.appendChild(canvas);
        visual.appendChild(btn);
        row.appendChild(visual);
        row.appendChild(info);
        listDiv.appendChild(row);
    });
}

archetypeSelect.addEventListener('change', render);
render();
