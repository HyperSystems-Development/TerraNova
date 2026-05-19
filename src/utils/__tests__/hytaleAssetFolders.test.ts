import { beforeEach, describe, expect, it, vi } from "vitest";

const { pathExistsMock } = vi.hoisted(() => ({
  pathExistsMock: vi.fn(),
}));

vi.mock("../ipc", () => ({
  pathExists: pathExistsMock,
}));

import {
  clearAvailableHytaleAssetFoldersCache,
  getAvailableHytaleAssetFolders,
  hytaleAssetFolders,
} from "../hytaleAssetFolders";

describe("hytaleAssetFolders cache", () => {
  beforeEach(() => {
    clearAvailableHytaleAssetFoldersCache();
    pathExistsMock.mockReset();
  });

  it("reuses cached folder checks for the same base path", async () => {
    pathExistsMock.mockImplementation(async (path: string) => path.endsWith("Common/Blocks"));

    const first = await getAvailableHytaleAssetFolders("hytale-assets");
    const second = await getAvailableHytaleAssetFolders("hytale-assets");

    expect(first).toEqual(["Common/Blocks"]);
    expect(second).toEqual(["Common/Blocks"]);
    expect(pathExistsMock).toHaveBeenCalledTimes(hytaleAssetFolders.length);
  });

  it("can clear cached results and re-query the filesystem", async () => {
    pathExistsMock.mockResolvedValue(false);

    await getAvailableHytaleAssetFolders("hytale-assets");
    clearAvailableHytaleAssetFoldersCache("hytale-assets");
    await getAvailableHytaleAssetFolders("hytale-assets");

    expect(pathExistsMock).toHaveBeenCalledTimes(hytaleAssetFolders.length * 2);
  });
});
