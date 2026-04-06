import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, doc, updateDoc } from 'firebase/firestore';
import { 
  Calendar, 
  Search, 
  Plus, 
  Clock, 
  CheckCircle2, 
  X, 
  Loader2,
  Filter,
  ChevronRight,
  User,
  AlertCircle
} from 'lucide-react';
import { Visit, Patient } from '../types';
import { format, isToday, isTomorrow, isFuture } from 'date-fns';
import { cn } from '../lib/utils';

const Appointments: React.FC = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    patientId: '',
    date: '',
    time: '',
    notes: ''
  });

  useEffect(() => {
    const visitsUnsub = onSnapshot(query(collection(db, 'visits'), orderBy('date', 'asc')), (snapshot) => {
      setVisits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Visit)));
      setLoading(false);
    });

    const patientsUnsub = onSnapshot(collection(db, 'patients'), (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    });

    return () => {
      visitsUnsub();
      patientsUnsub();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const appointmentDate = new Date(`${formData.date}T${formData.time}`);
      await addDoc(collection(db, 'visits'), {
        patientId: formData.patientId,
        date: appointmentDate.toISOString(),
        status: 'scheduled',
        notes: formData.notes,
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setFormData({ patientId: '', date: '', time: '', notes: '' });
    } catch (error) {
      console.error('Error scheduling appointment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (visitId: string, status: Visit['status']) => {
    try {
      await updateDoc(doc(db, 'visits', visitId), { status });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getPatientName = (id: string) => {
    return patients.find(p => p.id === id)?.fullName || 'Unknown Patient';
  };

  const upcomingVisits = visits.filter(v => v.status === 'scheduled');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 mt-1">Schedule and manage patient visits.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-sm"
        >
          <Plus className="w-5 h-5" />
          New Appointment
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Upcoming Appointments</h2>
            </div>
            {loading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : upcomingVisits.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {upcomingVisits.map((visit) => (
                  <div key={visit.id} className="p-6 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-center",
                      isToday(new Date(visit.date)) ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                    )}>
                      <span className="text-[10px] font-bold uppercase">{format(new Date(visit.date), 'MMM')}</span>
                      <span className="text-xl font-bold leading-none">{format(new Date(visit.date), 'd')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{getPatientName(visit.patientId)}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        {format(new Date(visit.date), 'p')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => updateStatus(visit.id, 'checked-in')}
                        className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-all"
                      >
                        Check-in
                      </button>
                      <button 
                        onClick={() => updateStatus(visit.id, 'no-show')}
                        className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100 transition-all"
                      >
                        No-show
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No upcoming appointments found.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Today's Schedule</h2>
            <div className="space-y-4">
              {visits.filter(v => isToday(new Date(v.date))).length > 0 ? (
                visits.filter(v => isToday(new Date(v.date))).map(v => (
                  <div key={v.id} className="flex gap-3">
                    <span className="text-xs font-bold text-gray-400 w-12 pt-1">{format(new Date(v.date), 'p')}</span>
                    <div className={cn(
                      "flex-1 p-3 rounded-xl border-l-4",
                      v.status === 'completed' ? "bg-green-50 border-green-500" :
                      v.status === 'scheduled' ? "bg-blue-50 border-blue-500" :
                      "bg-amber-50 border-amber-500"
                    )}>
                      <p className="text-xs font-bold text-gray-900">{getPatientName(v.patientId)}</p>
                      <p className="text-[10px] text-gray-500 capitalize">{v.status.replace('-', ' ')}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No appointments for today.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Appointment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h2 className="text-xl font-bold text-gray-900">Schedule Appointment</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Patient *</label>
                  <select
                    required
                    value={formData.patientId}
                    onChange={(e) => setFormData({...formData, patientId: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="">-- Choose Patient --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.fullName} ({p.idNumber})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input
                      required
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                    <input
                      required
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({...formData, time: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none h-24"
                    placeholder="Reason for visit..."
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
