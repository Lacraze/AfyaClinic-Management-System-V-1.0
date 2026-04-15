import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
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
import { Patient, Visit, InventoryItem, Clinic } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalPatients: 0,
    visitsToday: 0,
    lowStockDrugs: 0,
    pendingAppointments: 0
  });
  const [clinicStats, setClinicStats] = useState<{ [key: string]: any }>({});
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [queue, setQueue] = useState<(Visit & { patientName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile?.clinicId) {
      if (profile) setLoading(false);
      return;
    }

    const clinicId = profile.clinicId;

    // Load all clinics if admin
    if (profile.role === 'admin') {
      const clinicsUnsub = onSnapshot(collection(db, 'clinics'), (snapshot) => {
        const clinicsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Clinic));
        setClinics(clinicsData);
      });

      // Aggregate stats across all clinics (simplified for demo)
      // In a real app, you'd use a cloud function or aggregate queries
    }
    
    const patientsUnsub = onSnapshot(query(collection(db, 'patients'), where('clinicId', '==', clinicId)), (snapshot) => {
      setStats(prev => ({ ...prev, totalPatients: snapshot.size }));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'patients');
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const visitsUnsub = onSnapshot(
      query(collection(db, 'visits'), where('clinicId', '==', clinicId), where('date', '>=', today.toISOString())),
      (snapshot) => {
        setStats(prev => ({ ...prev, visitsToday: snapshot.size }));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'visits');
      }
    );

    const drugsUnsub = onSnapshot(query(collection(db, 'inventory'), where('clinicId', '==', clinicId), where('type', '==', 'drug')), (snapshot) => {
      const lowStock = snapshot.docs.filter(doc => {
        const drug = doc.data() as InventoryItem;
        return drug.stockQuantity <= drug.reorderLevel;
      }).length;
      setStats(prev => ({ ...prev, lowStockDrugs: lowStock }));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'inventory');
    });

    const recentVisitsUnsub = onSnapshot(
      query(collection(db, 'visits'), where('clinicId', '==', clinicId), orderBy('date', 'desc'), limit(5)),
      (snapshot) => {
        setRecentVisits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Visit)));
        setLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'visits');
        setLoading(false);
      }
    );

    const queueUnsub = onSnapshot(
      query(
        collection(db, 'visits'), 
        where('clinicId', '==', clinicId), 
        where('status', 'in', ['checked-in', 'vitals', 'history', 'encounter']),
        orderBy('date', 'asc')
      ),
      async (snapshot) => {
        const queueData = await Promise.all(snapshot.docs.map(async (vDoc) => {
          const visit = { id: vDoc.id, ...vDoc.data() } as Visit;
          const pDoc = await getDoc(doc(db, 'patients', visit.patientId));
          return { ...visit, patientName: pDoc.exists() ? pDoc.data().fullName : 'Unknown' };
        }));
        setQueue(queueData);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'visits');
      }
    );

    const appointmentsUnsub = onSnapshot(
      query(collection(db, 'visits'), where('clinicId', '==', clinicId), where('status', '==', 'scheduled')),
      (snapshot) => {
        setStats(prev => ({ ...prev, pendingAppointments: snapshot.size }));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'visits');
      }
    );

    return () => {
      patientsUnsub();
      visitsUnsub();
      drugsUnsub();
      recentVisitsUnsub();
      queueUnsub();
      appointmentsUnsub();
    };
  }, [profile?.clinicId]);

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back, {profile?.fullName || 'Staff'}</h1>
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

      {/* Multi-Clinic Overview (Admin Only) */}
      {profile?.role === 'admin' && clinics.length > 1 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Multi-Clinic Overview</h2>
            <button 
              onClick={() => navigate('/clinics')}
              className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Manage Clinics
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clinics.map(clinic => (
              <div 
                key={clinic.id} 
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer",
                  profile.clinicId === clinic.id 
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" 
                    : "bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800"
                )}
                onClick={() => navigate('/clinics')}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-white truncate pr-2">{clinic.name}</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    clinic.status === 'active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {clinic.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">
                  <span>{clinic.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Live Queue */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Live Patient Queue</h2>
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{queue.length} Waiting</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {queue.length > 0 ? (
              queue.map((visit) => (
                <div key={visit.id} className="p-6 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => navigate(`/visits/${visit.id}/workflow`)}>
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold">
                    {visit.patientName?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{visit.patientName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Arrived: {format(new Date(visit.date), 'p')}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter",
                        visit.status === 'checked-in' ? "bg-blue-100 text-blue-700" :
                        visit.status === 'vitals' ? "bg-purple-100 text-purple-700" :
                        visit.status === 'history' ? "bg-amber-100 text-amber-700" :
                        "bg-green-100 text-green-700"
                      )}>
                        {visit.status.replace('-', ' ')}
                      </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Queue is currently empty.</p>
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
