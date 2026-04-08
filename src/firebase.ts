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
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function signupWithEmailPassword(email: string, password: string, displayName: string, role: string = 'receptionist', facilityId: string = 'main-branch') {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    await setDoc(doc(db, 'users', uid), {
      uid,
      email,
      displayName,
      role,
      facilityId,
      active: true,
      createdAt: serverTimestamp(),
    });
    
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
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        role: 'receptionist',
        facilityId: 'main-branch',
        active: true,
        createdAt: serverTimestamp(),
      });
    }
    
    return user;
  } catch (error) {
    throw error;
  }
}

export async function logOut() {
  await signOut(auth);
}
