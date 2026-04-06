import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, where, getDocs } from 'firebase/firestore';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Activity, 
  Receipt, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Download,
  Filter,
  Loader2
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { cn } from '../lib/utils';

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<{ date: string; amount: number }[]>([]);
  const [visitStats, setVisitStats] = useState({ total: 0, completed: 0, cancelled: 0 });
  const [patientGrowth, setPatientGrowth] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch payments for revenue
      const paymentsSnap = await getDocs(query(collection(db, 'payments'), orderBy('date', 'asc')));
      const payments = paymentsSnap.docs.map(doc => doc.data());
      
      // Group by month
      const grouped = payments.reduce((acc: any, p: any) => {
        const month = format(new Date(p.date), 'MMM yyyy');
        acc[month] = (acc[month] || 0) + p.amount;
        return acc;
      }, {});

      setRevenueData(Object.entries(grouped).map(([date, amount]) => ({ date, amount: amount as number })));

      // Fetch visits
      const visitsSnap = await getDocs(collection(db, 'visits'));
      const visits = visitsSnap.docs.map(doc => doc.data());
      setVisitStats({
        total: visits.length,
        completed: visits.filter((v: any) => v.status === 'completed').length,
        cancelled: visits.filter((v: any) => v.status === 'no-show').length
      });

      // Patient growth (simple count for now)
      const patientsSnap = await getDocs(collection(db, 'patients'));
      setPatientGrowth(patientsSnap.size);

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-500 mt-1">Operational and financial performance overview.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
            <Filter className="w-4 h-4" />
            Filter Date
          </button>
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-sm">
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">KES {revenueData.reduce((acc, d) => acc + d.amount, 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-[75%]" />
          </div>
          <p className="text-xs text-gray-500 mt-2">75% of quarterly target achieved</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-green-100 text-green-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Patient Growth</p>
              <p className="text-2xl font-bold text-gray-900">+{patientGrowth}</p>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 w-[60%]" />
          </div>
          <p className="text-xs text-gray-500 mt-2">60% increase in new registrations</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-purple-100 text-purple-600">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Visit Efficiency</p>
              <p className="text-2xl font-bold text-gray-900">
                {visitStats.total > 0 ? Math.round((visitStats.completed / visitStats.total) * 100) : 0}%
              </p>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 w-[85%]" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Completion rate for all visits</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Chart Placeholder */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-gray-900">Revenue Trends</h2>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-end gap-4">
            {revenueData.length > 0 ? (
              revenueData.slice(-6).map((d, i) => {
                const max = Math.max(...revenueData.map(x => x.amount));
                const height = (d.amount / max) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div 
                      className="w-full bg-blue-100 rounded-t-lg group-hover:bg-blue-500 transition-all relative"
                      style={{ height: `${height}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {d.amount.toLocaleString()}
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">{d.date.split(' ')[0]}</span>
                  </div>
                );
              })
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm italic">
                Insufficient data for trends
              </div>
            )}
          </div>
        </div>

        {/* Visit Distribution */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-gray-900">Visit Distribution</h2>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 font-medium">Completed Visits</span>
                <span className="text-gray-900 font-bold">{visitStats.completed}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-1000" 
                  style={{ width: `${(visitStats.completed / visitStats.total) * 100}%` }} 
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 font-medium">Cancelled / No-show</span>
                <span className="text-gray-900 font-bold">{visitStats.cancelled}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-1000" 
                  style={{ width: `${(visitStats.cancelled / visitStats.total) * 100}%` }} 
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 font-medium">In Progress / Pending</span>
                <span className="text-gray-900 font-bold">{visitStats.total - visitStats.completed - visitStats.cancelled}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-1000" 
                  style={{ width: `${((visitStats.total - visitStats.completed - visitStats.cancelled) / visitStats.total) * 100}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
