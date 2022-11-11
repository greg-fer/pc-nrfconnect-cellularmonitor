/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { TraceEvent } from '../tracing/tracePacketEvents';
import { convert, initialState, State } from '.';

export const atPacket = (txt: string): TraceEvent => ({
    format: 'AT',
    data: txt,
    timestamp: 0,
});

export const OkPacket = atPacket('OK\r\n');
export const ErrorPacket = atPacket('ERROR\r\n');

export const convertPackets = (
    packets: TraceEvent[],
    previousState = initialState()
): State =>
    packets.reduce(
        (state, packet) => ({ ...state, ...convert(packet, state) }),
        previousState
    );
