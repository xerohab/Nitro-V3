import { FC } from 'react';
import { AvatarEditorUI2View } from './AvatarEditorUI2View';

/*
 * Solace UI2 is the permanent interface.
 * Always use the UI2 avatar editor/wardrobe.
 */
export const AvatarEditorView: FC<{}> = () =>
    <AvatarEditorUI2View />;
