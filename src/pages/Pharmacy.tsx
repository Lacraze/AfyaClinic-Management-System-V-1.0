import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { 
  Pill, 
  Search, 
  Plus, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  Package, 
  X, 
  Loader2,
  Filter,
  ChevronRight,
  ArrowDownCircle,
  ArrowUpCircle,
  ClipboardList
} from 'lucide-react';
import { Drug, Prescription } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

const Pharmacy: React.FC = () => {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'prescriptions'>('inventory');

  // Form state for new drug
  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    strength: '',
    unit: '',
    form: '',
    buyingPrice: 0,
    sellingPrice: 0,
    stockQuantity: 0,
    reorderLevel: 10,
    supplier: ''
  });

  useEffect(() => {
    const drugsUnsub = onSnapshot(query(collection(db, 'drugs'), orderBy('name', 'asc')), (snapshot) => {
      setDrugs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Drug)));
      setLoading(false);
    });

    const prescriptionsUnsub = onSnapshot(query(collection(db, 'prescriptions'), orderBy('prescribedAt', 'desc')), (snapshot) => {
      setPrescriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription)));
    });

    return () => {
      drugsUnsub();
      prescriptionsUnsub();
    };
  }, []);

  const filteredDrugs = drugs.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.genericName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'drugs'), {
        ...formData,
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setFormData({
        name: '',
        genericName: '',
        strength: '',
        unit: '',
        form: '',
        buyingPrice: 0,
        sellingPrice: 0,
        stockQuantity: 0,
        reorderLevel: 10,
        supplier: ''
      });
    } catch (error) {
      console.error('Error adding drug:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispense = async (prescription: Prescription) => {
    try {
      // Update prescription status
      await updateDoc(doc(db, 'prescriptions', prescription.id), {
        status: 'dispensed',
        dispensedAt: serverTimestamp()
      });

      // Reduce stock
      const drugRef = doc(db, 'drugs', prescription.drugId);
      const drug = drugs.find(d => d.id === prescription.drugId);
      if (drug) {
        await updateDoc(drugRef, {
          stockQuantity: drug.stockQuantity - prescription.quantity
        });
      }
    } catch (error) {
      console.error('Error dispensing prescription:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacy</h1>
          <p className="text-gray-500 mt-1">Manage drug inventory and process prescriptions.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add New Drug
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('inventory')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-all border-b-2",
            activeTab === 'inventory' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          Inventory
        </button>
        <button
          onClick={() => setActiveTab('prescriptions')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-all border-b-2",
            activeTab === 'prescriptions' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          Prescriptions
        </button>
      </div>

      {activeTab === 'inventory' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">{drugs.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Low Stock</p>
                  <p className="text-2xl font-bold text-gray-900">{drugs.filter(d => d.stockQuantity <= d.reorderLevel).length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-100 text-green-600">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Stock Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    KES {drugs.reduce((acc, d) => acc + (d.stockQuantity * d.buyingPrice), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by drug name or generic name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Drug Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : filteredDrugs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Drug Details</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Price (KES)</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredDrugs.map((drug) => (
                      <tr key={drug.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{drug.name}</p>
                            <p className="text-xs text-gray-500">{drug.genericName} • {drug.strength} {drug.unit} {drug.form}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-sm font-medium",
                              drug.stockQuantity <= drug.reorderLevel ? "text-amber-600" : "text-gray-900"
                            )}>
                              {drug.stockQuantity}
                            </span>
                            {drug.stockQuantity <= drug.reorderLevel && (
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            )}
                          </div>
                          <p className="text-xs text-gray-400">Reorder at: {drug.reorderLevel}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900 font-medium">{drug.sellingPrice.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">Cost: {drug.buyingPrice.toLocaleString()}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600">{drug.supplier || 'N/A'}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-sm font-medium text-blue-600 hover:text-blue-700">Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <Pill className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No drugs found in inventory.</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'prescriptions' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {prescriptions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Prescription</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Patient</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Instructions</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {prescriptions.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-gray-900">{p.drugName}</p>
                        <p className="text-xs text-gray-500">{p.dosage} • {p.frequency} • {p.duration}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">ID: {p.patientId.slice(0, 8)}</p>
                        <p className="text-xs text-gray-400">{format(new Date(p.prescribedAt), 'PP')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 line-clamp-1">{p.instructions || 'No instructions'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                          p.status === 'dispensed' ? "bg-green-100 text-green-700" :
                          p.status === 'pending' ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-700"
                        )}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {p.status === 'pending' && (
                          <button
                            onClick={() => handleDispense(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all"
                          >
                            Dispense
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No prescriptions found.</p>
            </div>
          )}
        </div>
      )}

      {/* Add Drug Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h2 className="text-xl font-bold text-gray-900">Add New Drug to Inventory</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Drug Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Panadol"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Generic Name</label>
                  <input
                    type="text"
                    value={formData.genericName}
                    onChange={(e) => setFormData({...formData, genericName: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Paracetamol"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Strength</label>
                  <input
                    type="text"
                    value={formData.strength}
                    onChange={(e) => setFormData({...formData, strength: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="mg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Form</label>
                  <input
                    type="text"
                    value={formData.form}
                    onChange={(e) => setFormData({...formData, form: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Tablet"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buying Price (KES) *</label>
                  <input
                    required
                    type="number"
                    value={formData.buyingPrice}
                    onChange={(e) => setFormData({...formData, buyingPrice: Number(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (KES) *</label>
                  <input
                    required
                    type="number"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({...formData, sellingPrice: Number(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock *</label>
                  <input
                    required
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({...formData, stockQuantity: Number(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level *</label>
                  <input
                    required
                    type="number"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({...formData, reorderLevel: Number(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="KEMSA"
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
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add Drug'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pharmacy;
