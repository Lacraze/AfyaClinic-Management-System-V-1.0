import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import localFirebaseConfig from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: "AIzaSyAU0_4KK76zhufXtS-t13nC-cbJuRhtaMQ",
  authDomain: "gen-lang-client-0768825526.firebaseapp.com",
  projectId: "gen-lang-client-0768825526",
  storageBucket: "gen-lang-client-0768825526.firebasestorage.app",
  messagingSenderId: "1030908396224",
  appId: "1:1030908396224:web:c97c6f5dc47225f0422325"
};

const firestoreDatabaseId = localFirebaseConfig.firestoreDatabaseId || 'ai-studio-ee65c350-8b1e-4dc2-bb4a-cec64102d104';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function signupWithEmailPassword(email: string, password: string, displayName: string, role: string = 'receptionist', clinicId: string = 'main-branch') {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    const path = `users/${uid}`;
    try {
      await setDoc(doc(db, 'users', uid), {
        uid,
        email,
        displayName,
        fullName: displayName, // Add fullName
        role,
        clinicId,
        status: 'active', // Use status instead of active
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
    
    return userCredential.user;
  } catch (error) {
    throw error;
  }
}

export async function loginWithEmailPassword(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    const path = `users/${user.uid}`;
    let userDoc;
    try {
      userDoc = await getDoc(doc(db, 'users', user.uid));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }

    if (!userDoc?.exists()) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          fullName: user.displayName || '', // Add fullName
          role: 'receptionist',
          clinicId: 'main-branch',
          status: 'active', // Use status instead of active
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
    
    return user;
  } catch (error) {
    throw error;
  }
}

export async function logOut() {
  await signOut(auth);
}
