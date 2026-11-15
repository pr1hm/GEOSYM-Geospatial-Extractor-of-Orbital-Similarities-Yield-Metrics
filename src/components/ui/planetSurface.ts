/**
 * Procedural Moon / Mars surfaces for the canvas globe (no image textures needed).
 * Feature positions follow real maria, basins and caps; small craters are seeded-random.
 * AI-assisted code: written with Claude (Anthropic) during NASA Space Apps 2026,
 * reviewed and integrated by Dinoco Studios.
 */
import * as d3 from "d3";

export type PlanetVariant = "moon" | "mars";

interface Spot {
  center: [number, number]; // [lng, lat]
  radius: number; // degrees
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A blob = several overlapping circles, so dark regions look irregular instead of round
function blob(rand: () => number, lng: number, lat: number, r: number, fill: string, parts = 4): Spot[] {
  const out: Spot[] = [{ center: [lng, lat], radius: r, fill }];
  for (let i = 1; i < parts; i++) {
    out.push({
      center: [lng + (rand() - 0.5) * r * 1.4, lat + (rand() - 0.5) * r * 1.1],
      radius: r * (0.45 + rand() * 0.45),
      fill,
    });
  }
  return out;
}

export function buildPlanetSpots(variant: PlanetVariant): { base: string; spots: Spot[]; glow?: string } {
  const rand = mulberry32(variant === "moon" ? 7 : 42);
  const spots: Spot[] = [];

  if (variant === "moon") {
    const mare = "#4B4B51";
    // Near-side maria (approximate centres and sizes)
    [
      [-57, 18, 22], // Oceanus Procellarum
      [-16, 33, 11], // Imbrium
      [17, 28, 7], // Serenitatis
      [31, 8, 8], // Tranquillitatis
      [59, 17, 5], // Crisium
      [-17, -21, 7], // Nubium
      [51, -8, 6], // Fecunditatis
      [1, 56, 8], // Frigoris
      [-39, -24, 5], // Humorum
      [35, -15, 4], // Nectaris
    ].forEach(([lng, lat, r]) => spots.push(...blob(rand, lng, lat, r, mare)));
    // Far-side / south pole basins (subtle)
    spots.push(...blob(rand, 170, -53, 14, "#5D5D63", 3)); // South Pole-Aitken
    // Seeded craters
    for (let i = 0; i < 170; i++) {
      const lng = rand() * 360 - 180;
      const lat = Math.asin(rand() * 2 - 1) * (180 / Math.PI);
      const r = 0.5 + Math.pow(rand(), 3) * 4.5;
      spots.push({ center: [lng, lat], radius: r, fill: "#77777D", stroke: "#B4B4BA", strokeWidth: 0.6 });
    }
    spots.push({ center: [-11, -43], radius: 2.2, fill: "#C8C8CE", stroke: "#E4E4E8", strokeWidth: 0.8 }); // Tycho
    spots.push({ center: [-20, 10], radius: 2, fill: "#BEBEC4", stroke: "#DCDCE0", strokeWidth: 0.7 }); // Copernicus
    return { base: "#8E8E94", spots };
  }

  // Mars
  const dark = "#6E2E1C";
  [
    [69, 8, 10], // Syrtis Major
    [-30, 46, 13], // Acidalia Planitia
    [-40, -25, 11], // Mare Erythraeum
    [0, -3, 6], // Sinus Meridiani
    [145, -25, 11], // Mare Cimmerium
    [110, 45, 11], // Utopia
    [-160, -25, 9], // Mare Sirenum
  ].forEach(([lng, lat, r]) => spots.push(...blob(rand, lng, lat, r, dark)));
  spots.push({ center: [70, -42], radius: 15, fill: "#D58A62" }); // Hellas basin (bright)
  spots.push({ center: [-43, -50], radius: 8, fill: "#CC7D56" }); // Argyre
  // Tharsis volcanoes
  [
    [-134, 18, 4.5],
    [-121, -9, 2.5],
    [-113, 1, 2.5],
    [-104, 12, 2.5],
  ].forEach(([lng, lat, r]) => spots.push({ center: [lng, lat], radius: r, fill: "#C4683F", stroke: "#8A3A22", strokeWidth: 0.9 }));
  // Valles Marineris as a chain of thin dark spots
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    spots.push({ center: [-90 + t * 55, -8 - t * 6 + Math.sin(t * 9) * 1.2], radius: 1.1, fill: "#5A2416" });
  }
  // Seeded craters
  for (let i = 0; i < 90; i++) {
    const lng = rand() * 360 - 180;
    const lat = Math.asin(rand() * 2 - 1) * (180 / Math.PI);
    const r = 0.6 + Math.pow(rand(), 3) * 3;
    spots.push({ center: [lng, lat], radius: r, fill: "#A44A2A", stroke: "#C9714A", strokeWidth: 0.5 });
  }
  // Polar caps
  spots.push({ center: [0, 90], radius: 9, fill: "#F1ECE6" });
  spots.push({ center: [0, -90], radius: 6, fill: "#E8E3DC" });
  return { base: "#B5532F", spots, glow: "rgba(240,150,100,0.45)" };
}

const circleGen = d3.geoCircle().precision(6);

export function paintPlanet(
  ctx: CanvasRenderingContext2D,
  path: d3.GeoPath,
  cx: number,
  cy: number,
  r: number,
  surface: ReturnType<typeof buildPlanetSpots>,
) {
  // Base disk
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = surface.base;
  ctx.fill();
  ctx.clip();

  for (const s of surface.spots) {
    const poly = circleGen.center(s.center).radius(s.radius)();
    ctx.beginPath();
    path(poly);
    ctx.fillStyle = s.fill;
    ctx.fill();
    if (s.stroke) {
      ctx.lineWidth = s.strokeWidth ?? 0.6;
      ctx.strokeStyle = s.stroke;
      ctx.stroke();
    }
  }

  // Sunlight from upper-left: soft highlight + dark limb
  const g = ctx.createRadialGradient(cx - r * 0.38, cy - r * 0.38, r * 0.05, cx, cy, r * 1.08);
  g.addColorStop(0, "rgba(255,255,255,0.16)");
  g.addColorStop(0.45, "rgba(0,0,0,0)");
  g.addColorStop(0.85, "rgba(0,0,0,0.55)");
  g.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore();

  // Thin atmosphere glow (Mars)
  if (surface.glow) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
    ctx.strokeStyle = surface.glow;
    ctx.lineWidth = 2;
    ctx.shadowColor = surface.glow;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}
