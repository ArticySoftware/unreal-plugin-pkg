import { UnrealPlatform } from "./installs";

export interface BuildSettings
{
    UnrealEnginePaths: string[];
    VersionsToInstall: string[];
    PluginPath: string;
    OutputPath: string;
    Platforms: UnrealPlatform[];
}

// Use default install directory to find installations
const defaultInstallPaths = 
    process.platform === "win32" ? ["C:\\Program Files\\Epic Games"] : 
    process.platform === "darwin" ? ["/Users/Shared/Epic Games"] : 
    // TODO: What is Linux's default path?
    [];

// Build for current platform by default
const defaultPlatforms: UnrealPlatform[] = 
    process.platform === "win32" ? ["Win64"] : 
    process.platform === "darwin" ? ["Mac"] : 
    process.platform === "linux" ? ["Linux"] : [];

/**
 * Default settings
 */
export const DefaultBuildSettings: BuildSettings = {
    UnrealEnginePaths: defaultInstallPaths,
    VersionsToInstall: ["4"], // Just use the best version of Unreal Engine 4 they have
    PluginPath: ".", // Use current working directory
    OutputPath: "Packages", // Use a Packages directory
    Platforms: defaultPlatforms
}