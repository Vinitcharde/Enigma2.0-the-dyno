'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface TTSOptions {
    /** Language code, default 'en-US' */
    lang?: string;
    /** Speech rate 0.1-2, default 1 */
    rate?: number;
    /** Pitch 0-2, default 1 */
    pitch?: number;
    /** Volume 0-1, default 1 */
    volume?: number;
    /** Preferred voice name substring (e.g. 'Google', 'Female', 'Zira') */
    preferredVoice?: string;
}

interface TTSState {
    /** Whether TTS is currently speaking */
    isSpeaking: boolean;
    /** Whether TTS is paused */
    isPaused: boolean;
    /** Whether TTS is globally enabled by user */
    isEnabled: boolean;
    /** Currently available voices */
    voices: SpeechSynthesisVoice[];
    /** Currently selected voice */
    selectedVoice: SpeechSynthesisVoice | null;
}

interface TTSControls {
    /** Speak the given text — strips markdown formatting for naturalness */
    speak: (text: string) => void;
    /** Pause current speech */
    pause: () => void;
    /** Resume current speech */
    resume: () => void;
    /** Stop/cancel current speech */
    stop: () => void;
    /** Toggle TTS on/off globally */
    toggleEnabled: () => void;
    /** Set the voice to use */
    setVoice: (voice: SpeechSynthesisVoice) => void;
    /** Set speech rate */
    setRate: (rate: number) => void;
}

/**
 * Strip markdown formatting so TTS reads naturally.
 * Removes **, *, ##, bullet points, emojis that sound odd, etc.
 */
function stripMarkdown(text: string): string {
    return text
        // Remove markdown bold/italic markers
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        // Remove markdown headers
        .replace(/#{1,6}\s*/g, '')
        // Remove bullet markers
        .replace(/^[-•]\s*/gm, '')
        // Remove numbered bullet markers like "1." etc
        .replace(/^\d+\.\s*/gm, '')
        // Remove emoji characters (common ones)
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, ' code block ')
        .replace(/`([^`]+)`/g, '$1')
        // Clean up extra whitespace
        .replace(/\n\n+/g, '. ')
        .replace(/\n/g, '. ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

export function useTTS(options: TTSOptions = {}): TTSState & TTSControls {
    const {
        lang = 'en-US',
        rate: initialRate = 1,
        pitch = 1,
        volume = 1,
        preferredVoice = '',
    } = options;

    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isEnabled, setIsEnabled] = useState(true);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
    const [rate, setRateState] = useState(initialRate);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const queueRef = useRef<string[]>([]);
    const isProcessingRef = useRef(false);

    // Load voices
    useEffect(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        const loadVoices = () => {
            const available = window.speechSynthesis.getVoices();
            if (available.length > 0) {
                setVoices(available);

                // Pick best voice: prefer English, natural-sounding voices
                const english = available.filter(v => v.lang.startsWith('en'));
                let best: SpeechSynthesisVoice | null = null;

                if (preferredVoice) {
                    best = english.find(v =>
                        v.name.toLowerCase().includes(preferredVoice.toLowerCase())
                    ) || null;
                }

                if (!best) {
                    // Prefer Google or Microsoft online voices for quality
                    best = english.find(v =>
                        v.name.includes('Google') && v.name.includes('Female')
                    ) || english.find(v =>
                        v.name.includes('Google')
                    ) || english.find(v =>
                        v.name.includes('Microsoft') && v.name.includes('Online')
                    ) || english.find(v =>
                        v.name.includes('Zira') || v.name.includes('Aria')
                    ) || english[0] || available[0];
                }

                if (best && !selectedVoice) {
                    setSelectedVoice(best);
                }
            }
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preferredVoice]);

    // Split long text into chunks for reliability (browsers sometimes cut off long utterances)
    const splitIntoChunks = useCallback((text: string): string[] => {
        const maxLen = 200;
        const sentences = text.split(/(?<=[.!?])\s+/);
        const chunks: string[] = [];
        let current = '';

        for (const sentence of sentences) {
            if ((current + ' ' + sentence).length > maxLen && current.length > 0) {
                chunks.push(current.trim());
                current = sentence;
            } else {
                current = current ? current + ' ' + sentence : sentence;
            }
        }
        if (current.trim()) chunks.push(current.trim());

        return chunks.length > 0 ? chunks : [text];
    }, []);

    const processQueue = useCallback(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        if (isProcessingRef.current || queueRef.current.length === 0) return;

        isProcessingRef.current = true;
        const chunk = queueRef.current.shift()!;

        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;
        if (selectedVoice) utterance.voice = selectedVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            isProcessingRef.current = false;
            if (queueRef.current.length > 0) {
                processQueue();
            } else {
                setIsSpeaking(false);
            }
        };
        utterance.onerror = () => {
            isProcessingRef.current = false;
            if (queueRef.current.length > 0) {
                processQueue();
            } else {
                setIsSpeaking(false);
            }
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [lang, rate, pitch, volume, selectedVoice]);

    const speak = useCallback((text: string) => {
        if (typeof window === 'undefined' || !window.speechSynthesis || !isEnabled) return;

        // Cancel any current speech
        window.speechSynthesis.cancel();
        isProcessingRef.current = false;

        const cleaned = stripMarkdown(text);
        const chunks = splitIntoChunks(cleaned);
        queueRef.current = chunks;
        processQueue();
    }, [isEnabled, splitIntoChunks, processQueue]);

    const pause = useCallback(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.pause();
        setIsPaused(true);
    }, []);

    const resume = useCallback(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.resume();
        setIsPaused(false);
    }, []);

    const stop = useCallback(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        queueRef.current = [];
        isProcessingRef.current = false;
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setIsPaused(false);
    }, []);

    const toggleEnabled = useCallback(() => {
        setIsEnabled(prev => {
            if (prev) {
                // Turning off — stop any current speech
                if (typeof window !== 'undefined' && window.speechSynthesis) {
                    queueRef.current = [];
                    isProcessingRef.current = false;
                    window.speechSynthesis.cancel();
                    setIsSpeaking(false);
                    setIsPaused(false);
                }
            }
            return !prev;
        });
    }, []);

    const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
        setSelectedVoice(voice);
    }, []);

    const setRate = useCallback((newRate: number) => {
        setRateState(Math.max(0.1, Math.min(2, newRate)));
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    return {
        isSpeaking,
        isPaused,
        isEnabled,
        voices,
        selectedVoice,
        speak,
        pause,
        resume,
        stop,
        toggleEnabled,
        setVoice,
        setRate,
    };
}
