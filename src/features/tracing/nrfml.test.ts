/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { testUtils } from '@nordicsemiconductor/pc-nrfconnect-shared/test';
import path from 'path';

import appReducer from '../../appReducer';
import { getMockStore, mockedDataDir } from '../../utils/testUtils';
import { resetDashboardState } from '../tracingEvents/dashboardSlice';
import nrfml from './__mocks__/@nordicsemiconductor/nrf-monitor-lib-js';
import { convertTraceFile, startTrace } from './nrfml';
import sinkConfig from './sinkConfig';
import {
    setDetectingTraceDb,
    setTraceDataReceived,
    setTraceIsStarted,
    setTraceIsStopped,
    setTraceSourceFilePath,
} from './traceSlice';

const MOCKED_DEFAULT_WIRESHARK_PATH = 'default/path/to/wireshark';

jest.mock('../wireshark/wireshark', () => ({
    defaultSharkPath: () => MOCKED_DEFAULT_WIRESHARK_PATH,
}));

jest.mock('@nordicsemiconductor/pc-nrfconnect-shared', () => ({
    ...jest.requireActual('@nordicsemiconductor/pc-nrfconnect-shared'),
    getAppDataDir: () => mockedDataDir,
    getAppFile: () => mockedDataDir,
    selectedDevice: () => {},
}));

const mockStore = getMockStore();

const initialState = {
    app: {
        trace: {
            traceSerialPort: 'COM3',
            traceData: [],
        },
        wireshark: {},
        serialPort: {
            terminalSerialPort: null,
            shellParser: null,
        },
    },
    device: {
        devices: {},
    },
};

const store = mockStore(initialState);

describe('nrfml', () => {
    beforeEach(() => {
        store.clearActions();
    });

    it('should start converting', () => {
        store.dispatch(convertTraceFile('somePath.mtrace'));
        expect(store.getActions()).toEqual([
            { payload: true, type: 'trace/setDetectingTraceDb' },
            {
                payload: {
                    progressConfigs: [],
                    taskId: 1,
                },
                type: 'trace/setTraceIsStarted',
            },
        ]);
    });

    describe('tracing', () => {
        beforeEach(() => {
            jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(
                '2000-01-01T00:00:00.000Z'
            );
            nrfml.start.mockClear();
        });

        it('should start tracing to pcap', () => {
            store.dispatch(startTrace(['pcap']));
            expect(store.getActions()).toEqual([
                { type: resetDashboardState.type, payload: undefined },
                { type: setTraceSourceFilePath.type, payload: null },
                { type: setTraceDataReceived.type, payload: false },
                { type: setDetectingTraceDb.type, payload: true },
                {
                    type: setTraceIsStarted.type,
                    payload: {
                        taskId: 1,
                        progressConfigs: [
                            {
                                format: 'pcap',
                                path: path.join(
                                    mockedDataDir,
                                    'trace-2000-01-01T00-00-00.000Z.pcapng'
                                ),
                            },
                        ],
                    },
                },
            ]);
        });

        it('should start tracing to raw binary', () => {
            store.dispatch(startTrace(['raw']));
            expect(store.getActions()).toEqual([
                { type: resetDashboardState.type, payload: undefined },
                { type: setTraceSourceFilePath.type, payload: null },
                { type: setTraceDataReceived.type, payload: false },
                { type: setDetectingTraceDb.type, payload: true },
                {
                    type: setTraceIsStarted.type,
                    payload: {
                        taskId: 1,
                        progressConfigs: [
                            {
                                format: 'raw',
                                path: path.join(
                                    mockedDataDir,
                                    'trace-2000-01-01T00-00-00.000Z.mtrace'
                                ),
                            },
                        ],
                    },
                },
            ]);
        });

        it('does not create a progress config for live traces', () => {
            store.dispatch(startTrace(['raw', 'live']));
            expect(store.getActions()).toEqual([
                { type: resetDashboardState.type, payload: undefined },
                { type: setTraceSourceFilePath.type, payload: null },
                { type: setTraceDataReceived.type, payload: false },
                { type: setDetectingTraceDb.type, payload: true },
                {
                    type: setTraceIsStarted.type,
                    payload: {
                        taskId: 1,
                        progressConfigs: [
                            {
                                format: 'raw',
                                path: path.join(
                                    mockedDataDir,
                                    'trace-2000-01-01T00-00-00.000Z.mtrace'
                                ),
                            },
                        ],
                    },
                },
            ]);
        });

        it('does not create a progress config for live traces', () => {
            store.dispatch(startTrace(['live']));
            expect(store.getActions()).toEqual([
                { type: resetDashboardState.type, payload: undefined },
                { type: setTraceSourceFilePath.type, payload: null },
                { type: setTraceDataReceived.type, payload: false },
                { type: setDetectingTraceDb.type, payload: true },
                {
                    type: setTraceIsStarted.type,
                    payload: {
                        taskId: 1,
                        progressConfigs: [],
                    },
                },
            ]);
        });

        // Used to simulate wireshark beeing closed while live tracing.
        const wiresharkClosedError = {
            error_code: 18,
            message:
                'wireshark process closed or pipe error plugin path: nrfml-wireshark-named-pipe-sink.nrfml',
            origin: 'Error when running nrfml operation worker.',
        };

        it('stop tracing when wireshark is closed with only live tracing', () => {
            store.dispatch(startTrace(['live']));
            const errorHandler = nrfml.start.mock.calls[0][1];
            errorHandler(wiresharkClosedError);
            const lastAction = store.getActions().at(-1);
            expect(lastAction.type).toBe(setTraceIsStopped.type);
        });

        it('keep tracing when wireshark is closed but pcap is chosen', () => {
            store.dispatch(startTrace(['live', 'pcap']));
            const errorHandler = nrfml.start.mock.calls[0][1];
            errorHandler(wiresharkClosedError);
            const lastAction = store.getActions().at(-1);
            expect(lastAction.type).toBe(setTraceIsStarted.type);
        });
    });

    describe('sink configuration', () => {
        const state = testUtils.rootReducer(appReducer)(undefined, {
            type: '@INIT',
        });

        beforeAll(() => {
            Object.defineProperty(process, 'platform', { value: 'MockOS' });
        });

        it('should return proper configuration for raw trace', () => {
            const rawConfig = sinkConfig(
                state,
                { type: 'file', path: 'some/path.mtrace' },
                'raw'
            );
            expect(rawConfig).toEqual({
                name: 'nrfml-raw-file-sink',
                init_parameters: {
                    file_path: path.join('some', 'path.mtrace'),
                },
            });
        });

        it('should return proper configuration for live trace', () => {
            const liveConfig = sinkConfig(
                state,
                { type: 'file', path: 'some/path.mtrace' },
                'live'
            );
            expect(liveConfig).toEqual({
                name: 'nrfml-wireshark-named-pipe-sink',
                init_parameters: {
                    application_name: 'Cellular Monitor',
                    hw_name: undefined,
                    os_name: 'MockOS',
                    start_process: MOCKED_DEFAULT_WIRESHARK_PATH,
                },
            });
        });

        it('should return proper configuration for pcap trace', () => {
            const pcapConfig = sinkConfig(
                state,
                { type: 'file', path: 'some/path.mtrace' },
                'pcap'
            );
            expect(pcapConfig).toEqual({
                name: 'nrfml-pcap-sink',
                init_parameters: {
                    application_name: 'Cellular Monitor',
                    hw_name: undefined,
                    os_name: 'MockOS',
                    file_path: path.join('some', 'path.pcapng'),
                },
            });
        });
    });
});
