import { HSBAColor, RNG } from '../src/greebler/common';
import { ShipComponent, ComponentType } from '../src/ship-shape/ShipComponent';

// Definition of Types
const types: { type: ComponentType, desc: string, greebles: string[] }[] = [
    {
        type: 'engine',
        desc: "Propulsion units. Blocky or tapered rear sections.",
        greebles: [
            "Archetype: Industrial",
            "Visual Style: Standard (Cylinder), Radiator (Vented), or Energy (Core)",
            "Custom Render: Gradients & Rings/Glows (No standard panels)"
        ]
    },
    {
        type: 'hull',
        desc: "Main structural spine blocks. Rectangular or trapezoidal.",
        greebles: [
            "Archetype: Standard",
            "Greebles: Balanced mix of Panels, Pipes, and small Vents",
            "Shapes: Rect, Chamfer, Taper-Front, Cut-Corner"
        ]
    },
    {
        type: 'superstructure',
        desc: "Decks, platforms, and command towers.",
        greebles: [
            "Archetype: Tech",
            "Greebles: High density of Lights, Wires, and Antennas",
            "Shapes: Taper-Front (Deck) or Taper-Top (Tower)"
        ]
    },
    {
        type: 'sensor',
        desc: "Dedicated sensor arrays and comms spires.",
        greebles: [
            "Archetype: Tech",
            "Greebles: Dense small details, exposed wiring",
            "Shapes: Taper-Top (Pyramid/Spire) or Cut-Corner"
        ]
    },
    {
        type: 'tank',
        desc: "Fuel or cargo storage pods.",
        greebles: [
            "Archetype: Clean",
            "Greebles: Minimal. Mostly smooth plating.",
            "Shapes: Chamfer (Capsule-like)"
        ]
    },
    {
        type: 'weapon',
        desc: "Turrets or heavy batteries (Not fully implemented in generator yet).",
        greebles: [
            "Archetype: Dense",
            "Greebles: Heavy pipes, vents, reinforcement",
        ]
    }
];

const listDiv = document.getElementById('list') as HTMLDivElement;

function render() {
    const rng = new RNG(123); // Fixed seed for consistent showcase
    const theme = new HSBAColor(0.6, 0.1, 0.5); // Blue-ish default
    
    types.forEach(def => {
        const row = document.createElement('div');
        row.className = 'element-row';
        
        // Info
        const info = document.createElement('div');
        info.className = 'element-info';
        info.innerHTML = `
            <h2>${def.type.toUpperCase()}</h2>
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
            
            // Create a dummy component centered in the canvas
            const w = 200;
            const h = 120;
            
            // For towers, make them tall
            const hMod = (def.type === 'sensor' || def.type === 'superstructure') ? 1.5 : 1.0;
            const wMod = (def.type === 'sensor') ? 0.5 : 1.0;
            
            const finalW = w * wMod;
            const finalH = h * hMod;
            const finalX = (300 - finalW)/2;
            const finalY = (200 - finalH)/2;

            // New RNG every click
            const localRng = new RNG(Math.random() * 10000);
            
            const comp = new ShipComponent(finalX, finalY, finalW, finalH, 10, def.type, theme);
            comp.generateShape(localRng);
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

render();
