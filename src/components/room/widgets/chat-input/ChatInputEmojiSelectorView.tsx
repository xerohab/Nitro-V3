import * as Popover from '@radix-ui/react-popover';
import { FC, useState } from 'react';
import { LazyEmojiPicker } from '../../../../common/LazyEmojiPicker';

interface ChatInputEmojiSelectorViewProps {
    addChatEmoji: (emoji: string) => void;
}

export const ChatInputEmojiSelectorView: FC<ChatInputEmojiSelectorViewProps> = (props) => {
    const { addChatEmoji = null } = props;
    const [selectorVisible, setSelectorVisible] = useState(false);

    const handleEmojiSelect = (emoji: any) => {
        if (!emoji?.native) return;

        addChatEmoji(emoji.native);
        setSelectorVisible(false);
    };

    return (
        <Popover.Root open={selectorVisible} onOpenChange={setSelectorVisible}>
            <Popover.Trigger asChild>
                <button
                    aria-label="Emojis"
                    className="swf-chat-emoji-trigger"
                    title="Emojis"
                    type="button"
                >
                    <span aria-hidden="true">☺</span>
                </button>
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Content
                    className="z-[1070]"
                    side="top"
                    sideOffset={8}
                >
                    <LazyEmojiPicker onEmojiSelect={handleEmojiSelect} />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};
