# ZenML VS Code Quickstart Extension Development Guide

Welcome to the development repository for the ZenML VS Code Quickstart Extension! This extension aims to smoothly onboard developers looking to get started with ZenML. This guide is intended for contributors looking to develop and extend the functionality of the ZenML VS Code Quickstart Extension.

If you're looking to use the Quickstart Extension head [here](https://github.com/zenml-io/vscode-quickstart).

If you're looking for the ZenML Extension for VS Code click [here](https://github.com/zenml-io/vscode-zenml).

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
   `npm install`

3. Open the project in Visual Studio Code.

4. You should be prompted to open the project in a devcontainer if you have the Dev Containers extension installed. If not, open the project by
   selecting "Dev Containers: Reopen in Container" from the VS Code command palette.

5. Once the container finishes building, you can open the extension for testing or debugging by pressing F5.

**Note**: If you're finding the extension is behaving oddly, double check that the project is running in a devcontainer before starting up the extension in debug mode. Multiple parts of the extension expect to be running in devcontainer and will break otherwise.

## Developing the Extension

The extension is built to run in three different devcontainer environments: a development devcontainer (this repository), and either a Github Codespaces or local devcontainer for the user-facing repository. (https://github.com/zenml-io/vscode-quickstart) There are instructions for how to install and use the Codespaces and local devcontainer options in the readme for the vscode-quickstart repository.

Keep in mind that the changes made to the extension will need to be tested in both of the user-facing devcontainers as well.

### Building the Extension

The quickstart is meant to be used from this repo: https://github.com/zenml-io/vscode-quickstart - any changes to the extension code itself or to `zenmlQuickstart` files made in this development repository need to be moved to and tested on the user-facing repository. Currently, this process is done manually and with npm scripts.

When you've made changes to the extension you'll need to build it, install [vsce](https://github.com/microsoft/vscode-vsce) and run `vsce package` from the extension directory to create a new .vsix file based on the changes you've made. There is also an npm script `buildExtension:replace` which will build the extension and replace the .vsix file with the newly packaged extension in both the `vscode-quickstart-extension` repo, and by relative path, in the user-facing `quickstart-extension` repo. **Note**: `buildExtension:replace` relies on the relative location of the two cloned repositories - they should be side-by-side for this command to work.

Likewise, if you make changes to the files contained in `zenmlQuickstart`, those changed files will need to be moved to the `quickstart-extension` repo as well.

### Building the Docker Image

The process of building the docker image/.devcontainer upon first opening the quickstart can be slow, to decrease the time a user spends initially waiting when they open the quickstart in a devcontainer locally or in a Github codespace the user facing repository uses a custom image with zenml, pyarrow, and sklearn already installed. The Dockerfile used to build the image that gets pushed to DockerHub is on the `docker-image-build` branch of this repository.

Check out this [guide](https://docs.docker.com/guides/getting-started/build-and-push-first-image/) for instructions on how to build the image and upload it. You'll need to make sure that the devcontainer.json references this image on any branches that should use it, for example: `"image": "zenml/quickstart:latest"` will use the latest image for quickstart on Dockerhub.

### Dev Container

The Dockerfile and devcontainer.json configurations are similar to the corresponding configurations for the deployed Quickstart-Extension but with some changes to make development easier. The Quickstart-Extension is meant to be run in a Dev Container, either locally or in a Github Codespace. Because of that, development takes place using a Dev Container to more closely match the deployed environment. The configuration for the devcontainer is contained in the `devcontainer.json` file, which builds on top of the Dockerfile in `.devcontainer`

### Overview of Codebase

The quickstart is broken up into a series of sections and is meant to be followed from section one through to the end. `zenmlQuickstart/sections` is where the files for each section are located. `quickstartMetadata.json` organizes those sections into a series of steps. Very broadly - each step will appear in a webview panel with descriptive text and load a corresponding python file to run next to.

When the extension activates (`extension.ts`), the `Quickstart` class is responsible for orchestrating the walkthrough.

## Documentation

For more detailed documentation on how to use ZenML, please refer to the [ZenML Documentation](https://docs.zenml.io/).
