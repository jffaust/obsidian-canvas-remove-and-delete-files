import {App, PluginSettingTab, Setting} from "obsidian";
import RemoveAndDeletePlugin from "./main";

export interface RemoveAndDeleteSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: RemoveAndDeleteSettings = {
	mySetting: 'default'
}

export class RemoveAndDeleteSettingTab extends PluginSettingTab {
	plugin: RemoveAndDeletePlugin;

	constructor(app: App, plugin: RemoveAndDeletePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Settings #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}