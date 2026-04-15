import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDocs, where } from 'firebase/firestore';
import { 
  Building2, 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Power, 
  MapPin, 
  Phone, 
  Mail,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Clinic } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

const Clinics: React.FC = () => {
  const { profile } = useAuth();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicStats, setClinicStats] = useState<{ [key: string]: { patients: number, staff: number } }>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phoneNumber: '',
    email: '',
    website: '',
    status: 'active' as 'active' | 'inactive'
  });

  useEffect(() => {
    const q = query(collection(db, 'clinics'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const newClinics = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Clinic));
      setClinics(newClinics);
      
      // Fetch counts for each clinic
      const stats: { [key: string]: { patients: number, staff: number } } = {};
      for (const clinic of newClinics) {
        const pSnap = await getDocs(query(collection(db, 'patients'), where('clinicId', '==', clinic.id)));
        const sSnap = await getDocs(query(collection(db, 'users'), where('clinicId', '==', clinic.id)));
        stats[clinic.id] = {
          patients: pSnap.size,
          staff: sSnap.size
        };
      }
      setClinicStats(stats);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clinics');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    setError(null);

    try {
      if (editingClinic) {
        await updateDoc(doc(db, 'clinics', editingClinic.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, 'audit_logs'), {
          userId: profile.uid,
          userEmail: profile.email,
          action: 'UPDATE_CLINIC',
          module: 'Clinics',
          details: `Updated clinic: ${formData.name} (${editingClinic.id})`,
          timestamp: serverTimestamp(),
          clinicId: profile.clinicId
        });
      } else {
        const clinicRef = await addDoc(collection(db, 'clinics'), {
          ...formData,
          createdAt: serverTimestamp()
        });

        await addDoc(collection(db, 'audit_logs'), {
          userId: profile.uid,
          userEmail: profile.email,
          action: 'CREATE_CLINIC',
          module: 'Clinics',
          details: `Created new clinic: ${formData.name} (ID: ${clinicRef.id})`,
          timestamp: serverTimestamp(),
          clinicId: profile.clinicId
        });
      }

      setIsModalOpen(false);
      setEditingClinic(null);
      setFormData({
        name: '',
        address: '',
        phoneNumber: '',
        email: '',
        website: '',
        status: 'active'
      });
    } catch (err: any) {
      console.error('Error saving clinic:', err);
      setError(err.message || 'Failed to save clinic.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (clinic: Clinic) => {
    setEditingClinic(clinic);
    setFormData({
      name: clinic.name,
      address: clinic.address,
      phoneNumber: clinic.phoneNumber,
      email: clinic.email,
      website: clinic.website || '',
      status: clinic.status
    });
    setIsModalOpen(true);
  };

  const toggleStatus = async (clinic: Clinic) => {
    if (!profile) return;
    try {
      const newStatus = clinic.status === 'active' ? 'inactive' : 'active';
      await updateDoc(doc(db, 'clinics', clinic.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, 'audit_logs'), {
        userId: profile.uid,
        userEmail: profile.email,
        action: 'TOGGLE_CLINIC_STATUS',
        module: 'Clinics',
        details: `Toggled clinic status for ${clinic.name} to ${newStatus}`,
        timestamp: serverTimestamp(),
        clinicId: profile.clinicId
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `clinics/${clinic.id}`);
    }
  };

  const filteredClinics = clinics.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clinic Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage multi-tenancy clinics and branches.</p>
        </div>
        <button
          onClick={() => {
            setEditingClinic(null);
            setFormData({ name: '', address: '', phoneNumber: '', email: '', website: '', status: 'active' });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add New Clinic
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search clinics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
          />
        </div>
      </div>

      {/* Clinics Grid */}
      {loading ? (
        <div className="p-12 flex justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClinics.map((clinic) => (
            <div key={clinic.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all group">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      clinic.status === 'active' 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    )}>
                      {clinic.status}
                    </span>
                    <button 
                      onClick={() => handleEdit(clinic)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{clinic.name}</h3>
                
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{clinic.address}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{clinic.phoneNumber}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{clinic.email}</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Patients</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{clinicStats[clinic.id]?.patients || 0}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Staff</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{clinicStats[clinic.id]?.staff || 0}</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">
                    ID: {clinic.id}
                  </p>
                  <button
                    onClick={() => toggleStatus(clinic)}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-bold transition-colors",
                      clinic.status === 'active' ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"
                    )}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {clinic.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clinic Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingClinic ? 'Edit Clinic' : 'Add New Clinic'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Clinic Name *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  placeholder="Main Branch"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address *</label>
                <textarea
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none h-20 dark:text-white"
                  placeholder="123 Health Ave, Nairobi"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone *</label>
                  <input
                    required
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  placeholder="https://afyaclinic.com"
                />
              </div>

              <div className="pt-4 flex gap-3">
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
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingClinic ? 'Update Clinic' : 'Create Clinic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clinics;
