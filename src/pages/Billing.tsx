import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
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
  FileText
} from 'lucide-react';
import { Invoice, Payment } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

const Billing: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');

  useEffect(() => {
    const invoicesUnsub = onSnapshot(query(collection(db, 'invoices'), orderBy('createdAt', 'desc')), (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
      setLoading(false);
    });

    const paymentsUnsub = onSnapshot(query(collection(db, 'payments'), orderBy('date', 'desc')), (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
    });

    return () => {
      invoicesUnsub();
      paymentsUnsub();
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
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">KES {stats.totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            +8.2% from last month
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase">Outstanding</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">KES {stats.outstanding.toLocaleString()}</p>
          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3" />
            -2.4% from last month
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase">Paid Invoices</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.paidInvoices}</p>
          <p className="text-xs text-blue-600 mt-1">Completion rate: 85%</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-red-100 text-red-600">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase">Unpaid</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.unpaidInvoices}</p>
          <p className="text-xs text-red-600 mt-1">Requires follow-up</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('invoices')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-all border-b-2",
            activeTab === 'invoices' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          Invoices
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-all border-b-2",
            activeTab === 'payments' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          Recent Payments
        </button>
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
        ) : activeTab === 'invoices' ? (
          filteredInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Patient</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-gray-900">#{invoice.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">ID: {invoice.patientId.slice(0, 8)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900">KES {invoice.total.toLocaleString()}</p>
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
                      <td className="px-6 py-4">
                        <p className="text-xs text-gray-500">
                          {invoice.createdAt ? format((invoice.createdAt as any).toDate(), 'PP') : 'N/A'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-sm font-medium text-blue-600 hover:text-blue-700">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <Receipt className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No invoices found.</p>
            </div>
          )
        ) : (
          payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Payment ID</th>
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
                        <div className="flex items-center gap-2">
                          {payment.method === 'mpesa' ? <div className="w-2 h-2 rounded-full bg-green-500" /> :
                           payment.method === 'card' ? <div className="w-2 h-2 rounded-full bg-blue-500" /> :
                           <div className="w-2 h-2 rounded-full bg-gray-500" />}
                          <span className="text-sm text-gray-600 capitalize">{payment.method}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900 text-green-600">KES {payment.amount.toLocaleString()}</p>
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
        )}
      </div>
    </div>
  );
};

export default Billing;
