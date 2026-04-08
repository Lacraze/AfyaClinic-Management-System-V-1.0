export type UserRole = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'pharmacist' | 'accountant' | 'lab_tech' | 'hr';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  fullName: string;
  role: UserRole;
  status: 'active' | 'inactive';
  phoneNumber?: string;
  facilityId: string;
  createdAt: string;
}

export interface Patient {
  id: string;
  fullName: string;
  idNumber: string;
  phoneNumber: string;
  address: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  nextOfKin: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  facilityId: string;
  createdAt: string;
}

export interface Vitals {
  bp: string;
  pulse: number;
  temp: number;
  weight: number;
  height: number;
  spo2: number;
  painScore: number;
  recordedBy: string;
  recordedAt: string;
}

export interface History {
  chiefComplaint: string;
  hpi: string;
  pmh: string;
  socialHistory: string;
  familyHistory: string;
  recordedBy: string;
  recordedAt: string;
}

export interface Encounter {
  examination: string;
  diagnosis: string;
  plan: string;
  doctorId: string;
  recordedAt: string;
}

export interface Visit {
  id: string;
  patientId: string;
  date: string;
  status: 'scheduled' | 'checked-in' | 'vitals' | 'history' | 'encounter' | 'billing' | 'completed' | 'no-show';
  facilityId: string;
  vitals?: Vitals;
  history?: History;
  encounter?: Encounter;
}

export interface InventoryItem {
  id: string;
  name: string;
  genericName?: string;
  strength?: string;
  form?: string;
  batchNumber?: string;
  expiryDate?: string;
  stockQuantity: number;
  reorderLevel: number;
  supplier?: string;
  type: 'drug' | 'equipment' | 'other';
  buyingPrice: number;
  sellingPrice: number;
  unit?: string;
}

export interface Prescription {
  id: string;
  visitId: string;
  patientId: string;
  drugId: string;
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  status: 'pending' | 'dispensed' | 'cancelled';
  prescribedBy: string;
  prescribedAt: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  patientId: string;
  visitId: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'unpaid' | 'partially-paid' | 'paid';
  createdAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: 'cash' | 'mpesa' | 'card' | 'insurance';
  reference?: string;
  date: string;
}

export interface Utility {
  id: string;
  type: 'electricity' | 'water' | 'internet' | 'rent' | 'other';
  amount: number;
  dueDate: string;
  status: 'unpaid' | 'paid';
  notes?: string;
}

export interface Attendance {
  id: string;
  uid: string;
  date: string;
  clockIn: string;
  clockOut?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  module: string;
  details: string;
  timestamp: string;
  facilityId: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  duration: number; // in minutes
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  facilityId: string;
  notes?: string;
}
