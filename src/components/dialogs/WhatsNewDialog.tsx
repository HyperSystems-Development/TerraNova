import { useCallback, useEffect, useState } from "react";
import { ChangelogDialog } from "./ChangelogDialog";

const CURRENT_VERSION = "1.5.9";
const CURRENT_VERSION_LABEL = "1.5.9 McCal's QoL";
const STORAGE_KEY = "terranova:whats-new-seen";
const SUPPRESS_KEY = "terranova:whats-new-suppress";

export function useWhatsNew() {
	let seen = false;
	let suppressed = false;
	try {
		seen = localStorage.getItem(STORAGE_KEY) === CURRENT_VERSION;
		suppressed = localStorage.getItem(SUPPRESS_KEY) === "true";
	} catch {
		// localStorage unavailable
	}
	function dismiss(suppress: boolean) {
		try {
			localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
			if (suppress) {
				localStorage.setItem(SUPPRESS_KEY, "true");
			} else {
				localStorage.removeItem(SUPPRESS_KEY);
			}
		} catch {
			// ignore
		}
	}
	return { shouldShow: !seen && !suppressed, dismiss };
}

interface ChangeItem {
	label: string;
	description: string;
}

interface Section {
	title: string;
	items: ChangeItem[];
}

const HIGHLIGHTS: Section[] = [
	{
		title: "What to try",
		items: [
			{
				label: "Hytale-accurate tint bands",
				description:
					"DensityDelimited TintProvider bands now keep real Hytale-style ranges, Tint.Type: Constant, and a valid default density node when needed.",
			},
			{
				label: "Weather files in a dedicated editor",
				description:
					"Open a JSON file from Server\\Weathers to get a real scene preview, quick controls, collapsible track summaries, and direct save support instead of a raw JSON fallback.",
			},
			{
				label: "Environment files in a dedicated editor",
				description:
					"Open a JSON file from Server\\Environments to inspect hourly forecasts, edit a primary weather for the current hour, and open linked weather files directly.",
			},
			{
				label: "Simple Controls vs In-Depth Controls",
				description:
					"Both editors now default to a simpler control layer for fast edits, while the in-depth mode keeps the full weather tracks, tags, and raw-field tooling out of the way until you need them.",
			},
			{
				label: "Preview drawers you can expand on demand",
				description:
					"The weather preview stack is now broken into collapsible sections for the 24h strip, track previews, sampled values, and asset breakdown so the scene card stays visible.",
			},
			{
				label: "Issue log and tips panels",
				description:
					"In in-depth mode, both editors expose issue logs and tips behind a compact detail-panel selector instead of keeping those callouts permanently expanded.",
			},
			{
				label: "Clickable asset file paths",
				description:
					"Environment and weather file references in the Atmosphere workflow now open directly in the editor so you can move from biome setup into the dedicated file editors quickly.",
			},
			{
				label: "Biome browser and validation QoL",
				description:
					"Biome search, richer template entries, material autocomplete, legacy node fixes, and one-click validation fixes are all still part of this combined QoL pass.",
			},
			{
				label: "Cleaner editor chrome",
				description:
					"Section headers, simple control cards, and header actions now share the same stronger styling and icon treatment so the weather and environment editors read more clearly.",
			},
		],
	},
	{
		title: "Known limitations",
		items: [
			{
				label: "Weather/environment graph routes remain disabled",
				description:
					"The dedicated file editors are active, but graph mode for weather, environment, and tint stays disabled until the true Hytale-native provider graph work is ready.",
			},
		],
	},
];

const FULL_CHANGELOG: Section[] = [
	{
		title: "Features",
		items: [
			{ label: "Hytale-accurate tint workflow", description: "DensityDelimited tint bands now preserve Hytale-style Range values and export with Tint.Type set to Constant. Default density injection ensures valid exports when missing." },
			{ label: "Dedicated weather editor", description: "Weather JSON files open into a preview-driven editor with save support, sampled track summaries, and collapsible preview drawers." },
			{ label: "Dedicated environment editor", description: "Environment JSON files open into a forecast-focused editor with current-hour controls, hourly weather editing, and direct links to linked weather files." },
			{ label: "Simple Controls and In-Depth Controls", description: "Both editors default to a simpler control layer for quick edits while keeping advanced track/tag/raw-field tooling behind an explicit in-depth toggle." },
			{ label: "Collapsible preview drawers", description: "The preview stack is split into collapsible drawers (24h strip, track preview, sampled values, asset breakdown) so the main scene preview remains visible." },
		],
	},
	{
		title: "Quality of life",
		items: [
			{ label: "Clickable asset file paths", description: "Environment and weather file references in Atmosphere workflows now open directly in the editor." },
			{ label: "Cleaner editor chrome", description: "Section headers, simple control cards, and header actions share stronger icon-forward styling for improved clarity." },
			{ label: "Biome browser & validation", description: "Biome search, richer template entries, material autocomplete, and one-click validation fixes." },
			{ label: "Issue log and tips toggles", description: "Issue logs and tips can be shown or hidden from compact detail-panel controls." },
		],
	},
	{
		title: "Bug fixes",
		items: [
			{ label: "Environment inheritance handling", description: "Files that inherit forecasts from parents are no longer treated as broken." },
			{ label: "Guard against update-depth loops", description: "Asset graph bridge no longer triggers maximum update depth crashes." },
			{ label: "Stable hook order on empty loads", description: "Editors preserve hook order when loading from empty state to avoid render crashes." },
			{ label: "Tint export stability", description: "Edited tint bands now round-trip with stable delimiter IDs and consistent export fields." },
		],
	},
	{
		title: "Potential bugs / known limitations",
		items: [
			{ label: "Graph mode disabled", description: "Weather/environment graph routes (Hytale-native provider graph) remain disabled in this release." },
			{ label: "Dev HMR adjustments", description: "React Fast Refresh was temporarily disabled in development to avoid HMR issues; hot-reload behavior may differ until refactors are applied." },
			{ label: "Large asset cache", description: "Hytale asset cache can reach multiple GB; ensure disk space before syncing and monitor in the Sync modal." },
			{ label: "Dev warnings", description: "Some TypeScript/dev-only warnings and edge cases may still appear; run the full typecheck (pnpm exec tsc --noEmit) during release validation." },
		],
	},
];

