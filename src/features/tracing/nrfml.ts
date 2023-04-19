/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import nrfml, { getPluginsDir } from '@nordicsemiconductor/nrf-monitor-lib-js';
import {
    Configuration,
    // eslint-disable-next-line import/no-unresolved
} from '@nordicsemiconductor/nrf-monitor-lib-js/config/configuration';
import { logger, usageData } from 'pc-nrfconnect-shared';

import type { RootState } from '../../appReducer';
import { traceFiles } from '../../components/SidePanel/DatabaseFileOverride';
import EventAction from '../../usageDataActions';
import { setCollapseConnectionStatusSection } from '../../utils/store';
import type { TAction } from '../../utils/thunk';
import { detectDatabaseVersion } from '../tracingEvents/at/recommeneded';
import { resetDashboardState } from '../tracingEvents/dashboardSlice';
import { findTshark } from '../wireshark/wireshark';
import { getTsharkPath } from '../wireshark/wiresharkSlice';
import { hasProgress, sinkEvent, SourceFormat, TraceFormat } from './formats';
import makeProgressCallback from './makeProgressCallback';
import sinkConfig from './sinkConfig';
import sinkFile from './sinkFile';
import sourceConfig from './sourceConfig';
import {
    notifyListeners,
    Packet,
    tracePacketEvents,
} from './tracePacketEvents';
import {
    getManualDbFilePath,
    getSerialPort,
    getUartSerialPort,
    setManualDbFilePath,
    setTraceDataReceived,
    setTraceIsStarted,
    setTraceIsStopped,
    setTraceSourceFilePath,
} from './traceSlice';

export type TaskId = number;
let reloadHandler: () => void;

const nrfmlConfig = (
    state: RootState,
    source: SourceFormat,
    sinks: TraceFormat[]
): Configuration => ({
    config: { plugins_directory: getPluginsDir() },
    sources: [sourceConfig(state, source)],
    sinks: sinks.map(format => sinkConfig(state, source, format)),
});

const progressConfigs = (source: SourceFormat, sinks: TraceFormat[]) =>
    sinks.filter(hasProgress).map(format => ({
        format,
        path: sinkFile(source, format),
    }));

export const convertTraceFile =
    (
        path: string,
        setLoading: (loading: boolean) => void = () => {}
    ): TAction =>
    (dispatch, getState) => {
        usageData.sendUsageData(EventAction.CONVERT_TRACE);
        const source: SourceFormat = { type: 'file', path };
        const sinks = ['pcap' as TraceFormat];

        const state = getState();
        const isDetectingTraceDb = getManualDbFilePath(state) == null;

        setLoading(true);
        return new Promise<void>((resolve, reject) => {
            const taskId = nrfml.start(
                nrfmlConfig(state, source, sinks),
                err => {
                    dispatch(setTraceIsStopped());
                    setLoading(false);

                    if (err?.error_code === 100) {
                        logger.error(
                            'Trace file does not include modem UUID, so trace database version cannot automatically be detected. Please select trace database manually from Advanced Options.'
                        );
                    } else if (err != null) {
                        logger.error(
                            `Failed conversion to pcap: ${err.message}`
                        );
                        logger.debug(`Full error: ${JSON.stringify(err)}`);
                    } else {
                        logger.info(`Successfully converted ${path} to pcap`);
                        return resolve();
                    }
                    return reject();
                },
                makeProgressCallback(dispatch, {
                    detectingTraceDb: isDetectingTraceDb,
                    displayDetectingTraceDbMessage: false,
                }),
                () => {}
            );

            logger.info(`Started converting ${path} to pcap.`);
            dispatch(
                setTraceIsStarted({
                    taskId,
                    progressConfigs: progressConfigs(source, sinks),
                })
            );
        });
    };

