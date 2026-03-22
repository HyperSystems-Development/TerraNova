declare module "@tauri-apps/api";
declare module "@tauri-apps/plugin-dialog" {
	export function ask(message: string, options?: any): Promise<boolean>;
	export function open(options?: any): Promise<any>;
	export function save(options?: any): Promise<any>;
}
