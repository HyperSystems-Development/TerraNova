# TerraNova Design System

Reference document for TerraNova's visual language, color tokens, component anatomy, and design files.

---

## Brand Identity

| | |
|---|---|
| **Name** | TerraNova |
| **Tagline** | Offline design studio for Hytale World Generation V2 |
| **Logo** | Isometric mountain SVG with layered terrain silhouette |
| **Logo Location** | `public/icons/terranova.svg` |
| **Organization** | HyperSystems-Development |

### Brand Colors

The brand uses an earth-toned palette inspired by terrain and geology. Dark backgrounds with warm amber accents and natural greens.

---

## Color Palette

### Core Theme Tokens (`tn-*`)

Defined in `tailwind.config.js` under `theme.extend.colors.tn`.

| Token | Hex | Usage |
|-------|-----|-------|
| `tn-bg` | `#1c1a17` | Primary background |
| `tn-bg-secondary` | `#242119` | Secondary background (panels, sidebars) |
| `tn-bg-tertiary` | `#2e2a24` | Tertiary background (nested surfaces) |
| `tn-surface` | `#262320` | Node body background, card surfaces |
| `tn-panel` | `#312d28` | Panel backgrounds (toolbar, inspector) |
| `tn-border` | `#4a4438` | Borders, dividers, scrollbar thumb |
| `tn-text` | `#e8e2d9` | Primary text (warm white) |
| `tn-text-muted` | `#9a9082` | Muted text (labels, secondary info) |
| `tn-text-secondary` | `#c4baa8` | Secondary text (field values) |
| `tn-accent` | `#b5924c` | Primary accent (amber gold) |
| `tn-accent-secondary` | `#6b8f5e` | Secondary accent (forest green) |
| `tn-highlight` | `#7a9e68` | Highlight (brighter green) |

### Node Category Colors

Defined in `src/schema/types.ts` as `CATEGORY_COLORS` and mirrored in `tailwind.config.js` under `theme.extend.colors.node`.

| Category | Hex | Color Name |
|----------|-----|------------|
| Density | `#5B8DBF` | Steel blue |
| Curve | `#A67EB8` | Soft purple |
| Pattern | `#D4A843` | Gold amber |
| MaterialProvider | `#C87D3A` | Burnt orange |
| PositionProvider | `#6B9E5A` | Forest green |
| Prop | `#C76B6B` | Dusty rose |
| Scanner | `#5AACA6` | Teal |
| Assignment | `#8B7355` | Warm brown |
| VectorProvider | `#7B8E92` | Slate blue-gray |
| EnvironmentProvider | `#7DB350` | Olive green |
| TintProvider | `#D46A4A` | Terracotta |
| BlockMask | `#8C8878` | Stone gray |
| Framework | `#8C8878` | Stone gray |
| WorldStructure | `#5A6FA0` | Navy blue |
| Biome | `#4E9E8F` | Sea green |
| Settings | `#8C8878` | Stone gray |
| Directionality | `#B8648B` | Mauve |

### Density Subcategory Colors

Density nodes use accent colors for further distinction. Defined in `src/schema/densitySubcategories.ts`.

| Subcategory | Hex | Color Name | Purpose |
|-------------|-----|------------|---------|
| Generative | `#4A90D9` | Bright blue | Noise sources (Simplex, Voronoi, Fractal) |
| FilterTransform | `#7B68AE` | Purple | Processing (Clamp, Normalizer, CurveFunction) |
| ArithmeticCombinator | `#2D9B83` | Teal | Math ops (Sum, Product, Blend) |
| PositionCoordinate | `#3D8B37` | Green | Spatial (CoordinateX/Y/Z, Distance) |
| Terrain | `#B8763C` | Warm amber | Terrain-specific (SurfaceDensity, Cave) |
| ShapeSDF | `#C45B84` | Rose | Geometric shapes (Ellipsoid, Cuboid) |

---

## Typography & Spacing

