/**
 * @jest-environment node
 */

/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { convert, initialState, Packet, State } from '.';
import { rawTraceData } from './traceSample';

const traceData = rawTraceData.map(
    jsonPacket =>
        ({
            format: jsonPacket.format,
            packet_data: new Uint8Array(jsonPacket.packet_data.data),
        } as Packet)
);

const expectedState: State = {
    notifySignalQuality: true,
    signalQuality: {
        rsrp: 54,
        rsrp_threshold_index: 255,
        rsrp_decibel: 140 - 54,
        rsrq: 11,
        rsrq_threshold_index: 255,
        rsrq_decibel: 0,
    },
    notifyPeriodicTAU: false,
    xmonitor: {
        regStatus: 5,
        operatorFullName: 'Telia N@',
        operatorShortName: 'Telia N@',
        plmn: '24202',
        tac: '0901',
        AcT: 7,
        band: 20,
        cell_id: '02024720',
        phys_cell_id: 428,
        EARFCN: 6300,
        rsrp: 53,
        snr: 22,
        NW_provided_eDRX_value: '',
        activeTime: '11100000',
        periodicTAU: '01001001',
        periodicTAUext: '11100000',
    },
    pinCodeStatus: 'READY',
    functionalMode: 1,
    IMEI: '352656106647673',
    manufacturer: 'Nordic Semiconductor ASA',
    revisionID: 'mfw_nrf9160_1.3.2',
    modeOfOperation: 2,
    availableBands: [1, 2, 3, 4, 5, 8, 12, 13, 18, 19, 20, 25, 26, 28, 66],
    pinRetries: { SIM_PIN: 3 },
    imsi: '204080813630037',
    iccid: '8901234567012345678F',
    currentBand: 13,
    periodicTAU: undefined,
    hardwareVersion: undefined,
    modemUUID: undefined,
    dataProfile: undefined,
    nbiotTXReduction: undefined,
    ltemTXReduction: undefined,
    activityStatus: undefined,
};

test('Trace is read properly', () => {
    let state = initialState();

    traceData.forEach(packet => {
        state = convert(packet, state);
    });

    expect(state).toEqual(expectedState);
});
