/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useRef, useState } from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { useDispatch, useSelector } from 'react-redux';
import { mdiPlayBox, mdiTextBox } from '@mdi/js';
import Icon from '@mdi/react';
import { Card, colors, openUrl, selectedDevice } from 'pc-nrfconnect-shared';

import { documentation } from '../../../../resources/docs/dashboardFields';
import { TDispatch } from '../../../utils/thunk';
import {
    getDetectedAtHostLibrary,
    getIsTracing,
} from '../../tracing/traceSlice';
import { documentationMap } from '../../tracingEvents/at';
import {
    commandHasRecommeneded,
    recommendedAT,
} from '../../tracingEvents/at/recommeneded';
import { sendAT } from '../../tracingEvents/at/sendCommand';

import './DashboardCard.css';

export type DashboardCardFields = Record<string, DashboardCardField>;
export type DashboardCardField = {
    value: string | number;
};

type DashboardCard = {
    title: string;
    iconName: string;
    information?: string;
    fields: DashboardCardFields;
};

export default ({
    title,
    iconName = 'mdi-border-none-variant',
    information = '',
    fields,
}: DashboardCard) => (
    <div>
        <Card
            title={
                <>
                    <span className={`mdi ${iconName} icon`} />
                    {title}
                    {information.length > 0 && (
                        <OverlayTrigger
                            key={`overlay-${title}`}
                            placement="bottom-end"
                            overlay={
                                <Tooltip id={`tooltip-${title}`}>
                                    <span className="info">{information}</span>
                                </Tooltip>
                            }
                        >
                            <span className="mdi mdi-information-outline info-icon" />
                        </OverlayTrigger>
                    )}
                </>
            }
        >
            {Object.entries(fields).map(([fieldKey, fieldValues]) => (
                <li key={fieldKey}>
                    <CardEntry
                        fieldKey={fieldKey}
                        value={fieldValues.value}
                        title={title}
                    />
                </li>
            ))}
        </Card>
    </div>
);

type CardEntry = {
    fieldKey: string;
    value: string | number;
    title: string;
};

const CardEntry = ({ fieldKey, value, title }: CardEntry) => {
    const dispatch = useDispatch();
    const device = useSelector(selectedDevice);
    const isTracing = useSelector(getIsTracing);
    const detectedAtHostLibrary = useSelector(getDetectedAtHostLibrary);
    const [keepShowing, setKeepShowing] = useState(false);

    const fieldRef = useRef<HTMLDivElement>(null);
    const oldValue = useRef<string | number | null>(null);

    const canSendCommand = device != null && detectedAtHostLibrary && isTracing;
    const showTooltip = (show: boolean) => setKeepShowing(show);

    useEffect(() => {
        if (
            value !== oldValue.current &&
            oldValue.current &&
            fieldRef.current
        ) {
            fieldRef.current?.classList.remove('animated-card-entry');
            setTimeout(() =>
                fieldRef?.current?.classList.add('animated-card-entry')
            );
        }
        oldValue.current = value;
    }, [value]);

    return (
        <div
            className="card-entry"
            onMouseEnter={() => {
                setKeepShowing(true);
            }}
            onMouseLeave={() => {
                setKeepShowing(false);
            }}
        >
            <div
                ref={fieldRef}
                className="w-100 d-flex justify-content-between"
            >
                <p>
                    <b>{fieldKey}</b>
                </p>
                <p className="text-right">{value}</p>
            </div>

            {keepShowing ? (
                <OverlayTrigger
                    key={`overlay-${fieldKey}`}
                    placement="bottom-end"
                    overlay={CardTooltip({
                        fieldKey,
                        title,
                        showTooltip,
                        canSendCommand,
                        dispatch,
                    })}
                    show={keepShowing}
                >
                    <div className="tooltip-helper" />
                </OverlayTrigger>
            ) : null}
        </div>
    );
};

type CardTooltip = {
    fieldKey: string;
    title: string;
    showTooltip: (show: boolean) => void;
    canSendCommand: boolean;
    dispatch: TDispatch;
};

const CardTooltip = ({
    fieldKey,
    title,
    showTooltip,
    canSendCommand,
    dispatch,
}: CardTooltip) => {
    const cardType = title.includes('PDN') ? 'Packet Domain Network' : title;
    const tooltipTitle = documentation[cardType]?.[fieldKey]?.title ?? fieldKey;
    const tooltipDocumentation = documentation[cardType]?.[fieldKey];
    const { commands, description } = tooltipDocumentation ?? {
        commands: [],
        description: undefined,
    };

    return (
        <Tooltip id={`tooltip-${fieldKey}`}>
            <div
                className="card-tooltip"
                onMouseEnter={() => showTooltip(true)}
                onMouseLeave={() => showTooltip(false)}
            >
                <p className="font-weight-bold">{tooltipTitle}</p>
                {description !== undefined ? (
                    <p style={{ color: colors.gray100 }}>
                        {description.split('\n').map((partial, indexKey) => (
                            // eslint-disable-next-line react/no-array-index-key
                            <span key={indexKey}>
                                {partial}
                                <br />
                            </span>
                        ))}
                    </p>
                ) : null}
                {commands.length > 0 ? (
                    <>
                        <p className="font-weight-bold">
                            RELATED{' '}
                            {commands.length > 1 ? 'COMMANDS' : 'COMMAND'}
                        </p>
                        {commands.map((cmd, index) => (
                            <div key={`${cmd}`} className="mb-3">
                                <p className="mb-0">{cmd}</p>

                                <div className="d-flex">
                                    {canSendCommand &&
                                    commandHasRecommeneded(cmd) ? (
                                        <span
                                            role="button"
                                            tabIndex={index}
                                            style={{
                                                marginRight: '8px',
                                                ...linkStyle,
                                            }}
                                            onClick={() => {
                                                const commandsToSend =
                                                    recommendedAT[cmd];
                                                if (commandsToSend) {
                                                    dispatch(
                                                        sendAT(commandsToSend)
                                                    );
                                                }
                                            }}
                                            onKeyDown={event => {
                                                if (event.key === 'Enter') {
                                                    const commandsToSend =
                                                        recommendedAT[cmd];
                                                    if (commandsToSend) {
                                                        dispatch(
                                                            sendAT(
                                                                commandsToSend
                                                            )
                                                        );
                                                    }
                                                }
                                            }}
                                        >
                                            <Icon
                                                className="mr-1"
                                                path={mdiPlayBox}
                                                size={0.6}
                                            />{' '}
                                            Run command{' '}
                                        </span>
                                    ) : null}
                                    <span
                                        role="button"
                                        tabIndex={index}
                                        style={linkStyle}
                                        onClick={() =>
                                            openUrl(documentationMap[cmd])
                                        }
                                        onKeyDown={event =>
                                            event.key === 'Enter'
                                                ? openUrl(documentationMap[cmd])
                                                : null
                                        }
                                    >
                                        <Icon
                                            className="mr-1"
                                            path={mdiTextBox}
                                            size={0.6}
                                        />{' '}
                                        Doc
                                    </span>
                                </div>
                            </div>
                        ))}
                    </>
                ) : null}
            </div>
        </Tooltip>
    );
};

const linkStyle: React.CSSProperties = {
    fontSize: '14px',
    color: colors.nordicBlue,
    display: 'flex',
    alignItems: 'center',
};
