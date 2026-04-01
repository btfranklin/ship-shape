import { HSBAColor, RNG } from '../src/greebles/common.js';
import { SteamEngineComponent } from '../src/railway/SteamEngineComponent.js';
import type { SteamEngineComponentType, WheelStyle } from '../src/railway/engineTypes.js';

interface TypeDef {
    type: SteamEngineComponentType;
    title: string;
    desc: string;
    details: string[];
    wheelStyle?: WheelStyle;
}

const types: TypeDef[] = [
    {
        type: 'boiler',
        title: 'Boiler',
        desc: 'Armored boiler jacket and central machinery body.',
        details: ['Long armored plating', 'Inspection access panels']
    },
    {
        type: 'firebox',
        title: 'Firebox',
        desc: 'Raised rear heat chamber behind the boiler.',
        details: ['Stepped roofline', 'Maintenance hatch detail']
    },
    {
        type: 'smokebox',
        title: 'Smokebox',
        desc: 'Armored front nose with lamp and smokestack mount.',
        details: ['Wedge-front silhouette', 'Forward vision slot']
    },
    {
        type: 'cab',
        title: 'Cab',
        desc: 'Crew compartment for driving and observation.',
        details: ['Vision slits', 'Side hatch door']
    },
    {
        type: 'tender',
        title: 'Tender',
        desc: 'Fuel and water carrier.',
        details: ['High bunker walls', 'Coal or cargo load']
    },
    {
        type: 'frame',
        title: 'Frame',
        desc: 'Undercarriage and suspension beam.',
        details: ['Armored wheel skirt', 'Axle box detail']
    },
    {
        type: 'casemate',
        title: 'Casemate Car Body',
        desc: 'Armored side body for escort, supply, or gun cars.',
        details: ['Sloped end armor', 'Vision slits and plate seams']
    },
    {
        type: 'cupola',
        title: 'Cupola',
        desc: 'Raised observation blister on escort cars.',
        details: ['Low armored roof', 'Twin viewing slits']
    },
    {
        type: 'turret',
        title: 'Turret',
        desc: 'Low rotating gun turret for armored cars.',
        details: ['Circular roof element', 'Compact armored profile']
    },
    {
        type: 'gun',
        title: 'Gun Barrel',
        desc: 'Short armored cannon used by gun and escort cars.',
        details: ['Forward projection', 'Heavy sleeve muzzle']
    },
    {
        type: 'coupler',
        title: 'Coupler',
        desc: 'Shared connection geometry between all rail vehicles.',
        details: ['Standardized height', 'Consistent consist alignment']
    },
    {
        type: 'cargo',
        title: 'Cargo Load',
        desc: 'Coal or deck cargo for tenders and support cars.',
        details: ['Irregular mound or crate mass', 'Muted dark material']
    },
    {
        type: 'chimney',
        title: 'Chimney',
        desc: 'Exhaust stack with flared mouth.',
        details: ['Tapered silhouette', 'Deep gradient shading']
    },
    {
        type: 'dome',
        title: 'Steam Dome',
        desc: 'Pressure cap with polished volume.',
        details: ['Hemispherical cap', 'Bright top highlight']
    },
    {
        type: 'lamp',
        title: 'Headlamp',
        desc: 'Forward light with glow.',
        details: ['Lens bloom', 'Metal housing']
    },
    {
        type: 'cowcatcher',
        title: 'Cowcatcher',
        desc: 'Front pilot deflector.',
        details: ['Angled slats', 'Riveted plates']
    },
    {
        type: 'wheel',
        title: 'Wheel (Spoked)',
        desc: 'Drive wheel with spokes.',
        details: ['Radial spokes', 'Rim shading'],
        wheelStyle: 'spoked'
    },
    {
        type: 'wheel',
        title: 'Wheel (Solid)',
        desc: 'Pressed wheel with heavy rim.',
        details: ['Solid plate', 'Deep rim shadow'],
        wheelStyle: 'solid'
    },
    {
        type: 'wheel',
        title: 'Wheel (Counterweight)',
        desc: 'Counterbalanced drive wheel.',
        details: ['Offset weight arc', 'Spoked core'],
        wheelStyle: 'counterweight'
    },
    {
        type: 'rod',
        title: 'Side Rod',
        desc: 'Connecting rod between drive wheels.',
        details: ['Bolted joints', 'Polished steel edge']
    }
];

const listDiv = document.getElementById('list') as HTMLDivElement;
const hueInput = document.getElementById('hueInput') as HTMLInputElement;
const refreshAllBtn = document.getElementById('refreshAllBtn') as HTMLButtonElement;

function buildElementSize(def: TypeDef) {
    let w = 200;
    let h = 120;

    switch (def.type) {
        case 'boiler':
            w = 230; h = 110;
            break;
        case 'firebox':
            w = 150; h = 120;
            break;
        case 'smokebox':
            w = 180; h = 95;
            break;
        case 'cab':
            w = 180; h = 140;
            break;
        case 'tender':
            w = 220; h = 120;
            break;
        case 'frame':
            w = 240; h = 60;
            break;
        case 'chimney':
            w = 70; h = 120;
            break;
        case 'dome':
            w = 90; h = 70;
            break;
        case 'lamp':
            w = 70; h = 70;
            break;
        case 'cowcatcher':
            w = 200; h = 90;
            break;
        case 'casemate':
            w = 240; h = 110;
            break;
        case 'cupola':
            w = 90; h = 50;
            break;
        case 'turret':
            w = 110; h = 54;
            break;
        case 'gun':
            w = 180; h = 24;
            break;
        case 'coupler':
            w = 90; h = 24;
            break;
        case 'cargo':
            w = 180; h = 70;
            break;
        case 'wheel':
            w = 140; h = 140;
            break;
        case 'rod':
            w = 200; h = 40;
            break;
        default:
            break;
    }

    return { w, h };
}

function render() {
    listDiv.innerHTML = '';
    const hue = parseInt(hueInput.value, 10) / 360;
    const theme = new HSBAColor(hue, 0.18, 0.55);

    types.forEach((def) => {
        const row = document.createElement('div');
        row.className = 'element-row';

        const info = document.createElement('div');
        info.className = 'element-info';
        info.innerHTML = `
            <h2>${def.title}</h2>
            <span class="tagline">${def.desc}</span>
            <ul class="detail-list">
                ${def.details.map((detail) => `<li>${detail}</li>`).join('')}
            </ul>
        `;

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
        btn.innerText = 'Regenerate';
        btn.style.padding = '5px 10px';
        btn.style.background = '#444';
        btn.style.color = '#fff';
        btn.style.border = '1px solid #555';
        btn.style.cursor = 'pointer';

        const draw = () => {
            ctx.save();
            ctx.clearRect(0, 0, 300, 200);
            ctx.fillStyle = '#111';
            ctx.fillRect(0, 0, 300, 200);

            const { w, h } = buildElementSize(def);
            const finalX = (300 - w) / 2;
            const finalY = (200 - h) / 2;

            const localRng = new RNG(Math.floor(Math.random() * 10000));

            const comp = new SteamEngineComponent(
                finalX,
                finalY,
                w,
                h,
                10,
                def.type,
                theme,
                { wheelStyle: def.wheelStyle }
            );

            comp.generateShape(localRng);
            comp.draw(ctx, localRng);

            ctx.restore();
        };

        btn.onclick = draw;

        draw();

        visual.appendChild(canvas);
        visual.appendChild(btn);
        row.appendChild(visual);
        row.appendChild(info);
        listDiv.appendChild(row);
    });
}

refreshAllBtn.addEventListener('click', render);
hueInput.addEventListener('change', render);
render();
