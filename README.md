# README for Alex

# Start up on Codespaces (Slower load time)

1. Should be able to start up a new codespace for this repo (on this development repo it's currently ~8-9minutes to start up, far cry from the 1 minute on the outward facing repo)
2. Run `npm install`
3. Run `npm run compile`
4. Hit the Run and Debug button on the left of VSCode. Click Run Extension. This should open the extension in debug mode in a new tab
5. The new tab might take a while to load and will look like it's doing nothing for a few seconds and then it will reload again with the quickstart panels open.

# Start up Locally (Faster load time)

1. Or you can pull this branch down on your machine, and run it in a dev container locally -- should be faster.
2. Same steps 2-4 above.

# Editing

- We made a little `edit text` button which should allow you to quickly edit the markdown file associated with the current page you're viewing. You'll have to `cmd + s` to save and then `cmd + r` to reload the extension to see the changes though.
- For editing the tip box to connect to zenML, that's actually its own html file in `zenmlQuickstart/sections/basicPipeline/connectToZenmlCloud.html`
- If you edit any of the code files and `cmd + s` that will save the changes to the code files unless you hit the `reset code` button for that particular file.
- If you want to break any of the steps into more steps, you'd just have to make a new object where you want it in the `quickstartMetadata.json` file. See Structure below for how that's stuctured.

# Structure

- We're using a JSON to organize all the files into sections and steps inside each section. That is the `src > quickstartMetadata.json` file
- The `Metadata` object has a sections array with `Section` objects.
- Each `Section` object has a `Steps` array.
- Each step has a markdown file associated with it (doc), an optional code file (code), and an optional html file with interactive elements (this was going to be displayed in the side panel, but now that we just have everything in one panel, it just gets displayed after the markdown file).
- If the optional code file doesn't exist, then the document just opens a single panel that takes up the whole screen rather than split screen.
- All the files are in the `zenmlQuickstart` folder.
  - assets contains the pictures
  - quickstartModules contains the codefiles downloaded from the original quickstart that are being used in this tutorial
  - Sections contain the actual tutorial markdown files and code files that are being referenced in the `quickstartMetadata.json` file. Right now each Section has its own directory with files.
