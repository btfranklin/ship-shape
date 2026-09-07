/** Draw a dark opening with a narrow metal edge and no emitted light. */
export function drawDarkWindow(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
): void {
    context.save();
    context.shadowBlur = 0;
    context.fillStyle = '#080e14';
    context.fillRect(x, y, width, height);
    context.strokeStyle = '#39434b';
    context.lineWidth = Math.min(width, height) * 0.12;
    context.strokeRect(x, y, width, height);
    context.restore();
}
