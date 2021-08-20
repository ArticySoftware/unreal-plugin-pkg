import * as fs from "fs";
import * as path from "path";
import * as util from "util";

export interface UnrealVersionInformation
{
    MajorVersion: number;
    MinorVersion: number;
    PatchVersion: number;
}

/**
 * Converts version information to a string
 * @param version Version information
 * @returns String of the form 0.0.0
 */
export function UnrealVersionString(version: UnrealVersionInformation)
{
    return `${version.MajorVersion}.${version.MinorVersion}.${version.PatchVersion}`;
}

export interface UnrealInstallation
{
    /** Version information */
    Version: UnrealVersionInformation;

    /** Path to the root of the Unreal installation */
    RootPath: string;

    /** Path to the BatchFiles directory */
    BatchFilesPath: string;
}

export type UnrealPlatform = "Win64" | "IOS" | "Android" | "Mac" | "Linux";

// Create promised version of readFile
const readFile = util.promisify(fs.readFile);

/**
 * Gets information about an Unreal installation at a given directory
 * @param directory Directory
 * @returns Installation information or null if this is not a valid Unreal install
 */
export async function FindUnrealInstallation(directory: string): Promise<UnrealInstallation>
{
    // Try to load and parse build version information from the directory
    let versionInfo: UnrealVersionInformation|null = null;
    try 
    {
        const versionFilePath = path.join(directory, "Engine", "Build", "Build.version");
        const buffer = await readFile(versionFilePath);
        versionInfo = JSON.parse(buffer.toString()) as UnrealVersionInformation;
    }
    catch(err) { 
        throw new Error(`'${directory}' is not a valid Unreal installation.`)
    }

    // Return version info
    return {
        Version: versionInfo,
        RootPath: directory,
        BatchFilesPath: path.join(directory, "Engine", "Build", "BatchFiles"),
    }
}

async function FindUnrealInstallationsInternal(directory: string): Promise<UnrealInstallation[]>
{
    console.log(`Scanning for Unreal installations in '${directory}'.`);

    // First, check if this folder itself is an Unreal installation
    try
    {
        const installation = await FindUnrealInstallation(directory);
        console.log(`Found Unreal ${installation.Version.MajorVersion}.${installation.Version.MinorVersion}.${installation.Version.PatchVersion} in '${directory}'.`);
        return [installation];
    }
    catch(err) { /** This is a path of many installations. */ }

    // Get all folders in the directory
    const files = await fs.promises.readdir(directory);
    const result: UnrealInstallation[] = [];

    // Iterate
    for(const file of files)
    {
        // Check if its a directory
        const dir = path.join(directory, file);
        const stat = await fs.promises.lstat(dir);
        if(!stat.isDirectory()) { 
            console.log(`Skipping non-directory '${dir}'.`);
            continue;
        }

        try
        {
            // Get installation
            const installation = await FindUnrealInstallation(dir);
            console.log(`Found Unreal ${installation.Version.MajorVersion}.${installation.Version.MinorVersion}.${installation.Version.PatchVersion} in '${dir}'.`);
            result.push(installation);
        }
        catch(err)
        {
            console.log(`Skipping non-Unreal installation '${dir}'.`);
        }
    }

    return result;
}

/**
 * Checks each directory for Unreal installations
 * @param directories List of directories that either are Unreal installations or whose subfolders are Unreal installations
 * @returns All Unreal installations found
 */
export async function FindUnrealInstallations(directories: string[]): Promise<UnrealInstallation[]>
{
    const result = await Promise.all(directories.map(FindUnrealInstallationsInternal));
    return result.flatMap(list => list);
}

function ParseVersionNumber(version: string): Partial<UnrealVersionInformation>
{
    // Get numbers
    const numbers = version.trim().split('.').map(n => parseInt(n)).reverse();

    // Make sure we have about three of them
    if(numbers.length > 3 || numbers.length === 0 || numbers.some(n => n === NaN)) {
        throw new Error(`Invalid version format: '${version}'`);
    }

    // Pop off in order
    return {
        MajorVersion: numbers.pop(),
        MinorVersion: numbers.pop(),
        PatchVersion: numbers.pop()
    }
}

function IsMatch(installed: UnrealVersionInformation, needed: Partial<UnrealVersionInformation>)
{
    return installed.MajorVersion === needed.MajorVersion &&
        (installed.MinorVersion === needed.MinorVersion || needed.MinorVersion === undefined) &&
        (installed.PatchVersion === needed.PatchVersion || needed.PatchVersion === undefined);
}

function IsGreaterThanOrEqual(installed: UnrealVersionInformation, needed: Partial<UnrealVersionInformation>)
{
    if(needed.MajorVersion === undefined) { return true; }
    if(installed.MajorVersion < needed.MajorVersion) { return false; }
    if(installed.MajorVersion === needed.MajorVersion) { 
        if(needed.MinorVersion === undefined) { return true; }
        if(installed.MinorVersion < needed.MinorVersion) { return false; }
        if(installed.MinorVersion === needed.MinorVersion) { 
            if(needed.PatchVersion === undefined) { return true; }
            if(needed.PatchVersion < needed.PatchVersion) { return false; }
        }
    }

    return true;
}

function CompareVersion(a: UnrealVersionInformation, b: UnrealVersionInformation)
{
    if(a.MajorVersion !== b.MajorVersion) { return a.MajorVersion - b.MajorVersion };
    if(a.MinorVersion !== b.MinorVersion) { return a.MinorVersion - b.MinorVersion };
    return a.PatchVersion - b.PatchVersion;
}

/**
 * Gets the best matching installation from a version number
 * @param installs List of all Unreal installations
 * @param version Version number of the format `\d+(.\d+)?(.\d+)?`
 * @returns The newest installation that matches the supplied version number, or null if none are available
 */
export function GetMatchingUnrealInstallation(installs: UnrealInstallation[], version: string): UnrealInstallation|null
{
    // Parse version
    const requestedVersion = ParseVersionNumber(version);

    // Filter installs
    const matchingInstalls = installs.filter(install => IsMatch(install.Version, requestedVersion));
    if(matchingInstalls.length === 0) { return null; }

    // Get best install
    const sortedMatchingInstalls = matchingInstalls.sort((a, b) => CompareVersion(a.Version, b.Version));
    return sortedMatchingInstalls.pop();
}

/**
 * Gets the path to the appropriate RunUAT batch file based on your platform
 * @param install Unreal installation
 * @returns Path to RunUAT(.bat|.sh)
 */
export function GetRunUATBatch(install: UnrealInstallation): string
{
    let out: string|null = null;
    switch(process.platform)
    {
        case 'win32':
            out = path.join(install.BatchFilesPath, 'RunUAT.bat');
            break;
        case 'linux':
        case 'darwin':
            out = path.join(install.BatchFilesPath, "RunUAT.sh");
            break;
        default:
            throw new Error(`Unknown platform '${process.platform}'. Expecting Windows, MacOSX, or Linux.`);
    }

    return out;
}

/**
 * Checks if a given platform can be built on the current machine using the given installation
 * @param install Installation
 * @param platform Platform you wish to build
 * @returns If the platform is supported by the install and running platform
 */
export function IsPlatformSupported(install: UnrealInstallation, platform: UnrealPlatform): boolean
{
    switch(process.platform)
    {
        case 'win32': 
            return platform === "Win64" 
                || (platform === "Android" && IsGreaterThanOrEqual(install.Version, { MajorVersion: 4, MinorVersion: 25}));
        case 'darwin':
            return platform === "Mac" || platform === "IOS";
        case 'linux':
            return platform === "Linux";
    }

    return false;
}