/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useSelector } from 'react-redux';

import { getSIM } from '../../at/atSlice';
import DashboardCard from '../Dashboard/DashboardCard';

export default () => {
    const SIMView = useSelector(getSIM);

    const fields = {
        IMSI: SIMView.iccid ?? 'Unknown',
        Operator: SIMView.operator ?? 'Unknown',
        Manufacturer: SIMView.manufacturer ?? 'Unknown',
        ICCID: SIMView.iccid ?? 'Unknown',
        // ODIS: false,
        PIN: SIMView.pin,
        // PUK: false,
        'Remaining PIN retries': SIMView.remainingPIN ?? 'unknown',
        'Remaining PUK retries': SIMView.remainingPUK ?? 'unknown',
        'Remaining PIN2 retries': SIMView.remainingPIN2 ?? 'unknown',
        'Remaining PUK2 retries': SIMView.remainingPUK2 ?? 'unknown',
        // 'Restricted SIM Access?': false,
        // 'Generic SIM Access?': false,
    };

    return (
        <DashboardCard title="Sim Card" iconName="mdi-sim" onclick={() => {}}>
            <ul>
                {Object.entries(fields).map(([key, value]) => (
                    <li key={key}>
                        <p>{key}:</p>
                        <p>{value}</p>
                    </li>
                ))}
            </ul>
        </DashboardCard>
    );
};
