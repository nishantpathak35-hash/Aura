import { Calendar as CalendarIcon, Clock, User, Plus } from 'lucide-react';

export default function AppointmentsView() {
  const appointments = [
    { id: 1, patient: 'Sarah Jenkins', time: '09:00 AM', doctor: 'Dr. Smith', type: 'Checkup', status: 'Completed' },
    { id: 2, patient: 'Michael Chang', time: '10:30 AM', doctor: 'Dr. Smith', type: 'Consultation', status: 'In Progress' },
    { id: 3, patient: 'Emma Watson', time: '02:00 PM', doctor: 'Dr. Adams', type: 'Follow-up', status: 'Scheduled' },
    { id: 4, patient: 'John Doe', time: '02:30 PM', doctor: 'Dr. Smith', type: 'New Patient', status: 'Scheduled' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-center pb-4 border-b border-slate-800/50">
        <div>
          <h1 className="text-3xl font-bold text-white">Appointments</h1>
          <p className="text-slate-400 mt-1">Manage today's schedule and upcoming bookings.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors shadow-lg shadow-teal-500/20">
          <Plus className="w-5 h-5" />
          New Booking
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Calendar Widget (Simplified) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 bg-slate-900/50 border border-slate-800/50 rounded-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">July 2026</h3>
              <div className="flex gap-2">
                <button className="p-1 hover:bg-slate-800 rounded">&lt;</button>
                <button className="p-1 hover:bg-slate-800 rounded">&gt;</button>
              </div>
            </div>
            {/* Mock Mini Calendar */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400 mb-2">
              <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              <div className="p-2 text-slate-600">28</div><div className="p-2 text-slate-600">29</div><div className="p-2 text-slate-600">30</div>
              <div className="p-2 text-slate-300">1</div><div className="p-2 text-slate-300">2</div>
              <div className="p-2 bg-teal-500 text-white font-semibold rounded-lg shadow-sm">3</div>
              <div className="p-2 text-slate-300">4</div>
              {/* ... more days ... */}
            </div>
          </div>

          <div className="p-5 bg-slate-900/50 border border-slate-800/50 rounded-2xl backdrop-blur-md space-y-3">
            <h3 className="font-semibold text-white mb-2">Filters</h3>
            <label className="flex items-center gap-2 text-slate-300 text-sm">
              <input type="checkbox" className="rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-500/50" defaultChecked />
              Dr. Smith
            </label>
            <label className="flex items-center gap-2 text-slate-300 text-sm">
              <input type="checkbox" className="rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-500/50" defaultChecked />
              Dr. Adams
            </label>
          </div>
        </div>

        {/* Schedule List */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold text-white">Today's Schedule</h2>
            <span className="text-slate-400 text-sm">4 Appointments</span>
          </div>

          <div className="bg-slate-900/30 border border-slate-800/50 rounded-2xl overflow-hidden backdrop-blur-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-800/50 text-slate-400 text-sm uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Time</th>
                  <th className="px-6 py-4 font-medium">Patient</th>
                  <th className="px-6 py-4 font-medium">Doctor</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-200">
                        <Clock className="w-4 h-4 text-slate-500" />
                        {apt.time}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                          <User className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-200">{apt.patient}</div>
                          <div className="text-xs text-slate-500">{apt.type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                      {apt.doctor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        apt.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        apt.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {apt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-teal-400 hover:text-teal-300 mr-4">Edit</button>
                      <button className="text-slate-500 hover:text-slate-400">Cancel</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
