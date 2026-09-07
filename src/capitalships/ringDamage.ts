import { getPath2D, RNG } from '../greebles/common.js';
import type { ShipBounds, ShipComponent } from './ShipComponent.js';
import { clipOutsideDamage, drawDamageEdges, type ShipDamage } from './shipDamage.js';

interface RingDamage {
    kind: 'hole';
    path: Path2D;
    edge: { x: number; y: number }[];
    center: { x: number; y: number };
}

type SupportHull = { shapePath: Path2D; bounds: Readonly<ShipBounds> };

function hasRingSupport(ctx: CanvasRenderingContext2D, ring: Pick<ShipComponent, 'bounds' | 'shapePath'>, supportHulls: readonly SupportHull[], damage: readonly ShipDamage[]): boolean {
    const transform = ctx.getTransform();
    const contains = (path: Path2D, x: number, y: number): boolean => ctx.isPointInPath(
        path,
        transform.a * x + transform.c * y + transform.e,
        transform.b * x + transform.d * y + transform.f
    );
    const { x, y, w, h } = ring.bounds;
    const layers = [damage, damage.map(breach => breach.farHull), damage.map(breach => breach.machinery)];
    let supported = false;
    for (const hull of supportHulls) {
        const left = Math.max(x, hull.bounds.x);
        const right = Math.min(x + w, hull.bounds.x + hull.bounds.w);
        const top = Math.max(y, hull.bounds.y);
        const bottom = Math.min(y + h, hull.bounds.y + hull.bounds.h);
        if (left >= right || top >= bottom) continue;
        for (let column = 0; column < 5 && !supported; column++) {
            const px = left + (right - left) * (column + 0.5) / 5;
            for (let row = 0; row < 65; row++) {
                const py = top + (bottom - top) * (row + 0.5) / 65;
                if (contains(ring.shapePath, px, py) && contains(hull.shapePath, px, py)
                    && layers.some(layer => layer.every(breach => !contains(breach.path, px, py)))) {
                    supported = true;
                    break;
                }
            }
        }
        if (supported) break;
    }
    return supported;

}

/** Return null when no part of the ring's hull attachment remains. */
export function planRingDamage(ctx: CanvasRenderingContext2D, ring: Pick<ShipComponent, 'bounds' | 'shapePath'>, supportHulls: readonly SupportHull[], damage: readonly ShipDamage[], rng: RNG): RingDamage[] | null {
    if (!hasRingSupport(ctx, ring, supportHulls, damage)) return null;
    const transform = ctx.getTransform();
    const contains = (path: Path2D, x: number, y: number): boolean => ctx.isPointInPath(
        path,
        transform.a * x + transform.c * y + transform.e,
        transform.b * x + transform.d * y + transform.f
    );
    const { x, y, w, h } = ring.bounds;
    const gaps: RingDamage[] = [];
    const margin = Math.max(w * 1.5, h * 0.035);
    for (const breach of damage) {
        // Find the affected ring sector. The hull mask never cuts the ring directly.
        const candidates: number[] = [];
        for (let row = 0; row < 41; row++) {
            const py = y + h * (row + 0.5) / 41;
            if ([-margin, w / 2, w + margin].some(offset => contains(breach.path, x + offset, py))) candidates.push(py);
        }
        for (const point of breach.edge) {
            if (point.x >= x - margin && point.x <= x + w + margin && point.y >= y && point.y <= y + h) candidates.push(point.y);
        }
        if (candidates.length === 0) continue;
        const centerY = rng.choice(candidates);
        if (gaps.some(gap => Math.abs(gap.center.y - centerY) < h * 0.13)) continue;
        const center = { x: x + w * rng.range(0.3, 0.7), y: centerY };
        // Most breaks cross the band. Smaller punctures leave a strip attached.
        const rx = w * rng.range(0.65, 1.15);
        const ry = Math.max(w * 0.8, h * rng.range(0.035, 0.085));
        const lean = rng.range(-0.5, 0.5);
        const edge = Array.from({ length: 32 }, (_, i) => {
            const angle = i / 32 * Math.PI * 2;
            const radius = rng.range(0.82, 1.18);
            const dx = Math.cos(angle) * rx * radius;
            return { x: center.x + dx, y: center.y + Math.sin(angle) * ry * radius + dx * lean };
        });
        const Path = getPath2D();
        const path = new Path();
        path.moveTo(edge[0].x, edge[0].y);
        for (const point of edge.slice(1)) path.lineTo(point.x, point.y);
        path.closePath();
        gaps.push({ kind: 'hole', path, edge: [...edge, edge[0]], center });
        if (gaps.length === 3) break;
    }
    return gaps;
}

/** Draw the continuous far side behind the hull and all front damage. */
export function drawRingBacks(ctx: CanvasRenderingContext2D, rings: readonly ShipComponent[], supportHulls: readonly SupportHull[], damage: readonly ShipDamage[], renderRng: RNG): void {
    for (const ring of rings) {
        if (!hasRingSupport(ctx, ring, supportHulls, damage)) continue;
        ctx.save();
        try {
            ring.draw(ctx, renderRng);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.fill(ring.shapePath);
        } finally {
            ctx.restore();
        }
    }
}

export function drawDamagedRings(ctx: CanvasRenderingContext2D, rings: readonly ShipComponent[], supportHulls: readonly SupportHull[], damage: readonly ShipDamage[], bounds: ShipBounds, damageRng: RNG, renderRng: RNG): void {
    for (const ring of rings) {
        const gaps = planRingDamage(ctx, ring, supportHulls, damage, damageRng);
        if (gaps === null) continue;
        ctx.save();
        try {
            clipOutsideDamage(ctx, gaps, bounds);
            ring.draw(ctx, renderRng);
        } finally {
            ctx.restore();
        }
        // Use the ring as the fragment root, but let bent metal leave its outline.
        const fragmentBounds = {
            ...ring.bounds,
            w: Math.max(160, ring.bounds.w * 8),
            h: Math.max(70, ring.bounds.h)
        };
        drawDamageEdges(ctx, gaps, ring.shapePath, fragmentBounds, damageRng);
    }
}
