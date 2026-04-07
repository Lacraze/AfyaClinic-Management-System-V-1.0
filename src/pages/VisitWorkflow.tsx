import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, serverTimestamp, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { 
  Activity, 
  FileText, 
  Stethoscope, 
  Receipt, 
  CheckCircle2, 
  ChevronRight, 
  Loader2,
  Thermometer,
  Heart,
  Weight,
  Scale,
  Wind,
  AlertCircle,
  Save,
  ArrowLeft,
  Plus,
  Trash2
} from 'lucide-react';
import { Visit, Patient, Vitals, History, Encounter, UserProfile, Drug } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

const steps = [
  { id: 'vitals', label: 'Vitals', icon: Activity },
  { id: 'history', label: 'History', icon: FileText },
  { id: 'encounter', label: 'Encounter', icon: Stethoscope },
  { id: 'billing', label: 'Billing', icon: Receipt },
];

const VisitWorkflow: React.FC = () => {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [drugs, setDrugs] = useState<Drug[]>([]);

  // Form states
  const [vitalsForm, setVitalsForm] = useState<Partial<Vitals>>({});
  const [historyForm, setHistoryForm] = useState<Partial<History>>({});
  const [encounterForm, setEncounterForm] = useState<Partial<Encounter>>({});
  const [billingItems, setBillingItems] = useState<{ description: string; quantity: number; unitPrice: number; total: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!visitId) return;

      try {
        const visitDoc = await getDoc(doc(db, 'visits', visitId));
        if (visitDoc.exists()) {
          const visitData = { id: visitDoc.id, ...visitDoc.data() } as Visit;
          setVisit(visitData);
          
          // Pre-fill forms if data exists
          if (visitData.vitals) setVitalsForm(visitData.vitals);
          if (visitData.history) setHistoryForm(visitData.history);
          if (visitData.encounter) setEncounterForm(visitData.encounter);

          // Fetch patient
          const patientDoc = await getDoc(doc(db, 'patients', visitData.patientId));
          if (patientDoc.exists()) {
            setPatient({ id: patientDoc.id, ...patientDoc.data() } as Patient);
          }

          // Fetch drugs for billing/prescriptions
          const drugsSnapshot = await getDocs(collection(db, 'drugs'));
          setDrugs(drugsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Drug)));
        } else {
          navigate('/patients');
        }

        if (auth.currentUser) {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as UserProfile);
          }
        }
      } catch (error) {
        console.error('Error fetching visit data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [visitId, navigate]);

  const handleSaveVitals = async () => {
    if (!visitId || !user) return;
    setSaving(true);
    try {
      const vitalsData = {
        ...vitalsForm,
        recordedBy: user.displayName || user.email,
        recordedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'visits', visitId), {
        vitals: vitalsData,
        status: 'history'
      });
      setVisit(prev => prev ? { ...prev, vitals: vitalsData as Vitals, status: 'history' } : null);
    } catch (error) {
      console.error('Error saving vitals:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHistory = async () => {
    if (!visitId || !user) return;
    setSaving(true);
    try {
      const historyData = {
        ...historyForm,
        recordedBy: user.displayName || user.email,
        recordedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'visits', visitId), {
        history: historyData,
        status: 'encounter'
      });
      setVisit(prev => prev ? { ...prev, history: historyData as History, status: 'encounter' } : null);
    } catch (error) {
      console.error('Error saving history:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEncounter = async () => {
    if (!visitId || !user) return;
    setSaving(true);
    try {
      const encounterData = {
        ...encounterForm,
        doctorId: user.uid,
        recordedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'visits', visitId), {
        encounter: encounterData,
        status: 'billing'
      });
      setVisit(prev => prev ? { ...prev, encounter: encounterData as Encounter, status: 'billing' } : null);
    } catch (error) {
      console.error('Error saving encounter:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBilling = async () => {
    if (!visitId || !patient) return;
    setSaving(true);
    try {
      const subtotal = billingItems.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0; // No tax for now
      const total = subtotal + tax;

      await addDoc(collection(db, 'invoices'), {
        patientId: patient.id,
        visitId: visitId,
        items: billingItems,
        subtotal,
        tax,
        total,
        status: 'unpaid',
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'visits', visitId), {
        status: 'completed'
      });

      navigate(`/patients/${patient.id}`);
    } catch (error) {
      console.error('Error saving billing:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!visit || !patient) return null;

  const currentStepIndex = steps.findIndex(s => s.id === visit.status) === -1 
    ? (visit.status === 'checked-in' ? 0 : steps.length - 1)
    : steps.findIndex(s => s.id === visit.status);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/patients/${patient.id}`)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Visit Workflow</h1>
            <p className="text-sm text-gray-500">Patient: {patient.fullName} | Date: {format(new Date(visit.date), 'PP')}</p>
          </div>
        </div>
        <div className={cn(
          "px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider",
          visit.status === 'completed' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
        )}>
          {visit.status.replace('-', ' ')}
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative flex justify-between">
          {/* Progress Line */}
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 z-0" />
          <div 
            className="absolute top-1/2 left-0 h-0.5 bg-blue-600 -translate-y-1/2 z-0 transition-all duration-500" 
            style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
          />

          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentStepIndex;
            const isActive = index === currentStepIndex;

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  isCompleted ? "bg-green-600 text-white" : 
                  isActive ? "bg-blue-600 text-white ring-4 ring-blue-100" : 
                  "bg-white border-2 border-gray-200 text-gray-400"
                )}>
                  {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-400"
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Vitals Step */}
        {visit.status === 'checked-in' || visit.status === 'vitals' ? (
          <div className="p-8 space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Patient Vitals</h2>
                <p className="text-sm text-gray-500">Record baseline physical measurements</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" /> Blood Pressure
                </label>
                <input
                  type="text"
                  placeholder="120/80"
                  value={vitalsForm.bp || ''}
                  onChange={e => setVitalsForm({ ...vitalsForm, bp: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" /> Pulse (bpm)
                </label>
                <input
                  type="number"
                  placeholder="72"
                  value={vitalsForm.pulse || ''}
                  onChange={e => setVitalsForm({ ...vitalsForm, pulse: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-orange-500" /> Temperature (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="36.5"
                  value={vitalsForm.temp || ''}
                  onChange={e => setVitalsForm({ ...vitalsForm, temp: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Weight className="w-4 h-4 text-green-500" /> Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="70.0"
                  value={vitalsForm.weight || ''}
                  onChange={e => setVitalsForm({ ...vitalsForm, weight: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-indigo-500" /> Height (cm)
                </label>
                <input
                  type="number"
                  placeholder="170"
                  value={vitalsForm.height || ''}
                  onChange={e => setVitalsForm({ ...vitalsForm, height: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Wind className="w-4 h-4 text-blue-400" /> SPO2 (%)
                </label>
                <input
                  type="number"
                  placeholder="98"
                  value={vitalsForm.spo2 || ''}
                  onChange={e => setVitalsForm({ ...vitalsForm, spo2: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-100">
              <button
                onClick={handleSaveVitals}
                disabled={saving}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save & Continue</>}
              </button>
            </div>
          </div>
        ) : visit.status === 'history' ? (
          <div className="p-8 space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Medical History</h2>
                <p className="text-sm text-gray-500">Document patient complaints and history</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Chief Complaint</label>
                <textarea
                  rows={2}
                  value={historyForm.chiefComplaint || ''}
                  onChange={e => setHistoryForm({ ...historyForm, chiefComplaint: e.target.value })}
                  placeholder="What is the main reason for the visit?"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">History of Present Illness (HPI)</label>
                <textarea
                  rows={4}
                  value={historyForm.hpi || ''}
                  onChange={e => setHistoryForm({ ...historyForm, hpi: e.target.value })}
                  placeholder="Detailed account of the current symptoms..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Past Medical History (PMH)</label>
                  <textarea
                    rows={3}
                    value={historyForm.pmh || ''}
                    onChange={e => setHistoryForm({ ...historyForm, pmh: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Social & Family History</label>
                  <textarea
                    rows={3}
                    value={historyForm.socialHistory || ''}
                    onChange={e => setHistoryForm({ ...historyForm, socialHistory: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-100">
              <button
                onClick={handleSaveHistory}
                disabled={saving}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save & Continue</>}
              </button>
            </div>
          </div>
        ) : visit.status === 'encounter' ? (
          <div className="p-8 space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Stethoscope className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Clinical Encounter</h2>
                <p className="text-sm text-gray-500">Examination, diagnosis, and treatment plan</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Physical Examination</label>
                <textarea
                  rows={4}
                  value={encounterForm.examination || ''}
                  onChange={e => setEncounterForm({ ...encounterForm, examination: e.target.value })}
                  placeholder="Record findings from physical exam..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Diagnosis</label>
                <input
                  type="text"
                  value={encounterForm.diagnosis || ''}
                  onChange={e => setEncounterForm({ ...encounterForm, diagnosis: e.target.value })}
                  placeholder="Primary diagnosis..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Treatment Plan</label>
                <textarea
                  rows={4}
                  value={encounterForm.plan || ''}
                  onChange={e => setEncounterForm({ ...encounterForm, plan: e.target.value })}
                  placeholder="Prescriptions, advice, follow-up..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-100">
              <button
                onClick={handleSaveEncounter}
                disabled={saving}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save & Continue</>}
              </button>
            </div>
          </div>
        ) : visit.status === 'billing' ? (
          <div className="p-8 space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Receipt className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Billing & Checkout</h2>
                <p className="text-sm text-gray-500">Generate invoice for services and items</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Invoice Items</h3>
                <button
                  onClick={() => setBillingItems([...billingItems, { description: '', quantity: 1, unitPrice: 0, total: 0 }])}
                  className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>

              <div className="space-y-4">
                {billingItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-end bg-gray-50 p-4 rounded-xl">
                    <div className="col-span-12 md:col-span-5 space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => {
                          const newItems = [...billingItems];
                          newItems[index].description = e.target.value;
                          setBillingItems(newItems);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Qty</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => {
                          const newItems = [...billingItems];
                          newItems[index].quantity = parseInt(e.target.value);
                          newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
                          setBillingItems(newItems);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Unit Price</label>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={e => {
                          const newItems = [...billingItems];
                          newItems[index].unitPrice = parseFloat(e.target.value);
                          newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
                          setBillingItems(newItems);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-3 md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Total</label>
                      <div className="px-3 py-2 font-bold text-gray-900">
                        {item.total.toLocaleString()}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() => setBillingItems(billingItems.filter((_, i) => i !== index))}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-end gap-2 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-8 text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-bold text-gray-900">
                    KES {billingItems.reduce((sum, item) => sum + item.total, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-8 text-lg font-bold text-gray-900">
                  <span>Total Due</span>
                  <span className="text-blue-600">
                    KES {billingItems.reduce((sum, item) => sum + item.total, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-100">
              <button
                onClick={handleSaveBilling}
                disabled={saving || billingItems.length === 0}
                className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-sm disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Complete Visit</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">Visit Completed</h2>
            <p className="text-gray-500">All steps have been recorded successfully.</p>
            <button
              onClick={() => navigate(`/patients/${patient.id}`)}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-all"
            >
              Back to Patient Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitWorkflow;
