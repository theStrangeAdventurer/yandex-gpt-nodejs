import { useCallback, useEffect, useRef, useState } from "react";
import { draw, calculateBarData } from "../utils";
import { AudioBufferVisualizerProps } from "./AudioBufferVisualizer.types";

// Функция для создания MediaStream из ArrayBuffer
async function mediaStreamFromArrayBuffer(audioContext: AudioContext, arrayBuffer: ArrayBuffer): Promise<{ stream: MediaStream, source: AudioBufferSourceNode }> {
    // Декодируем аудиоданные
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0)) //.slice(0) to prevent "Cannot decode detached ArrayBuffer"
      .catch((err) => console.log('Decode audio data error: ', err));
    
    // Создаем source node
    const source = audioContext.createBufferSource();

    const gainNode = audioContext.createGain();

    // Установите уровень громкости
    gainNode.gain.value = 0
    source.connect(gainNode);
    //@ts-expect-error that's ok
    source.buffer = audioBuffer;

    // Создаем destination node (MediaStreamAudioDestinationNode)
    const destination = audioContext.createMediaStreamDestination();
    
    gainNode.connect(audioContext.destination);

    source.connect(destination);
    
    // Во время создания нужно начать воспроизведение
    source.start();
    // Возвращаем MediaStream из destination
    return {
        stream: destination.stream,
        source,
    };
}

export function AudioBufferVisualizer ({
  audioBuffer,
  onEnd = () => {},
  width = "100%",
  height = "100%",
  barWidth = 2,
  gap = 1,
  backgroundColor = "transparent",
  barColor = "rgb(160, 198, 255)",
  fftSize = 1024,
  maxDecibels = -10,
  minDecibels = -90,
  smoothingTimeConstant = 0.4,
}: AudioBufferVisualizerProps) {
  const [context] = useState(() => new AudioContext());
  const [analyser, setAnalyser] = useState<AnalyserNode>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const prepareData = async () => {
      const { stream, source } = await mediaStreamFromArrayBuffer(
        context,
        audioBuffer
      );

      if (context.state !== 'running') {
        await context.resume();
      }
      
      const analyserNode = context.createAnalyser();
      analyserNode.fftSize = fftSize;
      analyserNode.minDecibels = minDecibels;
      analyserNode.maxDecibels = maxDecibels;
      analyserNode.smoothingTimeConstant = smoothingTimeConstant;
      
      setAnalyser(analyserNode);
      
      context.createMediaStreamSource(stream);
      source.connect(analyserNode);
      source.onended = onEnd;
    }
    prepareData();    
  }, []);

  const processFrequencyData = (data: Uint8Array): void => {
    if (!canvasRef.current) return;

    const dataPoints = calculateBarData(
      data,
      canvasRef.current.width,
      barWidth,
      gap
    );
    draw(
      dataPoints,
      canvasRef.current,
      barWidth,
      gap,
      backgroundColor,
      barColor
    );
  };

  const report = useCallback(() => {
    if (!analyser || context.state !== 'running') return;
    const data = new Uint8Array(analyser?.frequencyBinCount);
    analyser?.getByteFrequencyData(data);
    processFrequencyData(data);
    rafRef.current = requestAnimationFrame(report);
  }, [analyser, context.state]);

  useEffect(() => {
    if (analyser) {
      report();
    }
  }, [analyser]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    }
  },[]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        aspectRatio: "unset",
      }}
    />
  );
}
  
  