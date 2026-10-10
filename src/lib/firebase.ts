import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();

export interface FirestoreSyncReservationInput {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  date: string;
  startTime: string;
  endTime: string;
  slotType: 'morning' | 'afternoon' | 'full_day' | 'custom';
  eventType: string;
  guests: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  source: 'web' | 'phone' | 'whatsapp' | 'walkin';
  notes?: string;
  totalPrice: number;
}

export async function syncReservationToFirestore(res: FirestoreSyncReservationInput): Promise<void> {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  const safeId = res.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128) || 'res_default';
  const resRef = doc(db, 'reservations', safeId);
  const contactRef = doc(db, 'reservations', safeId, 'private', 'contact');

  try {
    const batch = writeBatch(db);
    batch.set(resRef, {
      ownerId: uid,
      firstName: res.firstName.slice(0, 80),
      lastName: res.lastName.slice(0, 100),
      date: res.date.slice(0, 10),
      startTime: res.startTime.slice(0, 5),
      endTime: res.endTime.slice(0, 5),
      slotType: res.slotType,
      eventType: res.eventType.slice(0, 80),
      guests: Math.max(1, Math.min(120, Math.round(res.guests))),
      status: res.status,
      source: res.source,
      notes: (res.notes || '').slice(0, 500),
      totalPrice: Math.max(0, Math.min(10000, Number(res.totalPrice) || 0)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(contactRef, {
      ownerId: uid,
      reservationId: safeId,
      phone: res.phone.slice(0, 30),
      email: res.email.slice(0, 120),
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `reservations/${safeId}`);
  }
}

export interface FirestoreSyncBlockInput {
  id: string;
  date: string;
  slotType: 'morning' | 'afternoon' | 'full_day' | 'custom';
  startTime: string;
  endTime: string;
  reason: string;
}

export async function syncBlockToFirestore(block: FirestoreSyncBlockInput): Promise<void> {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  const safeId = block.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128) || 'blk_default';
  const blockRef = doc(db, 'calendarBlocks', safeId);
  try {
    await setDoc(blockRef, {
      ownerId: uid,
      date: block.date.slice(0, 10),
      slotType: block.slotType,
      startTime: block.startTime.slice(0, 5),
      endTime: block.endTime.slice(0, 5),
      reason: block.reason.slice(0, 160),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `calendarBlocks/${safeId}`);
  }
}

export async function deleteBlockFromFirestore(blockId: string): Promise<void> {
  if (!auth.currentUser) return;
  const safeId = blockId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  try {
    await deleteDoc(doc(db, 'calendarBlocks', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `calendarBlocks/${safeId}`);
  }
}

export { signInWithPopup, signOut };
