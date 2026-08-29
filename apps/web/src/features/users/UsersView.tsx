import React, { useState } from 'react';
import {
  Users as UsersIcon,
  Home,
  UserPlus,
  LogIn,
  Sparkles,
  RefreshCw,
  ArrowLeftRight,
  Trash2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useUser } from '../../context/UserContext';
import type { UserResponse } from '../../types/api';
import { AddMemberModal } from './AddMemberModal';
import { CreateHouseholdModal } from './CreateHouseholdModal';
import { LoginModal } from './LoginModal';
import { RegisterModal } from './RegisterModal';

type ToastFn = (type: 'success' | 'error' | 'info', message: string) => void;

export const UsersView: React.FC<{ addToast: ToastFn }> = ({ addToast }) => {
  const {
    currentUser,
    currentHousehold,
    householdUsers,
    allHouseholds,
    allUsers,
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
  } = useUser();

  const [showAddMember, setShowAddMember] = useState(false);
  const [showCreateHousehold, setShowCreateHousehold] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const guard = async (fn: () => Promise<unknown>, ok: string, fail: string) => {
    try {
      await fn();
      addToast('success', ok);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : fail);
    }
  };

  const toggleRole = (u: UserResponse) =>
    guard(
      async () => {
        setBusyUserId(u.id);
        try {
          await updateHouseholdMember(u.id, { role: u.role === 'ADMIN' ? 'MEMBER' : 'ADMIN' });
        } finally {
          setBusyUserId(null);
        }
      },
      `${u.full_name} is now ${u.role === 'ADMIN' ? 'a Member' : 'an Admin'}`,
      'Failed to change role',
    );

  const removeMember = (u: UserResponse) => {
    if (!window.confirm(`Remove ${u.full_name} from ${currentHousehold?.name}?`)) return;
    void guard(() => removeHouseholdMember(u.id), `Removed ${u.full_name}`, 'Failed to remove member');
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {userError && (
        <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/70 text-rose-300 text-sm">
          {userError}
        </div>
      )}

      {/* Active session card */}
      <Card variant="glass" className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-300 text-lg font-bold">
              {currentUser?.full_name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-100">{currentUser?.full_name ?? 'No user'}</span>
                <Badge variant={currentUser?.role === 'ADMIN' ? 'primary' : 'default'} size="sm">
                  {currentUser?.role ?? 'MEMBER'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{currentUser?.phone_number ?? '—'}</p>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <Home className="w-3 h-3" /> {currentHousehold?.name ?? 'No household'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" leftIcon={<LogIn className="w-4 h-4" />} onClick={() => setShowLogin(true)}>
              Log in
            </Button>
            <Button variant="outline" size="sm" leftIcon={<Sparkles className="w-4 h-4" />} onClick={() => setShowRegister(true)}>
              Register
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void guard(() => logout(), 'Logged out — back on the demo session', 'Logout failed')}
            >
              Log out
            </Button>
          </div>
        </div>
      </Card>

      {/* Households */}
      <Card variant="glass" className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Home className="w-4 h-4 text-emerald-400" /> Households ({allHouseholds.length})
          </h3>
          <Button variant="emerald" size="sm" leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => setShowCreateHousehold(true)}>
            New household
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {allHouseholds.map((hh) => {
            const active = hh.id === currentHousehold?.id;
            return (
              <button
                key={hh.id}
                onClick={() =>
                  active ? undefined : void guard(() => switchHousehold(hh.id), `Switched to ${hh.name}`, 'Failed to switch household')
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                    : 'bg-slate-900/70 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {active && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                {hh.name} · {hh.base_currency}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Members */}
      <Card variant="glass" className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-emerald-400" /> Members of {currentHousehold?.name ?? 'household'} ({householdUsers.length})
          </h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => void refreshUsers()}>
              Refresh
            </Button>
            <Button variant="emerald" size="sm" leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => setShowAddMember(true)}>
              Add member
            </Button>
          </div>
        </div>

        {householdUsers.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No members in this household yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {householdUsers.map((u) => {
              const isSelf = u.id === currentUser?.id;
              return (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800/70"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 text-xs font-bold shrink-0">
                      {u.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200 font-medium truncate">
                        {u.full_name}
                        {isSelf && <span className="text-emerald-400 text-xs"> (you)</span>}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{u.phone_number} · {u.email ?? 'no email'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void toggleRole(u)}
                      disabled={busyUserId === u.id}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold border ${
                        u.role === 'ADMIN'
                          ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700'
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3 inline mr-0.5" />
                      {u.role}
                    </button>
                    {!isSelf && (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<ArrowLeftRight className="w-3.5 h-3.5" />}
                        onClick={() => void guard(() => switchUser(u), `Now acting as ${u.full_name}`, 'Failed to switch user')}
                      >
                        Switch
                      </Button>
                    )}
                    <button
                      onClick={() => removeMember(u)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40"
                      aria-label={`Remove ${u.full_name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* All users quick switcher */}
      {allUsers.length > householdUsers.length && (
        <Card variant="glass" className="p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-emerald-400" /> Switch across all users ({allUsers.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {allUsers.map((u) => {
              const isCurrent = u.id === currentUser?.id;
              return (
                <button
                  key={u.id}
                  onClick={() =>
                    isCurrent ? undefined : void guard(() => switchUser(u), `Now acting as ${u.full_name}`, 'Failed to switch user')
                  }
                  className={`text-left p-3 rounded-xl border text-xs ${
                    isCurrent
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                      : 'bg-slate-950/50 border-slate-800/70 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <p className="font-medium truncate">{u.full_name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{u.phone_number}</p>
                  <p className="text-[11px] mt-0.5">{isCurrent ? '● active' : u.role}</p>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        householdName={currentHousehold?.name ?? 'household'}
        onSubmit={async (payload) => {
          await createHouseholdMember(payload);
          addToast('success', 'Member added');
        }}
      />
      <CreateHouseholdModal
        isOpen={showCreateHousehold}
        onClose={() => setShowCreateHousehold(false)}
        onSubmit={async (name) => {
          await createHousehold(name);
          addToast('success', `Created and switched to "${name}"`);
        }}
      />
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSubmit={async (phone) => {
          await login(phone);
          addToast('success', 'Logged in');
        }}
      />
      <RegisterModal
        isOpen={showRegister}
        onClose={() => setShowRegister(false)}
        onSubmit={async (payload) => {
          await register(payload);
          addToast('success', 'Registered');
        }}
      />
    </div>
  );
};
