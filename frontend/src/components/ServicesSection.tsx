import React, { useState } from 'react';
import {
  Cpu,
  Wrench,
  ShieldCheck,
  Clock,
  Star,
  Sparkles,
} from 'lucide-react';
import { SERVICES_CATALOG } from '../data/productData';

interface ServicesSectionProps {
  onBookService: (serviceName: string) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ onBookService }) => {
  const [bookedService, setBookedService] = useState<string | null>(null);

  const getServiceIcon = (iconName: string) => {
    switch (iconName) {
      case 'Cpu':
        return <Cpu className="w-6 h-6 text-indigo-600" />;
      case 'Wrench':
        return <Wrench className="w-6 h-6 text-indigo-600" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-6 h-6 text-indigo-600" />;
      default:
        return <Sparkles className="w-6 h-6 text-indigo-600" />;
    }
  };

  const handleBook = (name: string) => {
    setBookedService(name);
    onBookService(name);
    setTimeout(() => setBookedService(null), 3000);
  };

  return (
    <section className="mt-16 pt-12 border-t border-slate-200">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
          In-Store &amp; On-Site Support
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
          Rabanal Technical Workshop Services
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          From custom liquid-cooled PC building to deep thermal compound servicing and hardware diagnostics by certified technicians.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SERVICES_CATALOG.map((service) => (
          <div
            key={service.id}
            className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                  {getServiceIcon(service.icon)}
                </div>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  {service.id}
                </span>
              </div>

              <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold mb-2">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{service.rating.toFixed(1)}</span>
                <span className="text-slate-400 font-normal">({service.reviewsCount} jobs)</span>
              </div>

              <h3 className="font-bold text-slate-900 text-base leading-snug">
                {service.name}
              </h3>

              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                {service.description}
              </p>

              <div className="mt-4 flex items-center gap-4 text-xs text-slate-600 font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Turnaround: {service.duration}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Expert Technicians</span>
                <span className="text-xs font-bold text-slate-700">
                  CIT Certified
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleBook(service.name)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  bookedService === service.name
                    ? 'bg-emerald-600 text-white shadow-emerald-200'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {bookedService === service.name ? 'Consultation Booked!' : 'Book Consultation'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
