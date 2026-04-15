import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, where } from 'firebase/firestore';
import { 
  Zap, 
  Plus, 
  X, 
  Loader2,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  Droplets,
  Wifi,
  Home,
  MoreHorizontal
} from 'lucide-react';
import { Utility } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

const Utilities: React.FC = () => {
  const { profile } = useAuth();
  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    type: 'electricity' as Utility['type'],
    amount: 0,
    dueDate: '',
    status: 'unpaid' as 'unpaid' | 'paid',
    notes: ''
  });

  useEffect(() => {
    if (!profile?.clinicId) {
      if (profile) setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      query(
        collection(db, 'utilities'), 
        where('clinicId', '==', profile.clinicId),
        orderBy('dueDate', 'desc')
      ), 
      (snapshot) => {
        setUtilities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Utility)));
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'utilities');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [profile?.clinicId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'utilities'), {
        ...formData,
        clinicId: profile.clinicId,
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setFormData({
        type: 'electricity',
        amount: 0,
        dueDate: '',
        status: 'unpaid',
        notes: ''
      });
    } catch (error) {
      console.error('Error adding utility:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (utility: Utility) => {
    try {
      await updateDoc(doc(db, 'utilities', utility.id), {
        status: utility.status === 'paid' ? 'unpaid' : 'paid'
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'electricity': return Zap;
      case 'water': return Droplets;
      case 'internet': return Wifi;
      case 'rent': return Home;
      default: return MoreHorizontal;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utility Tracking</h1>
          <p className="text-gray-500 mt-1">Manage monthly bills and operational expenses.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Log New Bill
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : utilities.length > 0 ? (
          utilities.map((bill) => {
            const Icon = getIcon(bill.type);
            return (
              <div key={bill.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "p-3 rounded-xl",
                    bill.type === 'electricity' ? "bg-amber-100 text-amber-600" :
                    bill.type === 'water' ? "bg-blue-100 text-blue-600" :
                    bill.type === 'internet' ? "bg-purple-100 text-purple-600" :
                    "bg-gray-100 text-gray-600"
                  )}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <button 
                    onClick={() => toggleStatus(bill)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                      bill.status === 'paid' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700 hover:bg-red-200"
                    )}
                  >
                    {bill.status}
                  </button>
                </div>
                <h3 className="text-lg font-bold text-gray-900 capitalize">{bill.type} Bill</h3>
                <p className="text-2xl font-bold text-gray-900 mt-2">KES {bill.amount.toLocaleString()}</p>
                
                <div className="mt-6 space-y-3 pt-4 border-t border-gray-50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Due Date
                    </span>
                    <span className="font-medium text-gray-700">{format(new Date(bill.dueDate), 'PP')}</span>
                  </div>
                  {bill.notes && (
                    <p className="text-xs text-gray-500 italic line-clamp-2">"{bill.notes}"</p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full p-12 text-center text-gray-500">
            <Zap className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No utility bills logged yet.</p>
          </div>
        )}
      </div>

      {/* Add Bill Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h2 className="text-xl font-bold text-gray-900">Log New Utility Bill</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Utility Type *</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="electricity">Electricity</option>
                    <option value="water">Water</option>
                    <option value="internet">Internet</option>
                    <option value="rent">Rent</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KES) *</label>
                  <input
                    required
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                  <input
                    required
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none h-24"
                    placeholder="Reference number or additional details..."
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
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Utilities;
