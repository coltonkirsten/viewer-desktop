import type { Point, Ray, Mirror, Lens, Prism, OpticalElement, HitResult } from './types';
import { PHYSICS } from './constants';

// Utility functions
export function normalizeAngle(angle: number): number {
  while (angle < 0) angle += Math.PI * 2;
  while (angle >= Math.PI * 2) angle -= Math.PI * 2;
  return angle;
}

export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getMidpoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

// Ray-line segment intersection
export function rayLineIntersection(
  ray: Ray,
  p1: Point,
  p2: Point
): { point: Point; t: number; u: number } | null {
  const dx = Math.cos(ray.angle);
  const dy = Math.sin(ray.angle);

  const x1 = p1.x, y1 = p1.y;
  const x2 = p2.x, y2 = p2.y;
  const x3 = ray.origin.x, y3 = ray.origin.y;
  const x4 = x3 + dx, y4 = y3 + dy;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < PHYSICS.EPSILON) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u > PHYSICS.MIN_HIT_DISTANCE) {
    return {
      point: { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) },
      t,
      u,
    };
  }
  return null;
}

// Get mirror normal (flat mirror)
export function getFlatMirrorNormal(mirror: Mirror): number {
  const dx = mirror.end.x - mirror.start.x;
  const dy = mirror.end.y - mirror.start.y;
  const surfaceAngle = Math.atan2(dy, dx);
  return surfaceAngle + Math.PI / 2;
}

// Get curved mirror normal at hit point
export function getCurvedMirrorNormal(mirror: Mirror, hitPoint: Point): number {
  if (mirror.type === 'flat' || mirror.curvature === 0) {
    return getFlatMirrorNormal(mirror);
  }

  // Calculate center of curvature
  const midpoint = getMidpoint(mirror.start, mirror.end);
  const surfaceNormal = getFlatMirrorNormal(mirror);
  const sign = mirror.type === 'concave' ? 1 : -1;

  // Center is offset from midpoint along the normal direction
  const center: Point = {
    x: midpoint.x + sign * mirror.curvature * Math.cos(surfaceNormal),
    y: midpoint.y + sign * mirror.curvature * Math.sin(surfaceNormal),
  };

  // Normal at hit point points from center to hit point (convex)
  // or from hit point to center (concave)
  const normalAngle = Math.atan2(
    hitPoint.y - center.y,
    hitPoint.x - center.x
  );

  return mirror.type === 'concave' ? normalAngle + Math.PI : normalAngle;
}

// Reflect ray off a surface
export function reflectRay(incidentAngle: number, normal: number): number {
  const reflected = 2 * normal - incidentAngle + Math.PI;
  return normalizeAngle(reflected);
}

// Snell's law refraction
export function refract(
  incidentAngle: number, // angle of ray relative to normal
  n1: number, // refractive index of first medium
  n2: number // refractive index of second medium
): number | null {
  // Snell's law: n1 * sin(theta1) = n2 * sin(theta2)
  const sinTheta1 = Math.sin(incidentAngle);
  const sinTheta2 = (n1 / n2) * sinTheta1;

  // Total internal reflection check
  if (Math.abs(sinTheta2) > 1) {
    return null; // total internal reflection
  }

  return Math.asin(sinTheta2);
}

// Get incident angle relative to normal
export function getIncidentAngle(rayAngle: number, normalAngle: number): number {
  let incident = rayAngle - normalAngle;
  // Normalize to [-PI, PI]
  while (incident > Math.PI) incident -= 2 * Math.PI;
  while (incident < -Math.PI) incident += 2 * Math.PI;
  return incident;
}

// Refract ray through a lens (thin lens approximation)
export function refractThroughLens(ray: Ray, lens: Lens): Ray | null {
  const lensX = lens.position.x;
  const lensTop = lens.position.y - lens.height / 2;
  const lensBottom = lens.position.y + lens.height / 2;

  const dx = Math.cos(ray.angle);
  const dy = Math.sin(ray.angle);

  if (Math.abs(dx) < PHYSICS.EPSILON) return null;

  const t = (lensX - ray.origin.x) / dx;
  if (t <= PHYSICS.MIN_HIT_DISTANCE) return null;

  const hitY = ray.origin.y + t * dy;
  if (hitY < lensTop || hitY > lensBottom) return null;

  const hitPoint: Point = { x: lensX, y: hitY };
  const distFromCenter = hitY - lens.position.y;
  const f = lens.focalLength;
  const rayDirection = dx > 0 ? 1 : -1;

  let newAngle: number;

  if (lens.type === 'converging') {
    if (Math.abs(dx) > 0.9) {
      // Nearly horizontal ray - aim at focal point
      const focalPoint = { x: lensX + rayDirection * f, y: lens.position.y };
      newAngle = Math.atan2(focalPoint.y - hitY, focalPoint.x - hitPoint.x);
    } else {
      // General ray - deflection proportional to distance from axis
      newAngle = ray.angle - (distFromCenter / f) * 0.5 * rayDirection;
    }
  } else {
    // Diverging lens
    if (Math.abs(dx) > 0.9) {
      // Nearly horizontal ray - appears to come from virtual focal point
      const virtualFocal = { x: lensX - rayDirection * f, y: lens.position.y };
      newAngle = Math.atan2(hitY - virtualFocal.y, hitPoint.x - virtualFocal.x);
    } else {
      newAngle = ray.angle + (distFromCenter / f) * 0.5 * rayDirection;
    }
  }

  return { origin: hitPoint, angle: normalizeAngle(newAngle) };
}

