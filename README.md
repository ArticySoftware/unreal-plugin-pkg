# Unreal Plugin Packager

A simple CLI tool to batch build and package Unreal plugins across multiple versions of Unreal.

## Installation

```
npm install unreal-plugin-pkg
yarn global add unreal-plugin-pkg
```

## Usage

```
Usage: unreal-plugin-pkg [options] [uplugin]

Options:
  --unrealDirs <paths...>     List of directories to search for Unreal installations in
  --versions <versions...>    List of Unreal versions to build your plugin for
  --out <outDir>              Directory to compile the packages into. One folder will be created inside per version.
  --platforms <platforms...>  Platforms to build for. Will be pruned to those supported by the current OS.
  --keepIntermediate          Don't cleaning the Intermediate folders after builds
  --cleanBinaries             Delete Binaries folders after builds
  --nozip                     Don't zip packages once they've been built
  -h, --help                  display help for command
```

## Example

To build a plugin in the current directory for Windows and Android using Unreal versions 4.24, 4.25, and 4.26, run:

```
unreal-plugin-pkg --versions 4.24 4.25 4.26 --platforms Win64 Android --out out/
```

All packages will be placed in the output folder `out/`

## Configuration File

If you're repeatedly using the same arguments, consider creating a `unreal-package.json` file.

**Example:**

```json
{
    "UnrealEnginePaths": ["C:\\Program Files\\Epic Games", "E:\\Unreal Installs"],
    "VersionsToInstall": ["4.26", "5"],
    "PluginPath": ".",
    "OutputPath": "out/",
    "Platforms": ["Win64", "Android"],
    "CleanBinaryFiles": true,
    "CleanIntermediateFiles": true,
    "ZipPackages": false
}
```

## Unreal Installation Directories

By default, this program will search for Unreal installs at `C:\Program Files\Epic Games` for Windows and `Users/Shared/Epic Games` on Mac. 

You can override this by changing the `--unrealDirs` command-line options or `UnrealEnginePaths` in `unreal-package.json`. Both accept an array of arguments that can either be the exact directory of an Unreal installation (eg. `C:\Program Files\Epic Games\UE_4.26) OR a path that contains subfolders which are Unreal installations.

## Version Numbers

When specifying versions to install, you can be as specific or general as you'd like. The program will select the newest version that matches the given version.

So specifying `4` would use the newest version of Unreal 4 installed. Specifying `4.26` will use the latest 4.26 installed. `4.26.1` will require that an installed version of Unreal matches `4.26.1` exactly.

## Plugin Path

The plugin path can be either a `.uplugin` file or a folder which contains a `.uplugin` file.

## Zipping

By default, this program will zip each packaged folder into a zip archive of the same name. If you don't want this, use `--nozip`.

## Binary and Intermediate Files

By default, this program deletes the Intermediate folder in each package before zipping it. If you don't want that, use `--keepIntermediate`.

If you want to also delete the Binaries folder, use `--cleanBinaries`.