export const startTrace =
    (sinks: TraceFormat[]): TAction =>
    async (dispatch, getState) => {
        const formats = [...sinks];
        const state = getState();
        const uartPort = getUartSerialPort(state);
        const tracePort = getSerialPort(state);
        if (!tracePort) {
            logger.error('Select serial port to start tracing');
            return;
        }
        const source: SourceFormat = {
            type: 'device',
            port: tracePort,
            startTime: new Date(),
        };

        let isDetectingTraceDb =
            getManualDbFilePath(state) == null &&
            !(formats.length === 1 && formats[0] === 'raw'); // if we originally only do RAW trace, we do not show dialog

        if (uartPort != null && isDetectingTraceDb) {
            const version = await detectDatabaseVersion(uartPort);
            if (version != null) {
                const matchedVersion = (await traceFiles()).find(
                    ({ version: v }) => v === version
                );

                const matchedDatabasePath = matchedVersion?.uuid ?? null;
                if (matchedDatabasePath != null) {
                    dispatch(setManualDbFilePath(matchedDatabasePath));
                    logger.info(
                        `Detected trace database version ${version} located at  ${matchedDatabasePath}`
                    );
                    isDetectingTraceDb = false;
                }
            }
        }

        const selectedTsharkPath = getTsharkPath(getState());
        if (findTshark(selectedTsharkPath) && !formats.includes('tshark')) {
            formats.push('tshark');
        }

        formats.forEach(format => {
            usageData.sendUsageData(sinkEvent(format));
        });

        const packets: Packet[] = [];
        const throttle = setInterval(() => {
            if (packets.length > 0) {
                notifyListeners(packets.splice(0, packets.length));
            }
        }, 30);

        dispatch(resetDashboardState());
        dispatch(setTraceSourceFilePath(null));
        dispatch(setTraceDataReceived(false));
        setCollapseConnectionStatusSection(true);
        tracePacketEvents.emit('start-process');
        const taskId = nrfml.start(
            nrfmlConfig(state, source, formats),
            err => {
                clearInterval(throttle);
                notifyListeners(packets.splice(0, packets.length));
                if (err?.message.includes('tshark')) {
                    logger.logError('Error while tracing', err);
                } else if (err != null) {
                    logger.error(`Error when creating trace: ${err.message}`);
                    logger.debug(`Full error: ${JSON.stringify(err)}`);
                } else {
                    logger.info('Finished tracefile');
                }

                if (reloadHandler) {
                    window.removeEventListener('beforeunload', reloadHandler);
                }

                // stop tracing if Completed callback is called and we are only doing live tracing
                if (
                    formats.length === 2 &&
                    formats.includes('live') &&
                    formats.includes('tshark')
                ) {
                    dispatch(stopTrace());
                }
            },
            makeProgressCallback(dispatch, {
                detectingTraceDb: isDetectingTraceDb,
                displayDetectingTraceDbMessage: isDetectingTraceDb,
            }),
            data => {
                const { dataReceived } = getState().app.trace;
                if (!dataReceived) dispatch(setTraceDataReceived(true));

                if (data.format !== 'modem_trace') {
                    // @ts-expect-error  -- Monitor lib has wrong type, needs to be changed.
                    packets.push(data as Packet);
                }
            }
        );
        logger.info('Started tracefile');
        dispatch(
            setTraceIsStarted({
                taskId,
                progressConfigs: progressConfigs(source, formats),
            })
        );
        reloadHandler = () => {
            nrfml.stop(taskId);
        };
        window.addEventListener('beforeunload', reloadHandler);
    };

export const readRawTrace =
    (sourceFile: string, setLoading: (loading: boolean) => void): TAction =>
    (dispatch, getState) => {
        const state = getState();
        const source: SourceFormat = { type: 'file', path: sourceFile };
        const sinks: TraceFormat[] = ['tshark'];

        const packets: Packet[] = [];
        const throttle = setInterval(() => {
            if (packets.length > 0) {
                notifyListeners(packets.splice(0, packets.length));
            }
        }, 30);
        setLoading(true);
        dispatch(resetDashboardState());
        dispatch(setTraceSourceFilePath(null));
        dispatch(setTraceDataReceived(false));
        setCollapseConnectionStatusSection(true);
        tracePacketEvents.emit('start-process');
        nrfml.start(
            nrfmlConfig(state, source, sinks),
            error => {
                clearInterval(throttle);
                if (error) {
                    logger.error(
                        `Error when reading trace from ${sourceFile}: ${error.message}`
                    );
                } else {
                    logger.info(`Completed reading trace from ${sourceFile}`);
                }
                setLoading(false);
                tracePacketEvents.emit('stop-process');
            },
            () => {},
            data => {
                const { dataReceived } = getState().app.trace;
                if (!dataReceived) dispatch(setTraceDataReceived(true));

                if (data.format !== 'modem_trace') {
                    // @ts-expect-error  -- Monitor lib has wrong type, needs to be changed.
                    packets.push(data as Packet);
                }
            }
        );
        dispatch(setTraceSourceFilePath(sourceFile));
        logger.info(`Started reading trace from ${sourceFile}`);
    };

export const stopTrace = (): TAction => (dispatch, getState) => {
    const { taskId } = getState().app.trace;
    if (taskId === null) return;
    nrfml.stop(taskId);
    usageData.sendUsageData(EventAction.STOP_TRACE);
    dispatch(setTraceDataReceived(false));
    dispatch(setTraceIsStopped());
    tracePacketEvents.emit('stop-process');
};
