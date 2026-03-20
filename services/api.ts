

import { Rock, User, Badge, OperatorStats } from '../types';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  limit
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { db, auth } from '../firebase';

// --- FIRESTORE ERROR HANDLING ---
enum OperationType {
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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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

// --- NEURAL NETWORK CONFIGURATION ---
const USE_MOCK_SERVER = false; 

export type { User };

export interface AddRockResponse {
  rock: Rock;
  userStats: { xp: number; level: number; xpGained: number; leveledUp: boolean };
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalRocks: number;
  activityData: { _id: string; count: number }[];
  locations: { lat: number; lng: number }[];
  logs: any[];
}

export const api = {
  onSyncStatusChange: ((isSyncing: boolean) => {}) as (isSyncing: boolean) => void,

  async _withSyncStatus<T>(promise: Promise<T>): Promise<T> {
    this.onSyncStatusChange(true);
    try {
      return await promise;
    } finally {
      setTimeout(() => this.onSyncStatusChange(false), 300);
    }
  },

  // Initialize Auth Listener
  init() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          localStorage.setItem('current_user_data', JSON.stringify(userDoc.data()));
        }
      } else {
        localStorage.removeItem('current_user_data');
      }
    });
  },

  async loginWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        const newUser: User = {
          id: user.uid,
          username: user.displayName || 'Explorer',
          email: user.email || '',
          xp: 0,
          level: 1,
          rankTitle: 'Novice Scout',
          createdAt: new Date().toISOString(),
          isAdmin: user.email === "rockhoundgo.cody@gmail.com",
          roles: ['user'],
          mfaEnabled: false,
          operatorStats: { totalScans: 0, distanceTraveled: 0, uniqueSpeciesFound: 0, legendaryFinds: 0, scanStreak: 0, highestRarityFound: 0 }
        };
        await setDoc(userDocRef, newUser);
        localStorage.setItem('current_user_data', JSON.stringify(newUser));
        return newUser;
      } else {
        const userData = userDoc.data() as User;
        localStorage.setItem('current_user_data', JSON.stringify(userData));
        return userData;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
      throw error;
    }
  },

  // Maintain compatibility with existing calls
  async register(username: string, email: string, password: string): Promise<User> {
    return this.loginWithGoogle();
  },

  async login(email: string, password: string): Promise<{ user?: User }> {
    const user = await this.loginWithGoogle();
    return { user };
  },

  async updateProfile(userData: Partial<User>): Promise<User> {
    return this._withSyncStatus(this._updateProfile(userData));
  },
  async _updateProfile(userData: Partial<User>): Promise<User> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("NOT_AUTHENTICATED");
    
    const path = `users/${userId}`;
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, userData);
      const updatedDoc = await getDoc(userDocRef);
      const updatedUser = updatedDoc.data() as User;
      localStorage.setItem('current_user_data', JSON.stringify(updatedUser));
      return updatedUser;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  },

  logout: async () => {
    await signOut(auth);
    localStorage.removeItem('current_user_data');
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem('current_user_data');
    return stored ? JSON.parse(stored) : null;
  },

  async getRocks(): Promise<Rock[]> {
    return this._withSyncStatus(this._getRocks());
  },
  async _getRocks(): Promise<Rock[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];
    
    const path = 'rocks';
    try {
      const q = query(collection(db, path), where('userId', '==', userId), orderBy('dateFound', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Rock);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      throw error;
    }
  },

  addRock(rock: Rock): Promise<AddRockResponse> {
    return this._withSyncStatus(this._addRock(rock));
  },
  async _addRock(rock: Rock): Promise<AddRockResponse> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("NOT_AUTHENTICATED");
    
    const path = 'rocks';
    try {
      const rockDocRef = doc(db, path, rock.id);
      await setDoc(rockDocRef, { ...rock, userId });

      // Update User Stats
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.data() as User;
      
      const xpGained = 50 + (rock.rarityScore || 0);
      const newXp = (userData.xp || 0) + xpGained;
      const newLevel = Math.floor(newXp / 100) + 1;
      const leveledUp = newLevel > (userData.level || 1);
      
      const updates: any = {
        xp: newXp,
        level: newLevel,
        'operatorStats.totalScans': (userData.operatorStats?.totalScans || 0) + 1
      };
      
      if (rock.rarityScore > 90) {
        updates['operatorStats.legendaryFinds'] = (userData.operatorStats?.legendaryFinds || 0) + 1;
      }
      if (rock.rarityScore > (userData.operatorStats?.highestRarityFound || 0)) {
        updates['operatorStats.highestRarityFound'] = rock.rarityScore;
      }
      
      await updateDoc(userDocRef, updates);
      
      const userStats = { xp: newXp, level: newLevel, xpGained, leveledUp };
      return { rock, userStats };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },
  
  async deleteRock(rockId: string): Promise<void> {
    return this._withSyncStatus(this._deleteRock(rockId));
  },
  async _deleteRock(rockId: string): Promise<void> {
    const path = `rocks/${rockId}`;
    try {
      await deleteDoc(doc(db, 'rocks', rockId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      throw error;
    }
  },

  async getAdminStats(): Promise<AdminStats> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("NOT_AUTHENTICATED");
    
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const rocksSnap = await getDocs(collection(db, 'rocks'));
      
      return {
        totalUsers: usersSnap.size,
        activeUsers: usersSnap.size,
        totalRocks: rocksSnap.size,
        activityData: [], // Would need aggregation logic
        locations: rocksSnap.docs.map(d => (d.data() as Rock).location).filter(Boolean) as { lat: number, lng: number }[],
        logs: []
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'admin_stats');
      throw error;
    }
  },

  async logAiRequest(type: string, prompt: string, response?: string): Promise<void> {
    console.log(`[AI LOG] ${type}: ${prompt.substring(0, 50)}... ${response ? `-> ${response.substring(0, 50)}...` : ''}`);
    // In a real app, you might save this to a 'logs' collection in Firestore
  }
};

// Initialize the API
api.init();
