import React from 'react';
import { Layers, Database, Globe, CheckCircle2, AlertCircle } from 'lucide-react';

interface HeaderProps {
  backendConnected: boolean;
  onRefresh: () => void;
  loading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ backendConnected, onRefresh, loading }) => {
  return (
    <header className="bg-slate-800/80 backdrop-blur border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Modular Monolith Architecture
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  In-Process Integration
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Order &amp; Inventory Modules &bull; Supabase PostgreSQL &bull; Spring Boot &bull; React
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Backend Connection Status */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
              backendConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              {backendConnected ? (
                <>
                  <CheckCircle2 className="w-4 h-4 animate-pulse" />
                  <span>Spring Boot + DB Online</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Backend Offline (:8080)</span>
                </>
              )}
            </div>

            {/* Swagger UI link */}
            <a
              href="http://localhost:8080/swagger-ui.html"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 border border-slate-600 text-xs text-slate-200 transition-colors"
              title="Open OpenAPI Swagger Docs"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>Swagger API</span>
            </a>

            {/* Supabase DB Tag */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/60 border border-slate-600 text-xs text-slate-300">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Supabase Postgres</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition shadow disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
