import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where, limit, startAfter, getDocs, QueryDocumentSnapshot, doc, updateDoc } from 'firebase/firestore';
import { 
  Users, 
  Search, 
  Plus, 
  UserPlus, 
  ChevronRight, 
  Phone, 
  MapPin, 
  Calendar,
  X,
  Loader2,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Patient } from '../types';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

const Patients: React.FC = () => {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);
  const navigate = useNavigate();

  const PAGE_SIZE = 20;

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    idNumber: '',
    phoneNumber: '',
    address: '',
    dateOfBirth: '',
    gender: 'male' as 'male' | 'female' | 'other',
    nextOfKin: '',
    insuranceProvider: '',
    insuranceNumber: ''
  });

  useEffect(() => {
    if (!profile?.clinicId && !isGlobalSearch) {
      if (profile) setLoading(false);
      return;
    }

    setLoading(true);
    let q;
    if (isGlobalSearch && profile?.role === 'admin') {
      q = query(
        collection(db, 'patients'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );
    } else {
      q = query(
        collection(db, 'patients'), 
        where('clinicId', '==', profile?.clinicId), 
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPatients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as Patient));
      setPatients(newPatients);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'patients');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.clinicId, isGlobalSearch]);

  const loadMore = async () => {
    if ((!profile?.clinicId && !isGlobalSearch) || !lastDoc || loadingMore) return;

    setLoadingMore(true);
    try {
      let q;
      if (isGlobalSearch && profile?.role === 'admin') {
        q = query(
          collection(db, 'patients'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      } else {
        q = query(
          collection(db, 'patients'),
          where('clinicId', '==', profile?.clinicId),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      }

      const snapshot = await getDocs(q);
      const newPatients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as Patient));
      
      setPatients(prev => [...prev, ...newPatients]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'patients');
    } finally {
      setLoadingMore(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.idNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCheckIn = async (patient: Patient) => {
    if (!profile) return;
    try {
      const clinicId = profile.clinicId;
      let visitRef;
      try {
        visitRef = await addDoc(collection(db, 'visits'), {
          patientId: patient.id,
          date: new Date().toISOString(),
          status: 'checked-in',
          clinicId,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'visits');
      }

      // Audit Log
      try {
        await addDoc(collection(db, 'audit_logs'), {
          userId: profile.uid,
          userEmail: profile.email,
          action: 'CHECK_IN_PATIENT',
          module: 'Patients',
          details: `Checked in patient: ${patient.fullName} (${patient.id})`,
          timestamp: serverTimestamp(),
          clinicId
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'audit_logs');
      }

      alert(`${patient.fullName} checked in successfully!`);
      if (visitRef) navigate(`/visits/${visitRef.id}/workflow`);
    } catch (error) {
      console.error('Error checking in patient:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    setError(null);
    try {
      const clinicId = profile.clinicId;
      if (!clinicId) {
        throw new Error('No clinic selected. Please select a clinic from the sidebar or contact an administrator.');
      }
      if (editingPatient) {
        try {
          await updateDoc(doc(db, 'patients', editingPatient.id), {
            ...formData,
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `patients/${editingPatient.id}`);
        }

        try {
          await addDoc(collection(db, 'audit_logs'), {
            userId: profile.uid,
            userEmail: profile.email,
            action: 'UPDATE_PATIENT',
            module: 'Patients',
            details: `Updated patient: ${formData.fullName} (${editingPatient.id})`,
            timestamp: serverTimestamp(),
            clinicId
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'audit_logs');
        }
      } else {
        let patientRef;
        try {
          patientRef = await addDoc(collection(db, 'patients'), {
            ...formData,
            clinicId,
            createdAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'patients');
        }

        try {
          await addDoc(collection(db, 'audit_logs'), {
            userId: profile.uid,
            userEmail: profile.email,
            action: 'REGISTER_PATIENT',
            module: 'Patients',
            details: `Registered patient: ${formData.fullName} (ID: ${formData.idNumber})`,
            timestamp: serverTimestamp(),
            clinicId
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'audit_logs');
        }
      }
      
      setIsModalOpen(false);
      setEditingPatient(null);
      setFormData({
        fullName: '',
        idNumber: '',
        phoneNumber: '',
        address: '',
        dateOfBirth: '',
        gender: 'male',
        nextOfKin: '',
        insuranceProvider: '',
        insuranceNumber: ''
      });
    } catch (err: any) {
      console.error('Error saving patient:', err);
      setError(err.message || 'Failed to save patient. Please check your permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 transition-colors duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Patients</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and register clinic patients.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-sm"
        >
          <UserPlus className="w-5 h-5" />
          Register New Patient
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
          />
        </div>
        {profile?.role === 'admin' && (
          <button 
            onClick={() => setIsGlobalSearch(!isGlobalSearch)}
            className={cn(
              "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border",
              isGlobalSearch 
                ? "bg-blue-600 text-white border-blue-600" 
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            )}
          >
            <Filter className="w-4 h-4" />
            {isGlobalSearch ? 'Global Search: ON' : 'Global Search: OFF'}
          </button>
        )}
      </div>

      {/* Patient List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredPatients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Patient Details</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact & ID</th>
                  {isGlobalSearch && (
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Clinic</th>
                  )}
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Insurance</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Registered</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold">
                          {patient.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{patient.fullName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{patient.gender}, {format(new Date(patient.dateOfBirth), 'PP')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" />
                          {patient.phoneNumber}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">ID: {patient.idNumber}</p>
                      </div>
                    </td>
                    {isGlobalSearch && (
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          {patient.clinicId}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      {patient.insuranceProvider ? (
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600 dark:text-gray-400">{patient.insuranceProvider}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">#{patient.insuranceNumber}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">Self-pay</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {patient.createdAt ? format((patient.createdAt as any).toDate(), 'PP') : 'N/A'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleCheckIn(patient)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-bold hover:bg-green-100 dark:hover:bg-green-900/50 transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Check-in
                        </button>
                        <Link
                          to={`/patients/${patient.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                          Details
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hasMore && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-2 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-600 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load More Patients'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No patients found matching your search.</p>
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Register New Patient</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ID / Passport Number *</label>
                  <input
                    required
                    type="text"
                    value={formData.idNumber}
                    onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                    placeholder="12345678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number *</label>
                  <input
                    required
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                    placeholder="0712 345 678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth *</label>
                  <input
                    required
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender *</label>
                  <select
                    required
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value as any})}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white bg-white dark:bg-gray-700"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address *</label>
                  <textarea
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none h-20 dark:text-white"
                    placeholder="123 Clinic Road, Nairobi"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next of Kin *</label>
                  <input
                    required
                    type="text"
                    value={formData.nextOfKin}
                    onChange={(e) => setFormData({...formData, nextOfKin: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                    placeholder="Jane Doe (Spouse) - 0712 345 679"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Insurance Provider</label>
                  <input
                    type="text"
                    value={formData.insuranceProvider}
                    onChange={(e) => setFormData({...formData, insuranceProvider: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                    placeholder="NHIF"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Insurance Number</label>
                  <input
                    type="text"
                    value={formData.insuranceNumber}
                    onChange={(e) => setFormData({...formData, insuranceNumber: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                    placeholder="POL-123456"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3 sticky bottom-0 bg-white dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;
