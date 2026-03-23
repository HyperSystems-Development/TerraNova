import type { Node, Edge } from "@xyflow/react";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";
import { getDefaults } from "@/schema/defaults";
import { alignNodes as alignNodesFn, distributeNodes as distributeNodesFn } from "@/utils/alignDistribute";
import { NODE_WIDTH } from "@/constants";
import { useSettingsStore } from "../settingsStore";
import { usePreviewStore } from "../previewStore";
import { emit } from "../storeEvents";
import { getMutateAndCommit } from "./historySlice";
import type { SliceCreator, GraphSliceState } from "./types";

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export const graphInitialState = {
  nodes: [] as Node[],
  edges: [] as Edge[],
  selectedNodeId: null as string | null,
  outputNodeId: null as string | null,
};

// ---------------------------------------------------------------------------
// Slice creator
// ---------------------------------------------------------------------------

export const createGraphSlice: SliceCreator<GraphSliceState> = (set, get) => {
  function markDirty() {
    emit("editor:dirty");
  }

  return {
    ...graphInitialState,

    onNodesChange: (changes) => {
      const hasRemove = changes.some((c) => c.type === "remove");

      if (hasRemove) {
        // Deletions are undoable
        const mutateAndCommit = getMutateAndCommit();
        mutateAndCommit((state) => ({
          nodes: applyNodeChanges(changes, state.nodes),
        }), "Edit nodes");
        markDirty();
      } else {
        // Position changes (moves) and other non-destructive changes:
        // apply without creating a history entry
        const hasDragEnd = changes.some(
          (c) => c.type === "position" && c.dragging === false,
        );
        set({ nodes: applyNodeChanges(changes, get().nodes) });
        if (hasDragEnd) markDirty();
      }
    },

    onEdgesChange: (changes) => {
      const mutateAndCommit = getMutateAndCommit();
      const hasRemove = changes.some((c) => c.type === "remove");
      if (hasRemove) {
        // Check if any removed edge targeted a Root node — clear outputNode
        const removedIds = new Set(
          changes.filter((c) => c.type === "remove").map((c) => (c as { id: string }).id),
        );
        const { edges, nodes } = get();
        const rootNodeIds = new Set(nodes.filter((n) => n.type === "Root").map((n) => n.id));
        const removedRootEdge = edges.some(
          (e) => removedIds.has(e.id) && rootNodeIds.has(e.target),
        );

        mutateAndCommit((state) => ({
          edges: applyEdgeChanges(changes, state.edges),
        }), "Edit edges");
        markDirty();

        if (removedRootEdge) {
          get().setOutputNode(null);
        }
      } else {
        set({ edges: applyEdgeChanges(changes, get().edges) });
      }
    },

    onConnect: (connection) => {
      const mutateAndCommit = getMutateAndCommit();
      mutateAndCommit((state) => {
        const filtered = state.edges.filter(
          (e) =>
            !(e.target === connection.target && e.targetHandle === connection.targetHandle),
        );
        return { edges: addEdge(connection, filtered) };
      }, "Connect");
      markDirty();

      // Auto-set outputNode when connecting into a Root node
      const { nodes } = get();
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (targetNode?.type === "Root" && connection.source) {
        get().setOutputNode(connection.source);
      }
    },

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),
    setSelectedNodeId: (id) => set({ selectedNodeId: id }),

    addNode: (node) => {
      const mutateAndCommit = getMutateAndCommit();
      const typeName = (node.data as Record<string, unknown>)?.type ?? node.type ?? "node";
      mutateAndCommit((state) => ({
        nodes: [...state.nodes, node],
        selectedNodeId: node.id,
      }), `Add ${typeName}`);
    },

    removeNode: (id) => {
      const mutateAndCommit = getMutateAndCommit();
      mutateAndCommit((state) => ({
        nodes: state.nodes.filter((n) => n.id !== id),
        edges: state.edges.filter((e) => e.source !== id && e.target !== id),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        outputNodeId: state.outputNodeId === id ? null : state.outputNodeId,
      }), "Delete node");
    },

    removeNodes: (ids) => {
      if (ids.length === 0) return;
      const mutateAndCommit = getMutateAndCommit();
      const idSet = new Set(ids);
      mutateAndCommit((state) => ({
        nodes: state.nodes.filter((n) => !idSet.has(n.id)),
        edges: state.edges.filter((e) => !idSet.has(e.source) && !idSet.has(e.target)),
        selectedNodeId: state.selectedNodeId && idSet.has(state.selectedNodeId)
          ? null
          : state.selectedNodeId,
        outputNodeId: state.outputNodeId && idSet.has(state.outputNodeId)
          ? null
          : state.outputNodeId,
      }), "Delete nodes");
    },

    removeEdges: (ids, label = "Delete edges") => {
      if (ids.length === 0) return;
      const mutateAndCommit = getMutateAndCommit();
      const idSet = new Set(ids);
      mutateAndCommit((state) => {
        const newEdges = state.edges.filter((e) => !idSet.has(e.id));

        // Check if any removed edge targeted a Root node — clear outputNode
        const rootNodeIds = new Set(state.nodes.filter((n) => n.type === "Root").map((n) => n.id));
        const removedRootEdge = state.edges.some(
          (e) => idSet.has(e.id) && rootNodeIds.has(e.target),
        );

        const updates: Partial<typeof state> = { edges: newEdges };
        if (removedRootEdge) {
          updates.outputNodeId = null;
          // Clear _outputNode from all nodes
          updates.nodes = state.nodes.map((n) => {
            const d = n.data as Record<string, unknown>;
            if (d._outputNode) {
              const { _outputNode: _, ...rest } = d;
              return { ...n, data: rest };
            }
            return n;
          });
        }
        return updates;
      }, label);
      markDirty();
    },

    updateNodeField: (nodeId, fieldName, value) => {
      set((state) => ({
        nodes: state.nodes.map((node) => {
          if (node.id !== nodeId) return node;
          const data = node.data as Record<string, unknown>;
          const fields = (data.fields as Record<string, unknown>) ?? {};
          return {
            ...node,
            data: {
              ...data,
              fields: { ...fields, [fieldName]: value },
            },
          };
        }),
      }));
    },

    splitEdge: (edgeId, newNodeId, inputHandle?, outputHandle?) => {
      const mutateAndCommit = getMutateAndCommit();
      mutateAndCommit((state) => {
        const edge = state.edges.find((e) => e.id === edgeId);
        if (!edge) return {};

        const newEdges = state.edges.filter((e) => e.id !== edgeId);
        newEdges.push({
          id: `${edge.source}-${newNodeId}`,
          source: edge.source,
          target: newNodeId,
          sourceHandle: edge.sourceHandle ?? null,
          targetHandle: inputHandle ?? null,
        });
        newEdges.push({
          id: `${newNodeId}-${edge.target}`,
          source: newNodeId,
          target: edge.target,
          sourceHandle: outputHandle ?? null,
          targetHandle: edge.targetHandle ?? null,
        });

        return { edges: newEdges };
      }, "Split edge");
    },

    interjectOnEdge: (edgeId, newNodeId, inputHandle?, outputHandle?) => {
      const mutateAndCommit = getMutateAndCommit();
      const flowDir = useSettingsStore.getState().flowDirection;
      const REQUIRED_GAP = NODE_WIDTH + 80; // node width + ranksep

      mutateAndCommit((state) => {
        const edge = state.edges.find((e) => e.id === edgeId);
        if (!edge) return {};

        const sourceNode = state.nodes.find((n) => n.id === edge.source);
        const targetNode = state.nodes.find((n) => n.id === edge.target);
        if (!sourceNode || !targetNode) return {};

        // 1. Split the edge (rewire)
        const newEdges = state.edges.filter((e) => e.id !== edgeId);
        newEdges.push({
          id: `${edge.source}-${newNodeId}`,
          source: edge.source,
          target: newNodeId,
          sourceHandle: edge.sourceHandle ?? null,
          targetHandle: inputHandle ?? null,
        });
        newEdges.push({
          id: `${newNodeId}-${edge.target}`,
          source: newNodeId,
          target: edge.target,
          sourceHandle: outputHandle ?? null,
          targetHandle: edge.targetHandle ?? null,
        });

        // 2. Snap interjected node to midpoint between source and target
        const midX = (sourceNode.position.x + targetNode.position.x) / 2;
        const midY = (sourceNode.position.y + targetNode.position.y) / 2;

        // 3. Calculate push amount along flow axis
        let pushAmount = 0;
        if (flowDir === "LR") {
          const gap = targetNode.position.x - midX;
          if (gap < REQUIRED_GAP) pushAmount = REQUIRED_GAP - gap;
        } else {
          // RL: target is to the left of source; push leftward
          const gap = midX - targetNode.position.x;
          if (gap < REQUIRED_GAP) pushAmount = REQUIRED_GAP - gap;
        }

        // 4. BFS forward from target to find all downstream node IDs
        const downstreamIds = new Set<string>();
        {
          const visited = new Set<string>();
          const queue = [edge.target];
          while (queue.length > 0) {
            const current = queue.shift()!;
            if (visited.has(current)) continue;
            visited.add(current);
            downstreamIds.add(current);
            for (const e of newEdges) {
              if (e.source === current) queue.push(e.target);
            }
          }
        }

        // 5. Apply position changes to all nodes
        const newNodes = state.nodes.map((n) => {
          if (n.id === newNodeId) {
            return { ...n, position: { x: midX, y: midY } };
          }
          if (pushAmount > 0 && downstreamIds.has(n.id)) {
            const shift = flowDir === "LR" ? pushAmount : -pushAmount;
            return { ...n, position: { x: n.position.x + shift, y: n.position.y } };
          }
          return n;
        });

        return { nodes: newNodes, edges: newEdges };
      }, "Interject node");
      markDirty();
    },

    setOutputNode: (nodeId) => {
      const mutateAndCommit = getMutateAndCommit();
      mutateAndCommit((state) => {
        // Clear _outputNode from ALL nodes
        const nodes = state.nodes.map((n) => {
          const d = n.data as Record<string, unknown>;
          if (d._outputNode) {
            const { _outputNode: _, ...rest } = d;
            return { ...n, data: rest };
          }
          return n;
        });
        // If nodeId non-null, set _outputNode on target
        if (nodeId) {
          const idx = nodes.findIndex((n) => n.id === nodeId);
          if (idx >= 0) {
            const n = nodes[idx];
            nodes[idx] = { ...n, data: { ...(n.data as Record<string, unknown>), _outputNode: true } };
          }
        }
        return { nodes, outputNodeId: nodeId };
      }, nodeId ? "Set output node" : "Clear output node");
      // Sync to preview store for immediate preview update
      usePreviewStore.getState().setSelectedPreviewNodeId(nodeId);
      markDirty();
    },

    alignNodes: (direction) => {
      const mutateAndCommit = getMutateAndCommit();
      const { nodes } = get();
      const selected = nodes.filter((n) => n.selected);
      if (selected.length < 2) return;
      const aligned = alignNodesFn(selected, direction);
      const alignedMap = new Map(aligned.map((n) => [n.id, n.position]));
      mutateAndCommit((state) => ({
        nodes: state.nodes.map((n) => {
          const pos = alignedMap.get(n.id);
          return pos ? { ...n, position: pos } : n;
        }),
      }), `Align ${direction}`);
      markDirty();
    },

    distributeNodes: (axis) => {
      const mutateAndCommit = getMutateAndCommit();
      const { nodes } = get();
      const selected = nodes.filter((n) => n.selected);
      if (selected.length < 3) return;
      const distributed = distributeNodesFn(selected, axis);
      const distMap = new Map(distributed.map((n) => [n.id, n.position]));
      mutateAndCommit((state) => ({
        nodes: state.nodes.map((n) => {
          const pos = distMap.get(n.id);
          return pos ? { ...n, position: pos } : n;
        }),
      }), `Distribute ${axis}`);
      markDirty();
    },

    createGroup: (nodeIds, name) => {
      if (nodeIds.length === 0) return;
      const mutateAndCommit = getMutateAndCommit();
      const { nodes, edges } = get();
      const idSet = new Set(nodeIds);

      const internalNodes = nodes.filter((n) => idSet.has(n.id));
      const internalEdges = edges.filter(
        (e) => idSet.has(e.source) && idSet.has(e.target),
      );
      const externalEdges = edges.filter(
        (e) => (idSet.has(e.source) || idSet.has(e.target)) &&
               !(idSet.has(e.source) && idSet.has(e.target)),
      );

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const n of internalNodes) {
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x + 220);
        maxY = Math.max(maxY, n.position.y + 120);
      }

      const groupId = crypto.randomUUID();
      const externalConnectionMap: { originalNodeId: string; handleId: string; direction: "in" | "out" }[] = [];
      const newEdges: Edge[] = [];

      for (const e of externalEdges) {
        if (idSet.has(e.target)) {
          externalConnectionMap.push({
            originalNodeId: e.target,
            handleId: e.targetHandle ?? "input",
            direction: "in",
          });
          newEdges.push({
            ...e,
            id: `${e.source}-${groupId}-${e.targetHandle ?? "input"}`,
            target: groupId,
          });
        } else {
          externalConnectionMap.push({
            originalNodeId: e.source,
            handleId: e.sourceHandle ?? "output",
            direction: "out",
          });
          newEdges.push({
            ...e,
            id: `${groupId}-${e.target}-${e.sourceHandle ?? "output"}`,
            source: groupId,
          });
        }
      }

      const groupNode: Node = {
        id: groupId,
        type: "group",
        position: { x: (minX + maxX) / 2 - 110, y: (minY + maxY) / 2 - 60 },
        data: {
          type: "group",
          name,
          collapsed: true,
          internalNodes: structuredClone(internalNodes),
          internalEdges: structuredClone(internalEdges),
          externalConnectionMap,
          fields: {},
        },
      };

      const remainingNodes = nodes.filter((n) => !idSet.has(n.id));
      const remainingEdges = edges.filter(
        (e) => !idSet.has(e.source) && !idSet.has(e.target),
      );

      mutateAndCommit(() => ({
        nodes: [...remainingNodes, groupNode],
        edges: [...remainingEdges, ...newEdges],
        selectedNodeId: groupId,
      }), "Group");
      markDirty();
    },

    expandGroup: (groupId) => {
      const mutateAndCommit = getMutateAndCommit();
      const { nodes, edges } = get();

      const groupNode = nodes.find((n) => n.id === groupId);
      if (!groupNode || groupNode.type !== "group") return;

      const groupData = groupNode.data as unknown as {
        internalNodes: Node[];
        internalEdges: Edge[];
        externalConnectionMap: { originalNodeId: string; handleId: string; direction: "in" | "out" }[];
      };

      const connectionMap = groupData.externalConnectionMap;
      const groupEdges = edges.filter(
        (e) => e.source === groupId || e.target === groupId,
      );

      const rewiredEdges: Edge[] = [];
      for (const e of groupEdges) {
        if (e.target === groupId) {
          const mapping = connectionMap.find(
            (m) => m.direction === "in" && m.handleId === (e.targetHandle ?? "input"),
          );
          if (mapping) {
            rewiredEdges.push({
              ...e,
              id: `${e.source}-${mapping.originalNodeId}-${e.targetHandle ?? "input"}`,
              target: mapping.originalNodeId,
            });
          }
        } else {
          const mapping = connectionMap.find(
            (m) => m.direction === "out" && m.handleId === (e.sourceHandle ?? "output"),
          );
          if (mapping) {
            rewiredEdges.push({
              ...e,
              id: `${mapping.originalNodeId}-${e.target}-${e.sourceHandle ?? "output"}`,
              source: mapping.originalNodeId,
            });
          }
        }
      }

      const offsetX = groupNode.position.x - (groupData.internalNodes[0]?.position.x ?? 0);
      const offsetY = groupNode.position.y - (groupData.internalNodes[0]?.position.y ?? 0);
      const restoredNodes = groupData.internalNodes.map((n) => ({
        ...n,
        position: { x: n.position.x + offsetX, y: n.position.y + offsetY },
      }));

      const remainingNodes = nodes.filter((n) => n.id !== groupId);
      const remainingEdges = edges.filter(
        (e) => e.source !== groupId && e.target !== groupId,
      );

      mutateAndCommit(() => ({
        nodes: [...remainingNodes, ...restoredNodes],
        edges: [...remainingEdges, ...groupData.internalEdges, ...rewiredEdges],
        selectedNodeId: null,
      }), "Ungroup");
      markDirty();
    },

    reorderMaterialLayers: (sadNodeId, fromIndex, toIndex) => {
      if (fromIndex === toIndex) return;
      const mutateAndCommit = getMutateAndCommit();
      mutateAndCommit((state) => {
        const layerEdges = state.edges
          .filter((e) => e.target === sadNodeId && /^Layers\[\d+\]$/.test(e.targetHandle ?? ""))
          .sort((a, b) => {
            const ai = parseInt(/\[(\d+)\]/.exec(a.targetHandle!)![1]);
            const bi = parseInt(/\[(\d+)\]/.exec(b.targetHandle!)![1]);
            return ai - bi;
          });

        const ordered = [...layerEdges];
        const [moved] = ordered.splice(fromIndex, 1);
        ordered.splice(toIndex, 0, moved);

        const layerEdgeIds = new Set(layerEdges.map((e) => e.id));
        const otherEdges = state.edges.filter((e) => !layerEdgeIds.has(e.id));
        const reindexed = ordered.map((e, i) => ({
          ...e,
          targetHandle: `Layers[${i}]`,
        }));

        return { edges: [...otherEdges, ...reindexed] };
      }, "Reorder layers");
      markDirty();
    },

    addMaterialLayer: (sadNodeId, layerType) => {
      const mutateAndCommit = getMutateAndCommit();
      mutateAndCommit((state) => {
        const existingLayerEdges = state.edges.filter(
          (e) => e.target === sadNodeId && /^Layers\[\d+\]$/.test(e.targetHandle ?? ""),
        );
        const nextIndex = existingLayerEdges.length;

        const layerNodeId = crypto.randomUUID();
        const layerDefaults = getDefaults(`MaterialProvider:${layerType}`);
        const layerNode: Node = {
          id: layerNodeId,
          type: `Material:${layerType}`,
          position: { x: -300, y: nextIndex * 150 },
          data: { type: layerType, fields: { ...layerDefaults } },
        };

        const matNodeId = crypto.randomUUID();
        const matNode: Node = {
          id: matNodeId,
          type: "Material:Constant",
          position: { x: -600, y: nextIndex * 150 },
          data: { type: "Constant", fields: { Material: "stone" } },
        };

        const layerEdge: Edge = {
          id: `${layerNodeId}-${sadNodeId}`,
          source: layerNodeId,
          sourceHandle: "output",
          target: sadNodeId,
          targetHandle: `Layers[${nextIndex}]`,
        };

        const matEdge: Edge = {
          id: `${matNodeId}-${layerNodeId}`,
          source: matNodeId,
          sourceHandle: "output",
          target: layerNodeId,
          targetHandle: "Material",
        };

        return {
          nodes: [...state.nodes, layerNode, matNode],
          edges: [...state.edges, layerEdge, matEdge],
        };
      }, "Add layer");
      markDirty();
    },

    removeMaterialLayer: (sadNodeId, layerIndex) => {
      const mutateAndCommit = getMutateAndCommit();
      mutateAndCommit((state) => {
        const layerEdge = state.edges.find(
          (e) => e.target === sadNodeId && e.targetHandle === `Layers[${layerIndex}]`,
        );
        if (!layerEdge) return {};

        const layerNodeId = layerEdge.source;
        const downstreamEdges = state.edges.filter((e) => e.target === layerNodeId);
        const downstreamNodeIds = new Set(downstreamEdges.map((e) => e.source));

        const removeNodeIds = new Set([layerNodeId, ...downstreamNodeIds]);
        const removeEdgeIds = new Set([
          layerEdge.id,
          ...downstreamEdges.map((e) => e.id),
          ...state.edges.filter((e) => removeNodeIds.has(e.source) || removeNodeIds.has(e.target)).map((e) => e.id),
        ]);

        const remainingEdges = state.edges.filter((e) => !removeEdgeIds.has(e.id));

        const layerEdges = remainingEdges
          .filter((e) => e.target === sadNodeId && /^Layers\[\d+\]$/.test(e.targetHandle ?? ""))
          .sort((a, b) => {
            const ai = parseInt(/\[(\d+)\]/.exec(a.targetHandle!)![1]);
            const bi = parseInt(/\[(\d+)\]/.exec(b.targetHandle!)![1]);
            return ai - bi;
          });

        const layerEdgeIds = new Set(layerEdges.map((e) => e.id));
        const otherEdges = remainingEdges.filter((e) => !layerEdgeIds.has(e.id));
        const reindexed = layerEdges.map((e, i) => ({
          ...e,
          targetHandle: `Layers[${i}]`,
        }));

        return {
          nodes: state.nodes.filter((n) => !removeNodeIds.has(n.id)),
          edges: [...otherEdges, ...reindexed],
        };
      }, "Remove layer");
      markDirty();
    },

    changeMaterialLayerType: (layerNodeId, newType, sadNodeId) => {
      const mutateAndCommit = getMutateAndCommit();
      mutateAndCommit((state) => {
        const oldNode = state.nodes.find((n) => n.id === layerNodeId);
        if (!oldNode) return {};

        const materialEdge = state.edges.find(
          (e) => e.target === layerNodeId && e.targetHandle === "Material",
        );

        const layerEdge = state.edges.find(
          (e) => e.source === layerNodeId && e.target === sadNodeId,
        );
        if (!layerEdge) return {};

        const newNodeId = crypto.randomUUID();
        const layerDefaults = getDefaults(`MaterialProvider:${newType}`);
        const newNode: Node = {
          id: newNodeId,
          type: `Material:${newType}`,
          position: { ...oldNode.position },
          data: { type: newType, fields: { ...layerDefaults } },
        };

        const edgesToRemove = new Set(
          state.edges
            .filter((e) => e.source === layerNodeId || e.target === layerNodeId)
            .map((e) => e.id),
        );
        const remainingEdges = state.edges.filter((e) => !edgesToRemove.has(e.id));

        const newLayerEdge: Edge = {
          id: `${newNodeId}-${sadNodeId}`,
          source: newNodeId,
          sourceHandle: "output",
          target: sadNodeId,
          targetHandle: layerEdge.targetHandle,
        };

        const newEdges: Edge[] = [newLayerEdge];

        if (materialEdge) {
          newEdges.push({
            ...materialEdge,
            id: `${materialEdge.source}-${newNodeId}`,
            target: newNodeId,
            targetHandle: "Material",
          });
        }

        return {
          nodes: [...state.nodes.filter((n) => n.id !== layerNodeId), newNode],
          edges: [...remainingEdges, ...newEdges],
        };
      }, "Change layer type");
      markDirty();
    },
  };
};
