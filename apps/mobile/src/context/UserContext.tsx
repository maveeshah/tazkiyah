import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { saveSession, loadSession, clearSession } from '../lib/storage';
import type {
  HouseholdResponse,
  UserCreate,
  UserRegisterRequest,
  UserResponse,
  UserUpdate,
} from '../types/api';

interface UserContextType {
  currentUser: UserResponse | null;
  currentHousehold: HouseholdResponse | null;
  householdUsers: UserResponse[];
  allHouseholds: HouseholdResponse[];
  allUsers: UserResponse[];
  isLoadingUser: boolean;
  userError: string | null;
  
  // Actions
  login: (phoneNumber: string) => Promise<void>;
  register: (payload: UserRegisterRequest) => Promise<void>;
  logout: () => void;
  switchHousehold: (householdId: string) => Promise<void>;
  switchUser: (user: UserResponse) => Promise<void>;
  createHouseholdMember: (payload: UserCreate) => Promise<UserResponse>;
  removeHouseholdMember: (userId: string) => Promise<void>;
  updateHouseholdMember: (userId: string, payload: UserUpdate) => Promise<UserResponse>;
  createHousehold: (name: string) => Promise<HouseholdResponse>;
  refreshUsers: () => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
  const [currentHousehold, setCurrentHousehold] = useState<HouseholdResponse | null>(null);
  const [householdUsers, setHouseholdUsers] = useState<UserResponse[]>([]);
  const [allHouseholds, setAllHouseholds] = useState<HouseholdResponse[]>([]);
  const [allUsers, setAllUsers] = useState<UserResponse[]>([]);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const [userError, setUserError] = useState<string | null>(null);

  const loadHouseholdMembers = useCallback(async (hhId: string) => {
    try {
      const members = await api.listHouseholdUsers(hhId);
      setHouseholdUsers(members);
    } catch (err) {
      console.warn('Failed to load household members:', err);
    }
  }, []);

  const loadAllMetadata = useCallback(async () => {
    try {
      const [hhs, usrs] = await Promise.all([
        api.listHouseholds().catch(() => [] as HouseholdResponse[]),
        api.listAllUsers().catch(() => [] as UserResponse[]),
      ]);
      setAllHouseholds(hhs);
      setAllUsers(usrs);
    } catch (err) {
      console.warn('Failed to list households/users:', err);
    }
  }, []);

  // Apply an authenticated session to state + api module + AsyncStorage
  const applySession = useCallback(async (user: UserResponse, household: HouseholdResponse) => {
    setCurrentUser(user);
    setCurrentHousehold(household);
    api.setHouseholdId(household.id);
    api.setCurrentUser(user);
    await saveSession({ user, household });
  }, []);

