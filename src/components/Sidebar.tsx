'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, Calendar, BookOpen, Settings } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  if (pathname?.startsWith('/call')) {
    return null;
  }

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Conversations', href: '/conversations', icon: MessageSquare },
    { name: 'Appointments', href: '/appointments', icon: Calendar },
    { name: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50 h-full flex flex-col p-4">
      <div className="flex items-center gap-3 px-2 mb-8 mt-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
          <span className="font-bold text-slate-900 text-lg">A</span>
        </div>
        <span className="font-semibold text-xl tracking-tight text-white">AURA</span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200 group"
          >
            <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform duration-200 text-slate-500 group-hover:text-teal-400" />
            <span className="font-medium">{item.name}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto p-4 bg-slate-800/30 rounded-xl border border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
            <span className="font-medium text-white">SC</span>
          </div>
          <div>
            <p className="text-sm font-medium text-white">Staff Member</p>
            <p className="text-xs text-slate-400">Downtown Clinic</p>
          </div>
        </div>
      </div>
    </div>
  );
}
