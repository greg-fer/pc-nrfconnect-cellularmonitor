/**
 * @jest-environment node
 */

/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { convert, initialState, Packet, State } from './index';

const encoder = new TextEncoder();
const encode = (txt: string) => Buffer.from(encoder.encode(txt));
const atPacket = (txt: string): Packet => ({
    format: 'at',
    packet_data: encode(txt),
});

const setCommandPacket = atPacket('AT%XCBAND');
const bandResponses = [1, 13, 16, 21, 54, 71].map(band => ({
    responsePacket: atPacket(`%XCBAND: ${band}\r\nOK\r\n`),
    result: band,
}));

const testCommandPacket = atPacket('AT%XCBAND=?');

const listsOfAvailableBands = [
    [1, 2, 3, 4, 12, 13],
    [1, 2, 3, 4, 12, 13, 17, 63, 71],
    [1, 2, 3, 4, 12, 13, 17, 54, 63, 71],
    [1, 12, 13, 17, 54, 63, 71],
];
const bandTestResponses = listsOfAvailableBands.map(bands => ({
    responsePacket: atPacket(`%XCBAND: (${bands})\r\nOK\r\n`),
    result: bands,
}));

const convertPackets = (
    packets: Packet[],
    previousState = initialState()
): State =>
    packets.reduce(
        (state, packet) => ({ ...state, ...convert(packet, state) }),
        previousState
    );

test('%XCBAND set command reads the current band and sets it in the viewModel', () => {
    bandResponses.forEach(response => {
        const getBandView = convertPackets([
            setCommandPacket,
            response.responsePacket,
        ]);
        expect(getBandView.currentBand).toBe(response.result);
    });
});

test('%XCBAND set command reads available bands and sets it in the viewModel', () => {
    bandTestResponses.forEach(response => {
        const testCommandSent = convertPackets([testCommandPacket]);
        const responseRecieved = convertPackets(
            [response.responsePacket],
            testCommandSent
        );

        expect(responseRecieved.availableBands).toEqual(response.result);
    });
});
