import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../src/context/UserContext';
import type { UserResponse } from '../../src/types/api';

export default function ProfileScreen() {
  const {
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
  } = useUser();

  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showCreateHouseholdModal, setShowCreateHouseholdModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Add Member Form
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('+92');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [memberFormError, setMemberFormError] = useState<string | null>(null);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  // Create Household Form
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [isSubmittingHh, setIsSubmittingHh] = useState(false);

  // Login Form
  const [loginPhone, setLoginPhone] = useState('+923001234567');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register Form
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('+92');
  const [regEmail, setRegEmail] = useState('');
  const [regHhName, setRegHhName] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUsers();
    setRefreshing(false);
  }, [refreshUsers]);

  // Handle Add Member
  const handleAddMember = async () => {
    if (!newMemberName.trim() || !newMemberPhone.trim()) {
      setMemberFormError('Name and Phone Number are required.');
      return;
    }
    setIsSubmittingMember(true);
    setMemberFormError(null);
    try {
      await createHouseholdMember({
        full_name: newMemberName.trim(),
        phone_number: newMemberPhone.trim(),
        email: newMemberEmail.trim() || undefined,
        role: newMemberRole,
      });
      setNewMemberName('');
      setNewMemberPhone('+92');
      setNewMemberEmail('');
      setNewMemberRole('MEMBER');
      setShowAddMemberModal(false);
      Alert.alert('Success', 'Member added successfully!');
    } catch (err: unknown) {
      setMemberFormError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setIsSubmittingMember(false);
    }
  };

  // Handle Delete Member
  const handleDeleteMember = (user: UserResponse) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${user.full_name} from ${currentHousehold?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeHouseholdMember(user.id);
            } catch (err: unknown) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  // Handle Toggle Role
  const handleToggleRole = async (user: UserResponse) => {
    const nextRole = user.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    try {
      await updateHouseholdMember(user.id, { role: nextRole });
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  // Handle Create Household
  const handleCreateHh = async () => {
    if (!newHouseholdName.trim()) return;
    setIsSubmittingHh(true);
    try {
      await createHousehold(newHouseholdName.trim());
      setNewHouseholdName('');
      setShowCreateHouseholdModal(false);
      Alert.alert('Success', 'Household created and activated!');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create household');
    } finally {
      setIsSubmittingHh(false);
    }
  };

  // Handle Login
  const handleLogin = async () => {
    if (!loginPhone.trim()) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await login(loginPhone.trim());
      setShowLoginModal(false);
      Alert.alert('Welcome Back', `Logged in successfully as ${loginPhone}`);
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Register
  const handleRegister = async () => {
    if (!regName.trim() || !regPhone.trim()) {
      setRegError('Name and Phone are required.');
      return;
    }
    setIsRegistering(true);
    setRegError(null);
    try {
      await register({
        full_name: regName.trim(),
        phone_number: regPhone.trim(),
        email: regEmail.trim() || undefined,
        household_name: regHhName.trim() || undefined,
      });
      setShowRegisterModal(false);
      Alert.alert('Success', 'Account and Household registered!');
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {isLoadingUser && !refreshing && (
          <ActivityIndicator style={{ marginTop: 20 }} color="#6366f1" />
        )}

        {userError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {userError}</Text>
          </View>
        )}

        {/* ── ACTIVE USER PROFILE CARD ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {currentUser?.full_name?.charAt(0).toUpperCase() ?? '👤'}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{currentUser?.full_name ?? 'Guest User'}</Text>
                <View style={[styles.roleBadge, currentUser?.role === 'ADMIN' ? styles.adminBadge : styles.memberBadge]}>
                  <Text style={styles.roleText}>{currentUser?.role ?? 'MEMBER'}</Text>
                </View>
              </View>
              <Text style={styles.userPhone}>{currentUser?.phone_number ?? 'No active session'}</Text>
              {currentUser?.email && <Text style={styles.userEmail}>{currentUser.email}</Text>}
            </View>
          </View>

          <View style={styles.activeHhRow}>
            <Text style={styles.activeHhLabel}>Active Household:</Text>
            <Text style={styles.activeHhName}>🏠 {currentHousehold?.name ?? 'None Selected'}</Text>
          </View>

          {/* Quick Action Buttons */}
          <View style={styles.authButtonsRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowLoginModal(true)}>
              <Text style={styles.secondaryBtnText}>🔑 Log In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowRegisterModal(true)}>
              <Text style={styles.secondaryBtnText}>✨ Register</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Text style={styles.logoutBtnText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── HOUSEHOLDS SELECTOR ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Households ({allHouseholds.length})</Text>
          <TouchableOpacity onPress={() => setShowCreateHouseholdModal(true)}>
            <Text style={styles.addLink}>+ New Household</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hhScroll}>
          {allHouseholds.map((hh) => {
            const isActive = hh.id === currentHousehold?.id;
            return (
              <TouchableOpacity
                key={hh.id}
                style={[styles.hhPill, isActive && styles.activeHhPill]}
                onPress={() => switchHousehold(hh.id)}
              >
                <Text style={[styles.hhPillText, isActive && styles.activeHhPillText]}>
                  {isActive ? '✓ ' : ''}
                  {hh.name} ({hh.base_currency})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── HOUSEHOLD MEMBERS MANAGEMENT ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Members of {currentHousehold?.name ?? 'Household'} ({householdUsers.length})
          </Text>
          <TouchableOpacity onPress={() => setShowAddMemberModal(true)}>
            <Text style={styles.addLink}>+ Add Member</Text>
          </TouchableOpacity>
        </View>

        {householdUsers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>No members registered in this household.</Text>
          </View>
        ) : (
          householdUsers.map((user) => {
            const isSelf = user.id === currentUser?.id;
            return (
              <View key={user.id} style={[styles.memberCard, isSelf && styles.activeMemberCard]}>
                <View style={styles.memberInfo}>
                  <View style={styles.smallAvatar}>
                    <Text style={styles.smallAvatarText}>{user.full_name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.memberName}>{user.full_name}</Text>
                      {isSelf && <Text style={styles.selfTag}> (You)</Text>}
                    </View>
                    <Text style={styles.memberMeta}>{user.phone_number} • {user.email ?? 'No email'}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.rolePill, user.role === 'ADMIN' ? styles.adminPill : styles.memberPill]}
                    onPress={() => handleToggleRole(user)}
                  >
                    <Text style={styles.rolePillText}>{user.role}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.memberActions}>
                  {!isSelf && (
                    <TouchableOpacity style={styles.switchBtn} onPress={() => switchUser(user)}>
                      <Text style={styles.switchBtnText}>Switch User</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.removeBtn} onPress={() => handleDeleteMember(user)}>
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* ── ALL USERS IN SYSTEM (QUICK SWITCHER) ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Switch Across All System Users ({allUsers.length})</Text>
        </View>
        <View style={styles.userListContainer}>
          {allUsers.map((u) => {
            const isCurrent = u.id === currentUser?.id;
            return (
              <TouchableOpacity
                key={u.id}
                style={[styles.allUserItem, isCurrent && styles.allUserItemActive]}
                onPress={() => switchUser(u)}
              >
                <Text style={styles.allUserName}>{u.full_name}</Text>
                <Text style={styles.allUserPhone}>{u.phone_number}</Text>
                <Text style={[styles.allUserRole, isCurrent && { color: '#6366f1' }]}>
                  {isCurrent ? '● Active' : u.role}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── MODAL: ADD HOUSEHOLD MEMBER ── */}
      <Modal visible={showAddMemberModal} transparent animationType="slide" onRequestClose={() => setShowAddMemberModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Member to {currentHousehold?.name}</Text>
            {memberFormError && <Text style={styles.formError}>{memberFormError}</Text>}

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ayesha"
              placeholderTextColor="#64748b"
              value={newMemberName}
              onChangeText={setNewMemberName}
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+923001234567"
              placeholderTextColor="#64748b"
              value={newMemberPhone}
              onChangeText={setNewMemberPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Email (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="ayesha@example.com"
              placeholderTextColor="#64748b"
              value={newMemberEmail}
              onChangeText={setNewMemberEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Role</Text>
            <View style={styles.roleSelectionRow}>
              <TouchableOpacity
                style={[styles.roleSelectBtn, newMemberRole === 'MEMBER' && styles.roleSelectActive]}
                onPress={() => setNewMemberRole('MEMBER')}
              >
                <Text style={[styles.roleSelectText, newMemberRole === 'MEMBER' && styles.roleSelectTextActive]}>
                  MEMBER
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleSelectBtn, newMemberRole === 'ADMIN' && styles.roleSelectActive]}
                onPress={() => setNewMemberRole('ADMIN')}
              >
                <Text style={[styles.roleSelectText, newMemberRole === 'ADMIN' && styles.roleSelectTextActive]}>
                  ADMIN
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowAddMemberModal(false); setMemberFormError(null); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAddMember}
                disabled={isSubmittingMember}
              >
                {isSubmittingMember ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Add Member</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: CREATE HOUSEHOLD ── */}
      <Modal visible={showCreateHouseholdModal} transparent animationType="slide" onRequestClose={() => setShowCreateHouseholdModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Household</Text>

            <Text style={styles.inputLabel}>Household Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Lahore House"
              placeholderTextColor="#64748b"
              value={newHouseholdName}
              onChangeText={setNewHouseholdName}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowCreateHouseholdModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreateHh}
                disabled={isSubmittingHh}
              >
                {isSubmittingHh ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: LOGIN ── */}
      <Modal visible={showLoginModal} transparent animationType="slide" onRequestClose={() => setShowLoginModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log In with Phone</Text>
            {loginError && <Text style={styles.formError}>{loginError}</Text>}

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+923001234567"
              placeholderTextColor="#64748b"
              value={loginPhone}
              onChangeText={setLoginPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowLoginModal(false); setLoginError(null); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleLogin}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Log In</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: REGISTER ── */}
      <Modal visible={showRegisterModal} transparent animationType="slide" onRequestClose={() => setShowRegisterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Account</Text>
            {regError && <Text style={styles.formError}>{regError}</Text>}

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mavee"
              placeholderTextColor="#64748b"
              value={regName}
              onChangeText={setRegName}
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+923001234567"
              placeholderTextColor="#64748b"
              value={regPhone}
              onChangeText={setRegPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Email (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="user@tazkiyah.app"
              placeholderTextColor="#64748b"
              value={regEmail}
              onChangeText={setRegEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Household Name (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Family Budget"
              placeholderTextColor="#64748b"
              value={regHhName}
              onChangeText={setRegHhName}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowRegisterModal(false); setRegError(null); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleRegister}
                disabled={isRegistering}
              >
                {isRegistering ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Register</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  errorBanner: { backgroundColor: '#7f1d1d', margin: 16, borderRadius: 10, padding: 12 },
  errorText: { color: '#fca5a5', fontSize: 13, fontWeight: '600' },
  profileCard: {
    backgroundColor: '#1e293b',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  userName: { color: '#f1f5f9', fontSize: 18, fontWeight: '700', marginRight: 8 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  adminBadge: { backgroundColor: '#4338ca' },
  memberBadge: { backgroundColor: '#334155' },
  roleText: { color: '#e0e7ff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  userPhone: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  userEmail: { color: '#64748b', fontSize: 12, marginTop: 1 },
  activeHhRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeHhLabel: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  activeHhName: { color: '#38bdf8', fontSize: 14, fontWeight: '700' },
  authButtonsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#f1f5f9', fontSize: 13, fontWeight: '700' },
  logoutBtn: {
    backgroundColor: '#7f1d1d',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutBtnText: { color: '#fca5a5', fontSize: 13, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  addLink: { color: '#818cf8', fontSize: 12, fontWeight: '700' },
  hhScroll: { paddingLeft: 16, marginBottom: 8 },
  hhPill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeHhPill: { backgroundColor: '#4f46e5', borderColor: '#6366f1' },
  hhPillText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  activeHhPillText: { color: '#fff', fontWeight: '700' },
  emptyCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  emptyCardText: { color: '#64748b', fontSize: 13 },
  memberCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeMemberCard: { borderColor: '#6366f1' },
  memberInfo: { flexDirection: 'row', alignItems: 'center' },
  smallAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  memberName: { color: '#f1f5f9', fontSize: 14, fontWeight: '700' },
  selfTag: { color: '#818cf8', fontSize: 12, fontWeight: '700' },
  memberMeta: { color: '#64748b', fontSize: 11, marginTop: 2 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  adminPill: { backgroundColor: '#3730a3' },
  memberPill: { backgroundColor: '#334155' },
  rolePillText: { color: '#e0e7ff', fontSize: 10, fontWeight: '700' },
  memberActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  switchBtn: { backgroundColor: '#334155', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  switchBtnText: { color: '#a5f3fc', fontSize: 12, fontWeight: '600' },
  removeBtn: { backgroundColor: '#450a0a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  removeBtnText: { color: '#f87171', fontSize: 12, fontWeight: '600' },
  userListContainer: { marginHorizontal: 16, backgroundColor: '#1e293b', borderRadius: 12, padding: 8 },
  allUserItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  allUserItemActive: { backgroundColor: '#312e81', borderRadius: 8 },
  allUserName: { color: '#f1f5f9', fontSize: 13, fontWeight: '600', width: '35%' },
  allUserPhone: { color: '#94a3b8', fontSize: 12, width: '40%' },
  allUserRole: { color: '#64748b', fontSize: 11, fontWeight: '700', width: '25%', textAlign: 'right' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '800', marginBottom: 16 },
  formError: { color: '#f87171', fontSize: 12, marginBottom: 12 },
  inputLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleSelectionRow: { flexDirection: 'row', gap: 12, marginTop: 6, marginBottom: 12 },
  roleSelectBtn: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleSelectActive: { backgroundColor: '#4f46e5', borderColor: '#6366f1' },
  roleSelectText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  roleSelectTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: '#334155', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelBtnText: { color: '#f1f5f9', fontSize: 14, fontWeight: '700' },
  submitBtn: { flex: 1, backgroundColor: '#4f46e5', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
