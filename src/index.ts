import { createCanvas } from 'canvas';
import fs from 'fs';
import { RNG, HSBAColor, CapitalShipSurfaceGreebles, CapitalShipWindowsGreebles, EquipmentTrenchGreebles } from './greebler/index.js';
import { ShipShapeGenerator } from './ship-shape/index.js';

const { createWriteStream } = fs;

const WIDTH = 1350;
const HEIGHT = 450;
const SEED = Date.now();

const rng = new RNG(SEED);

function generateShip() {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    // 1. Generate Shape
    const shapeGen = new ShipShapeGenerator(WIDTH, HEIGHT, rng);
    const shapeData = shapeGen.generate(rng.intRange(5, 10));

    // 2. Render Texture
    const texCanvas = createCanvas(WIDTH, HEIGHT);
    const texCtx = texCanvas.getContext('2d') as unknown as CanvasRenderingContext2D;
    
    // Normalize Scale
    texCtx.save();
    texCtx.scale(HEIGHT, HEIGHT);
    
    const aspect = WIDTH / HEIGHT;
    const centerY = 0.5; // Normalized
    
    const theme = HSBAColor.fromRGBA(150, 155, 160);
    const darkTheme = theme.withBrightness(-0.2);
    
    // A. Top Half
    const topSurf = new CapitalShipSurfaceGreebles(aspect, centerY, theme, 'science', 'hull');
    topSurf.draw(texCtx, rng);
    
    const topWin = new CapitalShipWindowsGreebles(aspect, centerY, theme, 8);
    topWin.draw(texCtx, rng);
    
    // B. Bottom Half
    texCtx.save();
    texCtx.translate(0, centerY);
    const botSurf = new CapitalShipSurfaceGreebles(aspect, 0.5, darkTheme, 'science', 'hull');
    botSurf.draw(texCtx, rng);
    
    const botWin = new CapitalShipWindowsGreebles(aspect, 0.5, darkTheme, 6);
    botWin.draw(texCtx, rng);
    texCtx.restore();
    
    // C. Dividing Line
    texCtx.lineWidth = 0.01;
    texCtx.strokeStyle = theme.withBrightness(-0.3).toRGBAString();
    texCtx.beginPath();
    texCtx.moveTo(0, centerY);
    texCtx.lineTo(aspect, centerY);
    texCtx.stroke();
    
    // D. Trench
    const trenchH = rng.range(0.05, 0.15); // Normalized height
    const trenchY = rng.range(0.3, 0.7);
    
    const trench = new EquipmentTrenchGreebles(aspect, 1.0, theme, trenchY, trenchH * 10);
    trench.draw(texCtx, rng);
    
    texCtx.restore(); // Undo scale
    
    // 3. Masking on Main Canvas
    ctx.beginPath();
    const ptrs = shapeData.polyPoints;
    if (!ptrs || ptrs.length === 0) return;

    ctx.moveTo(ptrs[0].x, ptrs[0].y);
    for(let i=1; i<ptrs.length; i++) ctx.lineTo(ptrs[i].x, ptrs[i].y);
    ctx.closePath();
    ctx.clip();
    
    // Draw Texture
    ctx.drawImage(texCanvas, 0, 0);
    
    // 4. Outline
    ctx.strokeStyle = theme.withBrightness(0.3).toRGBAString();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ptrs[0].x, ptrs[0].y);
    for(let i=1; i<ptrs.length; i++) ctx.lineTo(ptrs[i].x, ptrs[i].y);
    ctx.closePath();
    ctx.stroke(); 
    
    // Save
    const out = createWriteStream('ship_ts.png');
    const stream = canvas.createPNGStream();
    (stream as any).pipe(out);
    out.on('finish', () => console.log('The PNG file was created.'));
}

generateShip();