// Get prism vertices (equilateral triangle)
export function getPrismVertices(prism: Prism): [Point, Point, Point] {
  const h = (prism.sideLength * Math.sqrt(3)) / 2;
  const vertices: Point[] = [];

  for (let i = 0; i < 3; i++) {
    const angle = prism.rotation + (i * 2 * Math.PI) / 3 - Math.PI / 2;
    vertices.push({
      x: prism.position.x + ((h * 2) / 3) * Math.cos(angle),
      y: prism.position.y + ((h * 2) / 3) * Math.sin(angle),
    });
  }

  return vertices as [Point, Point, Point];
}

// Get edge normal (pointing outward from prism)
function getEdgeNormal(p1: Point, p2: Point, center: Point): number {
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const edgeAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

  // Determine which normal points outward
  const normal1 = edgeAngle + Math.PI / 2;
  const normal2 = edgeAngle - Math.PI / 2;

  const test1X = midX + Math.cos(normal1);
  const test1Y = midY + Math.sin(normal1);
  const dist1 = distance({ x: test1X, y: test1Y }, center);

  const test2X = midX + Math.cos(normal2);
  const test2Y = midY + Math.sin(normal2);
  const dist2 = distance({ x: test2X, y: test2Y }, center);

  return dist1 > dist2 ? normal1 : normal2;
}

// Refract ray through a prism
export function refractThroughPrism(ray: Ray, prism: Prism): Ray | null {
  const vertices = getPrismVertices(prism);
  const edges: [Point, Point][] = [
    [vertices[0], vertices[1]],
    [vertices[1], vertices[2]],
    [vertices[2], vertices[0]],
  ];

  // Find entry point
  let entryHit: { point: Point; edge: [Point, Point]; u: number } | null = null;
  let minU = Infinity;

  for (const edge of edges) {
    const hit = rayLineIntersection(ray, edge[0], edge[1]);
    if (hit && hit.u < minU) {
      minU = hit.u;
      entryHit = { point: hit.point, edge, u: hit.u };
    }
  }

  if (!entryHit) return null;

  // Calculate refraction at entry
  const entryNormal = getEdgeNormal(entryHit.edge[0], entryHit.edge[1], prism.position);
  const entryIncident = getIncidentAngle(ray.angle, entryNormal + Math.PI); // flip normal for entry
  const refractedAngle = refract(entryIncident, PHYSICS.AIR_REFRACTIVE_INDEX, prism.refractiveIndex);

  if (refractedAngle === null) {
    // Total internal reflection at entry (shouldn't normally happen)
    return null;
  }

  // Ray travels through prism
  const internalAngle = entryNormal + Math.PI + refractedAngle;
  const internalRay: Ray = {
    origin: {
      x: entryHit.point.x + Math.cos(internalAngle) * 0.1,
      y: entryHit.point.y + Math.sin(internalAngle) * 0.1,
    },
    angle: internalAngle,
  };

  // Find exit point (different edge)
  let exitHit: { point: Point; edge: [Point, Point] } | null = null;
  minU = Infinity;

  for (const edge of edges) {
    if (edge === entryHit.edge) continue;
    const hit = rayLineIntersection(internalRay, edge[0], edge[1]);
    if (hit && hit.u < minU) {
      minU = hit.u;
      exitHit = { point: hit.point, edge };
    }
  }

  if (!exitHit) return null;

  // Calculate refraction at exit
  const exitNormal = getEdgeNormal(exitHit.edge[0], exitHit.edge[1], prism.position);
  const exitIncident = getIncidentAngle(internalRay.angle, exitNormal);
  const exitRefracted = refract(exitIncident, prism.refractiveIndex, PHYSICS.AIR_REFRACTIVE_INDEX);

  if (exitRefracted === null) {
    // Total internal reflection - for simplicity, just reflect
    const reflectedAngle = reflectRay(internalRay.angle, exitNormal);
    return { origin: exitHit.point, angle: reflectedAngle };
  }

  const exitAngle = exitNormal + exitRefracted;
  return { origin: exitHit.point, angle: normalizeAngle(exitAngle) };
}

// Check if ray hits a lens
function checkLensHit(ray: Ray, lens: Lens): HitResult | null {
  const lensTop: Point = { x: lens.position.x, y: lens.position.y - lens.height / 2 };
  const lensBottom: Point = { x: lens.position.x, y: lens.position.y + lens.height / 2 };
  const hit = rayLineIntersection(ray, lensTop, lensBottom);

  if (hit) {
    return {
      point: hit.point,
      distance: hit.u,
      element: { kind: 'lens', data: lens },
    };
  }
  return null;
}

