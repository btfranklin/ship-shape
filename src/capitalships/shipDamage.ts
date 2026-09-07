import { getPath2D, RNG } from '../greebles/common.js';
import type { ShipBounds } from './ShipComponent.js';

interface Point { x: number; y: number }
interface DamageEdge {
    kind: 'cut' | 'hole';
    path: Path2D;
    edge: Point[];
    center: Point;
}

export interface ShipDamage extends DamageEdge {
    farHull: DamageEdge;
    machinery: DamageEdge;
}

function polygon(points: Point[]): Path2D {
    const Path = getPath2D();
    const path = new Path();
    path.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) path.lineTo(point.x, point.y);
    path.closePath();
    return path;
}

export function planShipDamage(bounds: ShipBounds, hulls: readonly ShipBounds[], rng: RNG, cutAway: number, cutFromRear = false): ShipDamage[] {
    const { x, y, w, h } = bounds;
    const damage: DamageEdge[] = [];
    // A torn end and enclosed breaches use the same edge treatment.
    if (cutAway > 0) {
        const cutX = x + w * (1 - cutAway);
        const slope = Math.tan(rng.range(15, 42) * Math.PI / 180) * (rng.bool() ? 1 : -1);
        const wander = Math.min(w * 0.07, h * 0.24);
        const offsets = Array.from({ length: 7 }, () => rng.range(-wander, wander));
        offsets[0] = offsets[6] = 0;
        const edge = Array.from({ length: 45 }, (_, i) => {
            const progress = i / 44;
            const py = y - h * 0.2 + h * 1.4 * progress;
            const segment = Math.min(5, Math.floor(progress * 6));
            const blend = progress * 6 - segment;
            const drift = offsets[segment] * (1 - blend) + offsets[segment + 1] * blend;
            return { x: cutX + (py - y - h / 2) * slope + drift + (i === 0 || i === 44 ? 0 : rng.range(-w * 0.012, w * 0.012)), y: py };
        });
        damage.push({
            kind: 'cut',
            edge,
            center: { x: x + w * 1.2, y: y + h / 2 },
            path: polygon([...edge, { x: x + w * 2, y: y + h * 2 }, { x: x + w * 2, y: y - h }])
        });
    }
    const targets = [...hulls].sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 4);
    for (let i = 0; i < 3; i++) {
        const target = targets[i % targets.length] ?? bounds;
        const center = {
            x: target.x + target.w * rng.range(0.2, 0.7),
            y: target.y + target.h * (i / 2 + rng.range(-0.06, 0.06))
        };
        const rx = Math.min(w * rng.range(0.045, 0.08), target.w * 0.35);
        const ry = Math.max(12, Math.min(h * 0.22, target.h * rng.range(0.32, 0.6)));
        const edge = Array.from({ length: 38 }, (_, j) => {
            const angle = j / 38 * Math.PI * 2;
            const radius = rng.range(0.7, 1.2);
            return { x: center.x + Math.cos(angle) * rx * radius, y: center.y + Math.sin(angle) * ry * radius };
        });
        damage.push({ kind: 'hole', path: polygon(edge), edge: [...edge, edge[0]], center });
    }
    return damage.map(breach => {
        // A broad offset makes some cuts pass diagonally through the ship's depth.
        // Other seeds keep a shallow break or reverse which skin extends further.
        const deepCut = breach.kind === 'cut' && rng.bool(0.7);
        const depth = deepCut
            ? bounds.w * rng.range(0.08, 0.18) * (rng.bool(0.8) ? 1 : -1)
            : 18;
        const middleDepth = deepCut ? depth * rng.range(0.35, 0.65) : 9;
        const planned = {
            ...breach,
            farHull: offsetDamageEdge(breach, bounds, rng, depth),
            machinery: offsetDamageEdge(breach, bounds, rng, middleDepth)
        };
        if (!cutFromRear || breach.kind !== 'cut') return planned;
        return {
            ...mirrorCut(planned, bounds),
            farHull: mirrorCut(planned.farHull, bounds),
            machinery: mirrorCut(planned.machinery, bounds)
        };
    });
}

