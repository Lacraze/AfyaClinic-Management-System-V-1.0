import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  useEffect(() => {
    const bootstrap = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          setUser(userData);
          const facilityId = userData.facilityId || 'main-branch';

          const visitsUnsub = onSnapshot(
            query(
              collection(db, 'visits'), 
              where('facilityId', '==', facilityId),
              where('status', 'in', ['checked-in', 'vitals', 'history', 'encounter', 'billing'])
            ),
            (snapshot) => {
              setActiveVisits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Visit)));
              setLoading(false);
            }
          );

          const patientsUnsub = onSnapshot(
            query(collection(db, 'patients'), where('facilityId', '==', facilityId)), 
            (snapshot) => {
              setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
            }
          );

          return () => {
            visitsUnsub();
            patientsUnsub();
          };
        }
      }
    };
    bootstrap();
  }, []);

  const handleSelectVisit = (visit: Visit) => {
    navigate(`/visits/${visit.id}/workflow`);
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
                    onClick={() => handleSelectVisit(visit)}
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
                        visit.status === 'vitals' ? "bg-blue-100 text-blue-700" :
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
          <div className="h-full bg-white rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center p-12">
            <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-6">
              <ClipboardList className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Patient Queue</h3>
            <p className="text-gray-500 mt-2 max-w-xs">Select a patient from the queue to start the clinical workflow (Vitals, History, Encounter, and Billing).</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicalNotes;