### Font Sizes

| Element | Size | Source |
|---------|------|--------|
| Node header text | `text-xs` (12px) | `BaseNode.tsx` |
| Node field labels | `text-[9px]` | `BaseNode.tsx` |
| Node field values | `text-[9px]` | `BaseNode.tsx` |
| Toolbar text | `text-xs` (12px) | Various toolbar components |

### Spacing Patterns

| Pattern | Value | Usage |
|---------|-------|-------|
| Header padding | `px-3 py-1.5` | Node header bar |
| Field row spacing | `space-y-1` | Between field rows in node body |
| Handle row height | `ROW_H = 28px` | Each input/output handle row |
| Header height | `HEADER_H = 32px` | Node header bar height |

### Node Dimensions

| Constant | Value | Source |
|----------|-------|--------|
| `NODE_WIDTH` | `220px` | `src/constants.ts` |
| `NODE_HEIGHT` | `120px` | `src/constants.ts` |
| `ROW_H` | `28px` | `src/nodes/shared/nodeLayout.ts` |
| `HEADER_H` | `32px` | `src/nodes/shared/nodeLayout.ts` |

---

## Node Anatomy

Source: `src/nodes/shared/BaseNode.tsx`

### Header

- Background: category color (full opacity)
- Text: white (`#fff`), `text-xs`, `font-semibold`
- Content: category label + node type name
- Badges: evaluation status dot, validation error/warning counts
- Padding: `px-3 py-1.5`
- Border radius: top corners only (`rounded-t-lg`)

### Handle Zones

- **Left side**: input (target) handles
- **Right side**: output (source) handles
- Handle size: `14px` circles
- Input handle color: `#8C8878` (stone gray, all inputs)
- Output handle color: category color of the output type
- Position: calculated via `handleTop(rowIndex)` = `rowIndex * 28 + 14`

### Body

- Background: `#262320` (tn-surface)
- Field rows: `flex justify-between` layout
- Labels: muted text (`tn-text-muted`)
- Values: default text (`tn-text`)
- Border radius: bottom corners only (`rounded-b-lg`)

### Shadow Effects

| State | Box Shadow |
|-------|------------|
| Default | `0 2px 8px rgba(0,0,0,0.4)` |
| Selected | `0 0 0 2px #f59e0b, 0 2px 8px rgba(0,0,0,0.4)` |
| Output node | `0 0 0 2px #f59e0b, 0 0 12px rgba(245,158,11,0.4), 0 2px 8px rgba(0,0,0,0.4)` |

---

## Validation & Status Indicators

### Validation Badge Colors

Source: `BaseNode.tsx` — `VALIDATION_BADGE_COLORS`

| Severity | Hex | Color |
|----------|-----|-------|
| Error | `#f87171` | Red |
| Warning | `#facc15` | Yellow |
| Info | `#60a5fa` | Blue |

### Evaluation Status Colors

Source: `BaseNode.tsx` — `EVAL_STATUS_COLORS`

| Status | Hex | Color | Label |
|--------|-----|-------|-------|
| Full | `#4ade80` | Green | "Preview: accurate" |
| Approximated | `#facc15` | Yellow | "Preview: approximated" |
| Unsupported | `#f87171` | Red | "Preview: not available (context-dependent)" |

---

## Selection & Interaction

| Element | Style | Value |
|---------|-------|-------|
| Selected node ring | Amber | `#f59e0b` (2px solid) |
| Selection box background | Amber tint | `rgba(245, 158, 11, 0.06)` |
| Selection box border | Amber | `rgba(245, 158, 11, 0.4)` (1px solid) |
| Selected edge stroke | Accent | `#b5924c` (2.5px) |
| Handle hover | Scale up | `1.25x` with `2px outline rgba(232,226,217,0.35)` |
| Edge transition | Smooth | `stroke 0.15s ease, stroke-width 0.15s ease, opacity 0.15s ease` |
| Handle scale | Zoom-responsive | CSS custom property `--handle-scale` |

