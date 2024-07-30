- Start in `extension.ts`
- Start in `activate` function 
  - grab the `extensionUri` from the `context` argument value (VSCode stuff)
  - if running in devcontainer, start "the directory" 
  - create a session backup from `extensionUri` (not sure what this does or why we need it)
  - if there are any open terminals in any VSCode windows, close them
  - (thought: maybe make a new terminal instead? dunno if user will want to preserve current terminal)
  - make sure the sidebar is closed 
  - create `quickstart` instance (look into `Quickstart` constructor next)
  - start the `quickstart` instance
  - (restructure: move terminal control and sidebar control into `start` functionality)
  - add listener for when user closes a terminal and set things up so that a new terminal will be opened if there isn't already an open termimal later on if the program needs to switch into a terminal. 



- look into `Quickstart` class 
  - (possible refactor: look into whether public properties are necessary and why)

  - `constructor`
    - sets `metadata` on the instance
    - sets `QuickstartSection`s array on the instance (`sections` array)
    - sets VSCode `context` on the instance
    - sets the current section selection to be the first in the `sections` array

  - `start` method
    - invokes internal method `_codeModifiedListener()`
    - invokes internal method `_activeTExtEditorListener()`
    - opens a new VSCode terminal and sends it a text message
    - opens the first section in the `sections` array

  - `terminal` setter method sets the internal `_terminal` property to argument value
  - `terminal` getter method returns the internal `_terminal` property, creates one if `undefined`
  - (difference between 'panel' and 'terminal' => panel is the panel is the 'editor window')
  - (possible refactor: rename `panel` to be consistent with widespread VSCode naming conventions, per docs)
  - `panel` getter method returns the internal `_panel` property, creates one if `undefined`

  - (possible refactor: break `resetCode` method into several supporting methods)
  - `resetCode` method (suggested refactor: rename to `resetCodeToOriginalFromBackup`)
    - declare constant `doc` and init to `currentlyDisplayingDocument` (calling object property)
    - (`doc` is the code currently displayed in the section)
    - (possible refactor: rename `doc` to more descriptive variable name)
    - guard clause: return if there is no `doc`
    - initiate async behavior: show the code (I think?)
    - declare constant `activeEditor` and init to the VSCode active text editor
    - (possible refactor: rename `activeEditor`)
    - if there is no file backup or no active editor then return from the function
    - replace the path to point to the backup (why are we doing this in `resetCode`?)
    - (suggestion: comments should help explain why we are doing a step if it's unclear from the code)


My general naming guidelines:
- For functions/methods: I should be a newcomer to the code who can read the invocation and understand what the function is supposed to do without needing to look at the implementation. 
- For variables: I want to get a decent idea of what set of possible values the varaible can hold without having to gather context clues by having to look at everywhere it's used. 
  


