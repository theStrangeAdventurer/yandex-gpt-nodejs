import { useCallback, useEffect, useRef, useState } from 'react';
// @ts-expect-error that's ok
import { LiveAudioVisualizer } from 'react-audio-visualize';
import {defaultTheme, Provider, Flex, Text, ProgressCircle, Button } from '@adobe/react-spectrum';
import { useAudioRecorder } from 'react-audio-voice-recorder';
import { AudioBufferVisualizer } from './components/AudioBufferVisualizer';
import './App.css'
import { isSafari } from './utils';
import { useTgMainButton } from './hooks/useTgMainButton';

type B64Str = string;

const getBufferFromB64 = (data: B64Str) => {
    // Парсинг base64 строки в бинарные данные
    const binaryData = atob(data);
    const dataArray = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
        dataArray[i] = binaryData.charCodeAt(i);
    }

    return dataArray.buffer;
};

// Проблемы:
// 0 - В Мобильном сафари через раз воспроизводится звук
// 1 - Перестал отрисовываться график

const playAudioData = async (data: B64Str): Promise<{ stop: () => void, source: AudioBufferSourceNode }> => {
      const arrBuff = getBufferFromB64(data);
      const context = new AudioContext();
      return new Promise((resolve) => {
            context.decodeAudioData(arrBuff)
              .then(buffer => {
                const source = context.createBufferSource();
                source.buffer = buffer;
                source.connect(context.destination);
                const stop = async () => {
                  source.stop();
                  source.disconnect();
                  if (context.state !== "closed") {
                    context.close()
                      .catch((err) => console.warn('cannot stop context: ', err))
                  }
                }
                resolve({ stop, source });
              })
      })
}

const ws = new WebSocket(`wss://${import.meta.env.VITE_WS_HOST}/assist`);
ws.binaryType = 'blob';

ws.addEventListener('open', (event) => console.log('Opened', event));

ws.addEventListener('close', (event) => console.log('ws closed', event));

ws.addEventListener('error', (err) => console.log('ws errr', err));

// @ts-expect-error that's fine
console.log('Telegram', window.Telegram);

function App() {
  const [ buffer, setAudioBuffer ] = useState<ArrayBuffer>();
  /** only need for safari browsers, see code below */
  const [_shouldShowBlobAnalizer, setShouldShowBlobAnalizer] = useState(false);
  
  const [ showPlayBtn, setShowPlayBtn ] = useState(false);
  const stopPreviousVoice = useRef<() => void>();
  const audioSource = useRef<AudioBufferSourceNode>();

  const playCurrentVoice = () => {
    setTimeout(() => setShowPlayBtn(false), 500);
    audioSource.current?.start();
    if (audioSource.current) {
      audioSource.current.onended = () => {
        stopPreviousVoice.current?.();
      }
    }
  };

  const {
    isRecording,
    startRecording,
    mediaRecorder: audioRec,
    stopRecording,
  } = useAudioRecorder();

  const wsMessageHandle = useCallback(async (ev: MessageEvent) => {
    console.info('message received');
    const { data } = ev;

    const { stop, source } = await playAudioData(data);
    stopPreviousVoice.current?.();
    setShouldShowBlobAnalizer(false);

    const shouldShowButton = isSafari();
    
    if (shouldShowButton)
      setShowPlayBtn(true);
    else
      source.start();
      
    stopPreviousVoice.current = stop;
    audioSource.current = source;
    setAudioBuffer(getBufferFromB64(data));

  }, []);

  useEffect(() => {
    if (!audioRec) return;

    audioRec.ondataavailable = (ev) => {
      console.info('send data', ev.data);
      ws.send(ev.data);
    };
    audioRec.onerror = (console.error);
    ws.removeEventListener('message', wsMessageHandle);
    ws.addEventListener('message', wsMessageHandle);
  }, [audioRec]);


  const recordVoice = () => {
    setAudioBuffer(undefined);
    stopPreviousVoice.current?.();
    startRecording();
  };
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { show: _show, hide: _hide } = useTgMainButton({
    text: 'Привет!',
    textColor: '#000',
    color: '#fff',
    onClick() {
      recordVoice();
    },
    isActive: true,
    isVisible: true,
  });

  const shouldShowBlobAnalizer = !isSafari() ? Boolean(buffer) : (Boolean(buffer) && _shouldShowBlobAnalizer);

  return (
    <Provider theme={defaultTheme}>
      <div className='container'>
        <Flex direction={'column'} gap={'size-150'}>
        <div key={'analizer-wrapper'} style={{ width: 200, height: 75 }}>
            {!audioRec && !buffer && (
              <Flex direction={'row'} gap={'size-100'} alignItems={'center'} justifyContent={'center'}>
                <ProgressCircle aria-label='Awaiting command' size='S' isIndeterminate/>
                  <Text >
                  Awaiting command...
                </Text>
              </Flex>
            )}
            {audioRec && (
              <LiveAudioVisualizer
                mediaRecorder={audioRec}
                width={200}
                height={75}
                onEnd={() => {
                  console.log('LiveAudioVisualizer:end');
                }}
              />
            )}
            {shouldShowBlobAnalizer && <AudioBufferVisualizer
              onEnd={() => {
                setAudioBuffer(undefined);
              }}
              audioBuffer={buffer!}
              width={200}
              height={75}
              barColor={'#f76565'}
            />}
          </div>
          <Button
            key={'rec-button'}
            isDisabled={isRecording}
            variant='cta'
            onPress={recordVoice}
          >
            Rec
          </Button>
          <Button
            key={'stop-button'}
            isDisabled={!isRecording}
            variant='secondary'
            onPress={() => {
              stopRecording();
            }}
          >
            Stop
          </Button>
         {showPlayBtn && (
          <Button
            key={'play-button'}
            variant='negative'
            onPress={() => {
              setShouldShowBlobAnalizer(true);
              playCurrentVoice();
            }}
          >
            Play
          </Button>
         )}
        </Flex>
      </div>
      
    </Provider>
  )
}

export default App
