'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Mic, MicOff, PhoneOff, Phone } from 'lucide-react';

export default function CallScreen() {
  const params = useParams();
  const phone = params.phone as string;
  
  const [isCalling, setIsCalling] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("Tap to start call...");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Stop recording if silence is detected for 2 seconds
  const startSilenceDetection = (stream: MediaStream) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioContext = audioContextRef.current;
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    analyser.fftSize = 512;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkSilence = () => {
      analyser.getByteFrequencyData(dataArray);
      const sum = dataArray.reduce((a, b) => a + b, 0);
      const average = sum / bufferLength;

      if (average < 10) { // Silence threshold
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            if (mediaRecorderRef.current?.state === 'recording') {
              setTranscript("Processing your voice...");
              mediaRecorderRef.current.stop();
            }
          }, 2000); // 2 seconds of silence = user finished speaking
        }
      } else {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      }
      if (isCalling) {
        requestAnimationFrame(checkSilence);
      }
    };
    checkSilence();
  };

  const startRecording = async () => {
    try {
      // Unlock Web Speech API on mobile by playing an empty utterance synchronously
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsCalling(true);
      setIsListening(true);
      setTranscript("Listening...");

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsListening(false);
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];
        await sendAudioToBackend(audioBlob);
      };

      mediaRecorder.start();
      startSilenceDetection(stream);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setTranscript("Microphone access denied.");
    }
  };

  // Store utterance in a ref to prevent garbage collection bug in some browsers
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const toggleListening = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      setTranscript("Processing your voice...");
      mediaRecorderRef.current.stop();
    }
  };

  const sendAudioToBackend = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'speech.webm');
      formData.append('phone', phone);

      const response = await fetch('/api/voice', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to get response");
      
      const data = await response.json();
      
      setTranscript("AI is speaking...");
      
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(data.text);
      currentUtteranceRef.current = utterance; // Prevent GC bug
      
      // Attempt to find the most human-like voice available natively
      const voices = window.speechSynthesis.getVoices();
      const goodVoice = voices.find(v => 
        v.name.includes('Google') || 
        v.name.includes('Siri') || 
        v.name.includes('Natural') || 
        v.name.includes('Female')
      ) || voices[0];
      
      if (goodVoice) utterance.voice = goodVoice;
      
      utterance.onend = () => {
        if (isCalling) {
          startRecording();
        }
      };
      
      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error("Voice processing error:", error);
      setTranscript("Error connecting to AI.");
      setTimeout(() => {
        if(isCalling) startRecording();
      }, 3000);
    }
  };

  const endCall = () => {
    setIsCalling(false);
    setIsListening(false);
    setTranscript("Call ended.");
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white font-sans p-6">
      <div className="flex flex-col items-center space-y-12 max-w-sm w-full">
        {/* Call Timer / Status */}
        <div className="absolute top-16 w-full text-center">
          <p className="text-gray-400 text-sm tracking-widest uppercase font-semibold mb-2">Clinic AI Receptionist</p>
          <h2 className="text-white text-3xl font-light">
            {!isCalling ? "Ready" : (isListening ? "Listening..." : "Speaking...")}
          </h2>
          {isCalling && (
            <p className="text-green-400 text-sm mt-2 animate-pulse">Live Call in Progress</p>
          )}
        </div>

        {/* Seamless Avatar Button */}
        <div 
          className="relative flex items-center justify-center h-48 w-48 cursor-pointer group" 
          onClick={!isCalling ? startRecording : toggleListening}
        >
          {isCalling && isListening && (
            <>
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
              <div className="absolute inset-4 bg-green-500/30 rounded-full animate-pulse delay-75"></div>
            </>
          )}
          
          <div className={`z-10 rounded-full h-40 w-40 flex items-center justify-center shadow-2xl transition-all duration-500 ${!isCalling ? 'bg-blue-600 hover:bg-blue-500 hover:scale-105' : (isListening ? 'bg-green-600' : 'bg-gray-800')}`}>
            {!isCalling ? (
              <Phone size={56} className="text-white animate-bounce" />
            ) : (
              isListening ? <Mic size={56} className="text-white" /> : <MicOff size={56} className="text-white/50" />
            )}
          </div>
          
          {!isCalling && (
            <div className="absolute -bottom-16 text-center w-64">
              <p className="text-white text-lg font-medium">Tap to Connect</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex space-x-6 justify-center">
          {isCalling && (
            <button 
              onClick={endCall}
              className="bg-red-600 hover:bg-red-500 text-white rounded-full p-6 shadow-xl transition-transform hover:scale-110 flex items-center justify-center w-20 h-20"
            >
              <PhoneOff size={32} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
