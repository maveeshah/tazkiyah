import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiClientError } from '../services/api';
import { clearSession, loadSession, saveSession } from '../lib/storage';
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

  login: (phoneNumber: string) => Promise<void>;
  register: (payload: UserRegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  switchHousehold: (householdId: string) => Promise<void>;
  switchUser: (user: UserResponse) => Promise<void>;
  createHouseholdMember: (payload: UserCreate) => Promise<UserResponse>;
  removeHouseholdMember: (userId: string) => Promise<void>;
  updateHouseholdMember: (userId: string, payload: UserUpdate) => Promise<UserResponse>;
  createHousehold: (name: string) => Promise<HouseholdResponse>;
  refreshUsers: () => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError) return err.message;
  return err instanceof Error ? err.message : fallback;
}

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
      setHouseholdUsers(await api.listHouseholdUsers(hhId));
    } catch (err) {
      console.warn('Failed to load household members:', err);
    }
  }, []);

  const loadAllMetadata = useCallback(async () => {
    const [hhs, usrs] = await Promise.all([
      api.listHouseholds().catch(() => [] as HouseholdResponse[]),
      api.listAllUsers().catch(() => [] as UserResponse[]),
    ]);
    setAllHouseholds(hhs);
    setAllUsers(usrs);
  }, []);

  const applySession = useCallback(
    async (user: UserResponse, household: HouseholdResponse) => {
      setCurrentUser(user);
      setCurrentHousehold(household);
      saveSession({ user, household });
      await Promise.all([loadHouseholdMembers(household.id), loadAllMetadata()]);
    },
    [loadHouseholdMembers, loadAllMetadata],
  );

  const bootstrapDemo = useCallback(async () => {
    const auth = await api.bootstrap();
    await applySession(auth.user, auth.household);
  }, [applySession]);

  const init = useCallback(async () => {
    setIsLoadingUser(true);
    setUserError(null);

    const stored = loadSession();
    if (stored) {
      // Optimistic render from cache, then validate against the server.
      setCurrentUser(stored.user);
      setCurrentHousehold(stored.household);
      try {
        const household = await api.getHousehold(stored.household.id);
        await applySession(stored.user, household);
        setIsLoadingUser(false);
        return;
      } catch (err) {
        console.warn('Persisted session no longer valid, re-bootstrapping:', err);
        clearSession();
      }
    }

    try {
      await bootstrapDemo();
    } catch (err) {
      setUserError(errMsg(err, 'Failed to connect to the backend server'));
    } finally {
      setIsLoadingUser(false);
    }
  }, [applySession, bootstrapDemo]);

  useEffect(() => {
    void init();
  }, [init]);

  const refreshUsers = useCallback(async () => {
    if (currentHousehold) await loadHouseholdMembers(currentHousehold.id);
    await loadAllMetadata();
  }, [currentHousehold, loadHouseholdMembers, loadAllMetadata]);

  const login = useCallback(
    async (phoneNumber: string) => {
      setIsLoadingUser(true);
      setUserError(null);
      try {
        const auth = await api.loginUser(phoneNumber);
        await applySession(auth.user, auth.household);
      } catch (err) {
        setUserError(errMsg(err, 'Login failed'));
        throw err;
      } finally {
        setIsLoadingUser(false);
      }
    },
    [applySession],
  );

  const register = useCallback(
    async (payload: UserRegisterRequest) => {
      setIsLoadingUser(true);
      setUserError(null);
      try {
        const auth = await api.registerUser(payload);
        await applySession(auth.user, auth.household);
      } catch (err) {
        setUserError(errMsg(err, 'Registration failed'));
        throw err;
      } finally {
        setIsLoadingUser(false);
      }
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    clearSession();
    setCurrentUser(null);
    setCurrentHousehold(null);
    setHouseholdUsers([]);
    // Land on a usable demo session rather than a dead end.
    setIsLoadingUser(true);
    try {
      await bootstrapDemo();
    } catch (err) {
      setUserError(errMsg(err, 'Failed to reconnect after logout'));
    } finally {
      setIsLoadingUser(false);
    }
  }, [bootstrapDemo]);

  const switchHousehold = useCallback(
    async (householdId: string) => {
      setIsLoadingUser(true);
      try {
        const hh = await api.getHousehold(householdId);
        const members = await api.listHouseholdUsers(hh.id);
        // Keep the current user if they belong to the target household, else pick its
        // first member, else keep the current user (so the session never desyncs).
        const nextUser = members.find((m) => m.id === currentUser?.id) ?? members[0] ?? currentUser;
        setCurrentHousehold(hh);
        setHouseholdUsers(members);
        if (nextUser) {
          setCurrentUser(nextUser);
          saveSession({ user: nextUser, household: hh });
        }
        await loadAllMetadata();
      } catch (err) {
        setUserError(errMsg(err, 'Failed to switch household'));
        throw err;
      } finally {
        setIsLoadingUser(false);
      }
    },
    [currentUser, loadAllMetadata],
  );

  const switchUser = useCallback(
    async (user: UserResponse) => {
      setIsLoadingUser(true);
      try {
        const hh = await api.getHousehold(user.household_id);
        await applySession(user, hh);
      } catch (err) {
        setUserError(errMsg(err, 'Failed to switch user'));
        throw err;
      } finally {
        setIsLoadingUser(false);
      }
    },
    [applySession],
  );

  const createHouseholdMember = useCallback(
    async (payload: UserCreate): Promise<UserResponse> => {
      if (!currentHousehold) throw new Error('No active household');
      const newUser = await api.createUser(currentHousehold.id, payload);
      await refreshUsers();
      return newUser;
    },
    [currentHousehold, refreshUsers],
  );

  const removeHouseholdMember = useCallback(
    async (userId: string) => {
      await api.deleteUser(userId);
      await refreshUsers();
    },
    [refreshUsers],
  );

  const updateHouseholdMember = useCallback(
    async (userId: string, payload: UserUpdate): Promise<UserResponse> => {
      const updated = await api.updateUser(userId, payload);
      if (currentUser?.id === userId) {
        setCurrentUser(updated);
        if (currentHousehold) saveSession({ user: updated, household: currentHousehold });
      }
      await refreshUsers();
      return updated;
    },
    [currentUser, currentHousehold, refreshUsers],
  );

  const createHousehold = useCallback(
    async (name: string): Promise<HouseholdResponse> => {
      const newHh = await api.createHousehold(name);
      await loadAllMetadata();
      await switchHousehold(newHh.id);
      return newHh;
    },
    [loadAllMetadata, switchHousehold],
  );

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
        createHousehold,
        refreshUsers,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a UserProvider');
  return ctx;
}
