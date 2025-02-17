/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { dialog, getCurrentWindow, shell } from '@electron/remote';
import { getAppDataDir } from '@nordicsemiconductor/pc-nrfconnect-shared';
import { FileFilter } from 'electron';
import path from 'path';

import { autoDetectDbRootFolder } from './store';

export const askForTraceDbFile = () =>
    askForFile(
        [
            {
                name: 'Trace Databases',
                extensions: ['gz', 'json'],
            },
            { name: 'All Files', extensions: ['*'] },
        ],
        autoDetectDbRootFolder()
    );

export const askForTraceFile = () =>
    askForFile([
        { name: 'Trace', extensions: ['mtrace', 'bin'] },
        { name: 'All Files', extensions: ['*'] },
    ]);

export const askForPcapFile = () =>
    askForFile([
        { name: 'PCAP', extensions: ['pcapng'] },
        { name: 'All Files', extensions: ['*'] },
    ]);

export const askForWiresharkPath = () => {
    if (process.platform === 'darwin') {
        return askForFile(
            [
                { name: 'Executable', extensions: ['app'] },
                { name: 'All Files', extensions: ['*'] },
            ],
            `/Applications`
        );
    }
    if (process.platform === 'win32') {
        return askForFile(
            [
                { name: 'Executable', extensions: ['exe'] },
                { name: 'All Files', extensions: ['*'] },
            ],
            `C:\\Program Files`
        );
    }
    if (process.platform === 'linux') {
        return askForFile(
            [{ name: 'Executable', extensions: ['*'] }],
            `/usr/bin/`
        );
    }

    throw new Error('Platform not supported');
};

const askForFile = async (
    filters: FileFilter[],
    defaultPath = getAppDataDir()
) => {
    const selection = await dialog.showOpenDialog(getCurrentWindow(), {
        defaultPath,
        filters,
        properties: ['openFile'],
    });

    if (selection.canceled || selection.filePaths.length !== 1) {
        return undefined;
    }

    return selection.filePaths[0];
};

export const openInFolder = (filepath: string) =>
    shell.showItemInFolder(filepath);

type FileName = string;
type FileDirectory = string;
type FileTuple = [FileName, FileDirectory];

export const getNameAndDirectory = (
    filepath: string,
    ext?: string
): FileTuple => [path.basename(filepath, ext), path.dirname(filepath)];
