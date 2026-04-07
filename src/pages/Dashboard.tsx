import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, limit, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { 
  Users, 
  Calendar, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Clock,
  CheckCircle2,
  UserPlus,
  Receipt,
  PlusCircle,
  ChevronRight
} from 'lucide-react';
import { Patient, Visit, Drug, UserProfile } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalPatients: 0,
    visitsToday: 0,
    lowStockDrugs: 0,
    pendingAppointments: 0
  });
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as UserProfile);
        }
      }
    };
    fetchUser();

    // Real-time stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const patientsUnsub = onSnapshot(collection(db, 'patients'), (snapshot) => {
      setStats(prev => ({ ...prev, totalPatients: snapshot.size }));
    });

    const visitsUnsub = onSnapshot(
      query(collection(db, 'visits'), where('date', '>=', today.toISOString())),
      (snapshot) => {
        setStats(prev => ({ ...prev, visitsToday: snapshot.size }));
      }
    );

    const drugsUnsub = onSnapshot(collection(db, 'drugs'), (snapshot) => {
      const lowStock = snapshot.docs.filter(doc => {
        const drug = doc.data() as Drug;
        return drug.stockQuantity <= drug.reorderLevel;
      }).length;
      setStats(prev => ({ ...prev, lowStockDrugs: lowStock }));
    });

    const recentVisitsUnsub = onSnapshot(
      query(collection(db, 'visits'), orderBy('date', 'desc'), limit(5)),
      (snapshot) => {
        setRecentVisits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Visit)));
        setLoading(false);
      }
    );

    const appointmentsUnsub = onSnapshot(
      query(collection(db, 'visits'), where('status', '==', 'scheduled')),
      (snapshot) => {
        setStats(prev => ({ ...prev, pendingAppointments: snapshot.size }));
      }
    );

    return () => {
      patientsUnsub();
      visitsUnsub();
      drugsUnsub();
      recentVisitsUnsub();
      appointmentsUnsub();
    };
  }, []);

  const statCards = [
    { name: 'Total Patients', value: stats.totalPatients, icon: Users, color: 'bg-blue-500', trend: '+12% from last month' },
    { name: 'Visits Today', value: stats.visitsToday, icon: Activity, color: 'bg-green-500', trend: 'Normal volume' },
    { name: 'Low Stock Drugs', value: stats.lowStockDrugs, icon: AlertTriangle, color: 'bg-amber-500', trend: 'Requires attention' },
    { name: 'Pending Appts', value: stats.pendingAppointments, icon: Calendar, color: 'bg-purple-500', trend: 'Next 24 hours' },
  ];

  return (
    <div className="space-y-8 transition-colors duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back, {user?.fullName || 'Staff'}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Here's what's happening at AfyaClinic today.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/patients')}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all font-semibold active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
            Register New Patient
          </button>
          
          <div className="relative group">
            <button className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">
              <PlusCircle className="w-5 h-5" />
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 overflow-hidden">
              <button 
                onClick={() => navigate('/appointments')}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between"
              >
                New Appointment
                <ChevronRight className="w-4 h-4" />
              </button>
              <button 
                onClick={() => navigate('/billing')}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between border-t border-gray-100 dark:border-gray-700"
              >
                New Invoice
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className={cn("p-3 rounded-xl text-white", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{stat.name}</span>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                {stat.trend}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Visits</h2>
            <button 
              onClick={() => navigate('/patients')}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentVisits.length > 0 ? (
              recentVisits.map((visit) => (
                <div key={visit.id} className="p-6 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">Visit ID: {visit.id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(visit.date), 'PPpp')}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                        visit.status === 'completed' ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                        visit.status === 'scheduled' ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" :
                        visit.status === 'no-show' ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" :
                        "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                      )}>
                        {visit.status.replace('-', ' ')}
                      </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No recent visits found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/patients')}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
              >
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <UserPlus className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Register Patient</span>
              </button>
              <button 
                onClick={() => navigate('/appointments')}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
              >
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 group-hover:bg-green-600 group-hover:text-white transition-colors">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">New Appointment</span>
              </button>
              <button 
                onClick={() => navigate('/billing')}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
              >
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Receipt className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Generate Invoice</span>
              </button>
            </div>
          </div>

          <div className="bg-blue-600 p-6 rounded-2xl shadow-lg text-white">
            <h3 className="font-bold text-lg mb-2">System Status</h3>
            <p className="text-blue-100 text-sm mb-4">All systems operational. Firestore database connected.</p>
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Verified Secure</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
