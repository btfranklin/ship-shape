export class FakePath2D {
  constructor(_path?: unknown) {}
  addPath(_path: unknown) {}
  arc(_x: number, _y: number, _r: number, _s: number, _e: number, _ccw?: boolean) {}
  bezierCurveTo(
    _cp1x: number,
    _cp1y: number,
    _cp2x: number,
    _cp2y: number,
    _x: number,
    _y: number
  ) {}
  closePath() {}
  ellipse(
    _x: number,
    _y: number,
    _rx: number,
    _ry: number,
    _rotation: number,
    _s: number,
    _e: number,
    _ccw?: boolean
  ) {}
  lineTo(_x: number, _y: number) {}
  moveTo(_x: number, _y: number) {}
  quadraticCurveTo(_cpx: number, _cpy: number, _x: number, _y: number) {}
  rect(_x: number, _y: number, _w: number, _h: number) {}
}

class FakeGradient {
  addColorStop(_offset: number, _color: string) {}
}

const fakeGradient = new FakeGradient();
const fakeCanvasSizes: Array<{ width: number; height: number }> = [];
const compositeOperations: string[] = [];

export function resetCanvasObservations(): void {
  fakeCanvasSizes.length = 0;
  compositeOperations.length = 0;
}

export function getCanvasObservations(): {
  sizes: Array<{ width: number; height: number }>;
  compositeOperations: string[];
} {
  return {
    sizes: [...fakeCanvasSizes],
    compositeOperations: [...compositeOperations],
  };
}

export interface TestContextCall {
  name: string;
  args: unknown[];
}

interface TestContextOptions {
  calls?: TestContextCall[];
  canvas?: FakeCanvas;
  withCanvas?: boolean;
  withTransform?: boolean;
}

class FakeCanvas {
  constructor(
    public width: number = 300,
    public height: number = 150
  ) {
    fakeCanvasSizes.push({ width, height });
  }

  getContext(_contextId: '2d') {
    return createTestContext({
      canvas: this,
      withTransform: true,
    });
  }
}

export function createTestContext(options: TestContextOptions = {}): CanvasRenderingContext2D {
  const calls = options.calls ?? [];
  const canvas = options.canvas ?? (options.withCanvas ? new FakeCanvas() : undefined);
  const ctx = {
    canvas,

    // State
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: 'butt',
    lineJoin: 'miter',
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    globalAlpha: 1,

    // Stack
    save() {},
    restore() {},

    // Transforms
    translate(_x: number, _y: number) {},
    scale(_x: number, _y: number) {},
    rotate(_angle: number) {},
    resetTransform() {
      calls.push({ name: 'resetTransform', args: [] });
    },
    setTransform(...args: unknown[]) {
      calls.push({ name: 'setTransform', args });
    },
    getTransform: options.withTransform
      ? () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
      : undefined,

    // Paths
    beginPath() {},
    closePath() {},
    moveTo(_x: number, _y: number) {},
    lineTo(_x: number, _y: number) {},
    quadraticCurveTo(_cpx: number, _cpy: number, _x: number, _y: number) {},
    rect(_x: number, _y: number, _w: number, _h: number) {},
    arc(
      _x: number,
      _y: number,
      _r: number,
      _sAngle: number,
      _eAngle: number,
      _ccw?: boolean
    ) {},
    ellipse(
      _x: number,
      _y: number,
      _rx: number,
      _ry: number,
      _rotation: number,
      _s: number,
      _e: number,
      _ccw?: boolean
    ) {},
    clip(_path?: unknown, _fillRule?: CanvasFillRule) {},

    // Drawing
    fill(_path?: unknown, _fillRule?: CanvasFillRule) {},
    stroke(_path?: unknown) {},
    fillRect(_x: number, _y: number, _w: number, _h: number) {},
    strokeRect(_x: number, _y: number, _w: number, _h: number) {},
    clearRect(_x: number, _y: number, _w: number, _h: number) {},
    drawImage(_img: unknown, _sx: number, _sy: number, _sw?: number, _sh?: number) {
      calls.push({ name: 'drawImage', args: [_img, _sx, _sy, _sw, _sh] });
    },

    // Styles
    setLineDash(_segments: number[]) {},
    getLineDash() {
      return [];
    },

    // Gradients
    createLinearGradient(_x0: number, _y0: number, _x1: number, _y1: number) {
      return fakeGradient;
    },
    createRadialGradient(
      _x0: number,
      _y0: number,
      _r0: number,
      _x1: number,
      _y1: number,
      _r1: number
    ) {
      return fakeGradient;
    },
  };

  let globalCompositeOperation = 'source-over';
  Object.defineProperty(ctx, 'globalCompositeOperation', {
    get: () => globalCompositeOperation,
    set: (value: string) => {
      globalCompositeOperation = value;
      compositeOperations.push(value);
    },
  });

  return ctx as unknown as CanvasRenderingContext2D;
}
