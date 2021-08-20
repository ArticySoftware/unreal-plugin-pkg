import { readFile, readdir } from "fs/promises";
import path = require("path");

/**
 * Format for .uplugin data
 */
export interface UnrealPlugin 
{
    /** Friendly name for this plugin */
    FriendlyName: string;
}

async function LoadPluginJSON(path: string): Promise<UnrealPlugin>
{
    const buffer = await readFile(path);
    return JSON.parse(buffer.toString()) as UnrealPlugin;
}

/**
 * Loads information from a .uplugin file
 * @param pluginPath Path to a .uplugin file
 * @returns Parsed plugin information
 */
export async function GetPluginInformation(pluginPath: string): Promise<[string, UnrealPlugin]>
{
    // If it leads straight to a plugin file, read that
    if(pluginPath.endsWith(".uplugin")) { 
        return [pluginPath, await LoadPluginJSON(pluginPath)]
    }

    // Otherwise, try to find it in the directory
    const files = await readdir(pluginPath);
    const foundPath = files.filter(f => f.endsWith(".uplugin")).pop();
    if(!foundPath) { 
        throw new Error(`Could not find any .uplugin files in the directory '${pluginPath}'.`);
    }

    // Read it
    console.log(`Found plugin '${foundPath}' in '${pluginPath}'.`);
    pluginPath = path.join(pluginPath, foundPath);
    return [pluginPath, await LoadPluginJSON(pluginPath)];
}