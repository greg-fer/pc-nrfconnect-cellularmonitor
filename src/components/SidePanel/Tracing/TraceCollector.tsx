/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useSelector } from 'react-redux';

import { getSerialPort } from '../../../features/tracing/traceSlice';
import DetectTraceDbDialog from './DetectTraceDbDialog';
import StartStopTrace from './StartStopTrace';

export default () => {
    const selectedSerialPort = useSelector(getSerialPort);

    if (!selectedSerialPort) {
        return null;
    }

    return (
        <>
            <StartStopTrace />
            <DetectTraceDbDialog />
        </>
    );
};
