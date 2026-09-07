const shipPowerStates = new WeakMap<CanvasRenderingContext2D, boolean>();

/**
 * Runs a ship paint operation with its powered state bound to this canvas.
 * The binding is restored even when rendering throws, so nested draws cannot
 * leak their state into later ships.
 */
export function withShipPower<T>(
    context: CanvasRenderingContext2D,
    powered: boolean,
    callback: () => T
): T {
    const previous = shipPowerStates.get(context);
    shipPowerStates.set(context, powered);

    try {
        return callback();
    } finally {
        if (previous === undefined) {
            shipPowerStates.delete(context);
        } else {
            shipPowerStates.set(context, previous);
        }
    }
}

/** A canvas has normal ship power unless a surrounding ship draw disables it. */
export function isShipPowered(context: CanvasRenderingContext2D): boolean {
    return shipPowerStates.get(context) ?? true;
}
