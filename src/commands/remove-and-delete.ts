import { App, Notice, TFile, ItemView, Plugin, MarkdownView } from "obsidian";

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
			const isMarkdown = activeView.getViewType() === "markdown";

			if (isCanvas || isMarkdown) {
				if (!checking) {
					if (isCanvas) {
						// eslint-disable-next-line @typescript-eslint/no-floating-promises
						removeAndDeleteFromCanvas(plugin.app, activeView as unknown as CanvasView);
					} else {
						// eslint-disable-next-line @typescript-eslint/no-floating-promises
						removeAndDeleteFromMarkdown(plugin.app, activeView as unknown as MarkdownView);
					}
				}
				return true;
			}
			return false;
		}
	});
}

async function removeAndDeleteFromMarkdown(app: App, view: MarkdownView) {
	const editor = view.editor;
	const selection = editor.getSelection();

	let textToProcess = selection;
	let replaceRange: { from: {line: number, ch: number}, to: {line: number, ch: number} } | null = null;

	// If no text selected, try to find a link/image under the cursor
	if (!textToProcess) {
		const cursor = editor.getCursor();
		const lineText = editor.getLine(cursor.line);
		
		// Regexes to identify common link formats
		// 1. WikiLinks: ![[filename]] or ![[filename|alias]]
		// 2. Markdown Links: ![alt](filename)
		const linkRegexes = [
			/!?\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g,
			/!?\[([^\]]*)\]\(([^)]+)\)/g
		];

		let foundMatch = null;
		for (const regex of linkRegexes) {
			let match;
			regex.lastIndex = 0;
			while ((match = regex.exec(lineText)) !== null) {
				const start = match.index;
				const end = start + match[0].length;
				
				// Check if cursor is inside or at the boundaries of the link
				if (cursor.ch >= start && cursor.ch <= end) {
					foundMatch = match;
					replaceRange = {
						from: { line: cursor.line, ch: start },
						to: { line: cursor.line, ch: end }
					};
					break;
				}
			}
			if (foundMatch) break;
		}

		if (foundMatch) {
			textToProcess = foundMatch[0];
		} else {
			new Notice("No file or image selected (click on an image or select text).");
			return;
		}
	}

	const wikiLinkRegex = /!?\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
	const markdownLinkRegex = /!?\[([^\]]*)\]\(([^)]+)\)/g;

	let match;
	const filesToDelete: TFile[] = [];

	// Process WikiLinks
	while ((match = wikiLinkRegex.exec(textToProcess)) !== null) {
		const linkText = match[1] || "";
		// Resolve link using the current file as context
		const file = app.metadataCache.getFirstLinkpathDest(linkText, view.file ? view.file.path : "");
		if (file instanceof TFile) {
			filesToDelete.push(file);
		}
	}

	// Process Markdown Links
	while ((match = markdownLinkRegex.exec(textToProcess)) !== null) {
		const linkText = match[2] || "";
		const decodedLink = decodeURIComponent(linkText);
		const file = app.metadataCache.getFirstLinkpathDest(decodedLink, view.file ? view.file.path : "");
		if (file instanceof TFile) {
			filesToDelete.push(file);
		}
	}

	if (filesToDelete.length === 0) {
		new Notice("No valid files found to delete in selection.");
		return;
	}

	let deletedCount = 0;
	const deletedFiles: string[] = [];

	for (const file of filesToDelete) {
		try {
			await app.fileManager.trashFile(file);
			deletedCount++;
			deletedFiles.push(file.name);
		} catch (error) {
			console.error("Error removing/deleting file:", error);
			new Notice(`Failed to delete ${file.path}`);
		}
	}

	// Remove the text from the editor
	if (deletedCount > 0) {
		if (replaceRange) {
			editor.replaceRange("", replaceRange.from, replaceRange.to);
		} else {
			editor.replaceSelection("");
		}
		new Notice(`Deleted: ${deletedFiles.join(", ")}`);
	}
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
