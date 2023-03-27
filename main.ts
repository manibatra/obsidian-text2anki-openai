import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	Notice,
	requestUrl,
} from "obsidian";
import { Configuration, OpenAIApi } from "openai";
interface FlashcardGeneratorSettings {
	modelName: string;
	prompt: string;
	apiKey: string;
	deckName: string;
}

const DEFAULT_SETTINGS: FlashcardGeneratorSettings = {
	apiKey: "",
	deckName: "Generated Flashcards",
	modelName: "gpt-4",
	prompt: "You are an AnkiAssistant that will create flashcards to be used in the Anki App. You should use HTML to format parts of the output according to Anki format. Provide code examples and anything that assists in recall. Separate the 'Front' and 'Back' of each flashcard with ||. Only use it once in the flashcard. Every flashcard should be separated by '======='",
};

export default class FlashcardGeneratorPlugin extends Plugin {
	settings: FlashcardGeneratorSettings;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	openai: any;

	async onload() {
		console.log("loading Flashcard Generator plugin");

		await this.loadSettings();

		this.addCommand({
			id: "generate-flashcards",
			name: "Generate flashcards from current file",
			callback: () => this.generateFlashcardsFromCurrentFile(),
		});

		this.addSettingTab(new FlashcardGeneratorSettingTab(this.app, this));

		// this.registerDomEvent(document, "click", (event: MouseEvent) => {
		// 	console.log("click", event);
		// });
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
		const configuration = new Configuration({
			apiKey: this.settings.apiKey,
		});

		this.openai = new OpenAIApi(configuration);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async generateFlashcardsFromCurrentFile() {
		if (!this.settings.apiKey) {
			new Notice(
				"OpenAI API key is required for Flashcard Generator plugin to work"
			);
		}

		const noteFile = this.app.workspace.getActiveFile(); // Currently Open Note
		if (noteFile === null) return; // Nothing Open

		const text = await this.app.vault.read(noteFile);

		if (!text) {
			new Notice(`Couldn't retrieve any text`);
			return;
		}

		// Extract the deck name from the note text
		const deckNameRegex = /^Deck:\s*(.+?)$/m;
		const match = text.match(deckNameRegex);
		const deckName = match ? match[1] : this.settings.deckName;

		// Remove the "Deck: ..." line from the text
		const cleanedText = text.replace(deckNameRegex, "").trim();

		try {
			// Display a waiting sign
			const waitingNotice = new Notice(
				"Generating flashcards, please wait...",
				120000
			);

			const response = await this.openai.createChatCompletion({
				messages: [
					{
						role: "system",
						content:
							"You are an AnkiAssistant that will create flashcards to be used in the Anki App.",
					},
					{
						role: "user",
						content: this.settings.prompt,
					},
					{
						role: "user",
						content:
							"Create flashcards from the following text:" +
							cleanedText,
					},
				],
				model: this.settings.modelName,
				temperature: 0.2,
				presence_penalty: -0.2,
			});

			waitingNotice.hide();

			const generatedFlashcards =
				response.data.choices[0].message.content;

			let deckId = await this.getDeckId(deckName);

			if (!deckId) {
				new Notice(
					`Could not find deck with name '${deckName}'. Creating it`
				);
				await this.createDeck(deckName);
				deckId = await this.getDeckId(deckName);
			}

			for (const flashcard of generatedFlashcards
				.trim()
				.split("=======")) {
				if (flashcard.length > 0) {
					let [front, back] = flashcard.split("||");
					front = front.replace("Front:", "").trim();
					back = back.replace("Back:", "").trim();

					await this.addCardToDeck(
						{
							front,
							back,
						},
						deckName
					);
				}
			}

			new Notice("Flashcards generated and added to Anki!");
		} catch (error) {
			console.error(error);
			new Notice("An error occurred while generating flashcards");
		}
	}

	async getDeckId(name: string) {
		try {
			const decks = await this.invokeAnkiConnect("deckNamesAndIds");
			for (const deck of decks) {
				if (deck.name === name) {
					return deck.id;
				}
			}
		} catch (error) {
			console.error(error);
		}

		return null;
	}

	async createDeck(deckName: string) {
		try {
			await this.invokeAnkiConnect("createDeck", {
				deck: deckName,
			});
		} catch (error) {
			console.error(error);
			new Notice("An error occurred while creating the deck");
		}
	}

	async addCardToDeck(
		note: { front: string; back: string },
		deckName: string
	) {
		const { front, back } = note;

		try {
			await this.invokeAnkiConnect("addNote", {
				note: {
					deckName: deckName,
					modelName: "Basic",
					fields: {
						Front: front,
						Back: back,
					},
					options: {
						allowDuplicate: false,
					},
					tags: ["generated"],
				},
			});
		} catch (error) {
			console.error(error);
			new Notice(error);
		}
	}

	async invokeAnkiConnect(action: string, params?: any) {
		const response = await requestUrl({
			url: "http://localhost:8765",
			method: "POST",
			body: JSON.stringify({
				action,
				params,
				version: 6,
			}),
		});

		const parsedResponse = await response.json;

		if (parsedResponse.hasOwnProperty("error")) {
			if (parsedResponse.error !== null) {
				throw new Error(parsedResponse.error);
			}
		}

		return parsedResponse.result;
	}

	onunload() {
		console.log("unloading Flashcard Generator plugin");
	}
}

class FlashcardGeneratorSettingTab extends PluginSettingTab {
	plugin: FlashcardGeneratorPlugin;

	constructor(app: App, plugin: FlashcardGeneratorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", {
			text: "Flashcard Generator plugin Settings",
		});

		new Setting(containerEl)
			.setName("OpenAI API Key")
			.setDesc("API key required for the OpenAI API")
			.addText((text) =>
				text
					.setPlaceholder("Enter API key")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Anki Deck Name")
			.setDesc("Name of the Deck in Anki where flashcards will be added")
			.addText((text) =>
				text
					.setPlaceholder("Enter Deck Name")
					.setValue(this.plugin.settings.deckName)
					.onChange(async (value) => {
						this.plugin.settings.deckName = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("OpenAI GPT Model Name")
			.setDesc("Name of the OpenAI GPT model to use")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("gpt-4", "gpt-4")
					.addOption("gpt-3.5-turbo", "gpt-3.5-turbo")
					.addOption("text-davinci-003", "text-davinci-003")
					.setValue(this.plugin.settings.modelName)
					.onChange(async (value) => {
						this.plugin.settings.modelName = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("OpenAI GPT Model Prompt")
			.setDesc("User Prompt to use for the OpenAI GPT model")
			.addText((text) =>
				text
					.setPlaceholder(
						"You are an AnkiAssistant that will create flashcards to be used in the Anki App. You should use HTML to format parts of the output according to Anki format. Provide code examples and anything that assists in recall. Separate the 'Front' and 'Back' of each flashcard with ||. Only use it once in the flashcard. Every flashcard should be separated by '======='"
					)
					.setValue(this.plugin.settings.prompt)
					.onChange(async (value) => {
						this.plugin.settings.prompt = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
