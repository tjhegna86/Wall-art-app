# Color Engine

Drop-in MVP color extraction + palette generation engine for a Next.js app.

## Install dependencies

```bash
npm install sharp node-vibrant
```

## File structure

```
/src
  /lib
    /color-engine
      extractColor.ts     # dominant/secondary color extraction (node-vibrant)
      generatePalette.ts  # harmony math: complementary/analogous/triadic/neutral
      colorUtils.ts        # hex/rgb/hsl conversions, lighten/darken, contrast
      imageUtils.ts        # upload validation, resize, buffer prep (sharp)
      index.ts             # barrel export
  /app
    /api
      /color-palette
        route.ts           # POST endpoint that ties it all together
  /types
    color.ts                # shared TypeScript types
```

## Usage

From the frontend, POST a photo as `multipart/form-data`:

```ts
const formData = new FormData();
formData.append("image", file);
// optional: formData.append("accentHex", "#3B5F4A");

const res = await fetch("/api/color-palette", {
  method: "POST",
  body: formData,
});

const data = await res.json();
// data.wallColor            -> { base, light, dark }
// data.complementaryOptions -> [{ id, label, color }, ...]
// data.finalPalette         -> { wallBase, wallLight, wallDark, accentBase, accentLight, accentDark }
```

## Flow

1. Frontend uploads a photo of the wall/room.
2. `imageUtils.ts` validates the file and resizes it to a manageable size.
3. `extractColor.ts` pulls the dominant + secondary tones via `node-vibrant`
   and softens them into livable "wall paint" tones.
4. `generatePalette.ts` builds 6-8 accent candidates across every major
   color-harmony rule (complementary, analogous, triadic, split-complementary,
   neutral).
5. The user picks an accent (or the API defaults to the first option).
6. `buildFinalPalette` assembles the final wall + accent palette with
   light/dark variants, ready to hand off to an art/design generator.

## Notes

- `route.ts` sets `export const runtime = "nodejs"` because `sharp` and
  `node-vibrant` need native/Node APIs — they will not run on the Edge runtime.
- All color math in `colorUtils.ts` and `generatePalette.ts` is pure/synchronous
  and has no dependencies — easy to unit test in isolation.
- To swap `node-vibrant` for `colorthief`, only `extractColor.ts` needs to change;
  everything downstream consumes the same `Color`/`ColorWithVariants` shape.