  // Initialize: restore a persisted session if present, otherwise auto-bootstrap
  const init = useCallback(async () => {
    setIsLoadingUser(true);
    setUserError(null);

    const stored = await loadSession();
    if (stored) {
      // Optimistic render from cache
      setCurrentUser(stored.user);
      setCurrentHousehold(stored.household);
      api.setHouseholdId(stored.household.id);
      api.setCurrentUser(stored.user);
      try {
        const household = await api.fetchHousehold(stored.household.id);
        await applySession(stored.user, household);
        await Promise.all([
          loadHouseholdMembers(household.id),
          loadAllMetadata(),
        ]);
        setIsLoadingUser(false);
        return;
      } catch (err) {
        console.warn('Persisted session no longer valid, re-bootstrapping:', err);
        await clearSession();
      }
    }

    try {
      const auth = await api.bootstrapHousehold();
      await applySession(auth.user, auth.household);
      await Promise.all([
        loadHouseholdMembers(auth.household.id),
        loadAllMetadata(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to backend server';
      setUserError(msg);
    } finally {
      setIsLoadingUser(false);
    }
  }, [applySession, loadHouseholdMembers, loadAllMetadata]);

  useEffect(() => {
    void init();
  }, [init]);

  const refreshUsers = useCallback(async () => {
    if (currentHousehold) {
      await loadHouseholdMembers(currentHousehold.id);
    }
    await loadAllMetadata();
  }, [currentHousehold, loadHouseholdMembers, loadAllMetadata]);

  const login = useCallback(async (phoneNumber: string) => {
    setIsLoadingUser(true);
    setUserError(null);
    try {
      const auth = await api.loginUser(phoneNumber);
      await applySession(auth.user, auth.household);

      await Promise.all([
        loadHouseholdMembers(auth.household.id),
        loadAllMetadata(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setUserError(msg);
      throw err;
    } finally {
      setIsLoadingUser(false);
    }
  }, [applySession, loadHouseholdMembers, loadAllMetadata]);

  const register = useCallback(async (payload: UserRegisterRequest) => {
    setIsLoadingUser(true);
    setUserError(null);
    try {
      const auth = await api.registerUser(payload);
      await applySession(auth.user, auth.household);

      await Promise.all([
        loadHouseholdMembers(auth.household.id),
        loadAllMetadata(),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setUserError(msg);
      throw err;
    } finally {
      setIsLoadingUser(false);
    }
  }, [applySession, loadHouseholdMembers, loadAllMetadata]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setCurrentHousehold(null);
    setHouseholdUsers([]);
    api.setHouseholdId(null);
    api.setCurrentUser(null);
    void clearSession();
  }, []);

  const switchHousehold = useCallback(async (householdId: string) => {
    setIsLoadingUser(true);
    try {
      const hh = await api.fetchHousehold(householdId);
      setCurrentHousehold(hh);
      api.setHouseholdId(hh.id);

      const members = await api.listHouseholdUsers(hh.id);
      setHouseholdUsers(members);

      // Select first member in that household as active user if current is not in it
      const nextUser = members.find((m) => m.id === currentUser?.id) ?? members[0] ?? null;
      if (nextUser) {
        setCurrentUser(nextUser);
        api.setCurrentUser(nextUser);
        await saveSession({ user: nextUser, household: hh });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to switch household';
      setUserError(msg);
      throw err;
    } finally {
      setIsLoadingUser(false);
    }
  }, [currentUser]);

  const switchUser = useCallback(async (user: UserResponse) => {
    setIsLoadingUser(true);
    try {
      const hh = await api.fetchHousehold(user.household_id);
      await applySession(user, hh);
      await loadHouseholdMembers(hh.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to switch user';
      setUserError(msg);
      throw err;
    } finally {
      setIsLoadingUser(false);
    }
  }, [applySession, loadHouseholdMembers]);

  const createHouseholdMember = useCallback(async (payload: UserCreate): Promise<UserResponse> => {
    if (!currentHousehold) throw new Error('No active household');
    const newUser = await api.createUser(currentHousehold.id, payload);
    await refreshUsers();
    return newUser;
  }, [currentHousehold, refreshUsers]);

  const removeHouseholdMember = useCallback(async (userId: string) => {
    await api.deleteUser(userId);
    await refreshUsers();
  }, [refreshUsers]);

  const updateHouseholdMember = useCallback(async (userId: string, payload: UserUpdate): Promise<UserResponse> => {
    const updated = await api.updateUser(userId, payload);
    if (currentUser?.id === userId) {
      setCurrentUser(updated);
      api.setCurrentUser(updated);
      if (currentHousehold) await saveSession({ user: updated, household: currentHousehold });
    }
    await refreshUsers();
    return updated;
  }, [currentUser, currentHousehold, refreshUsers]);

  const handleCreateHousehold = useCallback(async (name: string): Promise<HouseholdResponse> => {
    const newHh = await api.createHousehold(name);
    await loadAllMetadata();
    await switchHousehold(newHh.id);
    return newHh;
  }, [loadAllMetadata, switchHousehold]);

  return (
    <UserContext.Provider
      value={{
        currentUser,
        currentHousehold,
        householdUsers,
        allHouseholds,
        allUsers,
        isLoadingUser,
        userError,
        login,
        register,
        logout,
        switchHousehold,
        switchUser,
        createHouseholdMember,
        removeHouseholdMember,
        updateHouseholdMember,
        createHousehold: handleCreateHousehold,
        refreshUsers,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return ctx;
}
