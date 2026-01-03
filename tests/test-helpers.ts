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

export function createTestContext(): CanvasRenderingContext2D {
  const ctx = {
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
    globalCompositeOperation: 'source-over',

    // Stack
    save() {},
    restore() {},

    // Transforms
    translate(_x: number, _y: number) {},
    scale(_x: number, _y: number) {},
    rotate(_angle: number) {},
    resetTransform() {},

    // Paths
    beginPath() {},
    closePath() {},
    moveTo(_x: number, _y: number) {},
    lineTo(_x: number, _y: number) {},
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
    drawImage(_img: unknown, _sx: number, _sy: number, _sw?: number, _sh?: number) {},

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

  return ctx as unknown as CanvasRenderingContext2D;
}
