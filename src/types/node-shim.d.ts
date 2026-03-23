declare module "node:fs" {
  export interface Dirent {
    name: string;
    isDirectory(): boolean;
    isFile(): boolean;
  }

  export function readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  export function readFileSync(path: string, encoding: "utf8"): string;

  const fs: {
    readdirSync: typeof readdirSync;
    readFileSync: typeof readFileSync;
  };

  export default fs;
}

declare module "node:path" {
  export const sep: string;
  export function join(...parts: string[]): string;
  export function relative(from: string, to: string): string;
  export function resolve(...parts: string[]): string;

  const path: {
    sep: typeof sep;
    join: typeof join;
    relative: typeof relative;
    resolve: typeof resolve;
  };

  export default path;
}

declare const process: {
  cwd(): string;
};
