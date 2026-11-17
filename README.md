# Badge Larper

A Vencord plugin that lets you add, remove, and customize Discord profile badges locally. All changes are client-side and purely visual.

**Only you see the changes.** This plugin does not grant real badges, Nitro, or permissions.

## Preview
![Badge Larper preview](./preview.png)

## Features

- Add and remove custom badges on user profiles.
- Hide existing badges locally and restore them.
- Select individual badges in the **Manage Badges** context menu.
- Use **Give All Badges**, **Remove All Badges**, or **Reset to Original**.
- Save individual preferences locally through Vencord's DataStore.

> **Current compatibility issue:** This source still calls the old `Toasts` API. It needs a compatibility fix before installation on the inspected Vencord version. These instructions do not fix that code issue. See Troubleshooting below.

## Installation — Windows

Run the commands in **PowerShell**, one block at a time. **If a command fails, stop and resolve the error before continuing.**

### 1. Install the tools

Install [Git](https://git-scm.com/downloads/win), [Node.js LTS](https://nodejs.org/en/download) (22 or newer for the inspected checkout), and [Discord Desktop](https://discord.com/download). Then open a new PowerShell window:

```powershell
 git --version
 node --version
 npm.cmd --version
```

### 2. Download Vencord

```powershell
Set-Location $HOME
git clone https://github.com/Vendicated/Vencord.git
Set-Location .\Vencord
```

**Already have Vencord's source?** Skip cloning and open PowerShell in that existing folder instead. Run all remaining commands from the folder containing Vencord's `package.json`.

### 3. Install the correct pnpm version

This reads the version required by your Vencord checkout:

```powershell
$package = Get-Content .\package.json -Raw | ConvertFrom-Json
$pnpmVersion = $package.packageManager -replace '\+.*$', ''
npm.cmd install --global "$pnpmVersion"
pnpm.cmd --version
```

The inspected checkout requires **pnpm 12.15.0**. Other versions of Vencord may require a different version. If pnpm is not found after installation, reopen PowerShell and return to your Vencord folder.

### 4. Add the plugin file

Download this repository's `index.tsx` using GitHub's **Raw** file view, or download and extract its ZIP. Do not save the GitHub HTML page as source code.

Create the destination folder:

```powershell
New-Item -ItemType Directory -Force .\src\userplugins\badgeSelector | Out-Null
```

Enter the full path to your downloaded `index.tsx` when prompted:

```powershell
$pluginFile = (Read-Host "Full path to your downloaded index.tsx").Trim('"')
Copy-Item -LiteralPath $pluginFile -Destination .\src\userplugins\badgeSelector\index.tsx
Test-Path .\src\userplugins\badgeSelector\index.tsx
```

The last command should print `True`. Keep the folder name **badgeSelector**, even though the plugin is called **Badge Larper**.

```text
Vencord/src/userplugins/badgeSelector/index.tsx
```

Your standalone GitHub repository should contain:

```text
Badge-Larper/
├── index.tsx
└── README.md
```

Copy only `index.tsx` into Vencord, not a nested `Badge-Larper` folder. Make sure the file is not named `index.tsx.txt`.

### 5. Install dependencies and build

Run each command separately. Continue only when it succeeds:

```powershell
pnpm.cmd install --frozen-lockfile
```

```powershell
pnpm.cmd test:ts
```

```powershell
pnpm.cmd build --dev
```

**Do not install a build with unresolved errors.** The legacy toast calls noted above must be repaired first; successful bundling alone does not prove the plugin works.

### 6. Install your custom build

Only after the checks pass, fully quit Discord, including its system-tray process. From the same Vencord folder, run:

```powershell
pnpm.cmd inject
```

Follow the installer prompts and select your Discord installation. This command installs your local custom build into Discord. These steps follow the inspected repository; see [Vencord's official guide](https://docs.vencord.dev/installing/) if your checkout uses different scripts.

### 7. Enable and use the plugin

1. Open Discord.
2. Go to **User Settings → Vencord → Plugins**.
3. Search for **Badge Larper** and enable it.
4. Right-click a user and select **Manage Badges**.

Previously used **BadgeSelector**? Enable **Badge Larper** after rebuilding. The name-based enable setting is separate; the badge-storage keys are unchanged.

## Troubleshooting

| Problem | What to do |
| --- | --- |
| `pnpm is not recognized` | Repeat step 3, reopen PowerShell, and check `pnpm.cmd --version`. See [pnpm installation](https://pnpm.io/installation) if it remains unavailable. |
| `npm.ps1` or `pnpm.ps1` is blocked | Use `npm.cmd` and `pnpm.cmd`. Do not disable PowerShell protections globally. |
| Missing plugin / `Could not resolve "./userplugins/badgeSelector"` | Check the exact file path shown in step 4. Remove accidental nested folders or `.txt` extensions. |
| `No matching export for Toasts` / `Toasts is not defined` | The current source imports `showToast` but still calls `Toasts.show`, `Toasts.Type.SUCCESS`, and `Toasts.genId()`. Use a repaired revision compatible with your checkout. The inspected API is `showToast({ text, variant: "success" })` from `@webpack/common`. |
| Other build or TypeScript errors | Resolve the first reported error before proceeding. Menu-label types may also need adaptation. Do not delete badge features or bypass errors to install. |
| Bulk changes return after restarting | Existing limitation: Reset does not save its final state, and Remove All does not explicitly save after deleting custom badges. Those handlers need a code fix; this documentation update does not change them. |
| Plugin missing in Discord | Check the folder, rebuild, install from the same checkout, restart the correct Discord channel, and search for **Badge Larper**. |
| Stops working after updates | Use matching plugin/Vencord versions and rebuild. Disable the plugin if it causes errors until compatibility is restored. |

## Disclaimer

Badges are local visual changes, not badges granted by Discord. Other users cannot see them in their clients, although screenshots or streams can show your local display. Discord updates may break compatibility. Modified clients may violate [Discord's Terms of Service](https://discord.com/terms). Use at your own risk; this plugin is not endorsed by Discord or Vencord.
