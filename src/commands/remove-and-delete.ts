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
		id: "remove-and-delete",
		name: "Remove and delete",
		callback: () => removeAndDeleteFromCanvas(plugin.app),
	});
}

async function removeAndDeleteFromCanvas(app: App) {
	const view = app.workspace.getActiveViewOfType(ItemView);

	if (!view || view.getViewType() !== "canvas") {
		new Notice("The active view is not a canvas.");
		return;
	}

	const canvasView = view as unknown as CanvasView;
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
