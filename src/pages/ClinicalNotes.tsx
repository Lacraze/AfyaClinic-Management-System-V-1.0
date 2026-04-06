import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { 
  ClipboardList, 
  Search, 
  Activity, 
  Stethoscope, 
  Thermometer, 
  Weight, 
  Heart, 
  User, 
  Clock, 
  CheckCircle2, 
  X, 
  Loader2,
  ChevronRight,
  Save,
  Users
} from 'lucide-react';
import { Visit, Patient, UserProfile, Vitals, Encounter } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

const ClinicalNotes: React.FC = () => {
  const [activeVisits, setActiveVisits] = useState<Visit[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Vitals form
  const [vitalsData, setVitalsData] = useState<Vitals>({
    bp: '',
    pulse: 0,
    temp: 0,
    weight: 0,
    height: 0,
    spo2: 0,
    painScore: 0,
    recordedBy: '',
    recordedAt: ''
  });

  // Encounter form
  const [encounterData, setEncounterData] = useState<Encounter>({
    chiefComplaint: '',
    history: '',
    examination: '',
    diagnosis: '',
    plan: '',
    doctorId: '',
    recordedAt: ''
  });

  useEffect(() => {
    const fetchUser = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as UserProfile);
        }
      }
    };
    fetchUser();

    const visitsUnsub = onSnapshot(
      query(collection(db, 'visits'), where('status', 'in', ['checked-in', 'triage-completed', 'doctor-encounter'])),
      (snapshot) => {
        setActiveVisits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Visit)));
        setLoading(false);
      }
    );

    const patientsUnsub = onSnapshot(collection(db, 'patients'), (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    });

    return () => {
      visitsUnsub();
      patientsUnsub();
    };
  }, []);

  useEffect(() => {
    if (selectedVisit) {
      if (selectedVisit.vitals) setVitalsData(selectedVisit.vitals);
      if (selectedVisit.encounter) setEncounterData(selectedVisit.encounter);
    }
  }, [selectedVisit]);

  const handleSaveVitals = async () => {
    if (!selectedVisit || !user) return;
    setSubmitting(true);
    try {
      const updatedVitals = {
        ...vitalsData,
        recordedBy: user.displayName || user.email,
        recordedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'visits', selectedVisit.id), {
        vitals: updatedVitals,
        status: 'triage-completed'
      });
      setSelectedVisit(null);
    } catch (error) {
      console.error('Error saving vitals:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEncounter = async () => {
    if (!selectedVisit || !user) return;
    setSubmitting(true);
    try {
      const updatedEncounter = {
        ...encounterData,
        doctorId: user.uid,
        recordedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'visits', selectedVisit.id), {
        encounter: updatedEncounter,
        status: 'completed'
      });
      setSelectedVisit(null);
    } catch (error) {
      console.error('Error saving encounter:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getPatientName = (id: string) => {
    return patients.find(p => p.id === id)?.fullName || 'Unknown Patient';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clinical Workflow</h1>
          <p className="text-gray-500 mt-1">Manage triage, vitals, and doctor encounters.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Visits Queue */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Patient Queue</h2>
            </div>
            {loading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : activeVisits.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {activeVisits.map((visit) => (
                  <button
                    key={visit.id}
                    onClick={() => setSelectedVisit(visit)}
                    className={cn(
                      "w-full p-6 flex items-center gap-4 hover:bg-gray-50 transition-all text-left",
                      selectedVisit?.id === visit.id ? "bg-blue-50 border-l-4 border-blue-600" : ""
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                      {getPatientName(visit.patientId).charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{getPatientName(visit.patientId)}</p>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(visit.date), 'p')}
                      </p>
                      <span className={cn(
                        "inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        visit.status === 'checked-in' ? "bg-amber-100 text-amber-700" :
                        visit.status === 'triage-completed' ? "bg-blue-100 text-blue-700" :
                        "bg-purple-100 text-purple-700"
                      )}>
                        {visit.status.replace('-', ' ')}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No active visits in queue.</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-2">
          {selectedVisit ? (
            <div className="space-y-6">
              {/* Vitals Section (Nurses/Doctors) */}
              {(user?.role === 'nurse' || user?.role === 'doctor' || user?.role === 'admin') && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-600" />
                      <h2 className="text-lg font-bold text-gray-900">Triage & Vitals</h2>
                    </div>
                    {selectedVisit.vitals && (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Recorded
                      </span>
                    )}
                  </div>
                  <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Blood Pressure</label>
                      <input
                        type="text"
                        value={vitalsData.bp}
                        onChange={(e) => setVitalsData({...vitalsData, bp: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="120/80"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Pulse (bpm)</label>
                      <input
                        type="number"
                        value={vitalsData.pulse}
                        onChange={(e) => setVitalsData({...vitalsData, pulse: Number(e.target.value)})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Temp (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={vitalsData.temp}
                        onChange={(e) => setVitalsData({...vitalsData, temp: Number(e.target.value)})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Weight (kg)</label>
                      <input
                        type="number"
                        value={vitalsData.weight}
                        onChange={(e) => setVitalsData({...vitalsData, weight: Number(e.target.value)})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">SPO2 (%)</label>
                      <input
                        type="number"
                        value={vitalsData.spo2}
                        onChange={(e) => setVitalsData({...vitalsData, spo2: Number(e.target.value)})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleSaveVitals}
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Vitals
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Encounter Section (Doctors only) */}
              {(user?.role === 'doctor' || user?.role === 'admin') && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-bold text-gray-900">Doctor Encounter Notes</h2>
                  </div>
                  <div className="p-6 space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Chief Complaint</label>
                      <textarea
                        value={encounterData.chiefComplaint}
                        onChange={(e) => setEncounterData({...encounterData, chiefComplaint: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none h-20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">History & Examination</label>
                      <textarea
                        value={encounterData.history}
                        onChange={(e) => setEncounterData({...encounterData, history: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none h-32"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Diagnosis</label>
                      <input
                        type="text"
                        value={encounterData.diagnosis}
                        onChange={(e) => setEncounterData({...encounterData, diagnosis: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Treatment Plan</label>
                      <textarea
                        value={encounterData.plan}
                        onChange={(e) => setEncounterData({...encounterData, plan: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none h-32"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveEncounter}
                        disabled={submitting}
                        className="flex items-center gap-2 px-8 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg disabled:opacity-50"
                      >
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        Complete Encounter
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full bg-white rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center p-12">
              <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-6">
                <ClipboardList className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">No Visit Selected</h3>
              <p className="text-gray-500 mt-2 max-w-xs">Select a patient from the queue to start recording vitals or encounter notes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicalNotes;
