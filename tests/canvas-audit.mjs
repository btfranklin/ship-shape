import assert from 'node:assert/strict';

function installCanvasAudit() {
  let randomState = 0x5eed1234;
  Math.random = () => {
    randomState = (randomState * 1664525 + 1013904223) >>> 0;
    return randomState / 0x100000000;
  };
  Date.now = () => 1700000000000;

  const errors = [];
  const calls = Object.create(null);
  const contextIds = new WeakMap();
  const contexts = [];
  const depths = new Map();
  let nextContextId = 1;

  function count(name) {
    calls[name] = (calls[name] ?? 0) + 1;
  }

  function contextId(context) {
    let id = contextIds.get(context);
    if (id === undefined) {
      id = nextContextId++;
      contextIds.set(context, id);
      contexts.push({ id, context });
      depths.set(id, 0);
    }
    return id;
  }

  function fail(message) {
    errors.push(message);
    throw new TypeError(message);
  }

  function validateFinite(label, args) {
    args.forEach((value, index) => {
      if (typeof value === 'number' && !Number.isFinite(value)) {
        fail(`${label} received non-finite numeric argument ${index}: ${String(value)}`);
      }
    });
  }

  function validateGeometry(label, name, args) {
    validateFinite(`${label}.${name}`, args);

    const nonNegativeIndexes = {
      arc: [2],
      arcTo: [4],
      ellipse: [2, 3],
      createRadialGradient: [2, 5],
    }[name] ?? [];

    for (const index of nonNegativeIndexes) {
      if (typeof args[index] === 'number' && args[index] < 0) {
        fail(`${label}.${name} received negative radius argument ${index}: ${args[index]}`);
      }
    }

    if (name === 'setLineDash' && Array.isArray(args[0])) {
      validateFinite(`${label}.${name}`, args[0]);
      if (args[0].some((value) => typeof value === 'number' && value < 0)) {
        fail(`${label}.${name} received a negative dash length`);
      }
    }
  }

  function wrapContextPrototype(prototype, label) {
    if (!prototype) return;

    for (const name of [
      'save', 'restore', 'translate', 'scale', 'rotate', 'transform', 'setTransform',
      'resetTransform', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo',
      'ellipse', 'rect', 'roundRect', 'quadraticCurveTo', 'bezierCurveTo', 'clip',
      'fill', 'stroke', 'fillRect', 'strokeRect', 'clearRect', 'drawImage',
      'createLinearGradient', 'createRadialGradient', 'setLineDash',
    ]) {
      const original = prototype[name];
      if (typeof original !== 'function' || original.__shipShapeAuditWrapped) continue;

      const wrapped = function (...args) {
        const id = contextId(this);
        count(`${label}.${name}`);
        validateGeometry(label, name, args);

        if (name === 'save') {
          depths.set(id, (depths.get(id) ?? 0) + 1);
        } else if (name === 'restore') {
          const depth = depths.get(id) ?? 0;
          if (depth === 0) {
            errors.push(`${label}.restore underflow on context ${id}`);
          } else {
            depths.set(id, depth - 1);
          }
        }

        try {
          return original.apply(this, args);
        } catch (error) {
          errors.push(`${label}.${name} native failure: ${error instanceof Error ? error.message : String(error)}`);
          throw error;
        }
      };
      Object.defineProperty(wrapped, '__shipShapeAuditWrapped', { value: true });
      Object.defineProperty(prototype, name, { ...Object.getOwnPropertyDescriptor(prototype, name), value: wrapped });
    }
  }

  function wrapPathPrototype(prototype) {
    if (!prototype) return;

    for (const name of [
      'addPath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'ellipse', 'rect', 'roundRect',
      'quadraticCurveTo', 'bezierCurveTo', 'closePath',
    ]) {
      const original = prototype[name];
      if (typeof original !== 'function' || original.__shipShapeAuditWrapped) continue;

      const wrapped = function (...args) {
        count(`Path2D.${name}`);
        validateGeometry('Path2D', name, args);
        try {
          return original.apply(this, args);
        } catch (error) {
          errors.push(`Path2D.${name} native failure: ${error instanceof Error ? error.message : String(error)}`);
          throw error;
        }
      };
      Object.defineProperty(wrapped, '__shipShapeAuditWrapped', { value: true });
      Object.defineProperty(prototype, name, { ...Object.getOwnPropertyDescriptor(prototype, name), value: wrapped });
    }
  }

  wrapContextPrototype(globalThis.CanvasRenderingContext2D?.prototype, 'CanvasRenderingContext2D');
  wrapContextPrototype(globalThis.OffscreenCanvasRenderingContext2D?.prototype, 'OffscreenCanvasRenderingContext2D');
  wrapPathPrototype(globalThis.Path2D?.prototype);

  const gradientPrototype = globalThis.CanvasGradient?.prototype;
  if (gradientPrototype && typeof gradientPrototype.addColorStop === 'function') {
    const original = gradientPrototype.addColorStop;
    gradientPrototype.addColorStop = function (offset, color) {
      count('CanvasGradient.addColorStop');
      validateFinite('CanvasGradient.addColorStop', [offset]);
      if (offset < 0 || offset > 1) {
        fail(`CanvasGradient.addColorStop received out-of-range offset: ${offset}`);
      }
      try {
        return original.call(this, offset, color);
      } catch (error) {
        errors.push(`CanvasGradient.addColorStop native failure: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    };
  }

  globalThis.__shipShapeCanvasAudit = {
    snapshot() {
      const transforms = [];
      for (const { id, context } of contexts) {
        if (typeof context.getTransform !== 'function') continue;
        const matrix = context.getTransform();
        const values = [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f];
        if (values.some((value) => !Number.isFinite(value))) {
          errors.push(`context ${id} has a non-finite transform: ${values.join(', ')}`);
        }
        transforms.push({ id, values });
      }
      return {
        errors: [...errors],
        calls: { ...calls },
        openSaveDepths: [...depths.entries()].filter(([, depth]) => depth !== 0),
        transforms,
      };
    },
  };
}

function pixelStats(canvas) {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas did not provide a 2D context');
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  let visible = 0;
  let varied = 0;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;
  const first = [data[0], data[1], data[2], data[3]];

  for (let offset = 0; offset < data.length; offset += 4) {
    const pixelIndex = offset / 4;
    const x = pixelIndex % canvas.width;
    const y = Math.floor(pixelIndex / canvas.width);
    const alpha = data[offset + 3];
    if (alpha > 0) {
      visible++;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    if (
      data[offset] !== first[0]
      || data[offset + 1] !== first[1]
      || data[offset + 2] !== first[2]
      || alpha !== first[3]
    ) {
      varied++;
    }
  }

  return {
    width: canvas.width,
    height: canvas.height,
    visible,
    varied,
    bounds: visible === 0 ? null : { minX, minY, maxX, maxY },
  };
}

export async function assertCanvasHasMeaningfulOutput(locator, label) {
  const stats = await locator.evaluate(pixelStats);
  const pixels = stats.width * stats.height;
  assert.ok(stats.visible > Math.max(100, pixels * 0.0001), `${label} should contain visible pixels`);
  assert.ok(stats.varied > Math.max(100, pixels * 0.0001), `${label} should contain varied pixels`);
  assert.ok(stats.bounds, `${label} should expose occupied pixel bounds`);
  return stats;
}

export async function assertCanvasTransformIsIdentity(locator, label) {
  const values = await locator.evaluate((canvas) => {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas did not provide a 2D context');
    const matrix = context.getTransform();
    return [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f];
  });
  const identity = [1, 0, 0, 1, 0, 0];
  values.forEach((value, index) => {
    assert.ok(Math.abs(value - identity[index]) < 1e-9, `${label} leaked transform state: ${values.join(', ')}`);
  });
}

export async function openAuditedPage({ browser, baseUrl, relativeUrl, run }) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const runtimeFailures = [];

  page.on('pageerror', (error) => runtimeFailures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeFailures.push(`console.error: ${message.text()}`);
  });
  page.on('dialog', async (dialog) => {
    runtimeFailures.push(`unexpected ${dialog.type()} dialog: ${dialog.message()}`);
    await dialog.dismiss();
  });
  page.on('requestfailed', (request) => {
    runtimeFailures.push(`request failed: ${request.url()} (${request.failure()?.errorText ?? 'unknown error'})`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) runtimeFailures.push(`HTTP ${response.status()}: ${response.url()}`);
  });

  await page.addInitScript(installCanvasAudit);

  try {
    await page.goto(`${baseUrl}${relativeUrl}`, { waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(globalThis.__shipShapeCanvasAudit));
    await run(page);
    await page.waitForTimeout(50);

    const audit = await page.evaluate(() => globalThis.__shipShapeCanvasAudit.snapshot());
    assert.deepEqual(runtimeFailures, [], `runtime failures on ${relativeUrl}`);
    assert.deepEqual(audit.errors, [], `canvas audit failures on ${relativeUrl}`);
    assert.deepEqual(audit.openSaveDepths, [], `unbalanced save/restore state on ${relativeUrl}`);
    assert.ok(audit.transforms.length > 0, `expected native canvas contexts on ${relativeUrl}`);
    return audit;
  } finally {
    await page.close();
  }
}
