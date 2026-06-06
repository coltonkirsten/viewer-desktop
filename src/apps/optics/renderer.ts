import type { Point, LightSource, Mirror, Lens, Prism, OpticalElement, RenderContext } from './types';
import { COLORS, UI } from './constants';
import { getPrismVertices, distance, getMidpoint, getFlatMirrorNormal } from './physics';

export function clearCanvas(ctx: RenderContext): void {
  ctx.ctx.fillStyle = COLORS.background;
  ctx.ctx.fillRect(0, 0, ctx.width, ctx.height);
}

export function drawGrid(ctx: RenderContext): void {
  if (!ctx.showGrid) return;

  const { ctx: c, width, height, gridSize } = ctx;
  c.strokeStyle = COLORS.grid;
  c.lineWidth = 1;

  for (let x = 0; x < width; x += gridSize) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, height);
    c.stroke();
  }

  for (let y = 0; y < height; y += gridSize) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(width, y);
    c.stroke();
  }
}

export function drawRays(
  ctx: RenderContext,
  rayPaths: Point[][],
  lights: LightSource[]
): void {
  const { ctx: c } = ctx;

  for (const path of rayPaths) {
    if (path.length < 2) continue;

    // Find light color (use first light's color as default)
    const lightColor = lights[0]?.color || '#ffdc64';

    const gradient = c.createLinearGradient(
      path[0].x,
      path[0].y,
      path[path.length - 1].x,
      path[path.length - 1].y
    );

    gradient.addColorStop(0, lightColor + 'ee'); // 93% opacity
    gradient.addColorStop(1, lightColor + '19'); // 10% opacity

    c.strokeStyle = gradient;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(path[0].x, path[0].y);

    for (let i = 1; i < path.length; i++) {
      c.lineTo(path[i].x, path[i].y);
    }
    c.stroke();
  }
}

export function drawMirror(
  ctx: RenderContext,
  mirror: Mirror
): void {
  const { ctx: c, selectedId, hoveredId } = ctx;
  const isSelected = mirror.id === selectedId;
  const isHovered = mirror.id === hoveredId;

  c.strokeStyle = isSelected || isHovered ? COLORS.mirrorSelected : COLORS.mirror;
  c.lineWidth = isSelected ? 4 : isHovered ? 3.5 : 3;

  // Draw curved or flat mirror
  if (mirror.type !== 'flat' && mirror.curvature > 0) {
    // Draw curved mirror as arc
    const midpoint = getMidpoint(mirror.start, mirror.end);
    const chordLength = distance(mirror.start, mirror.end);
    const surfaceNormal = getFlatMirrorNormal(mirror);
    const sign = mirror.type === 'concave' ? 1 : -1;

    // Calculate sagitta (height of arc)
    const halfChord = chordLength / 2;
    const sagitta = mirror.curvature - Math.sqrt(Math.max(0, mirror.curvature * mirror.curvature - halfChord * halfChord));

    const controlX = midpoint.x + sign * sagitta * Math.cos(surfaceNormal);
    const controlY = midpoint.y + sign * sagitta * Math.sin(surfaceNormal);

    c.beginPath();
    c.moveTo(mirror.start.x, mirror.start.y);
    c.quadraticCurveTo(controlX, controlY, mirror.end.x, mirror.end.y);
    c.stroke();
  } else {
    // Draw flat mirror
    c.beginPath();
    c.moveTo(mirror.start.x, mirror.start.y);
    c.lineTo(mirror.end.x, mirror.end.y);
    c.stroke();
  }

  // Draw mirror backing (hatching)
  const dx = mirror.end.x - mirror.start.x;
  const dy = mirror.end.y - mirror.start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = (-dy / len) * 8;
  const ny = (dx / len) * 8;

  c.strokeStyle = isSelected || isHovered ? COLORS.mirrorHatchingSelected : COLORS.mirrorHatching;
  c.lineWidth = 1;

  const segments = Math.floor(len / 10);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = mirror.start.x + dx * t;
    const y = mirror.start.y + dy * t;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + nx, y + ny);
    c.stroke();
  }
}

