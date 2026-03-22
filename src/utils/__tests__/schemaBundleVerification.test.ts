import { describe, it, expect } from 'vitest';
import bundle from '../../data/terranova-bundle.json';

describe('Schema Bundle Verification', () => {
  const nodes = bundle.nodes as Record<string, any>;

  it('has version and metadata', () => {
    expect(bundle.version).toBeDefined();
    expect(bundle.format).toBe('terranova-bundle');
  });

  it('SimplexNoise2D has exactly 5 V2 fields', () => {
    const node = nodes['SimplexNoise2D'];
    expect(node).toBeDefined();
    expect(node.category).toBe('Density');
    const fieldNames = Object.keys(node.fields);
    expect(fieldNames).toEqual(['Lacunarity', 'Persistence', 'Scale', 'Octaves', 'Seed']);
  });

  it('SimplexNoise2D has correct defaults', () => {
    const fields = nodes['SimplexNoise2D'].fields;
    expect(fields.Scale.default).toBe(1.0);
    expect(fields.Octaves.default).toBe(1);
    expect(fields.Lacunarity.default).toBe(1.0);
    expect(fields.Persistence.default).toBe(1.0);
    expect(fields.Seed.default).toBe('A');
  });

  it('Pow has Exponent default of 1.0', () => {
    const fields = nodes['Pow'].fields;
    expect(fields.Exponent.default).toBe(1.0);
  });

  it('does not contain invented density types', () => {
    const invented = [
      'Square', 'CubeRoot', 'CubeMath', 'Inverse', 'Modulo',
      'SumSelf', 'WeightedSum', 'SimplexRidgeNoise2D', 'SimplexRidgeNoise3D',
      'FractalNoise2D', 'FractalNoise3D', 'Zero', 'One',
      'Debug', 'Passthrough', 'YGradient', 'DoubleNormalizer',
    ];
    for (const type of invented) {
      expect(nodes[type]).toBeUndefined();
    }
  });

  it('Clamp uses V2 field names WallA/WallB', () => {
    const fields = nodes['Clamp'].fields;
    expect(fields.WallA).toBeDefined();
    expect(fields.WallB).toBeDefined();
    expect(fields.Min).toBeUndefined();
    expect(fields.Max).toBeUndefined();
  });

  it('Normalizer uses flat V2 field names', () => {
    const fields = nodes['Normalizer'].fields;
    expect(fields.FromMin).toBeDefined();
    expect(fields.FromMax).toBeDefined();
    expect(fields.ToMin).toBeDefined();
    expect(fields.ToMax).toBeDefined();
    expect(fields.SourceRange).toBeUndefined();
    expect(fields.TargetRange).toBeUndefined();
  });
});
