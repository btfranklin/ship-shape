export class SteamEnginePaintPrimitives {
    drawPlateBand(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, rivets: boolean) {
        ctx.strokeStyle = 'rgba(30,24,20,0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + h);
        ctx.stroke();

        if (rivets) {
            this.drawRivetRow(ctx, x - 1, y + h * 0.08, x - 1, y + h * 0.92, Math.max(4, Math.round(h / 24)));
            this.drawRivetRow(ctx, x + 1, y + h * 0.08, x + 1, y + h * 0.92, Math.max(4, Math.round(h / 24)));
        }
    }

    drawHorizontalSeam(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number) {
        ctx.strokeStyle = 'rgba(30,24,20,0.65)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
        this.drawRivetRow(ctx, x1, y - 2, x2, y - 2, Math.max(4, Math.round((x2 - x1) / 28)));
    }

    drawVisionSlot(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
        ctx.fillStyle = 'rgba(15,14,12,0.92)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(210,192,164,0.2)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(x, y, w, h);
    }

    drawInspectionDoor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
        ctx.strokeStyle = 'rgba(34,28,24,0.82)';
        ctx.lineWidth = 1.1;
        ctx.strokeRect(x, y, w, h);
        this.drawRivetRow(ctx, x + w * 0.16, y, x + w * 0.16, y + h, 4);
        this.drawRivetRow(ctx, x + w * 0.84, y, x + w * 0.84, y + h, 4);
    }

    drawRivetRow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, count: number) {
        ctx.fillStyle = 'rgba(238,220,180,0.22)';
        for (let i = 0; i <= count; i++) {
            const t = i / Math.max(1, count);
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            ctx.beginPath();
            ctx.arc(x, y, 1.1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawArmorChevron(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
        ctx.strokeStyle = 'rgba(36,28,24,0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h * 0.5);
        ctx.lineTo(x, y + h);
        ctx.stroke();
    }
}
