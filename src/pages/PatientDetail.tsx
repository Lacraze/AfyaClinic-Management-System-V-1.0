import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Activity, 
  FileText, 
  Pill, 
  Receipt, 
  Plus, 
  ChevronLeft,
  Loader2,
  Clock,
  CheckCircle2,
  Stethoscope,
  Thermometer,
  Weight,
  Heart
} from 'lucide-react';
import { Patient, Visit, UserProfile, Vitals, Encounter } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'vitals' | 'encounters' | 'billing'>('history');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      // Fetch patient
      const patientDoc = await getDoc(doc(db, 'patients', id));
      if (patientDoc.exists()) {
        setPatient({ id: patientDoc.id, ...patientDoc.data() } as Patient);
      } else {
        navigate('/patients');
        return;
      }

      // Fetch user role
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as UserProfile);
        }
      }

      // Fetch visits
      const q = query(collection(db, 'visits'), where('patientId', '==', id), orderBy('date', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setVisits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Visit)));
        setLoading(false);
      });

      return () => unsubscribe();
    };

    fetchData();
  }, [id, navigate]);

  const handleCreateVisit = async () => {
    if (!id) return;
    try {
      const docRef = await addDoc(collection(db, 'visits'), {
        patientId: id,
        date: new Date().toISOString(),
        status: 'checked-in',
        createdAt: serverTimestamp()
      });
      // Optionally navigate to visit detail or show success
    } catch (error) {
      console.error('Error creating visit:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/patients')}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Patients
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-3xl font-bold mb-4">
                {patient.fullName.charAt(0)}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{patient.fullName}</h2>
              <p className="text-sm text-gray-500">ID: {patient.idNumber}</p>
              
              <div className="mt-6 w-full space-y-4 text-left">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {patient.phoneNumber}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {format(new Date(patient.dateOfBirth), 'PP')} ({patient.gender})
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {patient.address}
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Insurance</p>
                  <p className="text-sm text-gray-700 font-medium">{patient.insuranceProvider || 'Self-pay'}</p>
                  {patient.insuranceNumber && <p className="text-xs text-gray-500">#{patient.insuranceNumber}</p>}
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Next of Kin</p>
                  <p className="text-sm text-gray-700">{patient.nextOfKin}</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleCreateVisit}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Check-in for Visit
          </button>
        </div>

        {/* Tabs and Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100">
              {[
                { id: 'history', label: 'Visit History', icon: Clock },
                { id: 'vitals', label: 'Vitals', icon: Activity },
                { id: 'encounters', label: 'Encounters', icon: Stethoscope },
                { id: 'billing', label: 'Billing', icon: Receipt },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all border-b-2",
                    activeTab === tab.id 
                      ? "border-blue-600 text-blue-600 bg-blue-50/50" 
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'history' && (
                <div className="space-y-4">
                  {visits.length > 0 ? (
                    visits.map((visit) => (
                      <div key={visit.id} className="p-4 rounded-xl border border-gray-100 hover:border-blue-200 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-semibold text-gray-900">{format(new Date(visit.date), 'PPpp')}</span>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                            visit.status === 'completed' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                          )}>
                            {visit.status.replace('-', ' ')}
                          </span>
                        </div>
                        {visit.vitals && (
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                            <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> {visit.vitals.temp}°C</span>
                            <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {visit.vitals.bp}</span>
                            <span className="flex items-center gap-1"><Weight className="w-3 h-3" /> {visit.vitals.weight}kg</span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>No visit history found.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'vitals' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">Vitals History</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          <th className="pb-4">Date</th>
                          <th className="pb-4">BP</th>
                          <th className="pb-4">Pulse</th>
                          <th className="pb-4">Temp</th>
                          <th className="pb-4">Weight</th>
                          <th className="pb-4">SPO2</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {visits.filter(v => v.vitals).map((visit) => (
                          <tr key={visit.id} className="text-sm text-gray-600">
                            <td className="py-4">{format(new Date(visit.date), 'MMM d, p')}</td>
                            <td className="py-4 font-medium text-gray-900">{visit.vitals?.bp}</td>
                            <td className="py-4">{visit.vitals?.pulse}</td>
                            <td className="py-4">{visit.vitals?.temp}°C</td>
                            <td className="py-4">{visit.vitals?.weight}kg</td>
                            <td className="py-4">{visit.vitals?.spo2}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'encounters' && (
                <div className="space-y-6">
                  {visits.filter(v => v.encounter).map((visit) => (
                    <div key={visit.id} className="p-6 rounded-2xl border border-gray-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-gray-900">{format(new Date(visit.date), 'PPPP')}</h4>
                        <span className="text-xs text-gray-500">Dr. ID: {visit.encounter?.doctorId}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Chief Complaint</p>
                          <p className="text-sm text-gray-700">{visit.encounter?.chiefComplaint}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Diagnosis</p>
                          <p className="text-sm text-gray-700 font-medium">{visit.encounter?.diagnosis}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Plan</p>
                          <p className="text-sm text-gray-700">{visit.encounter?.plan}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'billing' && (
                <div className="text-center py-12 text-gray-500">
                  <Receipt className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Billing records will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDetail;
