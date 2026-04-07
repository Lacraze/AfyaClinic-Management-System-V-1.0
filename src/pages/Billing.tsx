import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, getDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  Receipt, 
  Search, 
  Plus, 
  TrendingUp, 
  CreditCard, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  X, 
  Loader2,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  ChevronRight
} from 'lucide-react';
import { Invoice, Payment, Visit } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

const Billing: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingVisits, setPendingVisits] = useState<(Visit & { patientName: string })[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'revenue' | 'outstanding' | 'paid' | 'unpaid' | 'pending'>('outstanding');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: 'cash' as Payment['method'],
    reference: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    const invoicesUnsub = onSnapshot(query(collection(db, 'invoices'), orderBy('createdAt', 'desc')), (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
      setLoading(false);
    });

    const paymentsUnsub = onSnapshot(query(collection(db, 'payments'), orderBy('date', 'desc')), (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
    });

    const pendingVisitsUnsub = onSnapshot(query(collection(db, 'visits'), where('status', '==', 'billing')), async (snapshot) => {
      const visits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Visit));
      const visitsWithNames = await Promise.all(visits.map(async (v) => {
        const patientDoc = await getDoc(doc(db, 'patients', v.patientId));
        return { ...v, patientName: patientDoc.exists() ? patientDoc.data().fullName : 'Unknown' };
      }));
      setPendingVisits(visitsWithNames);
    });

    return () => {
      invoicesUnsub();
      paymentsUnsub();
      pendingVisitsUnsub();
    };
  }, []);

  const filteredInvoices = invoices.filter(i => 
    i.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalRevenue: payments.reduce((acc, p) => acc + p.amount, 0),
    outstanding: invoices.filter(i => i.status !== 'paid').reduce((acc, i) => acc + i.total, 0),
    paidInvoices: invoices.filter(i => i.status === 'paid').length,
    unpaidInvoices: invoices.filter(i => i.status === 'unpaid').length
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      // Add payment record
      await addDoc(collection(db, 'payments'), {
        invoiceId: selectedInvoice.id,
        amount: paymentForm.amount,
        method: paymentForm.method,
        reference: paymentForm.reference,
        date: new Date().toISOString()
      });

      // Update invoice status
      const totalPaid = payments
        .filter(p => p.invoiceId === selectedInvoice.id)
        .reduce((sum, p) => sum + p.amount, 0) + paymentForm.amount;

      let newStatus: Invoice['status'] = 'partially-paid';
      if (totalPaid >= selectedInvoice.total) {
        newStatus = 'paid';
      }

      await updateDoc(doc(db, 'invoices', selectedInvoice.id), {
        status: newStatus
      });

      setIsPaymentModalOpen(false);
      setSelectedInvoice(null);
      setPaymentForm({ amount: 0, method: 'cash', reference: '' });
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };

  const getInvoicePayments = (invoiceId: string) => {
    return payments.filter(p => p.invoiceId === invoiceId);
  };

  const getPaidAmount = (invoiceId: string) => {
    return getInvoicePayments(invoiceId).reduce((sum, p) => sum + p.amount, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Payments</h1>
          <p className="text-gray-500 mt-1">Manage invoices, track payments, and view financial summaries.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <button 
          onClick={() => setActiveTab('revenue')}
          className={cn(
            "text-left p-6 rounded-2xl shadow-sm border transition-all",
            activeTab === 'revenue' ? "bg-blue-50 border-blue-200 ring-2 ring-blue-100" : "bg-white border-gray-100 hover:border-blue-200"
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">KES {stats.totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            Collected to date
          </p>
        </button>
        <button 
          onClick={() => setActiveTab('outstanding')}
          className={cn(
            "text-left p-6 rounded-2xl shadow-sm border transition-all",
            activeTab === 'outstanding' ? "bg-amber-50 border-amber-200 ring-2 ring-amber-100" : "bg-white border-gray-100 hover:border-amber-200"
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase">Outstanding</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">KES {stats.outstanding.toLocaleString()}</p>
          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3" />
            Unpaid & Partial
          </p>
        </button>
        <button 
          onClick={() => setActiveTab('paid')}
          className={cn(
            "text-left p-6 rounded-2xl shadow-sm border transition-all",
            activeTab === 'paid' ? "bg-green-50 border-green-200 ring-2 ring-green-100" : "bg-white border-gray-100 hover:border-green-200"
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase">Paid Invoices</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.paidInvoices}</p>
          <p className="text-xs text-blue-600 mt-1">Fully settled</p>
        </button>
        <button 
          onClick={() => setActiveTab('unpaid')}
          className={cn(
            "text-left p-6 rounded-2xl shadow-sm border transition-all",
            activeTab === 'unpaid' ? "bg-red-50 border-red-200 ring-2 ring-red-100" : "bg-white border-gray-100 hover:border-red-200"
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-red-100 text-red-600">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase">Unpaid</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.unpaidInvoices}</p>
          <p className="text-xs text-red-600 mt-1">No payments yet</p>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar">
        {[
          { id: 'outstanding', label: 'Outstanding' },
          { id: 'unpaid', label: 'Unpaid' },
          { id: 'paid', label: 'Paid' },
          { id: 'revenue', label: 'Revenue/Payments' },
          { id: 'pending', label: 'Pending Billing' },
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
            {tab.id === 'pending' && pendingVisits.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px]">
                {pendingVisits.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice ID or patient ID..."
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

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : activeTab === 'revenue' ? (
          payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Payment ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-gray-900">#{payment.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">Inv: #{payment.invoiceId.slice(0, 8)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            payment.method === 'mpesa' ? "bg-green-500" :
                            payment.method === 'card' ? "bg-blue-500" :
                            "bg-gray-500"
                          )} />
                          <span className="text-sm text-gray-600 capitalize">{payment.method}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-green-600">KES {payment.amount.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-gray-500 font-mono">{payment.reference || '-'}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-xs text-gray-500">{format(new Date(payment.date), 'PP p')}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No payments recorded yet.</p>
            </div>
          )
        ) : activeTab === 'pending' ? (
          pendingVisits.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Patient</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Visit Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingVisits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-gray-900">{visit.patientName}</p>
                        <p className="text-xs text-gray-500">ID: {visit.patientId.slice(0, 8)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">{format(new Date(visit.date), 'PP p')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 uppercase">
                          Ready for Billing
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => navigate(`/visits/${visit.id}/workflow`)}
                          className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 justify-end ml-auto"
                        >
                          Generate Invoice <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <Receipt className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No visits pending billing.</p>
            </div>
          )
        ) : (
          invoices.filter(inv => {
            if (activeTab === 'paid') return inv.status === 'paid';
            if (activeTab === 'unpaid') return inv.status === 'unpaid';
            if (activeTab === 'outstanding') return inv.status !== 'paid';
            return true;
          }).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Paid</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.filter(inv => {
                    if (activeTab === 'paid') return inv.status === 'paid';
                    if (activeTab === 'unpaid') return inv.status === 'unpaid';
                    if (activeTab === 'outstanding') return inv.status !== 'paid';
                    return true;
                  }).map((invoice) => {
                    const paid = getPaidAmount(invoice.id);
                    const balance = invoice.total - paid;
                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-gray-900">#{invoice.id.slice(0, 8)}</p>
                          <p className="text-xs text-gray-500">{invoice.createdAt ? format((invoice.createdAt as any).toDate(), 'PP') : 'N/A'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-900">KES {invoice.total.toLocaleString()}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-green-600 font-medium">KES {paid.toLocaleString()}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className={cn(
                            "text-sm font-bold",
                            balance > 0 ? "text-red-600" : "text-gray-400"
                          )}>
                            KES {balance.toLocaleString()}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                            invoice.status === 'paid' ? "bg-green-100 text-green-700" :
                            invoice.status === 'partially-paid' ? "bg-blue-100 text-blue-700" :
                            "bg-red-100 text-red-700"
                          )}>
                            {invoice.status.replace('-', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {invoice.status !== 'paid' && (
                            <button 
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setPaymentForm({ ...paymentForm, amount: balance });
                                setIsPaymentModalOpen(true);
                              }}
                              className="text-sm font-bold text-blue-600 hover:text-blue-700"
                            >
                              Record Payment
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <Receipt className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No invoices found for this category.</p>
            </div>
          )
        )}
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsPaymentModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleRecordPayment} className="p-6 space-y-6">
              <div className="bg-blue-50 p-4 rounded-xl space-y-1">
                <p className="text-xs font-bold text-blue-600 uppercase">Invoice Total</p>
                <p className="text-lg font-bold text-blue-900">KES {selectedInvoice.total.toLocaleString()}</p>
                <p className="text-xs text-blue-700">Balance: KES {(selectedInvoice.total - getPaidAmount(selectedInvoice.id)).toLocaleString()}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Payment Amount (KES)</label>
                  <input
                    required
                    type="number"
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Payment Method</label>
                  <select
                    value={paymentForm.method}
                    onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="cash">Cash</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="card">Card</option>
                    <option value="insurance">Insurance</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Reference / Transaction ID</label>
                  <input
                    type="text"
                    value={paymentForm.reference}
                    onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    placeholder="e.g. MPESA-CODE-123"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-sm"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