/** Reverse the cut and its depth layers without moving the hull holes. */
function mirrorCut(breach: DamageEdge, bounds: ShipBounds): DamageEdge {
    const mirror = (point: Point): Point => ({ x: bounds.x * 2 + bounds.w - point.x, y: point.y });
    const edge = breach.edge.map(mirror);
    const path = polygon([
        ...edge,
        { x: bounds.x - bounds.w, y: bounds.y + bounds.h * 2 },
        { x: bounds.x - bounds.w, y: bounds.y - bounds.h }
    ]);
    return { kind: breach.kind, edge, path, center: mirror(breach.center) };
}

function offsetDamageEdge(breach: DamageEdge, bounds: ShipBounds, rng: RNG, depth: number): DamageEdge {
    const phase = rng.range(0, Math.PI * 2);
    const scale = Math.min(1, bounds.h / 180, bounds.w / 700);
    const edge = breach.edge.map((point, i) => {
        const dx = breach.kind === 'cut' ? 1 : breach.center.x - point.x;
        const dy = breach.kind === 'cut' ? 0 : breach.center.y - point.y;
        const length = Math.hypot(dx, dy) || 1;
        const offset = scale * (depth + Math.sin(i * 0.65 + phase) * 28 + rng.range(-14, 14));
        return { x: point.x + dx / length * offset, y: point.y + dy / length * offset };
    });
    if (breach.kind === 'hole') edge[edge.length - 1] = edge[0];
    const closing = breach.kind === 'cut' ? [
        { x: bounds.x + bounds.w * 2, y: bounds.y + bounds.h * 2 },
        { x: bounds.x + bounds.w * 2, y: bounds.y - bounds.h }
    ] : [];
    return { ...breach, edge, path: polygon([...edge, ...closing]) };
}

/** Paint the far skin and broken interior before the facing hull covers them. */
export function drawDamageInterior(ctx: CanvasRenderingContext2D, damage: readonly ShipDamage[], silhouette: Path2D, bounds: ShipBounds, rng: RNG): void {
    const farHull = damage.map(breach => breach.farHull);
    const machinery = damage.map(breach => breach.machinery);
    ctx.save();
    ctx.save();
    ctx.clip(silhouette);
    clipOutsideDamage(ctx, farHull, bounds);
    const shade = ctx.createLinearGradient(0, bounds.y, 0, bounds.y + bounds.h);
    shade.addColorStop(0, '#444950');
    shade.addColorStop(0.5, '#292e35');
    shade.addColorStop(1, '#15191e');
    ctx.fillStyle = shade;
    ctx.fill(silhouette);
    ctx.strokeStyle = '#141a20';
    ctx.lineWidth = 2;
    for (let x = bounds.x; x < bounds.x + bounds.w; x += 27) {
        ctx.beginPath();
        ctx.moveTo(x, bounds.y);
        ctx.lineTo(x + 18, bounds.y + bounds.h);
        ctx.stroke();
    }
    ctx.restore();
    drawDamageEdges(ctx, farHull, silhouette, bounds, rng, true);

    ctx.save();
    ctx.clip(silhouette);
    clipOutsideDamage(ctx, machinery, bounds);
    // Open framing leaves gaps through which the far skin remains visible.
    for (let x = bounds.x; x < bounds.x + bounds.w; x += rng.range(20, 36)) {
        ctx.beginPath();
        ctx.moveTo(x, bounds.y);
        ctx.lineTo(x + rng.range(-22, 22), bounds.y + bounds.h);
        ctx.strokeStyle = '#11171b';
        ctx.lineWidth = 9;
        ctx.stroke();
        ctx.strokeStyle = '#62625b';
        ctx.lineWidth = 3;
        ctx.stroke();
        const y = bounds.y + rng.range(0.15, 0.85) * bounds.h;
        ctx.fillStyle = '#373e40';
        ctx.fillRect(x - 5, y, 16, 24);
        ctx.strokeStyle = '#77756a';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 5, y, 16, 24);
    }
    for (let y = bounds.y + 12; y < bounds.y + bounds.h; y += 31) {
        ctx.beginPath();
        ctx.moveTo(bounds.x, y);
        ctx.lineTo(bounds.x + bounds.w, y + rng.range(-15, 15));
        ctx.strokeStyle = '#242c30';
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.strokeStyle = '#777369';
        ctx.lineWidth = 1.2;
        ctx.stroke();
    }
    ctx.restore();
    drawDamageEdges(ctx, machinery, silhouette, bounds, rng, true);
    ctx.restore();
}

