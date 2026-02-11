import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Send, Bot, User, Sparkles, Loader2, Paperclip, Image as ImageIcon, FileText, Trash2, Edit2, RotateCcw } from 'lucide-react';
import { ResearchAnalysis } from '../types';
import { createChatSession } from '../services/geminiService';
import { Chat, Content, Part } from "@google/genai";
import ReactMarkdown from 'react-markdown';

interface ChatInterfaceProps {
  analysis: ResearchAnalysis;
  fileData: string;
  mimeType: string;
}

export interface ChatInterfaceRef {
  prefillMessage: (message: string) => void;
  sendMessage: (message: string) => void;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  attachments?: { name: string, type: string, data: string }[];
}

const ChatInterface = forwardRef<ChatInterfaceRef, ChatInterfaceProps>(({ analysis, fileData, mimeType }, ref) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<{name: string, type: string, data: string} | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    prefillMessage: (text: string) => {
      setInput(text);
      if (fileInputRef.current) fileInputRef.current.focus();
    },
    sendMessage: (text: string) => {
      setInput(text);
      // We need a slight delay or effect to trigger send after state update, 
      // but direct calling logic is safer.
      handleSend(text);
    }
  }));

  // Load history from LocalStorage on init
  useEffect(() => {
    const savedHistory = localStorage.getItem(`chat_history_${analysis.title}`);
    if (savedHistory) {
      try {
        const parsed: Message[] = JSON.parse(savedHistory);
        setMessages(parsed);
      } catch (e) {
        console.error("Failed to parse history", e);
        setMessages([{ id: 'init', role: 'model', text: "I've analyzed your draft. I'm ready to help you refine it. Ask me to clarify any critique or concern." }]);
      }
    } else {
      setMessages([{ id: 'init', role: 'model', text: "I've analyzed your draft. I'm ready to help you refine it. Ask me to clarify any critique or concern." }]);
    }
  }, [analysis.title]);

  // Initialize Chat Session (Context Aware)
  useEffect(() => {
    const initChat = async () => {
      try {
        // Convert visible messages back to SDK Content format for history restoration
        // We skip the 'init' message as that's purely UI
        const historyContent: Content[] = messages
          .filter(m => m.id !== 'init')
          .map(m => ({
            role: m.role,
            parts: [
              { text: m.text },
              ...(m.attachments?.map(a => ({ inlineData: { mimeType: a.type, data: a.data } })) || [])
            ]
          }));

        chatSessionRef.current = await createChatSession(analysis, fileData, mimeType, historyContent);
      } catch (e) {
        console.error("Failed to init chat", e);
      }
    };
    
    // Only init if we have messages loaded (or empty)
    initChat();
  }, [analysis, fileData, mimeType, messages.length]); // Re-init if message history drastically changes (like rewind)

  // Save to LocalStorage on change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_history_${analysis.title}`, JSON.stringify(messages));
    }
  }, [messages, analysis.title]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        const base64Data = base64String.split(',')[1];
        setAttachment({
          name: file.name,
          type: file.type,
          data: base64Data
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Rewind/Branching Logic
  const handleEdit = (msgId: string) => {
    const index = messages.findIndex(m => m.id === msgId);
    if (index !== -1) {
      const msgToEdit = messages[index];
      setInput(msgToEdit.text);
      setEditingId(msgId);
      // We don't delete yet, we wait for send.
    }
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() && !attachment) return;

    let newHistory = [...messages];

    // If editing, slice history up to that point
    if (editingId) {
      const index = messages.findIndex(m => m.id === editingId);
      if (index !== -1) {
        newHistory = messages.slice(0, index);
        // We need to re-init the chat session with this truncated history effectively
        // The useEffect dependency on messages.length helps, but strictly we should force re-creation
        chatSessionRef.current = null; 
      }
      setEditingId(null);
    }

    const userMsg: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      text: textToSend,
      attachments: attachment ? [attachment] : undefined
    };

    setMessages([...newHistory, userMsg]);
    setInput('');
    setAttachment(null);
    setIsLoading(true);

    try {
      // Re-init session if it was cleared (edit mode) or null
      if (!chatSessionRef.current) {
        const historyContent: Content[] = newHistory
          .filter(m => m.id !== 'init')
          .map(m => ({
            role: m.role,
            parts: [
              { text: m.text },
              ...(m.attachments?.map(a => ({ inlineData: { mimeType: a.type, data: a.data } })) || [])
            ]
          }));
        chatSessionRef.current = await createChatSession(analysis, fileData, mimeType, historyContent);
      }

      const parts: Part[] = [{ text: textToSend }];
      if (attachment) {
        parts.push({ inlineData: { mimeType: attachment.type, data: attachment.data } });
      }

      const result = await chatSessionRef.current.sendMessage({ 
        message: parts
      });

      const responseText = result.text || '';
      
      const botMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: responseText 
      };
      setMessages(prev => [...prev, botMsg]);

    } catch (error) {
      console.error("Chat error", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[700px] bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/20 p-2 rounded-lg">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">Editorial Council</h3>
            <p className="text-xs text-slate-400">Context-Aware • Multimodal • Secure</p>
          </div>
        </div>
        <button 
          onClick={() => {
            if (confirm("Clear chat history for this paper?")) {
              localStorage.removeItem(`chat_history_${analysis.title}`);
              setMessages([{ id: 'init', role: 'model', text: "History cleared. Ready for new questions." }]);
              chatSessionRef.current = null;
            }
          }}
          className="text-xs text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" /> Clear History
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`group flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-indigo-600'}`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            
            <div className={`max-w-[85%] relative`}>
              {/* Message Bubble */}
              <div className={`rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-md ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-700 text-slate-200 rounded-tl-none markdown-content'
              }`}>
                {/* Attachments Display */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mb-3 pb-3 border-b border-white/20">
                    {msg.attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-black/20 p-2 rounded">
                        {att.type.startsWith('image') ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                        <span className="truncate max-w-[150px]">{att.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>

              {/* Edit/Branch Action for User */}
              {msg.role === 'user' && (
                <button 
                  onClick={() => handleEdit(msg.id)}
                  className="absolute -left-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-700 rounded-full text-slate-500 hover:text-white"
                  title="Edit & Branch"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-4">
             <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-slate-700 rounded-2xl rounded-tl-none px-4 py-3 flex items-center shadow-md">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400 mr-2" />
              <span className="text-xs text-slate-400 animate-pulse">Council is deliberating...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-slate-900/50 border-t border-slate-700">
        
        {attachment && (
           <div className="flex items-center gap-2 mb-2 bg-slate-800 p-2 rounded-lg border border-slate-600 inline-block">
              <span className="text-xs text-slate-300 flex items-center gap-1">
                <Paperclip className="w-3 h-3" /> {attachment.name}
              </span>
              <button onClick={() => setAttachment(null)} className="text-slate-500 hover:text-red-400">
                <Trash2 className="w-3 h-3" />
              </button>
           </div>
        )}

        <div className="flex gap-2 items-end">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden" 
            accept=".pdf,.txt,.md,.tex,image/*"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-slate-400 hover:text-white transition-colors"
            title="Attach file or image"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={editingId ? "Edit your message to branch conversation..." : "Ask for rewriting, specific strategies, or code..."}
              rows={1}
              className={`w-full bg-slate-800 border ${editingId ? 'border-amber-500/50 focus:border-amber-500' : 'border-slate-600 focus:border-indigo-500'} rounded-xl px-4 py-3 text-white focus:outline-none transition-colors placeholder:text-slate-500 resize-none custom-scrollbar`}
              style={{ minHeight: '48px', maxHeight: '120px' }}
              disabled={isLoading}
            />
            {editingId && (
              <span className="absolute -top-6 left-0 text-xs text-amber-400 flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Editing previous turn
              </span>
            )}
          </div>

          <button
            onClick={() => handleSend()}
            disabled={isLoading || (!input.trim() && !attachment)}
            className={`
              p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              ${editingId ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}
            `}
          >
            {editingId ? <RotateCcw className="w-5 h-5" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-2 text-center">
          SynthIE provides academic guidance. Verify all citations and code.
        </p>
      </div>
    </div>
  );
});

export default ChatInterface;