---

## Preview Colormaps

Source: `src/utils/colormaps.ts`

### Blue-Red
Gradient: `#0000ff` → `#00ffff` → `#00ff00` → `#ffff00` → `#ff0000`
Stops: Blue → Cyan → Green → Yellow → Red

### Grayscale
Gradient: `#000000` → `#ffffff`
Stops: Black → White

### Terrain
Gradient: `#001e64` → `#1e649b` → `#32c832` → `#8c9632` → `#c8649b` → `#ffffff`
Stops: Deep blue → Blue → Green → Brown → Rose → White

### Viridis
Gradient: `#440154` → `#423e7a` → `#21918c` → `#5ec962` → `#fde725`
Stops: Deep purple → Indigo → Teal → Green → Yellow

### Red-Black
Gradient: `#000000` → `#800000` → `#ff3c14`
Stops: Black → Dark red → Bright red

---

## Global Overrides

Source: `src/index.css`

### Scrollbar Styling

- Track: `tn-bg` (`#1c1a17`)
- Thumb: `tn-border` (`#4a4438`), 4px border-radius
- Thumb hover: `tn-text-muted` (`#9a9082`)
- Width/height: `8px`

### React Flow Node Overrides

All default React Flow node styles are reset to transparent/none to prevent white box artifacts:

```css
.react-flow__node {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}
```

### React Flow Handle Overrides

- Border radius: `50%` (always circular)
- Zoom-responsive scaling via `--handle-scale` CSS variable
- Hover: `scale(1.25x)` with subtle outline

---

## Icon Assets

### SVG Logo

- File: `public/icons/terranova.svg`
- Style: Isometric mountain with layered terrain silhouette

### Platform Icons

Location: `src-tauri/icons/`

| File | Size/Format |
|------|-------------|
| `icon.icns` | macOS icon bundle |
| `icon.ico` | Windows icon bundle |
| `icon.png` | Base PNG |
| `32x32.png` | 32x32 |
| `64x64.png` | 64x64 |
| `128x128.png` | 128x128 |
| `128x128@2x.png` | 256x256 (Retina) |
| `Square30x30Logo.png` | Windows Store 30x30 |
| `Square44x44Logo.png` | Windows Store 44x44 |
| `Square71x71Logo.png` | Windows Store 71x71 |
| `Square89x89Logo.png` | Windows Store 89x89 |
| `Square107x107Logo.png` | Windows Store 107x107 |
| `Square142x142Logo.png` | Windows Store 142x142 |
| `Square150x150Logo.png` | Windows Store 150x150 |
| `Square284x284Logo.png` | Windows Store 284x284 |
| `Square310x310Logo.png` | Windows Store 310x310 |
| `StoreLogo.png` | Windows Store logo |

---

## Key Design Files Reference

| File | Contains |
|------|----------|
| `tailwind.config.js` | Theme tokens (`tn-*`), node category colors (`node.*`) |
| `src/schema/types.ts` | `CATEGORY_COLORS` record (16 categories) |
| `src/schema/densitySubcategories.ts` | `DENSITY_SUBCATEGORY_COLORS` (6 subcategories) |
| `src/nodes/shared/BaseNode.tsx` | Node component, shadows, validation badges, eval status colors |
| `src/nodes/shared/handles.ts` | Handle color logic, `INPUT_HANDLE_COLOR` |
| `src/nodes/shared/nodeLayout.ts` | `HEADER_H`, `ROW_H`, handle positioning |
| `src/constants.ts` | `NODE_WIDTH`, `NODE_HEIGHT`, zoom bounds |
| `src/utils/colormaps.ts` | Preview colormap definitions (5 colormaps) |
| `src/index.css` | Scrollbar styles, React Flow overrides, selection box |
| `public/icons/terranova.svg` | Application logo |
| `src-tauri/icons/` | Platform icon set |
