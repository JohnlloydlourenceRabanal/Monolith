import React from 'react';
import { Cpu, ArrowRightLeft, Database, Globe, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { IntegrationTrace } from '../types';

interface ArchitectureTrackerProps {
  traces: IntegrationTrace[];
  onClearTraces: () => void;
}

export const ArchitectureTracker: React.FC<ArchitectureTrackerProps> = ({ traces, onClearTraces }) => {
  return (
    <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-700/60 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            3-Tier Integration Architecture Inspector
          </h2>
          <p className="text-xs text-slate-400">
            Real-time visualization of Client-to-Service, In-Process Module-to-Module, and Database integration.
          </p>
        </div>

        {traces.length > 0 && (
          <button
            onClick={onClearTraces}
            className="text-xs text-slate-400 hover:text-slate-200 self-start sm:self-auto underline transition"
          >
            Clear Activity Log ({traces.length})
          </button>
        )}
      </div>

      {/* 3 Integration Styles Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Style 1: Client -> REST */}
        <div className="bg-slate-900/60 border border-indigo-500/30 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500/60 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Style 1
              </span>
              <Globe className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="font-semibold text-sm text-slate-100">External Client &bull; REST HTTP</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              React client sends JSON over HTTP to Spring Boot REST endpoints (<code className="text-indigo-300">/api/orders</code>, <code className="text-indigo-300">/api/inventory</code>) with CORS &amp; standard error codes.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>HTTP JSON &bull; Async Network</span>
          </div>
        </div>

        {/* Style 2: Module -> Module In-Process */}
        <div className="bg-slate-900/60 border border-violet-500/30 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-violet-500/60 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                Style 2 &bull; Core Focus
              </span>
              <ArrowRightLeft className="w-4 h-4 text-violet-400" />
            </div>
            <h3 className="font-semibold text-sm text-slate-100">In-Process Enforced Boundary</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              <code className="text-violet-300">OrderService</code> calls <code className="text-violet-300">InventoryModuleApi</code> in-memory. Zero network hops (&lt; 0.1ms). Enforced by ArchUnit: private internal classes cannot be imported across modules!
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
            <span>ArchUnit Tested &bull; In-Memory JVM</span>
          </div>
        </div>

        {/* Style 3: Service -> Supabase Database */}
        <div className="bg-slate-900/60 border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/60 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Style 3
              </span>
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="font-semibold text-sm text-slate-100">Database &bull; Supabase Postgres</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Shared PostgreSQL database managed via Spring Data JPA. Both modules participate in a single ACID transaction during checkout with pessimistic stock row locks.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>ACID Transaction &bull; Row Locking</span>
          </div>
        </div>
      </div>

      {/* Live Event Stream / Activity Log */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Live Integration Call Traces
        </h3>

        {traces.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-slate-700/80 rounded-xl text-slate-500 text-xs">
            No integration activity yet. Place an order or restock an item below to watch the in-process execution pipeline in real-time.
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {traces.map((trace) => (
              <div
                key={trace.id}
                className="bg-slate-900/80 border border-slate-700/60 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition hover:border-slate-600"
              >
                <div className="flex items-start sm:items-center gap-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      trace.type === 'MODULE_TO_MODULE'
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                        : trace.type === 'SERVICE_TO_DATABASE'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}
                  >
                    {trace.type === 'MODULE_TO_MODULE'
                      ? 'IN-PROCESS BOUNDARY'
                      : trace.type === 'SERVICE_TO_DATABASE'
                      ? 'DATABASE ACID'
                      : 'CLIENT REST'}
                  </span>
                  <div>
                    <span className="font-semibold text-slate-200">{trace.title}</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">{trace.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-400 text-[11px] self-end sm:self-auto">
                  <span className="font-mono text-indigo-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {trace.durationMs}
                  </span>
                  <span>{new Date(trace.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
