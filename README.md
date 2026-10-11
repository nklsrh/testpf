# Super Cricket 3 CloudScript

Legacy CloudScript for PlayFab title `28AEC`. Every top-level `.js` file is one CloudScript file; PlayFab loads them all into one global scope.

## Deploying

Merging to `master` deploys. The `CloudScript` GitHub Action uploads every file as a new revision and makes it live. Nothing is uploaded by hand, and the PlayFab GitHub add-on isn't used.

- Every PR runs `node tools/cloudscript.mjs check`: each file must parse, and no function, `var` or handler may be defined in two files (the second would silently replace the first).
- The deploy needs the repo secret `PLAYFAB_SECRET_KEY` (a PlayFab developer secret key, in the `playfab` environment). Rotate it in Game Manager → Title settings → Secret Keys and update the secret.
- To roll back, make an earlier revision live in Game Manager → Automation → Cloud Script, then revert the commit so the next deploy doesn't undo it.
- To redeploy without a change, run the workflow from the Actions tab.

Check locally with `node tools/cloudscript.mjs check`.
