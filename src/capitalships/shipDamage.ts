import { getPath2D, RNG } from '../greebles/common.js';
import type { ShipBounds } from './ShipComponent.js';

interface Point { x: number; y: number }
export interface ShipDamage {
    path: Path2D;
    edge: Point[];
    center: Point;
}

function polygon(points: Point[]): Path2D {
    const Path = getPath2D();
    const path = new Path();
    path.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) path.lineTo(point.x, point.y);
    path.closePath();
    return path;
}

export function planShipDamage(bounds: ShipBounds, hulls: readonly ShipBounds[], rng: RNG, cutAway: number): ShipDamage[] {
    const { x, y, w, h } = bounds;
    const damage: ShipDamage[] = [];
    // A torn end and enclosed breaches use the same edge treatment.
    if (cutAway > 0) {
        const cutX = x + w * (1 - cutAway);
        const slope = rng.range(-0.18, 0.18);
        const edge = Array.from({ length: 45 }, (_, i) => {
            const py = y - h * 0.2 + h * 1.4 * i / 44;
            return { x: cutX + (py - y - h / 2) * slope + rng.range(-w * 0.025, w * 0.025), y: py };
        });
        damage.push({
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
        damage.push({ path: polygon(edge), edge: [...edge, edge[0]], center });
    }
    return damage;
}

export function clipOutsideDamage(ctx: CanvasRenderingContext2D, damage: readonly ShipDamage[], bounds: ShipBounds): void {
    const Path = getPath2D();
    for (const breach of damage) {
        const outside = new Path();
        outside.rect(bounds.x - bounds.w * 3, bounds.y - bounds.h * 3, bounds.w * 7, bounds.h * 7);
        outside.addPath(breach.path);
        ctx.clip(outside, 'evenodd');
    }
}

export function drawDamageEdges(ctx: CanvasRenderingContext2D, damage: readonly ShipDamage[], silhouette: Path2D, bounds: ShipBounds, rng: RNG): void {
    for (const breach of damage) {
        ctx.save();
        ctx.clip(silhouette);
        // Clip each edge against the other holes so overlapping damage stays open.
        clipOutsideDamage(ctx, damage.filter(other => other !== breach), bounds);
        ctx.strokeStyle = '#171819';
        ctx.lineWidth = 12;
        ctx.stroke(breach.path);
        ctx.strokeStyle = '#55514a';
        ctx.lineWidth = 3;
        ctx.stroke(breach.path);
        ctx.strokeStyle = '#93918a';
        ctx.lineWidth = 0.8;
        ctx.stroke(breach.path);
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
            const reach = rng.range(8, Math.min(48, distance * 0.65) + 8);
            const twist = rng.range(-15, 15);
            const tip = { x: anchor.x + dx / distance * reach, y: anchor.y + dy / distance * reach };
            const bend = { x: (anchor.x + tip.x) / 2 - dy / distance * twist, y: (anchor.y + tip.y) / 2 + dx / distance * twist };
            // Folded sheet fragments alternate with narrow structural beams.
            if (rng.bool(0.38)) {
                ctx.beginPath();
                ctx.moveTo(previous.x, previous.y);
                ctx.lineTo(anchor.x, anchor.y);
                ctx.lineTo(tip.x, tip.y);
                ctx.lineTo(bend.x, bend.y);
                ctx.closePath();
                ctx.fillStyle = rng.choice(['#4b4d4e', '#696760', '#353a3d']);
                ctx.fill();
                ctx.strokeStyle = '#8c8980';
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
                ctx.strokeStyle = '#858782';
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.moveTo(anchor.x, anchor.y);
            ctx.bezierCurveTo(bend.x + twist, bend.y + 12, tip.x - twist, tip.y + 18, tip.x + twist, tip.y + rng.range(8, 24));
            ctx.strokeStyle = rng.choice(['#777268', '#4b5358', '#8a7760']);
            ctx.lineWidth = rng.range(0.5, 1.1);
            ctx.stroke();
        }
        ctx.restore();
    }
}
