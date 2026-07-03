import { Phone, MessageSquare, Mic, Search, ChevronRight } from 'lucide-react';

export default function ConversationsView() {
  const conversations = [
    { id: 1, type: 'phone', caller: 'John Doe', preview: "I'd like to book an appointment for tomorrow...", time: '10:42 AM', flagged: false },
    { id: 2, type: 'chat', caller: 'Sarah Jenkins', preview: "What are your hours on Saturday?", time: '09:15 AM', flagged: false },
    { id: 3, type: 'voice', caller: 'Unknown (Web)', preview: "I am having severe chest pain...", time: 'Yesterday', flagged: true },
    { id: 4, type: 'phone', caller: 'Emma Watson', preview: "Cancel my 2PM please.", time: 'Yesterday', flagged: false },
  ];

  const getIcon = (type: string) => {
    if (type === 'phone') return <Phone className="w-5 h-5" />;
    if (type === 'chat') return <MessageSquare className="w-5 h-5" />;
    return <Mic className="w-5 h-5" />;
  };

  return (
    <div className="flex h-full">
      {/* List Sidebar */}
      <div className="w-96 border-r border-slate-800/50 flex flex-col bg-slate-900/20 backdrop-blur-sm">
        <div className="p-4 border-b border-slate-800/50">
          <h2 className="text-xl font-semibold text-white mb-4">Conversations</h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search transcripts..." 
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {conversations.map((conv, idx) => (
            <div 
              key={conv.id} 
              className={`p-3 rounded-xl cursor-pointer transition-all duration-200 group flex items-start gap-4 ${
                idx === 0 ? 'bg-slate-800/80 border border-slate-700' : 'hover:bg-slate-800/40 border border-transparent'
              } ${conv.flagged ? 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10' : ''}`}
            >
              <div className={`p-2 rounded-lg ${
                conv.flagged ? 'bg-red-500/20 text-red-400' : 
                idx === 0 ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-800 text-slate-400 group-hover:text-teal-400 group-hover:bg-teal-500/10'
              } transition-colors`}>
                {getIcon(conv.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className={`font-medium text-sm truncate ${conv.flagged ? 'text-red-300' : 'text-slate-200'}`}>
                    {conv.caller}
                  </span>
                  <span className="text-xs text-slate-500">{conv.time}</span>
                </div>
                <p className="text-xs text-slate-400 truncate">{conv.preview}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transcript View (Main) */}
      <div className="flex-1 flex flex-col bg-slate-950/30">
        <header className="px-8 py-5 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/30 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-teal-500/10 rounded-xl border border-teal-500/20">
              <Phone className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">John Doe</h2>
              <p className="text-sm text-slate-400">Phone Call • In Progress</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors border border-slate-700">
            Take Over Call
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="flex flex-col gap-1 items-start">
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-800/80 border border-slate-700 text-slate-200 max-w-xl">
              Hello, this is the AURA Front Desk. How can I help you today?
            </div>
            <span className="text-xs text-slate-500 ml-1">AI Assistant • 10:42 AM</span>
          </div>

          <div className="flex flex-col gap-1 items-end">
            <div className="px-4 py-3 rounded-2xl rounded-tr-sm bg-teal-600 border border-teal-500 text-white max-w-xl">
              I'd like to book an appointment for tomorrow around 2 PM.
            </div>
            <span className="text-xs text-slate-500 mr-1">John Doe (Transcribed) • 10:42 AM</span>
          </div>

          <div className="flex flex-col gap-1 items-start">
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-800/80 border border-slate-700 text-slate-200 max-w-xl">
              I can help with that. Dr. Smith has an opening at 2:30 PM tomorrow. Does that work for you?
            </div>
            <span className="text-xs text-slate-500 ml-1">AI Assistant • 10:43 AM</span>
          </div>
          
          <div className="flex justify-center my-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              Caller is typing/speaking...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
