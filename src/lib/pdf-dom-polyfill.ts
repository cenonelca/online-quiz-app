/**
 * pdf-parse (and the pdfjs-dist build it wraps) references a handful of
 * browser-only globals - most importantly `DOMMatrix` - at MODULE
 * EVALUATION time, not just when actually rendering to a canvas. Vercel's
 * Node.js serverless runtime has no `DOMMatrix`, so simply importing
 * pdf-parse throws `ReferenceError: DOMMatrix is not defined` immediately,
 * before any of our code even runs.
 *
 * We only ever call `.getText()` (plain text extraction for the question
 * import template), never anything that renders to a canvas, so a minimal
 * but numerically-correct 2D affine-matrix polyfill is enough - it just
 * needs to exist and behave like a real DOMMatrix if pdf.js's text-position
 * math happens to touch it.
 *
 * Import this (for its side effect only) before dynamically importing
 * "pdf-parse", e.g.:
 *
 *   await import("@/lib/pdf-dom-polyfill");
 *   const { PDFParse } = await import("pdf-parse");
 */

class DOMMatrixPolyfill {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;

  constructor(init?: number[] | string) {
    if (Array.isArray(init) && init.length >= 6) {
      [this.a, this.b, this.c, this.d, this.e, this.f] = init;
    }
  }

  static fromMatrix(other: Partial<DOMMatrixPolyfill> = {}) {
    const m = new DOMMatrixPolyfill();
    Object.assign(m, other);
    return m;
  }

  multiply(other: Partial<DOMMatrixPolyfill>) {
    return DOMMatrixPolyfill.fromMatrix(this).multiplySelf(other);
  }

  multiplySelf(other: Partial<DOMMatrixPolyfill>) {
    const { a, b, c, d, e, f } = this;
    const o = DOMMatrixPolyfill.fromMatrix(other);
    this.a = a * o.a + c * o.b;
    this.b = b * o.a + d * o.b;
    this.c = a * o.c + c * o.d;
    this.d = b * o.c + d * o.d;
    this.e = a * o.e + c * o.f + e;
    this.f = b * o.e + d * o.f + f;
    return this;
  }

  preMultiplySelf(other: Partial<DOMMatrixPolyfill>) {
    const result = DOMMatrixPolyfill.fromMatrix(other).multiplySelf(this);
    Object.assign(this, result);
    return this;
  }

  translate(tx = 0, ty = 0) {
    return DOMMatrixPolyfill.fromMatrix(this).translateSelf(tx, ty);
  }

  translateSelf(tx = 0, ty = 0) {
    this.e += this.a * tx + this.c * ty;
    this.f += this.b * tx + this.d * ty;
    return this;
  }

  scale(sx = 1, sy = sx) {
    return DOMMatrixPolyfill.fromMatrix(this).scaleSelf(sx, sy);
  }

  scaleSelf(sx = 1, sy = sx) {
    this.a *= sx;
    this.b *= sx;
    this.c *= sy;
    this.d *= sy;
    return this;
  }

  invertSelf() {
    const { a, b, c, d, e, f } = this;
    const det = a * d - b * c;
    if (!det) {
      this.a = this.b = this.c = this.d = 0;
      this.e = this.f = 0;
      return this;
    }
    this.a = d / det;
    this.b = -b / det;
    this.c = -c / det;
    this.d = a / det;
    this.e = -(e * this.a + f * this.c);
    this.f = -(e * this.b + f * this.d);
    return this;
  }
}

const g = globalThis as unknown as { DOMMatrix?: unknown };
if (typeof g.DOMMatrix === "undefined") {
  g.DOMMatrix = DOMMatrixPolyfill;
}

export {};
