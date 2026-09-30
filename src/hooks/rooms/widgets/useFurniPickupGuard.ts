import { RoomObjectCategory, RoomObjectOperationType } from '@octane/renderer';
import { useCallback } from 'react';
import {
    expandLocalizedText,
    GetFurnitureDataForRoomObject,
    GetRoomSession,
    isWebApiBoxClassName,
    localizeWithFallback,
    ProcessRoomObjectOperation
} from '../../../api';
import { useNotification } from '../../notification';

const localizeText = (key: string, fallback: string): string =>
    expandLocalizedText(localizeWithFallback(key, fallback), (nested) => localizeWithFallback(nested, '') || null);

/** Whether any of these room objects is a Variables Web API add-on, whose keys die with a pickup. */
export const hasWebApiBox = (objectIds: number[], category: number = RoomObjectCategory.FLOOR): boolean => {
    const roomId = GetRoomSession()?.roomId;

    if (!roomId) return false;

    return objectIds.some((objectId) => isWebApiBoxClassName(GetFurnitureDataForRoomObject(roomId, objectId, category)?.className));
};

/** Picking up a web api box first asks (`wiredfurni.web_api.pickup.*`); everything else goes straight through. */
export const useFurniPickupGuard = () => {
    const { showConfirm = null } = useNotification();

    const confirmIfWebApiBox = useCallback(
        (objectIds: number[], category: number, proceed: () => void) => {
            if (!showConfirm || !hasWebApiBox(objectIds, category)) {
                proceed();
                return;
            }

            showConfirm(
                localizeText(
                    'wiredfurni.web_api.pickup.body',
                    'Are you sure you want to pick up this add-on? The Web API will stop working for this room, and the keys will be different when placing it again.'
                ),
                proceed,
                null,
                null,
                null,
                localizeText('wiredfurni.web_api.pickup.title', 'Removing a Web API Add-On')
            );
        },
        [showConfirm]
    );

    const pickupRoomObject = useCallback(
        (objectId: number, category: number, operation: string = RoomObjectOperationType.OBJECT_PICKUP) =>
            confirmIfWebApiBox([objectId], category, () => ProcessRoomObjectOperation(objectId, category, operation)),
        [confirmIfWebApiBox]
    );

    return { pickupRoomObject, confirmIfWebApiBox };
};
