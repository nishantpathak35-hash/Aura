'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';

export default function DashboardHome() {
  const [unconfirmedFacts, setUnconfirmedFacts] = useState<any[]>([]);
  const [activeConversations, setActiveConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, we'd fetch these from our Next.js API routes
    // Example: fetch('/api/patients/all/memory-facts?unconfirmed=true')
    // We are simulating the network request here for the UI, as the APIs are ready
    // but the database connection needs real credentials.
    
    setTimeout(() => {
      setUnconfirmedFacts([
        { id: 1, patient: 'Sarah Jenkins', fact: 'Prefers morning appointments', time: '10 mins ago' },
        { id: 2, patient: 'Marcus Chen', fact: 'Allergic to latex', time: '1 hour ago', highPriority: true },
      ]);
      setActiveConversations([
        { id: 1, type: 'Phone', caller: 'John Doe', status: 'In Progress', duration: '02:15' }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-end pb-4 border-b border-slate-800/50">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
            Good morning, Staff
          </h1>
          <p className="text-slate-400 mt-1">Here's what's happening at Downtown Clinic today.</p>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            AI Front Desk Online
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-500">Loading live data...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="p-5 rounded-2xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 backdrop-blur-xl">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-500/20 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-200">Safety Escalation: Review Required</h3>
                  <p className="text-red-300/80 mt-1">
                    A patient on Web Chat mentioned "chest pain". The AI has directed them to call emergency services.
                  </p>
                  <div className="mt-4 flex gap-3">
                    <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors">
                      Take Over Chat
                    </button>
                    <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-white">Live Activity</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeConversations.map(conv => (
                  <div key={conv.id} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 hover:bg-slate-800/40 transition-colors backdrop-blur-sm group cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                      <span className="px-2.5 py-1 text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-md">
                        {conv.type}
                      </span>
                      <div className="flex items-center gap-1 text-slate-400 text-sm">
                        <Clock className="w-4 h-4" />
                        {conv.duration}
                      </div>
                    </div>
                    <h4 className="text-lg font-medium text-slate-200 group-hover:text-teal-300 transition-colors">{conv.caller}</h4>
                    <p className="text-slate-500 text-sm mt-1">{conv.status}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="lg:col-span-1">
            <section className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5 backdrop-blur-md h-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">Memory Audit</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium border border-indigo-500/30">
                  {unconfirmedFacts.length} Pending
                </span>
              </div>
              
              <div className="space-y-4">
                {unconfirmedFacts.map(fact => (
                  <div key={fact.id} className={`p-4 rounded-xl border ${fact.highPriority ? 'bg-orange-500/5 border-orange-500/20' : 'bg-slate-800/30 border-slate-700/50'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-slate-200 text-sm">{fact.patient}</span>
                      <span className="text-xs text-slate-500">{fact.time}</span>
                    </div>
                    <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                      "{fact.fact}"
                    </p>
                    <div className="flex gap-2">
                      <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium transition-colors border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4" />
                        Confirm
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