export function clipOutsideDamage(ctx: CanvasRenderingContext2D, damage: readonly DamageEdge[], bounds: ShipBounds): void {
    const Path = getPath2D();
    for (const breach of damage) {
        const outside = new Path();
        outside.rect(bounds.x - bounds.w * 3, bounds.y - bounds.h * 3, bounds.w * 7, bounds.h * 7);
        outside.addPath(breach.path);
        ctx.clip(outside, 'evenodd');
    }
}

export function drawDamageEdges(ctx: CanvasRenderingContext2D, damage: readonly DamageEdge[], silhouette: Path2D, bounds: ShipBounds, rng: RNG, recessed = false): void {
    for (const breach of damage) {
        ctx.save();
        // Clip each edge against the other holes so overlapping damage stays open.
        clipOutsideDamage(ctx, damage.filter(other => other !== breach), bounds);
        ctx.save();
        ctx.clip(silhouette);
        ctx.strokeStyle = '#171819';
        ctx.lineWidth = 12;
        ctx.stroke(breach.path);
        ctx.strokeStyle = '#55514a';
        ctx.lineWidth = 3;
        ctx.stroke(breach.path);
        ctx.strokeStyle = recessed ? '#555c61' : '#93918a';
        ctx.lineWidth = 0.8;
        ctx.stroke(breach.path);
        ctx.restore();
        // Only the roots must touch the old hull. Bent fragments can extend beyond it.
        const fragmentScale = Math.min(1, bounds.w / 500, bounds.h / 140);
        for (let i = 1; i < breach.edge.length; i++) {
            const anchor = breach.edge[i];
            const previous = breach.edge[i - 1];
            const transform = ctx.getTransform();
            const px = transform.a * anchor.x + transform.c * anchor.y + transform.e;
            const py = transform.b * anchor.x + transform.d * anchor.y + transform.f;
            if (!ctx.isPointInPath(silhouette, px, py)) continue;
            const dx = breach.center.x - anchor.x;
            const dy = breach.center.y - anchor.y;
            const distance = Math.hypot(dx, dy) || 1;
            const reach = rng.range(8, Math.min(48, distance * 0.65) + 8) * fragmentScale;
            const twist = rng.range(-15, 15) * fragmentScale;
            const angle = Math.atan2(dy, dx) + rng.range(-1.15, 1.15);
            const ux = Math.cos(angle);
            const uy = Math.sin(angle);
            const tip = { x: anchor.x + ux * reach, y: anchor.y + uy * reach };
            const bend = { x: (anchor.x + tip.x) / 2 - uy * twist, y: (anchor.y + tip.y) / 2 + ux * twist };
            const rootLength = Math.hypot(previous.x - anchor.x, previous.y - anchor.y) || 1;
            const rootScale = Math.min(1, 20 * fragmentScale / rootLength);
            const root = { x: anchor.x + (previous.x - anchor.x) * rootScale, y: anchor.y + (previous.y - anchor.y) * rootScale };
            // Folded sheet fragments alternate with narrow structural beams.
            if (rng.bool(0.38)) {
                ctx.beginPath();
                ctx.moveTo(root.x, root.y);
                ctx.lineTo(anchor.x, anchor.y);
                ctx.lineTo(tip.x, tip.y);
                ctx.lineTo(bend.x, bend.y);
                ctx.closePath();
                ctx.fillStyle = rng.choice(recessed ? ['#292f36', '#3d454b', '#343a3b'] : ['#4b4d4e', '#696760', '#353a3d']);
                ctx.fill();
                ctx.strokeStyle = recessed ? '#515b63' : '#8c8980';
                ctx.lineWidth = 0.7;
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(anchor.x, anchor.y);
                ctx.lineTo(bend.x, bend.y);
                ctx.lineTo(tip.x, tip.y);
                ctx.strokeStyle = '#222629';
                ctx.lineWidth = rng.range(2, 5);
                ctx.stroke();
                ctx.strokeStyle = recessed ? '#586269' : '#858782';
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.moveTo(anchor.x, anchor.y);
            ctx.bezierCurveTo(bend.x + twist, bend.y + 12 * fragmentScale, tip.x - twist, tip.y + 18 * fragmentScale, tip.x + twist, tip.y + rng.range(8, 24) * fragmentScale);
            ctx.strokeStyle = rng.choice(['#777268', '#4b5358', '#8a7760']);
            ctx.lineWidth = rng.range(0.5, 1.1);
            ctx.stroke();
        }
        ctx.restore();
    }
}
