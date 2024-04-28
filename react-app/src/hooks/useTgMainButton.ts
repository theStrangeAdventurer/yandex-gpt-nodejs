import { useEffect } from 'react';

type Props = { 
    text: string;
    isVisible: boolean;
    isActive: boolean;
    color: string;
    textColor: string;
    onClick(): void;
}

export const useTgMainButton = (props: Props) => {
    const tgParams = {
        text: props.text,
        text_color: props.textColor,
        color: props.color,
        is_visible: props.isVisible,
        is_active: props.isActive,
    };

    useEffect(() => {
        // @ts-expect-error WebApp exists
        Telegram.WebApp.MainButton.setParams(tgParams); // init
        // @ts-expect-error WebApp exists
        Telegram.WebApp.MainButton.onClick(props.onClick);

        return () => {
            // @ts-expect-error WebApp exists
            Telegram.WebApp.MainButton.offClick(props.onClick);
        }
    }, []);
    
    return {
        // @ts-expect-error WebApp exists
        show: Telegram.WebApp.MainButton.show,
        // @ts-expect-error WebApp exists
        hide: Telegram.WebApp.MainButton.show,
        // @ts-expect-error WebApp exists
        sendData: Telegram.WebApp.MainButton.sendData,
    }
}
