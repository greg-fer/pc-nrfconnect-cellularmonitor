/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { getAT } from '../../../features/at/atSlice';

import DashboardCard from './DashboardCard';

const formatAvailableBands = (bandsArray: number[]) =>
    `${bandsArray.join(',')}`;

export default () => {
   const {
    IMEI,
    currentBand,
    availableBands,
    manufacturer
   } = useSelector(getAT);


    const fields = {
        IMEI: IMEI ?? 'Unknown',
        'REVISION ID': 'Unknown',
        'HARDWARE VERSION': 'Unknown',
        'MODEM UUID': 'Unknown',
        'CURRENT BAND': currentBand ?? 'Unknown',
        'AVAILABLE BANDS': availableBands ? formatAvailableBands(availableBands) : 'Unknown',
        'DATA PROFILE': 'Unknown',
        MANUFACTURER: manufacturer ?? 'Unknown',
    };
    return (
        <DashboardCard
            title="Device"
            iconName="mdi-integrated-circuit-chip"
            fields={fields}
        />
    );
};
