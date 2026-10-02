import React, { useEffect, useState } from 'react';
import {
  Radio,
  CheckCircle2,
  XCircle,
  Clock,
  Hash,
  Activity,
  Truck,
  PackageCheck,
  AlertCircle,
  RotateCcw,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import { ChannelStatus as ChannelStatusType } from '../types';

export const ChannelStatus: React.FC = () => {
  const [status, setStatus] = useState<ChannelStatusType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchStatus = async () => {
    try {
      const data = await api.getChannelStatus();
      setStatus(data);
      setError(null);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error('Failed to load channel status:', err);
      setError(err.message || 'Failed to connect to backend channel API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 10 seconds per requirements
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (orderStatus: string) => {
    const s = orderStatus ? orderStatus.toUpperCase() : 'UNKNOWN';
    if (s === 'ACCEPTED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          ACCEPTED
        </span>
      );
    }
    if (s === 'BACKORDERED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          BACKORDERED
        </span>
      );
    }
    if (s === 'REJECTED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          REJECTED
        </span>
      );
    }
    if (s === 'CANCELLED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700 border border-slate-300">
          CANCELLED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
        {s}
      </span>
    );
  };

  const getChannelStateBadge = (state?: string) => {
    const s = (state || 'running').toLowerCase();
    if (s === 'running') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Running
        </span>
      );
    }
    if (s === 'backoff') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Backoff
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-700 border border-slate-300">
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        Paused
      </span>
    );
  };

  if (loading && !status) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
          <Activity className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
          <p className="font-medium text-sm">Loading Tiangge Channel Status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Title & Auto-refresh status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Radio className="w-6 h-6 text-indigo-600" />
            Tiangge Marketplace Channel Status
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time telemetry and order feed synchronization for the external Tiangge Marketplace.
          </p>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Auto-refreshing every 10s</span>
            <span className="text-slate-400">•</span>
            <span>{lastRefreshed.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Status & Telemetry Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Channel State & Heartbeat */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Channel Status</span>
            {getChannelStateBadge(status?.channelState)}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="relative flex h-3.5 w-3.5">
              {status?.online && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                  status?.online ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              ></span>
            </span>
            <span className="text-sm font-bold text-slate-800">
              {status?.online ? 'Online (Heartbeat OK)' : 'Offline / Degraded'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Last heartbeat:{' '}
            <span className="font-semibold text-slate-700">
              {status?.lastHeartbeatTime ? new Date(status.lastHeartbeatTime).toLocaleTimeString() : 'Never'}
            </span>
          </p>
        </div>

        {/* Feed Cursor & Last Processed */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Feed Cursor</span>
            <Activity className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600">
            {status?.lastCursor !== null && status?.lastCursor !== undefined ? status.lastCursor : 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Last processed:{' '}
            <span className="font-semibold text-slate-700">
              {status?.lastProcessedTime ? new Date(status.lastProcessedTime).toLocaleTimeString() : 'Awaiting feed'}
            </span>
          </p>
        </div>

        {/* LegacySupply Restock Loop */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Supplier Adapter</span>
            <Truck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{status?.totalSupplierOrders ?? 0}</span>
            <span className="text-xs text-slate-500 font-medium">POs placed</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
            Deliveries received:{' '}
            <span className="font-semibold text-slate-800">{status?.totalDeliveries ?? 0}</span>
          </p>
        </div>

        {/* Instance UUID Card */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Instance UUID</span>
            <Hash className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <div
              className="text-[11px] font-mono font-semibold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200 truncate select-all"
              title={status?.instanceId || 'None'}
            >
              {status?.instanceId || 'N/A'}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Persistent per boot (<code className="text-slate-600">X-Client-Instance</code>)
          </p>
        </div>
      </div>

      {/* Orders Counters Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Tiangge Feed Orders Lifecycle
            </h3>
          </div>
          <span className="text-xs text-slate-400">Total decided within 60s SLA</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 font-medium mb-1">Total Received</div>
            <div className="text-xl font-bold text-slate-900">{status?.totalOrdersReceived ?? 0}</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
            <div className="text-xs text-emerald-700 font-medium mb-1 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Accepted</span>
            </div>
            <div className="text-xl font-bold text-emerald-800">{status?.totalAccepted ?? 0}</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
            <div className="text-xs text-amber-700 font-medium mb-1 flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Backordered</span>
            </div>
            <div className="text-xl font-bold text-amber-800">{status?.totalBackordered ?? 0}</div>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-center">
            <div className="text-xs text-rose-700 font-medium mb-1 flex items-center justify-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Rejected</span>
            </div>
            <div className="text-xl font-bold text-rose-800">{status?.totalRejected ?? 0}</div>
          </div>
          <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-600 font-medium mb-1 flex items-center justify-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Cancelled</span>
            </div>
            <div className="text-xl font-bold text-slate-800">{status?.totalCancelled ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Recent Channel Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Recent Channel Orders</h3>
            <p className="text-xs text-slate-500">
              Orders ingested from the marketplace feed, deduplicated and decided within 60s.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-sm">
            {status?.recentOrders?.length || 0} Recent
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Tiangge Order ID</th>
                <th className="py-3 px-4">Shop Order ID</th>
                <th className="py-3 px-4">Decision / Status</th>
                <th className="py-3 px-4">Processed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {status?.recentOrders && status.recentOrders.length > 0 ? (
                status.recentOrders.map((order, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-800 font-semibold">
                      {order.tianggeOrderId}
                    </td>
                    <td className="py-3 px-4 font-mono text-indigo-600">
                      #{order.shopOrderId}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {order.time ? new Date(order.time).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No marketplace orders recorded yet. Waiting for order feed...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Informational Footer Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-500 flex items-start gap-3">
        <Radio className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-700">Autonomous Operation: </span>
          This is a read-only monitoring window. Channel operations (heartbeats every 30s, feed polling every 3s,
          catalog & stock sync, outbox retry, and delivery backorder resolution) run fully autonomously in the Spring Boot backend.
          No manual controls or trigger buttons are needed.
        </div>
      </div>
    </div>
  );
};
