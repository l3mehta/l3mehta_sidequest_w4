/*
WorldLevel.js (Example 5)

WorldLevel wraps ONE level object from levels.json and provides:
- Theme colours (background/platform/blob)
- Physics parameters that influence the player (gravity, jump velocity)
- Spawn position for the player (start)
- An array of Platform instances
- A couple of helpers to size the canvas to fit the geometry

This is directly inspired by your original blob sketch’s responsibilities:
- parse JSON
- map platforms array
- apply theme + physics
- infer canvas size

Expected JSON shape for each level (from your provided file):
{
  "name": "Intro Steps",
  "gravity": 0.65,
  "jumpV": -11.0,
  "theme": { "bg":"...", "platform":"...", "blob":"..." },
  "start": { "x":80, "y":220, "r":26 },
  "platforms": [ {x,y,w,h}, ... ],
  "generated": { ... } // optional
}
*/

class WorldLevel {
  constructor(levelJson) {
    // A readable label for HUD.
    this.name = levelJson.name || "Level";

    // Theme defaults + override with JSON.
    this.theme = Object.assign(
      { bg: "#F0F0F0", platform: "#C8C8C8", blob: "#1478FF" },
      levelJson.theme || {},
    );

    // Physics knobs (the blob player will read these).
    this.gravity = levelJson.gravity ?? 0.65;
    this.jumpV = levelJson.jumpV ?? -11.0;

    // Player spawn data.
    // Use optional chaining so levels can omit fields safely.
    this.start = {
      x: levelJson.start?.x ?? 80,
      y: levelJson.start?.y ?? 180,
      r: levelJson.start?.r ?? 26,
    };

    // --- Platforms can be authored OR generated ---
    let rawPlatforms = Array.isArray(levelJson.platforms)
      ? levelJson.platforms
      : [];

    // If the level includes a "generated" config, build more platforms via loops
    if (levelJson.generated) {
      rawPlatforms = rawPlatforms.concat(
        this.generatePlatforms(levelJson.generated),
      );
    }

    // Convert raw platform objects into Platform instances.
    this.platforms = rawPlatforms.map((p) => new Platform(p));
  }

  // Generate platforms procedurally (random or patterned) from a config object.
  generatePlatforms(gen) {
    const out = [];

    // If a seed is provided, use it so the "random" layout is stable per load.
    if (typeof gen.seed === "number") {
      randomSeed(gen.seed);
    }

    // ----- Patterned stairs (non-random) -----
    if (gen.type === "stairs") {
      const worldW = gen.worldW ?? 640;
      const floorY = gen.floorY ?? 324;
      const floorH = gen.floorH ?? 36;

      // Floor
      out.push({ x: 0, y: floorY, w: worldW, h: floorH });

      const startX = gen.startX ?? 120;
      const startY = gen.startY ?? 290;
      const stepW = gen.stepW ?? 80;
      const stepH = gen.stepH ?? 12;
      const rise = gen.rise ?? 22;
      const count = gen.count ?? 8;

      for (let i = 0; i < count; i++) {
        out.push({
          x: startX + i * stepW,
          y: startY - i * rise,
          w: stepW,
          h: stepH,
        });
      }

      return out;
    }

    // ----- Random hop platforms (random) -----
    if (gen.type === "randomHops") {
      const worldW = gen.worldW ?? 900;
      const floorY = gen.floorY ?? 324;
      const floorH = gen.floorH ?? 36;

      // Floor
      out.push({ x: 0, y: floorY, w: worldW, h: floorH });

      const count = gen.count ?? 10;

      const platH = gen.platH ?? 12;
      const platWMin = gen.platWMin ?? 70;
      const platWMax = gen.platWMax ?? 120;

      const gapMin = gen.gapMin ?? 55;
      const gapMax = gen.gapMax ?? 95;

      // riseMin/riseMax control vertical change between platforms
      const riseMin = gen.riseMin ?? -15;
      const riseMax = gen.riseMax ?? 25;

      // Start position
      let x = gen.startX ?? 140;
      let y = gen.startY ?? 280;

      // Keep platforms within a “playable band”
      const minY = 110; // don’t go too high
      const maxY = floorY - 60; // don’t sink too low

      for (let i = 0; i < count; i++) {
        const w = floor(random(platWMin, platWMax + 1));
        out.push({ x, y, w, h: platH });

        // Next platform: random gap + random rise
        const gap = floor(random(gapMin, gapMax + 1));
        const dy = floor(random(riseMin, riseMax + 1));

        x = x + w + gap;
        y = constrain(y - dy, minY, maxY);
      }

      return out;
    }

    // If unknown type, generate nothing.
    return out;
  }

  /*
  If you want the canvas to fit the world, you can infer width/height by
  finding the maximum x+w and y+h across all platforms.
  */
  inferWidth(defaultW = 640) {
    if (!this.platforms.length) return defaultW;
    return max(this.platforms.map((p) => p.x + p.w));
  }

  inferHeight(defaultH = 360) {
    if (!this.platforms.length) return defaultH;
    return max(this.platforms.map((p) => p.y + p.h));
  }

  /*
  Draw only the world (background + platforms).
  The player draws itself separately, after the world is drawn.
  */
  drawWorld() {
    background(color(this.theme.bg));
    for (const p of this.platforms) {
      p.draw(color(this.theme.platform));
    }
  }
}
