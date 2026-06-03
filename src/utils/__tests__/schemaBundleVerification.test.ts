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

  // ── Task 2: Category-prefixed keys ──────────────────────────────

  describe('category-prefixed keys', () => {
    it('non-density nodes have Category:TypeName aliases', () => {
      const samplePrefixed = [
        'Curve:Sum', 'Curve:Clamp', 'Curve:Inverter', 'Curve:Max', 'Curve:Min',
        'Pattern:And', 'Pattern:Or', 'Pattern:Not', 'Pattern:Surface', 'Pattern:Wall',
        'Prop:Offset', 'Prop:Curve', 'Prop:Union', 'Prop:Box', 'Prop:Cluster',
        'Scanner:Area', 'Scanner:Origin', 'Scanner:ColumnLinear', 'Scanner:ColumnRandom',
        'Assignment:FieldFunction', 'Assignment:Weighted', 'Assignment:Sandwich',
        'Directionality:Pattern', 'Directionality:Random', 'Directionality:Static',
        'MaterialProvider:Solidity', 'MaterialProvider:Striped',
      ];
      for (const key of samplePrefixed) {
        expect(nodes[key]).toBeDefined();
        const [expectedCat] = key.split(':');
        expect(nodes[key].category).toBe(expectedCat);
      }
    });

    it('density types remain unprefixed', () => {
      const densityTypes = ['Abs', 'SimplexNoise2D', 'SimplexNoise3D', 'Pow', 'Scale', 'Rotator'];
      for (const key of densityTypes) {
        expect(nodes[key]).toBeDefined();
        expect(nodes[key].category).toBe('Density');
        // Should NOT have a Density: prefix
        expect(nodes['Density:' + key]).toBeUndefined();
      }
    });
  });

  // ── Task 2: Missing V2 types ────────────────────────────────────

  describe('V2 types that were missing', () => {
    it('Pattern:Rotator exists and is distinct from Density Rotator', () => {
      const patternRotator = nodes['Pattern:Rotator'];
      const densityRotator = nodes['Rotator'];
      expect(patternRotator).toBeDefined();
      expect(patternRotator.category).toBe('Pattern');
      expect(densityRotator).toBeDefined();
      expect(densityRotator.category).toBe('Density');
      // They should be different nodes
      expect(patternRotator).not.toBe(densityRotator);
    });

    it('Scanner:Queue exists and is distinct from Prop Queue', () => {
      const scannerQueue = nodes['Scanner:Queue'];
      const propQueue = nodes['Queue'];
      expect(scannerQueue).toBeDefined();
      expect(scannerQueue.category).toBe('Scanner');
      expect(propQueue).toBeDefined();
      expect(propQueue.category).toBe('Prop');
      expect(scannerQueue).not.toBe(propQueue);
    });

    it('all five PropDistribution types exist', () => {
      const pdTypes = [
        'PropDistribution:Assigned',
        'PropDistribution:Constant',
        'PropDistribution:Imported',
        'PropDistribution:Positions',
        'PropDistribution:Union',
      ];
      for (const key of pdTypes) {
        expect(nodes[key]).toBeDefined();
        expect(nodes[key].category).toBe('PropDistribution');
      }
    });

    it('PropDistribution nodes expose Update 5 Skip metadata', () => {
      for (const key of [
        'PropDistribution:Assigned',
        'PropDistribution:Constant',
        'PropDistribution:Imported',
        'PropDistribution:Positions',
        'PropDistribution:Union',
      ]) {
        expect(nodes[key].fields.ExportAs?.default).toBe('');
        expect(nodes[key].fields.Skip?.default).toBe(false);
      }
      expect(nodes['PropDistribution:Assigned'].fields.OverrideAllProps).toBeDefined();
    });

    it('PropDistribution category is registered', () => {
      const categories = (bundle as any).categories;
      expect(categories['PropDistribution']).toBeDefined();
      expect(categories['PropDistribution'].schemaDir).toBe('propdistributions');
    });

    it('Update 5 position/worldgen nodes use source-backed fields', () => {
      expect(nodes.Exported.category).toBe('Density');
      expect(Object.keys(nodes.Exported.fields)).toEqual(['ExportAs', 'SingleInstance', 'Skip']);
      expect(nodes.PositionsPinch.fields.MaxDistance.default).toBe(10);
      expect(nodes.PositionsPinch.fields.HorizontalPinch.default).toBe(true);
      expect(nodes.PositionsTwist.fields.ZeroPositionsY.default).toBe(false);
      expect(nodes['PositionProvider:TriangularGrid2d'].fields.Skip.default).toBe(false);
    });
  });

  // ── Task 2: Sub-type markers ────────────────────────────────────

  describe('sub-type markers', () => {
    const subTypeNames = [
      'AnchorType', 'Cell', 'CellType', 'CellValue', 'DecimalConstants',
      'Distance2', 'Distance2Add', 'Distance2Div', 'Distance2Mul', 'Distance2Sub',
      'Euclidean', 'LineType', 'Manhattan', 'NoiseType', 'ParentDistanceType',
      'ParentType', 'Simplex', 'Type',
    ];

    it('all 18 enum discriminators are marked isSubType', () => {
      for (const name of subTypeNames) {
        expect(nodes[name]).toBeDefined();
        expect(nodes[name].isSubType).toBe(true);
      }
    });

    it('standalone nodes are NOT marked isSubType', () => {
      const standaloneTypes = [
        'SimplexNoise2D', 'Pow', 'Clamp', 'Normalizer', 'Scale', 'CellNoise2D',
      ];
      for (const name of standaloneTypes) {
        expect(nodes[name]).toBeDefined();
        expect(nodes[name].isSubType).toBeUndefined();
      }
    });
  });

  // ── Task 2: No invented types (extended check) ─────────────────

  describe('no invented types (extended)', () => {
    it('invented types absent in both bare and prefixed form', () => {
      const invented = [
        'Square', 'CubeRoot', 'CubeMath', 'Inverse', 'Modulo',
        'SumSelf', 'WeightedSum', 'SimplexRidgeNoise2D', 'SimplexRidgeNoise3D',
        'FractalNoise2D', 'FractalNoise3D', 'Zero', 'One',
        'Debug', 'Passthrough', 'YGradient', 'DoubleNormalizer',
      ];
      for (const type of invented) {
        expect(nodes[type]).toBeUndefined();
        // Also check no prefixed variant exists
        for (const key of Object.keys(nodes)) {
          if (key.endsWith(':' + type)) {
            throw new Error(`Found invented type as prefixed key: ${key}`);
          }
        }
      }
    });
  });
});
