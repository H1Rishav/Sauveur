import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from './ui/Toast.tsx';

interface VoiceMicButtonProps {
  onTranscriptReady: (text: string) => void;
  className?: string;
  placeholder?: string;
}

export default function VoiceMicButton({ onTranscriptReady, className = '', placeholder = '' }: VoiceMicButtonProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isSanitizing, setIsSanitizing] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for browser SpeechRecognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          toast('Microphone permission denied. Open app in new tab or grant permissions.', 'error');
        } else {
          toast(`Voice recording error: ${event.error}`, 'error');
        }
        setIsRecording(false);
      };

      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript && transcript.trim().length > 0) {
          await sanitizeVoiceTranscript(transcript);
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const sanitizeVoiceTranscript = async (rawText: string) => {
    setIsSanitizing(true);
    try {
      const token = localStorage.getItem('sauveur_token') || sessionStorage.getItem('sauveur_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/voice/sanitize', {
        method: 'POST',
        headers,
        body: JSON.stringify({ transcript: rawText }),
      });

      if (!res.ok) {
        throw new Error('Failed to sanitize transcript on server');
      }

      const data = await res.json();
      if (data.sanitized) {
        onTranscriptReady(data.sanitized);
        toast('Voice dictation captured & sanitized successfully.', 'success');
      }
    } catch (err: any) {
      console.error(err);
      // Fallback to raw text if sanitization failed
      onTranscriptReady(rawText);
      toast('Voice captured (used raw text due to sanitization timeout).', 'warning');
    } finally {
      setIsSanitizing(false);
    }
  };

  const handleToggleRecord = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!recognitionRef.current) {
      toast('Speech recognition not supported in this browser. Try Chrome/Safari.', 'error');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition', err);
        recognitionRef.current.stop();
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggleRecord}
      disabled={isSanitizing}
      className={`relative p-2 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
        isRecording 
          ? 'bg-rose-500/10 border-rose-500/40 text-rose-400 hover:bg-rose-500/25 animate-pulse'
          : isSanitizing
          ? 'bg-neutral-900 border-neutral-800 text-neutral-500'
          : 'bg-neutral-950/40 border-neutral-800 text-neutral-400 hover:text-amber-500 hover:border-neutral-700 hover:bg-neutral-850'
      } ${className}`}
      title={isRecording ? 'Listening... Click to finish' : isSanitizing ? 'Sanitizing voice transcript...' : placeholder || 'Dictate instructions by voice'}
      id="voice-mic-button"
    >
      {isSanitizing ? (
        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
      ) : isRecording ? (
        <MicOff className="w-4 h-4 text-rose-500" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </button>
  );
}
