import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, RemoveAndDeleteSettings, RemoveAndDeleteSettingTab } from "./settings";
import { registerCommands } from "./commands/remove-and-delete";

export default class RemoveAndDeletePlugin extends Plugin {
	settings: RemoveAndDeleteSettings;

	async onload() {
		await this.loadSettings();

		registerCommands(this);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new RemoveAndDeleteSettingTab(this.app, this));
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<RemoveAndDeleteSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}