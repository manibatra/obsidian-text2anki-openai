# Text2Anki using OpenAI

## Flashcard Generator Plugin for Obsidian

The Flashcard Generator plugin automatically generates flashcards from your Obsidian notes using the OpenAI API and pushes them to a local Anki app.

## Features

-   Automatically generate flashcards from bullet points(they work best) in Obsidian notes.
-   Push generated flashcards to the Anki app.
-   Specify a custom deck name for the generated flashcards in Anki.
-   Configure the OpenAI GPT model to use for flashcard generation.
-   Specify a custom user prompt to be used for generating the flashcards.

## Usage

1. Open a note in Obsidian.
2. Run the "Generate flashcards from current file" command. The plugin will extract flashcards from the note and push them to the Anki app running locally.

To specify a custom deck name for the generated flashcards, add a line at the beginning of the note in the following format:

```
Deck: Computer Science::Python
```

## Settings

You can configure the following settings in the Flashcard Generator plugin:

1. **OpenAI API Key**: Add your OpenAI API key to enable the flashcard generation feature.
2. **Anki Deck Name**: Specify the default Anki deck name where flashcards will be added.
3. **OpenAI GPT Model Name**: Select the OpenAI GPT model to use for flashcard generation.

## Dependencies

This plugin requires the following dependencies:

-   Obsidian
-   OpenAI (`openai`)
-   Anki app running locally with [AnkiConnect](https://ankiweb.net/shared/info/2055492159) installed

## Known Issues

If you encounter any issues, please report them on the [GitHub issues page](https://github.com/obsidian-text2anki-openai/issues).
