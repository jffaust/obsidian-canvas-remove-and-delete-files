import { App, Notice, TFile, ItemView, Plugin } from "obsidian";

// Define a minimal interface for the Canvas internal API
interface CanvasNode {
	file?: TFile;
	[key: string]: unknown;
}

interface Canvas {
	selection: Set<CanvasNode>;
	removeNode(node: CanvasNode): void;
	requestSave(): void;
	[key: string]: unknown;
}

interface CanvasView extends ItemView {
	canvas: Canvas;
}

export function registerCommands(plugin: Plugin) {
	plugin.addCommand({
		// eslint-disable-next-line obsidianmd/commands/no-plugin-id-in-command-id
		id: "remove-and-delete",
		// eslint-disable-next-line obsidianmd/commands/no-plugin-name-in-command-name
		name: "Remove and delete",
		checkCallback: (checking: boolean) => {
			const activeView = plugin.app.workspace.getActiveViewOfType(ItemView);
			
			if (!activeView) return false;

			const isCanvas = activeView.getViewType() === "canvas";

			if (isCanvas) {
				if (!checking) {
					// eslint-disable-next-line @typescript-eslint/no-floating-promises
					removeAndDeleteFromCanvas(plugin.app, activeView as unknown as CanvasView);
				}
				return true;
			}
			return false;
		}
	});
}

async function removeAndDeleteFromCanvas(app: App, canvasView: CanvasView) {
	const canvas = canvasView.canvas;

	if (!canvas) {
		new Notice("Canvas not found.");
		return;
	}

	const selection = canvas.selection;
	if (!selection || selection.size === 0) {
		new Notice("No items selected in the canvas.");
		return;
	}

	let deletedCount = 0;
	const nodesToRemove: { node: CanvasNode; file: TFile }[] = [];

	for (const node of selection) {
		if (node.file && node.file instanceof TFile) {
			nodesToRemove.push({ node, file: node.file });
		}
	}

	if (nodesToRemove.length === 0) {
		new Notice("No valid files found in the selection.");
		return;
	}

	for (const { node, file } of nodesToRemove) {
		try {
			if (typeof canvas.removeNode === "function") {
				canvas.removeNode(node);
			}

			await app.fileManager.trashFile(file);
			deletedCount++;
		} catch (error) {
			console.error("Error removing/deleting file:", error);
			new Notice(`Failed to delete ${file.path}`);
		}
	}

	if (deletedCount > 0) {
		if (typeof canvas.requestSave === "function") {
			canvas.requestSave();
		}
		new Notice(`Removed and deleted ${deletedCount} file(s).`);
	}
}
