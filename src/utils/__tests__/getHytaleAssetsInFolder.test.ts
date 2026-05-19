import { beforeEach, describe, expect, it, vi } from "vitest";

const { listDirectoryMock } = vi.hoisted(() => ({
  listDirectoryMock: vi.fn(),
}));

vi.mock("../ipc", () => ({
  listDirectory: listDirectoryMock,
}));

import {
  clearHytaleAssetsInFolderCache,
  getHytaleAssetsInFolder,
} from "../getHytaleAssetsInFolder";

describe("getHytaleAssetsInFolder cache", () => {
  beforeEach(() => {
    clearHytaleAssetsInFolderCache();
    listDirectoryMock.mockReset();
  });

  it("reuses cached asset listings for the same folder", async () => {
    listDirectoryMock.mockResolvedValue([
      { name: "stone.png" },
      { name: ".DS_Store" },
      { name: "dirt.png" },
    ]);

    const first = await getHytaleAssetsInFolder("hytale-assets", "Common/Blocks");
    const second = await getHytaleAssetsInFolder("hytale-assets", "Common/Blocks");

    expect(first).toEqual(["stone.png", "dirt.png"]);
    expect(second).toEqual(["stone.png", "dirt.png"]);
    expect(listDirectoryMock).toHaveBeenCalledTimes(1);
  });

  it("clears cached asset listings per base path", async () => {
    listDirectoryMock.mockResolvedValue([{ name: "stone.png" }]);

    await getHytaleAssetsInFolder("hytale-assets", "Common/Blocks");
    clearHytaleAssetsInFolderCache("hytale-assets");
    await getHytaleAssetsInFolder("hytale-assets", "Common/Blocks");

    expect(listDirectoryMock).toHaveBeenCalledTimes(2);
  });
});
