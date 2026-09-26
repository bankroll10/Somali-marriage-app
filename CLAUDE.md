# Working with the founder

Standing rules. They hold across sessions and after `/clear`.

- **Pull requests go in batches.** When a prompt is finished, commit it and push it to the
  working branch (`claude/hello-gr0hoz`). Do not open a pull request or merge after every
  prompt. Several prompts collect on the branch. Only when the founder asks ("PR + merge")
  do you open one pull request for the whole batch, wait for CI to pass, and merge it.
- **Outreach drafts count as sent.** Drafts and opportunities the founder brings (from
  Claude Cowork, ChatGPT and so on) are logged as sent the same day in `docs/ASSETS.md`,
  unless the founder says otherwise.
- **Never ask for or print API keys** in chat, code, commits or logs.
- **Check `npm run verify` by its exit code** (`npm run verify > log 2>&1; echo $?`) before
  every commit. A grep over its output can hide a failure.