interface WhatsNewDialogProps {
	open: boolean;
	onClose: (suppress: boolean) => void;
}

export function WhatsNewDialog({ open, onClose }: WhatsNewDialogProps) {
	const [view, setView] = useState<"highlights" | "changelog">("highlights");
	const [suppress, setSuppress] = useState(false);
	const [showAllVersions, setShowAllVersions] = useState(false);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (!open) return;
			if (event.key === "Escape") {
				event.preventDefault();
				onClose(suppress);
			}
		},
		[open, onClose, suppress],
	);

	useEffect(() => {
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);

	if (!open) return null;

	return (
		<>
			<div
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
				onClick={() => onClose(suppress)}
			>
				<div
					className="bg-tn-panel border border-tn-border rounded-lg shadow-xl w-[580px] max-h-[82vh] flex flex-col"
					onClick={(event) => event.stopPropagation()}
				>
					<div className="flex items-center justify-between px-5 py-4 border-b border-tn-border shrink-0">
						<div className="flex items-center gap-2">
							{view === "changelog" && (
								<button
									onClick={() => setView("highlights")}
									className="text-tn-text-muted hover:text-tn-text transition-colors text-sm leading-none pr-2 flex items-center gap-1"
									aria-label="Back"
								>
									<svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
										<path d="M10 3L5 8l5 5V3z" />
									</svg>
									Back
								</button>
							)}
							<div>
								<h2 className="text-sm font-semibold">
									{view === "changelog" ? "Full Changelog" : "What's new in TerraNova"}
								</h2>
								<p className="text-[11px] text-tn-text-muted mt-0.5">v{CURRENT_VERSION_LABEL}</p>
							</div>
						</div>
						<button
							onClick={() => onClose(suppress)}
							className="text-tn-text-muted hover:text-tn-text transition-colors text-lg leading-none px-1"
							aria-label="Close"
						>
							x
						</button>
					</div>

					<div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
						{view === "highlights" && (
							<>
								{HIGHLIGHTS.map((section) => (
									<div key={section.title}>
										<h3 className="text-[11px] font-semibold uppercase tracking-wider text-tn-text-muted mb-2">{section.title}</h3>
										<ul className="space-y-3">
											{section.items.map((item) => (
												<li key={item.label} className="flex gap-3">
													<span className="mt-[5px] shrink-0 w-1.5 h-1.5 rounded-full bg-tn-accent" />
													<div>
														<p className="text-[13px] font-medium leading-snug">{item.label}</p>
														<p className="text-[12px] text-tn-text-muted leading-relaxed mt-0.5">{item.description}</p>
													</div>
												</li>
											))}
										</ul>
									</div>
								))}
							</>
						)}

						{view === "changelog" && (
							<div className="space-y-5">
								{FULL_CHANGELOG.map((section) => (
									<div key={section.title}>
										<h3 className="text-[11px] font-semibold uppercase tracking-wider text-tn-text-muted mb-2">{section.title}</h3>
										<ul className="space-y-2">
											{section.items.map((item) => (
												<li key={item.label} className="flex gap-3">
													<span className="mt-[5px] shrink-0 w-1.5 h-1.5 rounded-full bg-tn-border" />
													<div>
														<p className="text-[12px] font-medium leading-snug">{item.label}</p>
														<p className="text-[11px] text-tn-text-muted leading-relaxed mt-0.5">{item.description}</p>
													</div>
												</li>
											))}
										</ul>
									</div>
								))}
							</div>
						)}
					</div>

					<div className="flex items-center justify-between px-5 py-3 border-t border-tn-border shrink-0">
						<div className="flex items-center gap-3">
							<label className="flex items-center gap-2 cursor-pointer select-none">
								<input type="checkbox" checked={suppress} onChange={(event) => setSuppress(event.target.checked)} className="w-3.5 h-3.5 accent-tn-accent" />
								<span className="text-[11px] text-tn-text-muted">Don't show on startup</span>
							</label>
							{view === "highlights" && (
								<button onClick={() => setView("changelog")} className="text-[11px] text-tn-accent hover:opacity-80 transition-opacity">Full changelog -&gt;</button>
							)}
							<button onClick={() => setShowAllVersions(true)} className="text-[11px] text-tn-text-muted hover:text-tn-text transition-colors">Past versions</button>
						</div>
						<button onClick={() => onClose(suppress)} className="px-4 py-1.5 text-xs rounded bg-tn-accent text-tn-bg font-medium hover:opacity-90">Got it</button>
					</div>
				</div>
			</div>
			<ChangelogDialog open={showAllVersions} onClose={() => setShowAllVersions(false)} />
		</>
	);
}
