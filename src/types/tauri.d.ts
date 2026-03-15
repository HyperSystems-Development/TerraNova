declare module "@tauri-apps/api";
declare module "@tauri-apps/api/fs" {
	export function exists(path: string): Promise<boolean>;
	export function readTextFile(path: string): Promise<string>;
	export function writeFile(options: { path: string; contents: string } | string): Promise<void>;
}
declare module "@tauri-apps/plugin-dialog" {
	export function ask(message: string, options?: any): Promise<boolean>;
	export function open(options?: any): Promise<any>;
	export function save(options?: any): Promise<any>;
}
