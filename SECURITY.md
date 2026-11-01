# Security

## Supported versions

RPG Engine is below 1.0. Only the latest version on npm gets security fixes; a fix comes in a new release, never in an older one.

| Version | Supported |
|---|---|
| latest release | yes |
| anything older | no |

## Reporting a vulnerability

Please do not open a public issue. Report it privately on GitHub: in this repository's **Security** tab, choose **Report a vulnerability** ([direct link](https://github.com/stefanocaronia/rpg-engine/security/advisories/new)). Say what you found, how to reproduce it, and what it lets someone do.

A problem in one of our packages goes to that package's repository, the same way.

## What to expect

RPG Engine is made by one person, in their own time. Your report will be read and answered as soon as that person can: there is no fixed response time, and no bug bounty. When a report is confirmed, the fix is released and a GitHub security advisory published, crediting you if you wish. Please keep the details private until then; we will agree a date with you.

## By design, not a vulnerability

- **Packages are code.** A game system or an extension is an npm package: its code runs on your computer with your permissions, in the game's server and in the dashboard, where it sees the whole campaign, as the code of any npm package does. There is no sandbox. Before installing a package that is not ours (`@rpgengine/...`), RPG Engine asks your yes, in a form of your agent or a window of your computer; it does not review that package, and cannot vouch for it. Install only packages whose authors you trust. A way to make a package's code run without that yes **is** a vulnerability: report it.
- **Your AI agent is not part of RPG Engine.** What the agent may do on your computer (commands, files outside the campaign) is decided by its host and the permissions you give it. Report problems of the agent or its host to their makers.
- **The story's secrets are game, not security.** A master that tells you a secret of the story is a matter for an issue, not for this page.

A package by others that you believe is malicious: report it to npm, from **Report malware** on its page, and tell us if you like.
