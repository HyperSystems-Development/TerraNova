# Reading the Node Graph

This guide explains how to look at any TerraNova (or Hytale) node graph and understand what it does, even if you didn't build it.

---

## The direction of data flow

Data in the graph **always flows left to right**. Leaf nodes on the far left produce raw values (noise, constants, positions). Those values pass through transform nodes in the middle (curves, math, combinators). The final result arrives at the Root node on the far right.

```
[CellNoise2D] ──→ [FastGradientWarp] ──→ [AmplitudeConstant] ──→ [Sum] ──→ [Root]
[Constant]    ────────────────────────────────────────────────────→ ──┘
```

To understand a graph, **start from the Root and trace backwards**. Ask "what feeds into this?" at each node.

---

## Reading a node

Every node has:

- **Type** (shown in the header): what computation it performs
- **Fields** (in the Properties panel): its parameters
- **Inputs** (left handles): values coming in from other nodes
- **Output** (right handle): the value it produces

When you select a node, the Properties panel shows its fields. The Docs panel shows what the node type does. Press `Ctrl+\`` to flip between them.

---

## Common patterns to recognize

### Pattern 1: The height formula

```
Constant(N) ──┐
              Sum ── ...
YValue ── Inverter ──┘
```

Any time you see `Sum` fed by `Inverter(YValue)` and a `Constant`, you're looking at the height formula: `N - y`. This creates a surface at Y=N. It's the foundation of almost every terrain graph.

```curve
Height formula output — positive below surface, negative above
[[0,1],[0.4,0.2],[0.5,0],[0.6,-0.2],[1,-1]]
```

### Pattern 2: Noise → Remap → Height

```
SimplexNoise2D ── AmplitudeConstant(40) ──┐
                                          Sum ── [height formula]
                  Constant(110) ──────────┘
```

This is a **noise-driven height map**. The noise (output: `-1` to `1`) is scaled by 40 and shifted by 110, giving an output of `70` to `150` (the Y range where terrain will appear).

```bounds
{"min": 70, "max": 150, "label": "Typical noise-driven height range"}
```

Whenever you see `AmplitudeConstant` + `Sum` + `Constant`, you're looking at scale-and-offset. In TerraNova's active node set, the closest direct tools are `Normalizer` or an explicit scale-plus-offset chain like this one.

### Pattern 3: Noise → Curve → Mask

```
CellNoise2D ──→ [Curve:DistanceExponential] ──→ Multiplier
```

Noise output is being **remapped by a curve** to create a mask. The curve shapes how the noise value is converted: cell center values become `1.0` (solid) and edge values taper to `0.0` (air).

```curve
DistanceExponential Exponent 2 — island falloff
[[0,1],[0.25,0.9375],[0.5,0.75],[0.75,0.4375],[1,0]]
```

### Pattern 4: Two branches → Multiplier

```
[branch A: island mask] ──┐
                          Multiplier ── Root
[branch B: vertical shape] ──┘
```

A `Multiplier` combining two branches means: **solid only where BOTH are positive**. This is how islands work. Terrain exists only where the horizontal island mask AND the vertical height range both agree. If either is zero, the result is zero (air).

### Pattern 5: FastGradientWarp wrapping noise

```
[CellNoise2D] ── FastGradientWarp ── ...
```

`FastGradientWarp` always wraps another noise node as its input. It displaces the sample coordinates before the noise lookup. The result is the same noise, but with organic, wavy edges instead of geometric ones.

```curve
Before warp — hard cell transitions
[[0,0],[0.45,0],[0.5,1],[1,1]]
```

```curve
After warp — transitions become jagged and irregular (conceptual)
[[0,0],[0.4,0],[0.48,0.3],[0.52,0.7],[0.6,1],[1,1]]
```

### Pattern 6: Cache node

```
[expensive subgraph] ── Cache(Capacity: 3) ── ...
```

A `Cache` node doesn't change values. It stores recently computed results so they don't need to be recalculated when the same position is queried again (e.g., for material lookups after density). It's a performance optimization. Ignore it when reading the logic; it's transparent to the data flow.

---

## Reading field values

### Noise scale

`Scale`, `ScaleX`, `ScaleZ` are in **world-space blocks**. A scale of `125` means the pattern repeats roughly every 125 blocks.

| Scale | Feature size |
|---|---|
| 30–60 | Small detail (boulders, small caves) |
| 80–150 | Medium features (islands, hills) |
| 200–500 | Large regions (mountain ranges, biome blobs) |
| 500+ | Very broad (biome selection) |

### AmplitudeConstant value

This is a **multiplier** on its input. If simplex noise outputs `-1` to `1` and you connect it through `AmplitudeConstant(40)`, the output is `-40` to `40`. Connect that to `Sum` with `Constant(110)` and you get `70` to `150` (the island height range).

```bounds
{"min": -1, "max": 1, "label": "Raw noise output range"}
```

```bounds
{"min": -40, "max": 40, "label": "After AmplitudeConstant(40)"}
```

```bounds
{"min": 70, "max": 150, "label": "After Sum + Constant(110)"}
```

### Clamp WallA / WallB

These are the **min** and **max** of a clamp. `WallA: 0, WallB: 1` means "if the input is below 0, output 0; above 1, output 1; otherwise pass through".

```curve
Clamp WallA: 0, WallB: 1
[[0,0],[0,0],[0.5,0.5],[1,1],[1,1]]
```

---

## How to debug a graph

1. **Select a node** and watch the 2D preview. The heatmap shows that node's output at every `(x, z)` position. Bright = high value, dark = low value.

2. **Follow the hot path.** If terrain is wrong, start at the Root and work backwards. Select each upstream node and check its heatmap. Find where the output stops looking right.

3. **Use Skip.** Right-click a node and toggle "Skip" to bypass it temporarily. This lets you see what the graph looks like without a particular node's contribution.

4. **Check field values.** A common mistake is `Scale` being in the wrong units (e.g., `1.0` when you meant `100`) or `AmplitudeConstant` being `0` (which zeros out everything downstream).

5. **Liveness mode.** Enable terrain liveness (View menu) to see which nodes actually contribute to the Root output. Orphaned nodes (not connected to Root) are dimmed.

---

## What the colors mean

Node header colors map to **node categories**:

| Color | Category |
|---|---|
| Blue | Generative (noise, generators) |
| Purple | Filter / math operations |
| Teal | Position / scanner |
| Green | Math combinators (Sum, Min, Max) |
| Brown/Gold | Terrain / output |
| Pink | Shape |
| Orange | Material / prop |
| Lavender | Curve |

When you see a tight cluster of purple/lavender nodes downstream of a noise node, that's a **curve remapping chain**: the noise being shaped before it contributes to terrain.

---

## Common mistakes

| What you see | Likely cause |
|---|---|
| Flat terrain, no features | `AmplitudeConstant` is 0, or noise isn't connected to the height formula |
| Everything is solid / all air | Height offset (`Constant`) is too high or too low for your world bounds |
| Terrain exists everywhere (no gaps) | Island mask isn't properly cutting values to negative; check `AmplitudeConstant` sign |
| Terrain has hard geometric shapes | Missing `FastGradientWarp` on cell noise |
| Props everywhere / nowhere | Prop density threshold is too low / too high |
| Performance warning in Validation | High octave noise or missing `Cache` on shared subgraphs |
