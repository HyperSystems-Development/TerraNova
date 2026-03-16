# Guide: Setup, Data Flow & First Steps

**Difficulty:** Beginner

This guide introduces the core WorldGen V2 workflow and the TerraNova editor structure.

## Getting Started

1. Create a new world using **File → New World**.
2. Choose a template to start with (e.g., "Starter Island") or create a blank world.
3. Open the **Node Editor** and familiarize yourself with the node graph.

## Core Concepts

### WorldGen V2 Flow

- **Nodes** represent generators, modifiers, or output connections.
- Each node outputs a value (density, material, etc.) that is used to build the world.
- The **world generator** evaluates the graph across all coordinates to produce terrain and biomes.

## Recommended Next Steps

- Read the [Understanding Basic Terrain Generation](./understanding-basic-terrain-generation.md) guide.
- Explore the [Glossary](../glossary/README.md) to learn key terms.