export function drawLens(
  ctx: RenderContext,
  lens: Lens
): void {
  const { ctx: c, selectedId, hoveredId } = ctx;
  const isSelected = lens.id === selectedId;
  const isHovered = lens.id === hoveredId;
  const isConverging = lens.type === 'converging';

  c.strokeStyle = isSelected || isHovered ? COLORS.lensSelected : COLORS.lens;
  c.lineWidth = isSelected ? 3 : isHovered ? 2.5 : 2;

  const top = { x: lens.position.x, y: lens.position.y - lens.height / 2 };
  const bottom = { x: lens.position.x, y: lens.position.y + lens.height / 2 };

  // Draw lens shape
  c.beginPath();
  if (isConverging) {
    // Converging lens (thicker in middle)
    c.moveTo(top.x - 8, top.y);
    c.quadraticCurveTo(lens.position.x - 15, lens.position.y, bottom.x - 8, bottom.y);
    c.moveTo(top.x + 8, top.y);
    c.quadraticCurveTo(lens.position.x + 15, lens.position.y, bottom.x + 8, bottom.y);
  } else {
    // Diverging lens (thinner in middle)
    c.moveTo(top.x - 10, top.y);
    c.quadraticCurveTo(lens.position.x - 3, lens.position.y, bottom.x - 10, bottom.y);
    c.moveTo(top.x + 10, top.y);
    c.quadraticCurveTo(lens.position.x + 3, lens.position.y, bottom.x + 10, bottom.y);
  }
  c.stroke();

  // Draw arrows at tips
  c.beginPath();
  if (isConverging) {
    // Arrows pointing outward
    c.moveTo(top.x - 5, top.y + 8);
    c.lineTo(top.x, top.y);
    c.lineTo(top.x + 5, top.y + 8);
    c.moveTo(bottom.x - 5, bottom.y - 8);
    c.lineTo(bottom.x, bottom.y);
    c.lineTo(bottom.x + 5, bottom.y - 8);
  } else {
    // Arrows pointing inward
    c.moveTo(top.x - 5, top.y);
    c.lineTo(top.x, top.y + 8);
    c.lineTo(top.x + 5, top.y);
    c.moveTo(bottom.x - 5, bottom.y);
    c.lineTo(bottom.x, bottom.y - 8);
    c.lineTo(bottom.x + 5, bottom.y);
  }
  c.stroke();

  // Draw focal point indicators
  if (isSelected) {
    const focalLeft = { x: lens.position.x - lens.focalLength, y: lens.position.y };
    const focalRight = { x: lens.position.x + lens.focalLength, y: lens.position.y };

    c.fillStyle = COLORS.lensSelected;
    c.beginPath();
    c.arc(focalLeft.x, focalLeft.y, 3, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(focalRight.x, focalRight.y, 3, 0, Math.PI * 2);
    c.fill();

    // Draw optical axis
    c.strokeStyle = 'rgba(136, 255, 136, 0.3)';
    c.lineWidth = 1;
    c.setLineDash([5, 5]);
    c.beginPath();
    c.moveTo(lens.position.x - 150, lens.position.y);
    c.lineTo(lens.position.x + 150, lens.position.y);
    c.stroke();
    c.setLineDash([]);
  }
}

export function drawPrism(
  ctx: RenderContext,
  prism: Prism
): void {
  const { ctx: c, selectedId, hoveredId } = ctx;
  const isSelected = prism.id === selectedId;
  const isHovered = prism.id === hoveredId;
  const vertices = getPrismVertices(prism);

  c.strokeStyle = isSelected || isHovered ? COLORS.prismSelected : COLORS.prism;
  c.lineWidth = isSelected ? 3 : isHovered ? 2.5 : 2;
  c.fillStyle = COLORS.prismFill;

  c.beginPath();
  c.moveTo(vertices[0].x, vertices[0].y);
  c.lineTo(vertices[1].x, vertices[1].y);
  c.lineTo(vertices[2].x, vertices[2].y);
  c.closePath();
  c.fill();
  c.stroke();

  // Show refractive index when selected
  if (isSelected) {
    c.fillStyle = COLORS.prismSelected;
    c.font = '10px Inter, system-ui, sans-serif';
    c.textAlign = 'center';
    c.fillText(`n=${prism.refractiveIndex.toFixed(2)}`, prism.position.x, prism.position.y + 4);
  }
}

export function drawLight(
  ctx: RenderContext,
  light: LightSource
): void {
  const { ctx: c, selectedId, hoveredId } = ctx;
  const isSelected = light.id === selectedId;
  const isHovered = light.id === hoveredId;

  // Draw light source circle
  c.fillStyle = isSelected || isHovered ? COLORS.lightSelected : COLORS.light;
  c.beginPath();
  c.arc(
    light.position.x,
    light.position.y,
    isSelected ? UI.LIGHT_SELECTED_RADIUS : UI.LIGHT_RADIUS,
    0,
    Math.PI * 2
  );
  c.fill();

  // Draw direction indicator
  c.strokeStyle = COLORS.lightDirection;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(light.position.x, light.position.y);
  c.lineTo(
    light.position.x + Math.cos(light.angle) * 20,
    light.position.y + Math.sin(light.angle) * 20
  );
  c.stroke();

  // Draw spread arc when selected
  if (isSelected && light.spread > 0) {
    c.strokeStyle = 'rgba(255, 200, 100, 0.4)';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(
      light.position.x,
      light.position.y,
      30,
      light.angle - light.spread / 2,
      light.angle + light.spread / 2
    );
    c.stroke();
  }
}

export function drawPreview(
  ctx: RenderContext,
  startPoint: Point,
  endPoint: Point
): void {
  const { ctx: c } = ctx;

  c.strokeStyle = COLORS.preview;
  c.lineWidth = 2;
  c.setLineDash([5, 5]);
  c.beginPath();
  c.moveTo(startPoint.x, startPoint.y);
  c.lineTo(endPoint.x, endPoint.y);
  c.stroke();
  c.setLineDash([]);
}

export function drawElements(
  ctx: RenderContext,
  elements: OpticalElement[]
): void {
  for (const element of elements) {
    if (element.kind === 'mirror') {
      drawMirror(ctx, element.data);
    } else if (element.kind === 'lens') {
      drawLens(ctx, element.data);
    } else if (element.kind === 'prism') {
      drawPrism(ctx, element.data);
    }
  }
}

export function drawLights(
  ctx: RenderContext,
  lights: LightSource[]
): void {
  for (const light of lights) {
    drawLight(ctx, light);
  }
}

export function render(
  ctx: RenderContext,
  lights: LightSource[],
  elements: OpticalElement[],
  rayPaths: Point[][],
  previewStart?: Point | null,
  previewEnd?: Point | null
): void {
  clearCanvas(ctx);
  drawGrid(ctx);
  drawRays(ctx, rayPaths, lights);
  drawElements(ctx, elements);
  drawLights(ctx, lights);

  if (previewStart && previewEnd) {
    drawPreview(ctx, previewStart, previewEnd);
  }
}
