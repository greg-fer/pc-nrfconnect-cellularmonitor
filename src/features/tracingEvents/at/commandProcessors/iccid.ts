/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import type { Processor } from '..';

export const processor: Processor = {
    command: '%XICCID',
    documentation:
        'https://infocenter.nordicsemi.com/topic/ref_at_commands/REF/at_commands/access_uicc/xiccid.html',
    initialState: () => ({}),
    onResponse: ( packet, state ) => {
        if (packet.status === 'OK') {
            return { ...state, iccid: packet.payload };
        }
        return state;
    },
};
