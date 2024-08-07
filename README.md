# ZenML VS Code Quickstart Extension Development Guide

Welcome to the development repository for the ZenML VSCode Quickstart Extension! This guide is intended for contributors looking to develop and extend the functionality of the ZenML VSCode Quickstart Extension. The extension aims to smoothly onboard developers looking to get started with ZenML.

If you're looking to *use* the Quickstart Extension head [here](https://github.com/zenml-io/vscode-quickstart).

If you're looking for the ZenML Extension for VSCode click [here](https://github.com/zenml-io/vscode-zenml).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/download/)
- [Visual Studio Code](https://code.visualstudio.com/Download)
- [Docker](https://www.docker.com/get-started/)
- [Dev Containers Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### Installation

1. Clone the repository:
   `git clone https://github.com/zenml-io/vscode-quickstart-extension cd vscode-quickstart-extension`

2. Install dependencies:
   `npm install`, then `npm run compile`

3. Open the project in Visual Studio Code.

4. You should be prompted to open the project in a devcontainer if you have the Dev Containers extension installed. If not, open the project by
   selecting "Dev Containers: Reopen in Container" from the VS Code command palette (`cmd + shift + p` if you're on MacOS).

5. Once the container finishes building, you can open the extension for testing or debugging by pressing `F5`, or by opening the Run and Debug side panel and hitting Run Extension.

### Building the Extension

When you've made changes to the extension code you'll need to compile the extension by running `npm run compile`.
Next you'll need to rebuild and reopen the container to see the changes.

To build the extension itself, install [vsce](https://github.com/microsoft/vscode-vsce) and run `vsce package` from the extension directory.

## Developing the Extension

The extension is only made to be run in a Dev Container and is not intended to be downloaded and used through the Extension MarketPlace

### Dev Container

The Dockerfile and devcontainer.json configurations are similar to the corresponding configurations for the deployed Quickstart-Extension but with some changes to make development easier. The Quickstart-Extension is meant to be run in a Dev Container, either locally or in a Github Codespace. Because of that, development takes place using a Dev Container to more closely match the deployed environment.

### Overview of Codebase

The quickstart is broken up into a series of sections and is meant to be followed from section one through to the end. `zenmlQuickstart/sections` is where the files for each section are located. `quickstartMetadata.json` organizes those sections into a series of steps. Very broadly - each step will appear in a webview panel with descriptive text and load a corresponding python file to run next to.

When the extension activates (`extension.ts`), the `Quickstart` class is responsible for orchestrating the walkthrough.

### Editing Flow / Content
There is an `edit text` button in the WebView HTML that can be enabled by uncommenting it to make it easier to make edits to the markdown file while you are previewing the Quickstart flow. You can then `cmd + s` to save and then `cmd + r` to reload the extension to see the changes to the text.

To make deeper changes like adding steps or reorganizing files, you'll have to make changes to the `quickstartMetadata.json` file.

- The `Metadata` object has a sections array with `Section` objects.
- Each `Section` object has a `Steps` array.
- Each step has a markdown file associated with it (`doc`), and an optional code file (`code`).
- If the optional code file doesn't exist, then the document just opens a single panel that takes up the whole screen rather than split screen.



## Documentation

For more detailed documentation on how to use ZenML, please refer to the [ZenML Documentation](https://docs.zenml.io/).
