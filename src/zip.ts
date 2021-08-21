import * as path from "path";

const zipper = require('zip-local');

/**
 * Zips a directory into a zip file with the matching name
 * @param directory Directory to zip
 */
export function ZipDirectory(directory: string): Promise<void>
{
    return new Promise(
        (resolve, reject) => { 
            zipper.zip(directory, (error: any, zipped: any) => { 
                if(error) { reject(error); }
                else
                {
                    zipped.compress();
                    zipped.save(path.join(path.dirname(directory), path.basename(directory) + ".zip"), (err2: any) => { 
                        if(err2) { reject(err2); }
                        else { resolve(); }
                    });
                }
            });
        }
    )
}