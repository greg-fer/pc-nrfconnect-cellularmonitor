/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Dropdown,
    DropdownItem,
    logger,
    selectedDevice,
    truncateMiddle,
    usageData,
} from '@nordicsemiconductor/pc-nrfconnect-shared';
import { basename } from 'path';

import { getDeviceKeyForTraceDatabaseEntries } from '../../features/programSample/programSample';
import {
    DatabaseVersion,
    getDatabases,
    getRemoteDatabases,
    setSelectedTraceDatabaseFromVersion,
} from '../../features/tracing/traceDatabase';
import {
    getIsTracing,
    getManualDbFilePath,
    resetManualDbFilePath,
    setManualDbFilePath,
} from '../../features/tracing/traceSlice';
import EventAction from '../../usageDataActions';
import { askForTraceDbFile } from '../../utils/fileUtils';
import { deleteDbFilePath, storeManualDbFilePath } from '../../utils/store';

const autoSelectItem: DropdownItem = {
    label: 'Autoselect',
    value: 'autoselect',
};

const selectFromDiskItem = {
    label: 'Select Trace DB',
    value: 'select-trace-db',
};

export default () => {
    const dispatch = useDispatch();
    const manualDbFilePath = useSelector(getManualDbFilePath);
    const [databases, setDatabases] = useState<DatabaseVersion[]>([]);
    const [selectedItem, setSelectedItem] = useState(autoSelectItem);
    const isTracing = useSelector(getIsTracing);
    const device = useSelector(selectedDevice);
    const nrfDeviceVersion = getDeviceKeyForTraceDatabaseEntries(device);

    const items = [
        autoSelectItem,
        selectFromDiskItem,
        ...databases
            .map(database => ({
                label: database.version,
                value: database.uuid,
            }))
            .reverse(),
    ];

    useEffect(() => {
        getDatabases(nrfDeviceVersion)
            .then(setDatabases)
            .then(() => getRemoteDatabases(nrfDeviceVersion))
            .then(dbs => {
                if (dbs != null) {
                    setDatabases(dbs);
                }
            });
    }, [nrfDeviceVersion]);

    useEffect(() => {
        const selectedDatabase = databases.find(file =>
            manualDbFilePath?.includes(
                // eslint-disable-next-line no-template-curly-in-string
                file.database.path.replace('${root}', '')
            )
        );
        if (selectedDatabase) {
            setSelectedItem({
                label: selectedDatabase?.version,
                value: selectedDatabase?.uuid,
            });
        }
    }, [databases, manualDbFilePath]);

    const onSelect = async (item: DropdownItem) => {
        const label = typeof item.label === 'string' ? item.label : item.value;
        usageData.sendUsageData(EventAction.SELECT_TRACE_DATABASE, {
            selectedTraceDatabase: label,
        });
        setSelectedItem(item);
        if (item.value === selectFromDiskItem.value) {
            const filePath = await askForTraceDbFile();
            if (filePath) {
                dispatch(setManualDbFilePath(filePath));
                storeManualDbFilePath(filePath);
                usageData.sendUsageData(EventAction.SET_TRACE_DB_MANUALLY);

                setSelectedItem({
                    label: truncateMiddle(basename(filePath), 10, 16),
                    value: 'select-trace-db',
                });
                logger.info(
                    `Database path successfully updated to ${filePath}`
                );
            }
        } else if (item.value === autoSelectItem.value) {
            deleteDbFilePath();
            dispatch(resetManualDbFilePath());
            logger.info(`Database path successfully reset to default value`);
        } else {
            dispatch(
                setSelectedTraceDatabaseFromVersion(label, nrfDeviceVersion)
            );
        }
    };

    return (
        <Dropdown
            disabled={isTracing}
            label="Modem trace database"
            items={items}
            onSelect={onSelect}
            selectedItem={selectedItem}
            numItemsBeforeScroll={10}
        />
    );
};
