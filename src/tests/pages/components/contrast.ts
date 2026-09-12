import type { Locator } from '@playwright/test';

// Solid CSS surfaces only: composite alpha colors and nested opacity groups in paint order.
// Gradients, overlapping siblings, images and pseudo-elements need separate visual review.
export async function settleSurfaceAnimations(locator: Locator) {
  await locator.evaluate(async element => {
    // Entrance, hover and focus motion must settle before sampling opacity or colors.
    for (let node: Element | null = element; node; node = node.parentElement) {
      await Promise.all(node.getAnimations().filter(animation =>
        Number.isFinite(animation.effect?.getComputedTiming().endTime)
      ).map(animation => animation.finished.catch(() => undefined)));
    }
  });
}

export async function measureContrast(locator: Locator, property: 'color' | 'stroke' = 'color') {
  await settleSurfaceAnimations(locator);
  return locator.evaluate((element, property) => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    const rgba = (color: string) => {
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const over = (front: number[], back: number[]) => {
      const alpha = front[3] + back[3] * (1 - front[3]);
      return [...front.slice(0, 3).map((v, i) => alpha ? (v * front[3] + back[i] * back[3] * (1 - front[3])) / alpha : 0), alpha];
    };
    const style = getComputedStyle(element);
    let foreground = rgba(style[property]), background = [0, 0, 0, 0];
    const unmeasuredImages: string[] = [];
    for (let node: Element | null = element; node; node = node.parentElement) {
      const current = getComputedStyle(node), surface = rgba(current.backgroundColor);
      if (current.backgroundImage !== 'none') unmeasuredImages.push(current.backgroundImage);
      foreground = over(foreground, surface); background = over(background, surface);
      foreground[3] *= Number(current.opacity); background[3] *= Number(current.opacity);
    }
    foreground = over(foreground, [255, 255, 255, 1]); background = over(background, [255, 255, 255, 1]);
    const lum = (rgb: number[]) => rgb.slice(0, 3).map(v => {
      const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
    }).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
    const a = lum(background), b = lum(foreground);
    return { ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), foreground, background,
      color: style[property], surface: style.backgroundColor, opacity: style.opacity, unmeasuredImages };
  }, property);
}

export async function contrast(locator: Locator, property: 'color' | 'stroke' = 'color') {
  const measurement = await measureContrast(locator, property);
  if (measurement.unmeasuredImages.length) throw new Error('Contrast requires visual sampling of background images.');
  return measurement.ratio;
}

// Diagnostic inventory, not a blanket accessibility assertion. Direct text nodes avoid
// measuring a container's inherited color in place of its differently styled children.
export async function textContrastInventory(root: Locator) {
  const elements = root.locator('*');
  const candidates = await elements.evaluateAll(nodes => nodes.flatMap((node, index) => {
    if (!(node instanceof HTMLElement)) return [];
    const text = Array.from(node.childNodes).filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join('').trim();
    const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
    if (!text || rect.width <= 2 || rect.height <= 2 || style.visibility !== 'visible') return [];
    return [{ index, text, disabled: node.matches(':disabled'), fontSize: style.fontSize, fontWeight: style.fontWeight }];
  }));
  return Promise.all(candidates.map(async ({ index, ...candidate }) => ({ ...candidate, ...await measureContrast(elements.nth(index)) })));
}