// Check if ray hits a mirror
function checkMirrorHit(ray: Ray, mirror: Mirror): HitResult | null {
  // For curved mirrors, we use the chord as approximation for hit detection
  // but calculate proper normal at hit point
  const hit = rayLineIntersection(ray, mirror.start, mirror.end);

  if (hit) {
    return {
      point: hit.point,
      distance: hit.u,
      element: { kind: 'mirror', data: mirror },
      normal: getCurvedMirrorNormal(mirror, hit.point),
    };
  }
  return null;
}

// Check if ray hits a prism
function checkPrismHit(ray: Ray, prism: Prism): HitResult | null {
  const vertices = getPrismVertices(prism);
  const edges: [Point, Point][] = [
    [vertices[0], vertices[1]],
    [vertices[1], vertices[2]],
    [vertices[2], vertices[0]],
  ];

  let closestHit: { point: Point; u: number } | null = null;

  for (const edge of edges) {
    const hit = rayLineIntersection(ray, edge[0], edge[1]);
    if (hit && (!closestHit || hit.u < closestHit.u)) {
      closestHit = { point: hit.point, u: hit.u };
    }
  }

  if (closestHit) {
    return {
      point: closestHit.point,
      distance: closestHit.u,
      element: { kind: 'prism', data: prism },
    };
  }
  return null;
}

// Trace a single ray through all elements
export function traceRay(
  initialRay: Ray,
  elements: OpticalElement[],
  maxBounces: number = PHYSICS.MAX_BOUNCES,
  rayLength: number = PHYSICS.RAY_LENGTH
): Point[][] {
  const paths: Point[][] = [];
  let currentRay = initialRay;
  let currentPath: Point[] = [currentRay.origin];

  for (let bounce = 0; bounce < maxBounces; bounce++) {
    let closestHit: HitResult | null = null;

    // Check intersections with all elements
    for (const element of elements) {
      let hit: HitResult | null = null;

      if (element.kind === 'mirror') {
        hit = checkMirrorHit(currentRay, element.data);
      } else if (element.kind === 'lens') {
        hit = checkLensHit(currentRay, element.data);
      } else if (element.kind === 'prism') {
        hit = checkPrismHit(currentRay, element.data);
      }

      if (hit && (!closestHit || hit.distance < closestHit.distance)) {
        closestHit = hit;
      }
    }

    if (closestHit) {
      currentPath.push(closestHit.point);

      if (closestHit.element.kind === 'mirror') {
        // Reflect off mirror
        const newAngle = reflectRay(currentRay.angle, closestHit.normal!);
        currentRay = {
          origin: {
            x: closestHit.point.x + Math.cos(newAngle) * 0.1,
            y: closestHit.point.y + Math.sin(newAngle) * 0.1,
          },
          angle: newAngle,
        };
      } else if (closestHit.element.kind === 'lens') {
        // Refract through lens
        paths.push(currentPath);
        const refracted = refractThroughLens(
          { origin: currentRay.origin, angle: currentRay.angle },
          closestHit.element.data
        );
        if (refracted) {
          currentRay = {
            origin: {
              x: refracted.origin.x + Math.cos(refracted.angle) * 0.1,
              y: refracted.origin.y + Math.sin(refracted.angle) * 0.1,
            },
            angle: refracted.angle,
          };
          currentPath = [refracted.origin];
        } else {
          break;
        }
      } else if (closestHit.element.kind === 'prism') {
        // Refract through prism
        paths.push(currentPath);
        const refracted = refractThroughPrism(currentRay, closestHit.element.data);
        if (refracted) {
          currentRay = {
            origin: {
              x: refracted.origin.x + Math.cos(refracted.angle) * 0.1,
              y: refracted.origin.y + Math.sin(refracted.angle) * 0.1,
            },
            angle: refracted.angle,
          };
          currentPath = [refracted.origin];
        } else {
          break;
        }
      }
    } else {
      // No hit - extend ray to edge
      const endPoint: Point = {
        x: currentRay.origin.x + Math.cos(currentRay.angle) * rayLength,
        y: currentRay.origin.y + Math.sin(currentRay.angle) * rayLength,
      };
      currentPath.push(endPoint);
      break;
    }
  }

  if (currentPath.length > 1) {
    paths.push(currentPath);
  }

  return paths;
}

// Generate all rays from a light source
export function generateRaysFromLight(light: import('./types').LightSource): Ray[] {
  const rays: Ray[] = [];
  const startAngle = light.angle - light.spread / 2;
  const angleStep = light.rayCount > 1 ? light.spread / (light.rayCount - 1) : 0;

  for (let i = 0; i < light.rayCount; i++) {
    const angle = light.rayCount === 1 ? light.angle : startAngle + i * angleStep;
    rays.push({ origin: light.position, angle });
  }

  return rays;
}
