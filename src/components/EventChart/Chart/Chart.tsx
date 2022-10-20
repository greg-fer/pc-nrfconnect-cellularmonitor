/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import 'chartjs-adapter-date-fns';

import React, { useMemo, useEffect } from 'react';
import { Scatter } from 'react-chartjs-2';
import ReactDOM from 'react-dom';
import { useDispatch } from 'react-redux';
import {
    CategoryScale,
    Chart as ChartJS,
    ChartData,
    ChartOptions,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    TimeScale,
    Title,
    Tooltip,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';

import { colors as sharedColors } from "pc-nrfconnect-shared";
import { setSelectedTime } from './chartSlice';
import { selectTimePlugin } from './selectTimePlugin';
import { PacketTooltip } from './Tooltip';
import { Packet } from '../../../features/at';

ChartJS.register(
    LinearScale,
    CategoryScale,
    TimeScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    zoomPlugin
);

const colors = [
    sharedColors.primary,
    sharedColors.deepPurple,
    sharedColors.indigo,
    sharedColors.amber,
    sharedColors.purple,
    sharedColors.green,
    sharedColors.deepPurple,
    sharedColors.orange,
    sharedColors.lime,
    sharedColors.pink,
];

const formats = ["at", "lte_rrc.bcch_dl_sch", "nas-eps", "lte_rrc.ul_ccch", "lte_rrc.dl_ccch", "lte_rrc.ul_dcch", "lte_rrc.dl_dcch", "ip"];

export const Events = ({ packets }: { packets: Packet[] }) => {
    const dispatch = useDispatch();

    const options: ChartOptions<'scatter'> = useMemo(
        () => ({
            maintainAspectRatio: false,
            responsive: true,

            plugins: {
                legend: {
                    display: true,
                },

                zoom: {
                    zoom: {
                        wheel: {
                            enabled: true,
                        },
                        mode: 'x',
                    },
                    pan: {
                        enabled: true,
                        modifierKey: 'ctrl',
                        mode: 'x',
                    },
                },

                selectTime: {
                    updateTime(time) {
                        dispatch(setSelectedTime(time));
                    },
                },

                tooltip: {
                    enabled: false,
                    external(context) {
                        const showing = context.tooltip.opacity === 1;
                        
                        if (showing) {
                            const tooltip = PacketTooltip(context.tooltip);
                            if (tooltip) {
                                ReactDOM.render(
                                    tooltip,
                                    document.getElementById('tooltip')
                                );
                            }
                        } else {
                            ReactDOM.render(
                                <div />,
                                document.getElementById('tooltip')
                            );
                        }
                    },
                },
            },

            scales: {
                y: {
                    display: true,
                    ticks: {
                        callback: () => undefined,
                    },
                    grid: { display: false },
                    suggestedMin: -1,
                    suggestedMax: formats.length
                },
                x: {
                    type: 'time',
                    ticks: {
                        sampleSize: 50,
                        autoSkip: true,
                        autoSkipPadding: 50,
                        maxRotation: 0,
                    },
                },
            },
        }),
        []
    );

    const events = packets.map(event => ({
        x: (event.timestamp?.value ?? 0) / 1000,
        y: formats.indexOf(event.format) ?? 0,
        event,
    }));
    
    const datasets: typeof data.datasets = formats.map((format, index) => ({
        label: format,
        data: events.filter(event => event.event.format === format),
        borderColor: colors[index],
        backgroundColor: colors[index],
        pointRadius: 6,
        pointHoverRadius: 6,
        pointHoverBorderWidth: 5,
        pointBorderWidth: 5,
        pointHoverBackgroundColor: 'white',
        hidden: format === 'modem_trace',
    }));
    
    const data: ChartData<'scatter'> = {
        datasets,
    };

    const plugins = [selectTimePlugin];

    return (
        <Scatter
            options={options}
            data={data}
            plugins={plugins}
        />
    );
};
