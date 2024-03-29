#!/usr/bin/env node

import { execSync } from "child_process";
import { program } from "commander";
import { readFileSync } from "fs";
import path = require("path");
import rimraf = require("rimraf");
import { promisify } from "util";
import { FindUnrealInstallations, GetMatchingUnrealInstallation, GetRunUATBatch, IsPlatformSupported, UnrealVersionString } from "./installs";
import { GetPluginInformation } from "./plugin";
import { BuildSettings, DefaultBuildSettings } from "./settings";
import { ZipDirectory } from "./zip";

const rimrafPromise = promisify(rimraf);

async function cleanDirectory(dir: string, options: BuildSettings)
{
    if(options.CleanIntermediateFiles || options.CleanBinaryFiles)
    {
        await rimrafPromise(path.join(dir, "Intermediate"));
    }
    if(options.CleanBinaryFiles)
    {
        await rimrafPromise(path.join(dir, "Binaries"));
    }
}

async function main(options: BuildSettings)
{
    // Get all installs on this machine
    const installs = await FindUnrealInstallations(options.UnrealEnginePaths);

    // Find the installations we actually want
    const installsToUse: typeof installs = [];
    for(const version of options.VersionsToInstall) { 
        const install = GetMatchingUnrealInstallation(installs, version);
        if(!install) { 
            throw new Error(`Failed to find Unreal installation for version ${version} in any of your Unreal Engine paths (${options.UnrealEnginePaths}). Make sure this version is installed or remove it from your version list.`);
        }
        installsToUse.push(install);
    }

    // Get plugin information
    const [pluginPath, plugin] = await GetPluginInformation(options.PluginPath);

    // For each build
    for(const install of installsToUse)
    {
        // Get supported platforms
        const supportedPlatforms = options.Platforms.filter(p => IsPlatformSupported(install, p));

        // Get UAT script
        const uatPath = GetRunUATBatch(install);
        
        // Get output directory
        const outputDirectory = path.resolve(options.OutputPath, `${plugin.FriendlyName}_${UnrealVersionString(install.Version).replace(/\./g, '_')}`);

        // Run
        const args = [
            "BuildPlugin",
            `-Plugin="${path.resolve(pluginPath)}"`,
            `-TargetPlatforms=${supportedPlatforms.join('+')}`,
            `-Package="${outputDirectory}"`,
            "-Rocket",
            "-StrictIncludes"
        ];
        
        // PS: enforce VS2019 when running under windows
        if (process.platform === 'win32')
        	args.push("-VS2019");

        // Change working directory to the UAT path
        const cwd = process.cwd();
        process.chdir(path.dirname(uatPath));

        // Run UAT
        console.log(`Building ${UnrealVersionString(install.Version)} to ${outputDirectory}.`);
        const cmd = `${process.platform === "win32" ? '' : './'}${path.basename(uatPath)} ${args.join(' ')}`;
        console.log(cmd);
        execSync(cmd, { stdio: "inherit" });
        
        // Restore working directory
        process.chdir(cwd);

        await cleanDirectory(outputDirectory, settings);
        if(settings.ZipPackages) { 
            ZipDirectory(outputDirectory).then(() => console.log(`Finished zipping '${outputDirectory}'`)).catch(error => console.error(`Failed to zip '${outputDirectory}': ${error}`));
        }
    }
}

const parsed = program
    .version("0.0.1")
    .arguments("[uplugin]")
    .option("--unrealDirs <paths...>", "List of directories to search for Unreal installations in")
    .option("--versions <versions...>", "List of Unreal versions to build your plugin for")
    .option("--out <outDir>", "Directory to compile the packages into. One folder will be created inside per version.")
    .option("--platforms <platforms...>", "Platforms to build for. Will be pruned to those supported by the current OS.")
    .option('--keepIntermediate', "If set, keep intermediate files (don't delete).")
    .option('--cleanBinaries', "If set, clean the Binaries folder (code only package)")
    .option('--nozip', "If set, do not zip the created packages.")
    .parse();

// Start with default settings
let settings: BuildSettings = DefaultBuildSettings;
try
{    
    // Try to load local settings
    const optionsBuffer = readFileSync("./unreal-package.json");
    settings = {...settings, ...JSON.parse(optionsBuffer.toString())};
}
catch(err) { /* no settings file. Ignore */ }

// Add command line settings
settings.PluginPath = parsed.args[0] ?? settings.PluginPath;
const opts = parsed.opts();
settings.OutputPath = opts.out ?? settings.OutputPath;
settings.VersionsToInstall = opts.versions ?? settings.VersionsToInstall;
settings.Platforms = opts.platforms ?? settings.Platforms;
settings.UnrealEnginePaths = opts.unrealDirs ?? settings.UnrealEnginePaths;
if(opts.keepIntermediate) { settings.CleanIntermediateFiles = false; }
if(opts.cleanBinaries) { settings.CleanBinaryFiles = true; }
if(opts.nozip) { settings.ZipPackages = false; }

// Execute
main(settings);