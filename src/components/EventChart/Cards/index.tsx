/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
    events,
    tracePacketEvents,
} from '../../../features/tracing/tracePacketEvents';
import { convert } from '../../../features/tracingEvents';
import { initialState } from '../../../features/tracingEvents/at';
import {
    getDashboardState,
    getPowerSavingMode,
    setDashboardState,
} from '../../../features/tracingEvents/dashboardSlice';
import { getSelectedTime } from '../Chart/chartSlice';
import Device from './Device';
import LTENetwork from './LTENetwork';
import Modem from './Modem';
import PacketDomainNetwork from './PacketDomainNetwork';
import PowerSavingMode from './PowerSavingMode';
import Sim from './Sim';
import ConnectivityStaistics from './Statistics';
import Temp from './Temp';

export default () => {
    const timestamp = useSelector(getSelectedTime);
    const dispatch = useDispatch();
    const powerSavingMode = useSelector(getPowerSavingMode);
    const atState = useSelector(getDashboardState);

    useEffect(() => {
        // TODO: Create new state based on atState
        // TODO: Filter out events later than selected time
        const newState = events
            .filter(packet => packet.timestamp < timestamp)
            .reduce(
                (current, packet) => ({
                    ...current,
                    ...convert(packet, current),
                }),
                initialState()
            );
        dispatch(setDashboardState(newState));
    }, [dispatch, timestamp]);

    return (
        <div className="cards-container">
            <Temp />
            <Device />
            <Sim />
            <LTENetwork />
            <Modem />
            {powerSavingMode !== undefined ? <PowerSavingMode /> : null}
            <PacketDomainNetwork />
            <ConnectivityStaistics />
        </div>
    );
};
