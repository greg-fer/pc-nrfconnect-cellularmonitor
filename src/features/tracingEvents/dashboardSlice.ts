/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import StateSelector from 'pc-nrfconnect-shared/src/StateSelector/StateSelector';

import type { RootState } from '../../appReducer';
import { initialState, RRCState, State } from './index';

const atSlice = createSlice({
    name: 'at',
    initialState: initialState(),
    reducers: {
        setAT: (state, action: PayloadAction<State>) => ({
            ...state,
            ...action.payload,
        }),

        setRRCState: (state, action: PayloadAction<RRCState>) => {
            state.rrcState = action.payload;
        },
    },
});

export const getAT = (state: RootState) => state.app.at;
export const getPowerSavingMode = (state: RootState) =>
    state.app.at.powerSavingMode;
export const { setAT, setRRCState } = atSlice.actions;
export default atSlice.reducer;
