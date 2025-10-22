import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAiBlob } from '@google/genai';
import type { MatchState, CommentaryStyle } from '../types';
import { blobToBase64, decode, encode, decodeAudioData } from '../utils/mediaUtils';

declare var process: {
  env: {
    API_KEY: string;
  }
};

const FRAME_RATE = 2; // Send 2 frames per second for live analysis
const JPEG_QUALITY = 0.6; // Lower quality to reduce payload size

type AudioStatus = 'idle' | 'loading' | 'playing' | 'error';

interface UseLiveCommentaryProps {
  isActive: boolean;
  matchState: MatchState;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onError: () => void;
}

interface UseLiveCommentaryResult {
  liveTranscription: string;
  audioStatus: AudioStatus;
}

export const useLiveCommentary = ({ isActive, matchState, videoRef, canvasRef, onError }: UseLiveCommentaryProps): UseLiveCommentaryResult => {
  const [liveTranscription, setLiveTranscription] = useState('');
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('idle');

  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);
  const liveSessionPromiseRef = useRef<Promise<any> | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    let inputAudioContext: AudioContext | null = null;
    let scriptProcessor: ScriptProcessorNode | null = null;
    let microphoneSource: MediaStreamAudioSourceNode | null = null;

    const stopLiveSession = async () => {
        if (liveSessionPromiseRef.current) {
            try {
                const session = await liveSessionPromiseRef.current;
                session.close();
            } catch (e) {
                console.error("Error closing live session:", e);
            } finally {
                 liveSessionPromiseRef.current = null;
            }
        }
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }
        if (microphoneStreamRef.current) {
            microphoneStreamRef.current.getTracks().forEach(track => track.stop());
            microphoneStreamRef.current = null;
        }
        if (scriptProcessor) {
            scriptProcessor.disconnect();
            scriptProcessor = null;
        }
        if (microphoneSource) {
            microphoneSource.disconnect();
            microphoneSource = null;
        }
        if (inputAudioContext && inputAudioContext.state !== 'closed') {
            await inputAudioContext.close().catch(e => console.error("Failed to close input audio context:", e));
            inputAudioContext = null;
        }
        setLiveTranscription('');
        setAudioStatus('idle');
    };

    if (isActive) {
        const startLiveSession = async () => {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                
                let currentInputTranscription = '';
                setLiveTranscription('');
                setAudioStatus('loading');
                
                const styleInstructions: Record<CommentaryStyle, string> = {
                    professional: 'You are an expert, world-class football (soccer) commentator. Your commentary must be dynamic, insightful, and reflect the current state of the match. You need to sound like a real person broadcasting a live game.',
                    fan: `You are a passionate, slightly biased fan of the home team (${matchState.homeTeam.name}), commenting on the match. You get super excited for your team and a bit salty about the opponents. Keep it fun and energetic!`,
                    youth: 'You are a young, enthusiastic football player commentating for a youth audience. Use simple, exciting language. Think like a kid watching their heroes play!',
                    comic: 'You are a sarcastic, witty, and comic commentator. You find humor in everything, from a bad pass to a dramatic foul. Your goal is to entertain with dry humor and clever observations, like a British comedian.'
                };

                const voiceMap: Record<CommentaryStyle, 'Kore' | 'Zephyr' | 'Puck' | 'Charon'> = {
                    professional: 'Kore',
                    fan: 'Zephyr',
                    youth: 'Puck',
                    comic: 'Charon'
                };

                const systemInstruction = `
                    ${styleInstructions[matchState.commentaryStyle]}
                    You are an AI Director, receiving a live audio stream of ambient match sounds and periodic video frames (about 2 per second).
                    Your primary role is to provide continuous, engaging commentary based on BOTH the audio and visuals.
                    - **Describe the action**: Comment on player movements, passes, shots, tackles, and tactical formations you see in the frames.
                    - **React to sounds**: Use the audio to gauge crowd excitement, whistles, and the intensity of play.
                    - **Context is key**: The match is between ${matchState.homeTeam.name} and ${matchState.awayTeam.name}. The score is ${matchState.homeStats.goals} - ${matchState.awayStats.goals}. The home team (${matchState.homeTeam.name}) is attacking towards the ${matchState.homeTeamAttackDirection} side of the screen.
                    Your response MUST be entirely in ${matchState.commentaryLanguage}. Be dynamic and responsive to what you see and hear.
                `;

                liveSessionPromiseRef.current = ai.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    callbacks: {
                        onopen: async () => {
                            try {
                                // Start audio streaming
                                microphoneStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                                inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                                
                                microphoneSource = inputAudioContext.createMediaStreamSource(microphoneStreamRef.current);
                                scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                                
                                scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                                    const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                                    const pcmBlob: GenAiBlob = {
                                        data: encode(new Uint8Array(new Int16Array(inputData.map(f => f * 32768)).buffer)),
                                        mimeType: 'audio/pcm;rate=16000',
                                    };
                                    liveSessionPromiseRef.current?.then((session) => {
                                        session.sendRealtimeInput({ media: pcmBlob });
                                    });
                                };
                                
                                microphoneSource.connect(scriptProcessor);
                                scriptProcessor.connect(inputAudioContext.destination);
                                
                                // Start video frame streaming
                                if (videoRef.current && canvasRef.current) {
                                    frameIntervalRef.current = window.setInterval(() => {
                                        const video = videoRef.current;
                                        const canvas = canvasRef.current;
                                        if (!video || !canvas || video.paused || video.ended) return;

                                        canvas.width = video.videoWidth;
                                        canvas.height = video.videoHeight;
                                        const ctx = canvas.getContext('2d');
                                        if (ctx) {
                                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                                            canvas.toBlob(
                                                async (blob) => {
                                                    if (blob) {
                                                        const base64Data = await blobToBase64(blob);
                                                        liveSessionPromiseRef.current?.then((session) => {
                                                            session.sendRealtimeInput({
                                                                media: { data: base64Data, mimeType: 'image/jpeg' }
                                                            });
                                                        });
                                                    }
                                                },
                                                'image/jpeg',
                                                JPEG_QUALITY
                                            );
                                        }
                                    }, 1000 / FRAME_RATE);
                                }


                            } catch (e) {
                                console.error("Microphone access error:", e);
                                setAudioStatus('error');
                                setLiveTranscription("Error: Could not access microphone.");
                                onError();
                            }
                        },
                        onmessage: async (message: LiveServerMessage) => {
                            if (message.serverContent?.outputTranscription) {
                                const text = message.serverContent.outputTranscription.text;
                                setLiveTranscription(prev => prev + text);
                            }
                            if (message.serverContent?.inputTranscription) {
                                currentInputTranscription += message.serverContent.inputTranscription.text;
                            }
                            if (message.serverContent?.turnComplete) {
                                console.log("User said:", currentInputTranscription);
                                currentInputTranscription = '';
                                setLiveTranscription(prev => prev.trim() + ' ');
                            }
                            
                            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData.data;
                            if (base64Audio) {
                                setAudioStatus('playing');
                                if (!outputAudioContextRef.current) {
                                    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                                }
                                const audioContext = outputAudioContextRef.current;
                                if (audioContext.state === 'suspended') await audioContext.resume();
                                
                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContext.currentTime);
                                const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
                                const source = audioContext.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(audioContext.destination);
                                source.addEventListener('ended', () => {
                                    audioSourcesRef.current.delete(source)
                                    if(audioSourcesRef.current.size === 0) {
                                        setAudioStatus('idle');
                                    }
                                });
                                
                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += audioBuffer.duration;
                                audioSourcesRef.current.add(source);
                            }

                            if (message.serverContent?.interrupted) {
                                for (const source of audioSourcesRef.current.values()) {
                                    source.stop();
                                }
                                audioSourcesRef.current.clear();
                                nextStartTimeRef.current = 0;
                            }
                        },
                        onerror: (e: ErrorEvent) => {
                            console.error('Live session error:', e);
                            setAudioStatus('error');
                            setLiveTranscription("Error: Live commentary session failed.");
                        },
                        onclose: (e: CloseEvent) => {
                            console.log('Live session closed.');
                            setAudioStatus('idle');
                        },
                    },
                    config: {
                        responseModalities: [Modality.AUDIO],
                        outputAudioTranscription: {},
                        inputAudioTranscription: {},
                        speechConfig: {
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceMap[matchState.commentaryStyle] } },
                        },
                        systemInstruction: systemInstruction,
                    },
                });

            } catch(e) {
                console.error("Failed to start live session", e);
                setAudioStatus('error');
            }
        };
        
        startLiveSession();
    } else {
      stopLiveSession();
    }

    return () => {
      stopLiveSession();
    };
  }, [isActive, matchState, videoRef, canvasRef, onError]);

  return { liveTranscription, audioStatus };
};