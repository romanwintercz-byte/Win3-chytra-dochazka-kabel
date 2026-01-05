import React, { useState, useRef, useEffect } from 'react';
import { getMechanicAdvice, transcribeAudio } from '../services/geminiService';
import { ChatMessage } from '../types';
import { Wrench, Send, User, Bot, AlertTriangle, Mic, Square, Loader2 } from 'lucide-react';

const MechanicChat: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'model',
      text: 'Ahoj! Jsem MotoMech AI. Co tě trápí s motorkou? Slyšíš divné zvuky, nebo svítí kontrolka?',
      timestamp: new Date()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const responseText = await getMechanicAdvice(history, userMsg.text);

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText || "Něco se pokazilo, zkus to znovu.",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, aiMsg]);
    setLoading(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop()); // Stop mic
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        setTranscribing(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            const text = await transcribeAudio(base64String, 'audio/webm');
            if (text) {
              // Append to existing text or set new
              setInput(prev => prev + (prev ? " " : "") + text);
            }
            setTranscribing(false);
          };
        } catch (e) {
          console.error(e);
          setTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      alert("Pro diktování povolte mikrofon.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[600px] max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center text-white">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white">MotoMech AI</h3>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Online diagnostika
            </p>
          </div>
        </div>
        <button 
          onClick={() => setMessages([])} 
          className="text-xs text-slate-500 hover:text-slate-300 underline"
        >
          Vymazat
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <div className="bg-amber-900/20 border border-amber-500/30 p-3 rounded-lg flex items-start gap-3 text-sm text-amber-200">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
          <p>AI může dělat chyby. Pokud jde o brzdy, řízení nebo kritické systémy, vždy navštivte autorizovaný servis.</p>
        </div>

        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-700' : 'bg-amber-600'}`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-slate-300" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-slate-800 text-slate-100 rounded-tr-none' 
                : 'bg-slate-700/50 text-slate-200 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-slate-700/50 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1 items-center">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <div className="relative flex items-center gap-2">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={transcribing || loading}
            className={`p-3 rounded-xl transition shrink-0 ${
                isRecording 
                ? 'bg-red-900/50 text-red-500 animate-pulse border border-red-500/50' 
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            }`}
            title="Diktovat závadu"
          >
            {transcribing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRecording ? (
                <Square className="w-5 h-5 fill-current" />
            ) : (
                <Mic className="w-5 h-5" />
            )}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isRecording ? "Poslouchám..." : "Popište závadu..."}
            className={`flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                isRecording ? 'border-red-500/50' : ''
            }`}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || loading || isRecording}
            className="bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white p-3 rounded-xl transition shadow-lg shadow-amber-900/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MechanicChat;