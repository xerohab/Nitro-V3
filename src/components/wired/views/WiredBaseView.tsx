import { GetRoomEngine, GetSessionDataManager } from '@octane/renderer';
import { CSSProperties, FC, MouseEvent, PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType, WiredSelectionVisualizer, wiredStyleClassName } from '../../../api';
import wiredBgLeft from '../../../assets/images/wired/wired_bg_left.png';
import wiredBgRight from '../../../assets/images/wired/wired_bg_right.png';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../common';
import { useWired, useWiredTools } from '../../../hooks';
import { WiredFurniSelectorView } from './WiredFurniSelectorView';

export interface WiredBaseViewProps {
    wiredType: string;
    requiresFurni: number;
    hasSpecialInput: boolean;
    save: () => void;
    validate?: () => boolean;
    cardStyle?: CSSProperties;
    footer?: ReactNode;
    footerCollapsible?: boolean;
    selectionPreview?: ReactNode;
    /** False keeps furni picking on but leaves its section out, for views that show it elsewhere. */
    showSelection?: boolean;
}

export const WiredBaseView: FC<PropsWithChildren<WiredBaseViewProps>> = (props) => {
    const WIRED_CARD_WIDTH = 244;
    const {
        wiredType = '',
        requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_NONE,
        save = null,
        validate = null,
        children = null,
        hasSpecialInput = false,
        cardStyle = undefined,
        footer = null,
        footerCollapsible = true,
        selectionPreview = null,
        showSelection = true
    } = props;
    const [wiredName, setWiredName] = useState<string>(null);
    const [needsSave, setNeedsSave] = useState<boolean>(false);
    const [keepOpenOnSave, setKeepOpenOnSave] = useState<boolean>(false);
    const [showFooter, setShowFooter] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [pasteInto, setPasteInto] = useState(false);
    const {
        trigger = null,
        setTrigger = null,
        setIntParams = null,
        setStringParam = null,
        setFurniIds = null,
        furniIds = [],
        setAllowsFurni = null,
        saveWired = null,
        saveWiredAndKeepOpen = null,
        clipboardEntry = null,
        copyWiredToClipboard = null,
        pasteWiredFromClipboard = null,
        resetWiredToDefault = null,
        clearWiredPicks = null
    } = useWired();
    const { roomSettings, accountPreferences } = useWiredTools();

    const clearRoomAreaSelection = () => {
        GetRoomEngine().areaSelectionManager.clearHighlight();
        GetRoomEngine().areaSelectionManager.deactivate();
    };

    const onClose = () => {
        clearRoomAreaSelection();
        WiredSelectionVisualizer.clearAllSelectionShaders();
        setTrigger(null);
    };

    const onSave = (keepOpen: boolean = false) => {
        if (!roomSettings.canModify) return;

        if (validate && !validate()) return;

        if (save) save();

        setKeepOpenOnSave(keepOpen);
        setNeedsSave(true);
    };

    useEffect(() => {
        if (!needsSave) return;

        if (keepOpenOnSave && saveWiredAndKeepOpen) saveWiredAndKeepOpen();
        else saveWired();

        setNeedsSave(false);
        setKeepOpenOnSave(false);
    }, [needsSave, keepOpenOnSave, saveWired, saveWiredAndKeepOpen]);

    // The quick menu. Copy pushes the view's current settings into the hook first (the same
    // step "ready" takes), so the clipboard holds what is on screen and not what was last saved.
    const canEdit = !!roomSettings.canModify;
    // The header is the drag handle; a press on the menu is a click, not the start of a drag.
    const stopDrag = (event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        event.nativeEvent.stopImmediatePropagation();
    };

    const runMenuAction = (action: () => void) => {
        setIsMenuOpen(false);
        action();
    };
    const onCopy = () => {
        if (validate && !validate()) return;

        if (save) save();

        copyWiredToClipboard?.();
    };
    const menuItems: Array<{ id: string; label: string; disabled: boolean; onClick: () => void; checked?: boolean } | null> = [
        { id: 'copy', label: localizeWithFallback('wiredfurni.params.menu.copy', 'Copy'), disabled: !canEdit, onClick: onCopy },
        {
            id: 'paste',
            label: localizeWithFallback('wiredfurni.params.menu.paste', 'Paste'),
            disabled: !canEdit || !clipboardEntry,
            onClick: () => pasteWiredFromClipboard?.(pasteInto)
        },
        {
            id: 'paste-into',
            label: localizeWithFallback('wiredfurni.params.menu.paste_into', 'Paste into (keep picks and delay)'),
            disabled: !canEdit,
            checked: pasteInto,
            onClick: () => setPasteInto((value) => !value)
        },
        null,
        {
            id: 'clear-picks',
            label: localizeWithFallback('wiredfurni.params.menu.clear_picks', 'Clear furni picks'),
            disabled: !canEdit || !furniIds?.length,
            onClick: () => clearWiredPicks?.()
        },
        { id: 'reset', label: localizeWithFallback('wiredfurni.params.menu.reset', 'Reset to default'), disabled: !canEdit, onClick: () => resetWiredToDefault?.() },
        null,
        {
            id: 'save-open',
            label: localizeWithFallback('wiredfurni.params.menu.save_without_closing', 'Save without closing'),
            disabled: !canEdit,
            onClick: () => onSave(true)
        }
    ];

    useEffect(() => {
        if (!trigger) return;

        setShowFooter(false);
        setIsMenuOpen(false);

        WiredSelectionVisualizer.clearAllSelectionShaders();

        const spriteId = trigger.spriteId || -1;
        const furniData = GetSessionDataManager().getFloorItemData(spriteId);

        if (!furniData) {
            setWiredName('NAME: ' + spriteId);
        } else {
            setWiredName(furniData.name);
        }

        if (hasSpecialInput) {
            setIntParams(trigger.intData);
            setStringParam(trigger.stringData);
        }
    }, [trigger, hasSpecialInput, setIntParams, setStringParam]);

    useEffect(() => {
        if (!trigger) return;

        setFurniIds((prevValue) => {
            if (prevValue && prevValue.length) WiredSelectionVisualizer.clearSelectionShaderFromFurni(prevValue);

            if (requiresFurni <= WiredFurniType.STUFF_SELECTION_OPTION_NONE) return [];

            if (trigger.selectedItems && trigger.selectedItems.length) {
                WiredSelectionVisualizer.applySelectionShaderToFurni(trigger.selectedItems);

                return trigger.selectedItems;
            }

            return [];
        });
    }, [trigger, requiresFurni, setFurniIds]);

    useEffect(() => {
        return () => clearRoomAreaSelection();
    }, []);

    useEffect(() => {
        if (!trigger) return;

        setAllowsFurni(requiresFurni);
    }, [trigger, requiresFurni, setAllowsFurni]);

    const resolvedCardStyle: CSSProperties = { ...cardStyle };

    resolvedCardStyle.width = WIRED_CARD_WIDTH;
    resolvedCardStyle.minWidth = WIRED_CARD_WIDTH;
    resolvedCardStyle.maxWidth = WIRED_CARD_WIDTH;
    resolvedCardStyle.resize = 'none';

    return (
        <OctaneCardView
            className={`octane-wired ${wiredStyleClassName(accountPreferences?.wiredStyle)} max-h-[calc(100vh-16px)]`}
            theme="primary-slim"
            uniqueKey="octane-wired"
            isResizable={false}
            style={resolvedCardStyle}
        >
            <OctaneCardHeaderView classNames={['octane-wired__header']} headerText={LocalizeText('wiredfurni.title')} onCloseClick={onClose}>
                <div className="octane-wired__menu">
                    <button
                        aria-expanded={isMenuOpen}
                        aria-haspopup="menu"
                        aria-label={localizeWithFallback('wiredfurni.params.menu', 'Menu')}
                        className="octane-wired__menu-toggle"
                        title={localizeWithFallback('wiredfurni.params.menu', 'Menu')}
                        type="button"
                        onClick={() => setIsMenuOpen((value) => !value)}
                        onMouseDownCapture={stopDrag}
                    >
                        &#8801;
                    </button>
                    {isMenuOpen && (
                        <div className="octane-wired__menu-list" role="menu" onMouseDownCapture={stopDrag}>
                            {menuItems.map((item, index) =>
                                item ? (
                                    <button
                                        key={item.id}
                                        aria-checked={item.checked}
                                        className="octane-wired__menu-item"
                                        disabled={item.disabled}
                                        role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
                                        type="button"
                                        onClick={() => (item.checked === undefined ? runMenuAction(item.onClick) : item.onClick())}
                                    >
                                        {item.checked !== undefined && <span className="octane-wired__menu-check">{item.checked ? '\u2611' : '\u2610'}</span>}
                                        <span>{item.label}</span>
                                    </button>
                                ) : (
                                    <div key={`spacer-${index}`} className="octane-wired__menu-spacer" />
                                )
                            )}
                        </div>
                    )}
                </div>
            </OctaneCardHeaderView>
            <OctaneCardContentView classNames={['octane-wired__content']} gap={0}>
                <div className="octane-wired__section octane-wired__summary">
                    <img className="octane-wired__summary-bg octane-wired__summary-bg--left" src={wiredBgLeft} alt="" />
                    <img className="octane-wired__summary-bg octane-wired__summary-bg--right" src={wiredBgRight} alt="" />
                    <div className="octane-wired__summary-copy">
                        <Text bold className="octane-wired__summary-title">
                            {wiredName}
                        </Text>
                    </div>
                </div>
                <div className="octane-wired__body">
                    {!!children && <div className="octane-wired__divider" />}
                    {!!children && <div className="octane-wired__section octane-wired__section--body">{children}</div>}
                    {showSelection && requiresFurni > WiredFurniType.STUFF_SELECTION_OPTION_NONE && (
                        <>
                            <div className="octane-wired__divider" />
                            <div className="octane-wired__section octane-wired__section--selector">{selectionPreview || <WiredFurniSelectorView />}</div>
                        </>
                    )}
                    {footer && (
                        <>
                            <div className="octane-wired__divider" />
                            <div className="octane-wired__section octane-wired__section--footer">
                                {footerCollapsible ? (
                                    <>
                                        <button className="octane-wired__advanced-toggle" type="button" onClick={() => setShowFooter((value) => !value)}>
                                            {LocalizeText(showFooter ? 'wiredfurni.params.sources.collapse' : 'wiredfurni.params.sources.expand')}
                                        </button>
                                        {showFooter && <div className="octane-wired__advanced-body">{footer}</div>}
                                    </>
                                ) : (
                                    footer
                                )}
                            </div>
                        </>
                    )}
                    <div className="octane-wired__divider" />
                    <div className="flex items-center gap-1 octane-wired__actions">
                        <Button
                            disabled={!roomSettings.canModify}
                            fullWidth
                            variant="success"
                            classNames={['octane-wired__button', 'octane-wired__button--primary']}
                            onClick={() => onSave(false)}
                        >
                            {LocalizeText('wiredfurni.ready')}
                        </Button>
                        <Button fullWidth variant="secondary" classNames={['octane-wired__button', 'octane-wired__button--secondary']} onClick={onClose}>
                            {LocalizeText('cancel')}
                        </Button>
                    </div>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
