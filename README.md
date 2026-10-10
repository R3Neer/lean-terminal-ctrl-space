# Lean Terminal Ctrl+Space

Fixes Ctrl+Space in local Windows Nushell sessions inside Obsidian Lean Terminal.
The hotfix preserves Space + CONTROL through ConPTY, so your existing Nushell
bindings work without changes. It applies only to the focused terminal and only
after Win32 keyboard mode negotiation. Other keys keep their normal handling.

## Install

Install Lean Terminal and its native binaries in the vault first. Download and
extract the ZIP from this repository's Releases, close the vault in Obsidian,
and run with Node.js 22 or later:

```console
node install.mjs --vault "D:\Path\MyVault"
```

Reopen Obsidian, enable Lean Terminal, select your Windows `nu.exe`, and leave
**Win32 Ctrl+Space** enabled. The installer preserves settings and native
binaries and backs up replaced plugin files. Existing Lean Terminal 1.4.0 and
1.5.0 installations are upgraded to this hotfix. Official plugin updates may
replace it; install the hotfix again only for a compatible version.

Check with `keybindings listen`: pressing Ctrl+Space should report Space with
CONTROL. Exit with Escape and use your original Nushell bindings as usual.
To revert, close the vault and restore the files from the printed backup folder,
or disable **Win32 Ctrl+Space** in the plugin settings.

Based on MIT-licensed Lean Terminal. Original attribution is retained in LICENSE.
Native binaries are supplied by Lean Terminal's original binary distribution.
