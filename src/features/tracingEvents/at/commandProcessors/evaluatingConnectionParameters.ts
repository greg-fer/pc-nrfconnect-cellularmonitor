/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import {
    ConevalEnergyEstimate,
    ConnectionEvaluationResult,
    CoverageEnhancementLevel,
    RRCState,
    TAUTriggered,
} from '../../types';
import type { Processor } from '..';
import { getParametersFromResponse } from '../utils';

export const processor: Processor<'%CONEVAL'> = {
    command: '%CONEVAL',
    documentation:
        'https://infocenter.nordicsemi.com/topic/ref_at_commands/REF/at_commands/mob_termination_ctrl_status/coneval.html',
    initialState: () => ({}),
    onResponse: (packet, state) => {
        if (packet.status === 'OK') {
            const parsedPayload = getParametersFromResponse(packet.payload);
            const conevalResult = validateConevalResult(parsedPayload[0]);
            if (conevalResult === 0) {
                const rsrp = validateNumberValue(parsedPayload[3]);
                const rsrq = validateNumberValue(parsedPayload[4]);
                const snr = validateNumberValue(parsedPayload[5]);
                return {
                    ...state,
                    networkStatusLastUpdate: 'coneval',
                    conevalResult: validateConevalResult(parsedPayload[0]),
                    rrcState: validateRRCState(parsedPayload[1]),
                    conevalEnergyEstimate: validateConevalEnergyEstimate(
                        parsedPayload[2]
                    ),
                    signalQuality: {
                        ...state.signalQuality,
                        rsrp: rsrp ?? state.signalQuality?.rsrp,
                        rsrp_decibel: rsrp
                            ? rsrp - 140
                            : state.signalQuality?.rsrp_decibel,
                        rsrq: rsrq ?? state.signalQuality?.rsrq,
                        rsrq_decibel: rsrq
                            ? rsrq / 2 - 19.5
                            : state.signalQuality?.rsrq_decibel,
                        snr: snr ?? state.signalQuality?.snr,
                        snr_decibel: snr
                            ? snr - 24
                            : state.signalQuality?.snr_decibel,
                    },
                    cellID: parsedPayload[6],
                    plmn: parsedPayload[7],
                    physicalCellID: validateNumberValue(parsedPayload[8]),
                    earfcn: validateNumberValue(parsedPayload[9]),
                    band: validateNumberValue(parsedPayload[10]),
                    TAUTriggered: validateTAUTriggered(parsedPayload[11]),
                    conevalCoverageEnhancementLevel:
                        validateCoverageEnhancementLevel(parsedPayload[12]),
                    conevalTXPower: validateNumberValue(parsedPayload[13]),
                    conevalTXRepetitions: validateNumberValue(
                        parsedPayload[14]
                    ),
                    conevalRXRepetitions: validateNumberValue(
                        parsedPayload[15]
                    ),
                    conevalDLPathLoss: validateNumberValue(parsedPayload[16]),
                };
            }

            return {
                ...state,
                conevalResult,
                networkStatusLastUpdate: 'coneval',
            };
        }
        return state;
    },
};

const validateConevalResult = (value: string): ConnectionEvaluationResult => {
    if (value == null) return undefined;

    const numberValue = Number.parseInt(value, 10);
    if (numberValue >= 0 && numberValue <= 7) {
        return numberValue as ConnectionEvaluationResult;
    }

    return undefined as never;
};

const validateRRCState = (value: string): RRCState => {
    if (value === '0') return 0;
    if (value === '1') return 1;
    return undefined as never;
};

const validateConevalEnergyEstimate = (
    value: string
): ConevalEnergyEstimate => {
    const validValues = [5, 6, 7, 8, 9];
    const numberValue = Number.parseInt(value, 10);

    if (validValues.includes(numberValue))
        return numberValue as ConevalEnergyEstimate;

    return undefined as never;
};

const validateCoverageEnhancementLevel = (
    value: string
): CoverageEnhancementLevel => {
    const validValues = [0, 1, 2, 3, 255];
    const numberValue = Number.parseInt(value, 10);

    if (validValues.includes(numberValue))
        return numberValue as CoverageEnhancementLevel;

    return undefined as never;
};

const validateTAUTriggered = (value: string): TAUTriggered => {
    if (value === '0') return 0;
    if (value === '1') return 1;
    if (value === '255') return 255;

    return undefined as never;
};

const validateNumberValue = (value: string): number | undefined => {
    // The purpose is to not have a NaN flowing around in the program, because
    // typeof NaN is 'number'.
    const numberValue = Number.parseInt(value, 10);
    if (!Number.isNaN(numberValue)) return numberValue;
    return undefined as never;
};
