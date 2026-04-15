import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, query, orderBy, where, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';
import { 
  Users, 
  Shield, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Search,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

const ManageStaff: React.FC = () => {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roleDescriptions: Record<UserRole, string> = {
    admin: 'Full system access, staff management, and clinical oversight.',
    doctor: 'Clinical encounters, prescriptions, and patient history.',
    nurse: 'Vitals recording, patient history, and clinical support.',
    receptionist: 'Patient registration, appointments, and billing.',
    pharmacist: 'Drug inventory management and prescription dispensing.',
    accountant: 'Financial management, billing, and utility tracking.',
    lab_tech: 'Laboratory tests and results management.',
    hr: 'Staff records and human resources management.'
  };

  useEffect(() => {
    if (!profile?.clinicId) return;

    const clinicId = profile.clinicId;

    const q = query(
      collection(db, 'users'), 
      where('clinicId', '==', clinicId),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staffData = snapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id
      })) as UserProfile[];
      setStaff(staffData);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching staff:', err);
      setError('You do not have permission to view staff records.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.clinicId]);

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    if (!profile) return;
    setUpdatingUid(uid);
    setError(null);
    try {
      const clinicId = profile.clinicId;
      await updateDoc(doc(db, 'users', uid), {
        role: newRole
      });

      // Audit Log
      await addDoc(collection(db, 'audit_logs'), {
        userId: profile.uid,
        userEmail: profile.email,
        action: 'UPDATE_STAFF_ROLE',
        module: 'Staff Management',
        details: `Updated role for user ${uid} to ${newRole}`,
        timestamp: serverTimestamp(),
        clinicId
      });
    } catch (err: any) {
      console.error('Error updating role:', err);
      setError('You do not have permission to update this user.');
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleStatusToggle = async (uid: string, currentStatus: 'active' | 'inactive') => {
    if (!profile) return;
    setUpdatingUid(uid);
    setError(null);
    try {
      const clinicId = profile.clinicId;
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await updateDoc(doc(db, 'users', uid), {
        status: newStatus
      });

      // Audit Log
      await addDoc(collection(db, 'audit_logs'), {
        userId: profile.uid,
        userEmail: profile.email,
        action: 'UPDATE_STAFF_STATUS',
        module: 'Staff Management',
        details: `Updated status for user ${uid} to ${newStatus}`,
        timestamp: serverTimestamp(),
        clinicId
      });
    } catch (err: any) {
      console.error('Error updating status:', err);
      setError('You do not have permission to update this user.');
    } finally {
      setUpdatingUid(null);
    }
  };

  const filteredStaff = staff.filter(member => 
    member.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roles: UserRole[] = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'accountant', 'lab_tech', 'hr'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Manage Staff
          </h1>
          <p className="text-gray-500 dark:text-gray-400">View and manage clinic staff roles and access</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-400 p-4 rounded-md flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Role Reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.map(role => (
          <div key={role} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                {role.replace('_', ' ')}
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {roleDescriptions[role]}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Total: {filteredStaff.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Staff Member</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Role</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredStaff.map((member) => (
                <tr key={member.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs">
                        {(member.fullName || member.displayName || member.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {member.fullName || member.displayName || 'Unnamed Staff'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{member.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Mail className="w-4 h-4" />
                      {member.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.uid, e.target.value as UserRole)}
                      disabled={updatingUid === member.uid}
                      className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 disabled:opacity-50"
                    >
                      {roles.map(role => (
                        <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      {(() => {
                        try {
                          if (!member.createdAt) return 'N/A';
                          // Handle Firestore Timestamp or String
                          const date = (member.createdAt as any).toDate 
                            ? (member.createdAt as any).toDate() 
                            : new Date(member.createdAt);
                          return isNaN(date.getTime()) ? 'N/A' : format(date, 'MMM d, yyyy');
                        } catch (e) {
                          return 'N/A';
                        }
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleStatusToggle(member.uid, member.status || 'active')}
                      disabled={updatingUid === member.uid}
                      className={cn(
                        "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50",
                        member.status === 'inactive' 
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200"
                          : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200"
                      )}
                    >
                      {member.status === 'inactive' ? (
                        <>
                          <XCircle className="w-3 h-3" />
                          Inactive
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageStaff;
