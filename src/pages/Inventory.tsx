import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, where, limit, startAfter, getDocs, QueryDocumentSnapshot } from 'firebase/firestore';
import { 
  Package, 
  Search, 
  Plus, 
  AlertTriangle, 
  TrendingUp, 
  X, 
  Loader2,
  Filter,
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit2,
  Calendar,
  Truck,
  Layers,
  Box
} from 'lucide-react';
import { InventoryItem } from '../types';
import { format, isPast, isWithinInterval, addMonths } from 'date-fns';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

const Inventory: React.FC = () => {
  const { profile } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'drug' | 'equipment' | 'other'>('all');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);

  const PAGE_SIZE = 20;

  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    strength: '',
    form: '',
    batchNumber: '',
    expiryDate: '',
    stockQuantity: 0,
    reorderLevel: 10,
    supplier: '',
    type: 'drug' as InventoryItem['type'],
    buyingPrice: 0,
    sellingPrice: 0,
    unit: ''
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
        collection(db, 'inventory'),
        orderBy('name', 'asc'),
        limit(PAGE_SIZE)
      );
    } else {
      q = query(
        collection(db, 'inventory'), 
        where('clinicId', '==', profile?.clinicId), 
        orderBy('name', 'asc'),
        limit(PAGE_SIZE)
      );
    }

    const inventoryUnsub = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as InventoryItem)));
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'inventory');
      setLoading(false);
    });

    return () => inventoryUnsub();
  }, [profile?.clinicId, isGlobalSearch]);

  const loadMore = async () => {
    if ((!profile?.clinicId && !isGlobalSearch) || !lastDoc || loadingMore) return;

    setLoadingMore(true);
    try {
      let q;
      if (isGlobalSearch && profile?.role === 'admin') {
        q = query(
          collection(db, 'inventory'),
          orderBy('name', 'asc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      } else {
        q = query(
          collection(db, 'inventory'),
          where('clinicId', '==', profile?.clinicId),
          orderBy('name', 'asc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      }

      const snapshot = await getDocs(q);
      const newItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as InventoryItem));
      
      setItems(prev => [...prev, ...newItems]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'inventory');
    } finally {
      setLoadingMore(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.genericName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.batchNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || item.type === activeTab;
    return matchesSearch && matchesTab;
  });

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
      if (editingItem) {
        try {
          await updateDoc(doc(db, 'inventory', editingItem.id), {
            ...formData,
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `inventory/${editingItem.id}`);
        }

        // Audit Log
        try {
          await addDoc(collection(db, 'audit_logs'), {
            userId: profile.uid,
            userEmail: profile.email,
            action: 'UPDATE_INVENTORY',
            module: 'Inventory',
            details: `Updated item: ${formData.name} (${editingItem.id})`,
            timestamp: serverTimestamp(),
            clinicId
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'audit_logs');
        }
      } else {
        let itemRef;
        try {
          itemRef = await addDoc(collection(db, 'inventory'), {
            ...formData,
            clinicId,
            createdAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'inventory');
        }

        // Audit Log
        try {
          await addDoc(collection(db, 'audit_logs'), {
            userId: profile.uid,
            userEmail: profile.email,
            action: 'ADD_INVENTORY',
            module: 'Inventory',
            details: `Added new item: ${formData.name} (${itemRef?.id})`,
            timestamp: serverTimestamp(),
            clinicId
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'audit_logs');
        }
      }
      handleCloseModal();
    } catch (err: any) {
      console.error('Error saving inventory item:', err);
      setError(err.message || 'Failed to save inventory item. Please check your permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      genericName: item.genericName || '',
      strength: item.strength || '',
      form: item.form || '',
      batchNumber: item.batchNumber || '',
      expiryDate: item.expiryDate || '',
      stockQuantity: item.stockQuantity,
      reorderLevel: item.reorderLevel,
      supplier: item.supplier || '',
      type: item.type,
      buyingPrice: item.buyingPrice,
      sellingPrice: item.sellingPrice,
      unit: item.unit || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'inventory', itemToDelete));
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({
      name: '',
      genericName: '',
      strength: '',
      form: '',
      batchNumber: '',
      expiryDate: '',
      stockQuantity: 0,
      reorderLevel: 10,
      supplier: '',
      type: 'drug',
      buyingPrice: 0,
      sellingPrice: 0,
      unit: ''
    });
  };

  const getExpiryStatus = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isPast(date)) return 'expired';
    if (isWithinInterval(date, { start: new Date(), end: addMonths(new Date(), 3) })) return 'expiring-soon';
    return 'valid';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500 mt-1">Track drugs, equipment, and medical supplies.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add New Item
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{items.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900">{items.filter(i => i.stockQuantity <= i.reorderLevel).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-100 text-red-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Expired/Soon</p>
              <p className="text-2xl font-bold text-gray-900">
                {items.filter(i => getExpiryStatus(i.expiryDate) === 'expired' || getExpiryStatus(i.expiryDate) === 'expiring-soon').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100 text-green-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Stock Value</p>
              <p className="text-2xl font-bold text-gray-900">
                KES {items.reduce((acc, i) => acc + (i.stockQuantity * i.buyingPrice), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="space-y-4">
        <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Inventory' },
            { id: 'drug', label: 'Drugs' },
            { id: 'equipment', label: 'Equipment' },
            { id: 'other', label: 'Other Supplies' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap",
                activeTab === tab.id 
                  ? "border-blue-600 text-blue-600 bg-blue-50/50" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, generic name, or batch number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          {profile?.role === 'admin' && (
            <button 
              onClick={() => setIsGlobalSearch(!isGlobalSearch)}
              className={cn(
                "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                isGlobalSearch 
                  ? "bg-blue-600 text-white border-blue-600" 
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              )}
            >
              <Filter className="w-4 h-4" />
              {isGlobalSearch ? 'Global Search: ON' : 'Global Search: OFF'}
            </button>
          )}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Item Details</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Batch & Expiry</th>
                  {isGlobalSearch && (
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Clinic</th>
                  )}
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Stock Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Pricing (KES)</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item) => {
                  const expiryStatus = getExpiryStatus(item.expiryDate);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{item.name}</p>
                          {item.genericName && (
                            <p className="text-xs text-gray-500 font-medium">{item.genericName}</p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-tight">
                            {item.strength} {item.unit} {item.form} • {item.type}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-xs font-mono text-gray-600">Batch: {item.batchNumber || 'N/A'}</p>
                          {item.expiryDate ? (
                            <div className="flex items-center gap-1.5">
                              <Calendar className={cn(
                                "w-3 h-3",
                                expiryStatus === 'expired' ? "text-red-500" :
                                expiryStatus === 'expiring-soon' ? "text-amber-500" :
                                "text-gray-400"
                              )} />
                              <span className={cn(
                                "text-xs font-medium",
                                expiryStatus === 'expired' ? "text-red-600" :
                                expiryStatus === 'expiring-soon' ? "text-amber-600" :
                                "text-gray-600"
                              )}>
                                {format(new Date(item.expiryDate), 'MMM yyyy')}
                              </span>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400">No expiry</p>
                          )}
                        </div>
                      </td>
                      {isGlobalSearch && (
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                            {item.clinicId}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-bold",
                            item.stockQuantity <= item.reorderLevel ? "text-amber-600" : "text-gray-900"
                          )}>
                            {item.stockQuantity} {item.unit || 'units'}
                          </span>
                          {item.stockQuantity <= item.reorderLevel && (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400">Reorder at: {item.reorderLevel}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Truck className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-600 truncate max-w-[120px]">{item.supplier || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900">{item.sellingPrice.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400">Buy: {item.buyingPrice.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEdit(item)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setItemToDelete(item.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {hasMore && (
              <div className="p-4 border-t border-gray-100 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-2 bg-gray-50 text-gray-600 rounded-xl font-semibold hover:bg-gray-100 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load More Items'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No items found in inventory.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setItemToDelete(null)} />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-6">
            <div className="flex items-center gap-4 text-red-600">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Delete Item?</h3>
            </div>
            <p className="text-gray-600">
              Are you sure you want to delete this item? This action cannot be undone and will remove the item from all inventory records.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setItemToDelete(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
              </h2>
              <button onClick={handleCloseModal} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 text-sm">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Item Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. Panadol, Surgical Gloves"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Item Type *</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="drug">Drug</option>
                    <option value="equipment">Equipment</option>
                    <option value="other">Other Supplies</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Generic Name</label>
                  <input
                    type="text"
                    value={formData.genericName}
                    onChange={(e) => setFormData({...formData, genericName: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. Paracetamol"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Strength & Form</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.strength}
                      onChange={(e) => setFormData({...formData, strength: e.target.value})}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="500mg"
                    />
                    <input
                      type="text"
                      value={formData.form}
                      onChange={(e) => setFormData({...formData, form: e.target.value})}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Tablet"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({...formData, batchNumber: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. BN-2024-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Quantity on Hand *</label>
                  <input
                    required
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({...formData, stockQuantity: Number(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Reorder Level *</label>
                  <input
                    required
                    type="number"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({...formData, reorderLevel: Number(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Buying Price (KES) *</label>
                  <input
                    required
                    type="number"
                    value={formData.buyingPrice}
                    onChange={(e) => setFormData({...formData, buyingPrice: Number(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Selling Price (KES) *</label>
                  <input
                    required
                    type="number"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({...formData, sellingPrice: Number(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Supplier</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. KEMSA, MedSource"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
