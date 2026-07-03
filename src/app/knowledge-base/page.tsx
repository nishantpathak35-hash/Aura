import { Plus, Search, Edit2, History } from 'lucide-react';

export default function KnowledgeBaseView() {
  const kbEntries = [
    { id: 1, topic: 'What are your hours on Saturday?', answer: 'We are open from 9 AM to 1 PM on Saturdays.', lastUpdated: '2 days ago', editor: 'Staff Member' },
    { id: 2, topic: 'Do you accept Medicaid?', answer: 'Yes, we accept most state Medicaid plans. Please bring your card to the first visit.', lastUpdated: '1 week ago', editor: 'Dr. Smith' },
    { id: 3, topic: 'Where should I park?', answer: 'There is a free parking garage behind the building on 4th street.', lastUpdated: '1 month ago', editor: 'Staff Member' },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <header className="flex justify-between items-center pb-4 border-b border-slate-800/50">
        <div>
          <h1 className="text-3xl font-bold text-white">Knowledge Base</h1>
          <p className="text-slate-400 mt-1">Manage the answers the AI uses when talking to patients.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors shadow-lg shadow-teal-500/20">
          <Plus className="w-5 h-5" />
          Add Topic
        </button>
      </header>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
        <input 
          type="text" 
          placeholder="Search knowledge base topics..." 
          className="w-full bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl pl-12 pr-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all text-lg"
        />
      </div>

      <div className="space-y-4">
        {kbEntries.map((entry) => (
          <div key={entry.id} className="p-6 bg-slate-900/30 border border-slate-800/50 rounded-2xl hover:bg-slate-800/30 transition-colors group">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-semibold text-slate-200 group-hover:text-teal-400 transition-colors">
                {entry.topic}
              </h3>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors" title="View History">
                  <History className="w-4 h-4" />
                </button>
                <button className="p-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 rounded-lg transition-colors" title="Edit">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <p className="text-slate-400 leading-relaxed bg-slate-950/50 p-4 rounded-xl border border-slate-800/30">
              {entry.answer}
            </p>
            
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <span>Last edited by <span className="font-medium text-slate-400">{entry.editor}</span></span>
              <span>•</span>
              <span>{entry.lastUpdated}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
