import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { logOut, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  ClipboardList, 
  Pill, 
  Receipt, 
  UserCog, 
  Shield,
  Zap, 
  BarChart3, 
  LogOut,
  Menu,
  X,
  Activity,
  Sun,
  Moon,
  Package,
  UserPlus,
  Building2,
  ChevronDown
} from 'lucide-react';
import { UserProfile, UserRole, Clinic } from '../types';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { collection, query, limit, onSnapshot, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { profile, loading, switchClinic } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeStaff, setActiveStaff] = useState<UserProfile[]>([]);
  const [allClinics, setAllClinics] = useState<Clinic[]>([]);
  const [isClinicSwitcherOpen, setIsClinicSwitcherOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !profile) {
      navigate('/login');
    }
  }, [loading, profile, navigate]);

  useEffect(() => {
    const bootstrapAdmin = async () => {
      if (profile && profile.email === 'klacraze@gmail.com') {
        const updates: any = {};
        if (profile.role !== 'admin') updates.role = 'admin';
        if (!profile.clinicId) updates.clinicId = 'main-branch';
        
        if (Object.keys(updates).length > 0) {
          try {
            await updateDoc(doc(db, 'users', profile.uid), updates);
          } catch (err) {
            console.error('Admin bootstrap failed:', err);
          }
        }
      }
    };
    bootstrapAdmin();

    if (profile?.role === 'admin') {
      // Load all clinics for the switcher
      const qClinics = query(collection(db, 'clinics'));
      const unsubClinics = onSnapshot(qClinics, (snapshot) => {
        setAllClinics(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Clinic)));
      });

      if (profile.clinicId) {
        const q = query(
          collection(db, 'users'), 
          where('clinicId', '==', profile.clinicId),
          limit(5)
        );
        const unsub = onSnapshot(q, (snapshot) => {
          setActiveStaff(snapshot.docs
            .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))
            .filter(u => u.uid !== profile.uid)
          );
        });
        return () => {
          unsubClinics();
          unsub();
        };
      }
      return () => unsubClinics();
    }
  }, [profile]);

  const handleLogout = async () => {
    await logOut();
    navigate('/login');
  };

  const currentClinic = allClinics.find(c => c.id === profile?.clinicId);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'accountant', 'lab_tech', 'hr'] },
    { name: 'Patients', path: '/patients', icon: Users, roles: ['admin', 'doctor', 'nurse', 'receptionist'] },
    { name: 'Appointments', path: '/appointments', icon: Calendar, roles: ['admin', 'doctor', 'nurse', 'receptionist'] },
    { name: 'Inventory', path: '/inventory', icon: Package, roles: ['admin', 'pharmacist', 'nurse', 'doctor', 'receptionist', 'accountant'] },
    { name: 'Clinical Notes', path: '/clinical', icon: ClipboardList, roles: ['admin', 'doctor', 'nurse'] },
    { name: 'Pharmacy', path: '/pharmacy', icon: Pill, roles: ['admin', 'pharmacist', 'doctor'] },
    { name: 'Billing', path: '/billing', icon: Receipt, roles: ['admin', 'accountant', 'receptionist'] },
    { name: 'Clinics', path: '/clinics', icon: Building2, roles: ['admin'] },
    { name: 'Manage Staff', path: '/manage-staff', icon: Shield, roles: ['admin'] },
    { name: 'Staff List', path: '/staff', icon: UserCog, roles: ['admin', 'hr'] },
    { name: 'Utilities', path: '/utilities', icon: Zap, roles: ['admin', 'accountant'] },
    { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['admin', 'accountant'] },
    { name: 'Audit Logs', path: '/audit-logs', icon: Shield, roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => profile && item.roles.includes(profile.role));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <Activity className="w-12 h-12 text-blue-600 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden transition-colors duration-200">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">AfyaClinic</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 text-gray-500 dark:text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Clinic Switcher (Admin Only) */}
          {profile?.role === 'admin' && allClinics.length > 0 && (
            <div className="px-4 mb-4">
              <div className="relative">
                <button
                  onClick={() => setIsClinicSwitcherOpen(!isClinicSwitcherOpen)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">
                      {currentClinic?.name || 'Select Clinic'}
                    </span>
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 text-gray-400 transition-transform",
                    isClinicSwitcherOpen && "rotate-180"
                  )} />
                </button>

                {isClinicSwitcherOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-40 max-h-48 overflow-y-auto py-1">
                    {allClinics.map((clinic) => (
                      <button
                        key={clinic.id}
                        onClick={() => {
                          switchClinic(clinic.id);
                          setIsClinicSwitcherOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs transition-colors",
                          profile.clinicId === clinic.id
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                        )}
                      >
                        {clinic.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === item.path
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
            <div className="px-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Active Sessions</div>
            
            <div className="space-y-2">
              {/* Current User (Admin) */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm ring-2 ring-blue-100 dark:ring-blue-900/50">
                  {profile?.fullName?.charAt(0) || profile?.displayName?.charAt(0) || profile?.email?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">{profile?.fullName || profile?.displayName || profile?.email || 'Admin'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-tighter">
                      {currentClinic?.name || profile?.clinicId?.replace('-', ' ') || 'Main Branch'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Other Active Sessions */}
              {activeStaff.map(staff => (
                <div key={staff.uid} className="flex items-center gap-3 px-4 py-2 opacity-60 hover:opacity-100 transition-all cursor-default group">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-xs group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
                    {staff.fullName?.charAt(0) || staff.displayName?.charAt(0) || staff.email?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{staff.fullName || staff.displayName || staff.email}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">{staff.role?.replace('_', ' ') || 'Staff'}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 space-y-1">
              <button 
                onClick={() => navigate('/signup')}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all group"
              >
                <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                  <UserPlus className="w-4 h-4" />
                </div>
                Add Account
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group"
              >
                <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-colors">
                  <LogOut className="w-4 h-4" />
                </div>
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 dark:text-gray-400 lg:hidden">
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden lg:flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-600" />
              <span className="font-bold text-gray-900 dark:text-white">AfyaClinic Management</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
