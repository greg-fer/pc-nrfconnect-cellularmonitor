/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import type { Processor } from '.';
import { getParametersFromResponse } from './utils';

type ViewModel = {
    pinRetries?: {
        SIM_PIN?: number;
        SIM_PIN2?: number;
        SIM_PUK?: number;
        SIM_PUK2?: number;
    };
};

export const processor: Processor<ViewModel> = {
    command: '+CPINR',
    documentation:
        'https://infocenter.nordicsemi.com/topic/ref_at_commands/REF/at_commands/security/cpinr.html',
    initialState: () => ({}),
    onResponse: packet => {
        if (packet.status === 'OK') {
            const responseArray = getParametersFromResponse(packet.body);
            if (responseArray?.length === 2) {
                switch (responseArray[0]) {
                    case 'SIM PIN':
                        return {
                            pinRetries: {
                                SIM_PIN: parseInt(responseArray[1], 10),
                            },
                        };
                    case 'SIM PIN2':
                        return {
                            pinRetries: {
                                SIM_PIN2: parseInt(responseArray[1], 10),
                            },
                        };
                    case 'SIM PUK':
                        return {
                            pinRetries: {
                                SIM_PUK: parseInt(responseArray[1], 10),
                            },
                        };
                    case 'SIM PUK2':
                        return {
                            pinRetries: {
                                SIM_PUK2: parseInt(responseArray[1], 10),
                            },
                        };
                    default:
                }
            }
        }
        return {};
    },
};
