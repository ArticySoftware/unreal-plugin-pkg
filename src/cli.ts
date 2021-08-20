import { execFileSync } from "child_process";
import { Command, program } from "commander";
import { readFileSync } from "fs";
import path = require("path");
import { FindUnrealInstallations, GetMatchingUnrealInstallation, GetRunUATBatch, IsPlatformSupported, UnrealVersionString } from "./installs";
import { GetPluginInformation } from "./plugin";
import { BuildSettings, DefaultBuildSettings } from "./settings";

// Paths where Unreal installations may live
/*const UnrealEnginePaths = ["C:\\Program Files\\Epic Games"];
const VersionsToInstall = ['4.26', '4.25'];
const PluginPath = "./plugin/ArticyImporter.uplugin";
const OutputPath = "./out"
const Platforms: UnrealPlatform[] = ["Win64", "Android"];*/

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
        console.log(`Building ${UnrealVersionString(install.Version)} to ${outputDirectory}.`);
        execFileSync('"' + uatPath + '"', args, { shell: true, stdio: "inherit" });
    }
}

const parsed = program
    .version("0.0.1")
    .arguments("[uplugin]")
    .option("--unrealDirs <paths...>", "List of directories to search for Unreal installations in")
    .option("--versions <versions...>", "List of Unreal versions to build your plugin for")
    .option("--out <outDir>", "Directory to compile the packages into. One folder will be created inside per version.")
    .option("--platforms <platforms...>", "Platforms to build for. Will be pruned to those supported by the current OS.")
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
settings.OutputPath = opts.outDir ?? settings.OutputPath;
settings.VersionsToInstall = opts.versions ?? settings.VersionsToInstall;
settings.Platforms = opts.platforms ?? settings.Platforms;
settings.UnrealEnginePaths = opts.unrealDirs ?? settings.UnrealEnginePaths;

// Execute
main(settings);