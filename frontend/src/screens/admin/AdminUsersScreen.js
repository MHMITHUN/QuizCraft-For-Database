import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Dimensions, ScrollView, Alert, Modal, Switch, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import { saveTextToDownloads, saveUriToDownloads } from '../../services/exportUtils';
import * as Haptics from 'expo-haptics';
import { BarChart } from 'react-native-chart-kit';
import { adminAPI } from '../../services/api';
import { useI18n } from '../../i18n';
import { useTheme } from '../../hooks/useTheme';

const { width } = Dimensions.get('window');

export default function AdminUsersScreen({ route, navigation }) {
  const { t } = useI18n();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [subscription, setSubscription] = useState('');
  const [isActive, setIsActive] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { theme } = useTheme();

  // Detail modal state
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editUser, setEditUser] = useState({});
  const [errors, setErrors] = useState({});

  const load = async (p = page) => {
    try {
      setLoading(true);
      const res = await adminAPI.getUsers({ page: p, limit: 50, role: role || undefined, search: search || undefined, subscription: subscription || undefined, isActive: isActive || undefined, from: from || undefined, to: to || undefined });
      setList(res?.data?.data?.users || []);
      setPage(res?.data?.data?.pagination?.page || p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const preset = route?.params?.preset || {};
    if (preset) {
      if (preset.role) setRole(preset.role);
      if (preset.subscription) setSubscription(preset.subscription);
      if (preset.isActive) setIsActive(preset.isActive);
      if (preset.from) setFrom(preset.from);
      if (preset.to) setTo(preset.to);
    }
    load(1);
  }, []);

  const filtered = useMemo(() => {
    // Client-side fallback filters
    return (Array.isArray(list) ? list : []).filter(u => {
      const txt = `${u.name||''} ${u.email||''}`.toLowerCase();
      if (search && !txt.includes(search.toLowerCase())) return false;
      if (role && String(u.role) !== String(role)) return false;
      if (subscription && String(u.subscription?.plan||'free') !== String(subscription)) return false;
      if (isActive && String(!!u.isActive) !== String(isActive === 'true')) return false;
      if (from && new Date(u.createdAt) < new Date(from)) return false;
      if (to && new Date(u.createdAt) > new Date(to)) return false;
      return true;
    });
  }, [list, search, role, subscription, isActive, from, to]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const byRole = { student: 0, teacher: 0, admin: 0, guest: 0 };
    const premium = filtered.filter(u => (u.subscription?.plan || 'free') !== 'free').length;
    const active = filtered.filter(u => u.isActive).length;
    filtered.forEach(u => { byRole[u.role] = (byRole[u.role] || 0) + 1; });
    return { total, byRole, premium, active };
  }, [filtered]);

  const exportCSV = async () => {
    const header = ['name','email','role','subscription','active','createdAt'];
    const toCsv = (value) => `"${String(value ?? '').replace(/"/g,'""')}"`;
    const rows = filtered.map(u => [u.name, u.email, u.role, u.subscription?.plan || 'free', u.isActive ? 'Yes' : 'No', new Date(u.createdAt).toISOString()]);
    const csv = [header.join(','), ...rows.map(r => r.map(toCsv).join(','))].join('\n');
    const res = await saveTextToDownloads(csv, `users_${Date.now()}.csv`, 'text/csv');
    if (res?.error) Alert.alert('Export failed', res.error);
    else Alert.alert('Exported', `Saved to: ${res.uri}`, [
      { text: 'Share/Save', onPress: () => import('../../services/exportUtils').then(m => m.openFile(res.uri, 'text/csv').then(ok => { if (!ok) Alert.alert('Open failed', `File saved at: ${res.uri}`); })) },
      { text: 'OK' }
    ]);
  };

  const openDetail = (item) => {
    setSelectedUser(item);
    setEditUser({ ...item });
    setEditMode(false);
    setDetailVisible(true);
  };

  const validateUser = () => {
    const err = {};
    const allowedRoles = ['student','teacher','admin','guest'];
    if (!allowedRoles.includes((editUser.role||'').trim())) err.role = `Role must be one of: ${allowedRoles.join(', ')}`;
    const plan = editUser.subscription?.plan || 'free';
    const allowedPlans = ['free','premium','institutional','student_basic','student_premium','teacher_basic','teacher_premium','teacher_institutional'];
    if (!allowedPlans.includes(String(plan).trim())) err.plan = `Plan must be one of: ${allowedPlans.join(', ')}`;
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const saveUser = async () => {
    if (!validateUser()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(()=>{});
      return;
    }
    try {
      await adminAPI.updateUser(selectedUser._id, {
        role: editUser.role,
        isActive: editUser.isActive,
        subscription: editUser.subscription
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{});
      Alert.alert('Success', 'User updated successfully');
      load(page); // refresh
      setDetailVisible(false);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(()=>{});
      Alert.alert('Error', 'Failed to update user');
    }
  };

  const deleteUser = () => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${selectedUser.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await adminAPI.deleteUser(selectedUser._id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{});
              Alert.alert('Success', 'User deleted successfully');
              load(page);
              setDetailVisible(false);
            } catch (e) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(()=>{});
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]}
      onPress={() => openDetail(item)}
      activeOpacity={0.7}
    >
      <Text style={[styles.name, { color: theme === 'light' ? '#111827' : 'white' }]}>{item.name} <Text style={styles.muted}>({item.role})</Text></Text>
      <Text style={[styles.muted, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>{t('admin:email')}: {item.email}</Text>
      <Text style={[styles.muted, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>Plan: {item.subscription?.plan || 'free'} • Active: {item.isActive ? 'Yes' : 'No'}</Text>
    </TouchableOpacity>
  );

  // Date picker (conditional)
  let DateTimePicker;
  try { DateTimePicker = require('@react-native-community/datetimepicker').default; } catch(e) { DateTimePicker = null; }
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  const renderHeader = () => (
    <>
      {/* Stats + Charts */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: theme === 'light' ? '#ffffff' : '#1e1e1e' }]}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme === 'light' ? '#ffffff' : '#1e1e1e' }]}>
          <Text style={styles.statValue}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme === 'light' ? '#ffffff' : '#1e1e1e' }]}>
          <Text style={styles.statValue}>{stats.premium}</Text>
          <Text style={styles.statLabel}>Premium</Text>
        </View>
      </View>

      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        <BarChart
          data={{
            labels: ['Student', 'Teacher', 'Admin', 'Guest'],
            datasets: [{ data: [stats.byRole.student||0, stats.byRole.teacher||0, stats.byRole.admin||0, stats.byRole.guest||0] }]
          }}
          width={width - 24}
          height={220}
          chartConfig={{ backgroundColor: '#1e1e1e', backgroundGradientFrom: '#4F46E5', backgroundGradientTo: '#7C3AED', color: () => '#ffffff', labelColor: () => '#ffffff' }}
          style={{ borderRadius: 16 }}
          onDataPointClick={({ index }) => {
            const roles = ['student','teacher','admin','guest'];
            const r = roles[index];
            if (r) { setRole(r); load(1); }
          }}
        />
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <TextInput style={[styles.input, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', color: theme === 'light' ? '#111827' : 'white', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]} placeholder={t('admin:search')} value={search} onChangeText={setSearch} placeholderTextColor={theme === 'light' ? '#9CA3AF' : '#6B7280'} />
        <TextInput style={[styles.input, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', color: theme === 'light' ? '#111827' : 'white', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]} placeholder={t('admin:role')} value={role} onChangeText={setRole} placeholderTextColor={theme === 'light' ? '#9CA3AF' : '#6B7280'} />
        <TextInput style={[styles.input, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', color: theme === 'light' ? '#111827' : 'white', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]} placeholder={t('admin:subscription')} value={subscription} onChangeText={setSubscription} placeholderTextColor={theme === 'light' ? '#9CA3AF' : '#6B7280'} />
      </View>
      <View style={styles.filters}>
        <TextInput style={[styles.input, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', color: theme === 'light' ? '#111827' : 'white', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]} placeholder={t('admin:isActive')} value={isActive} onChangeText={setIsActive} placeholderTextColor={theme === 'light' ? '#9CA3AF' : '#6B7280'} />
        <TouchableOpacity style={[styles.quickBtn, { backgroundColor: '#EEF2FF', borderColor:'#4F46E5' }]} onPress={() => { setSubscription('premium'); setPage(1); }}>
          <Text style={{ color:'#4F46E5', fontWeight:'700' }}>Premium</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.filters}>
        <View style={styles.dateRow}>
          <TextInput style={[styles.input, { flex: 1, backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', color: theme === 'light' ? '#111827' : 'white', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]} placeholder={t('admin:from')} value={from} onChangeText={setFrom} placeholderTextColor={theme === 'light' ? '#9CA3AF' : '#6B7280'} />
          <TouchableOpacity style={[styles.calBtn, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]} onPress={()=>setShowFrom(true)}><Text>📅</Text></TouchableOpacity>
        </View>
        <View style={styles.dateRow}>
          <TextInput style={[styles.input, { flex: 1, backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', color: theme === 'light' ? '#111827' : 'white', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]} placeholder={t('admin:to')} value={to} onChangeText={setTo} placeholderTextColor={theme === 'light' ? '#9CA3AF' : '#6B7280'} />
          <TouchableOpacity style={[styles.calBtn, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]} onPress={()=>setShowTo(true)}><Text>📅</Text></TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.btn} onPress={() => load(1)}><Text style={styles.btnText}>{t('admin:filter')}</Text></TouchableOpacity>
      </View>
      {DateTimePicker && showFrom && (
        <DateTimePicker value={from? new Date(from): new Date()} mode="date" onChange={(e, date)=>{ setShowFrom(false); if (date) setFrom(date.toISOString().slice(0,10)); }} />
      )}
      {DateTimePicker && showTo && (
        <DateTimePicker value={to? new Date(to): new Date()} mode="date" onChange={(e, date)=>{ setShowTo(false); if (date) setTo(date.toISOString().slice(0,10)); }} />
      )}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#121212' }]}>
      {/* Header */}
      <LinearGradient colors={theme === 'light' ? ['#667eea', '#764ba2'] : ['#1e1b4b', '#312e81']} style={styles.header}>
        <Text style={styles.headerTitle}>👥 Users</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => load(1)}><Text style={styles.headerBtnText}>Refresh</Text></TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={exportCSV}><Text style={styles.headerBtnText}>Export CSV</Text></TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={async ()=>{
            try {
              const Print = await import('expo-print');
              const rows = filtered.map(u => `<tr><td>${u.name}</td><td>${u.email}</td><td>${u.role}</td><td>${u.subscription?.plan||'free'}</td><td>${u.isActive?'Yes':'No'}</td><td>${new Date(u.createdAt).toLocaleDateString()}</td></tr>`).join('');
              const html = `<!doctype html><html><head><meta charset='utf-8'><style>table{width:100%;border-collapse:collapse;font-family:Arial}th,td{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#4F46E5;color:#fff;text-align:left}</style></head><body><h2>Users Report</h2><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Plan</th><th>Active</th><th>Created</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
              const { uri } = await Print.printToFileAsync({ html });
              const saved = await saveUriToDownloads(uri, `users_report_${Date.now()}.pdf`, 'application/pdf');
              const finalUri = saved?.uri || uri;
              Alert.alert('PDF Ready', `Saved to: ${finalUri}`,[
                { text: 'Share/Save', onPress: () => import('../../services/exportUtils').then(m => m.openFile(finalUri, 'application/pdf').then(ok => { if (!ok) Alert.alert('Open failed', `File saved at: ${finalUri}`); })) },
                { text: 'OK' }
              ]);
            } catch (e) {
              Alert.alert('Install Required', 'Please install expo-print to export PDF: expo install expo-print');
            }
          }}><Text style={styles.headerBtnText}>Export PDF</Text></TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList 
        data={filtered} 
        keyExtractor={(u)=>u._id} 
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        style={{ flex: 1 }}
      />
      <View style={[styles.pager, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#121212' }]}>
        <TouchableOpacity style={[styles.pagerBtn, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]} onPress={() => { if (page>1) { setPage(page-1); load(page-1);} }}><Text style={{ color: theme === 'light' ? '#111827' : 'white' }}>{t('admin:prev')}</Text></TouchableOpacity>
        <Text style={{ color: theme === 'light' ? '#111827' : 'white' }}>{t('admin:page')}: {page}</Text>
        <TouchableOpacity style={[styles.pagerBtn, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]} onPress={() => { const np = page+1; setPage(np); load(np); }}><Text style={{ color: theme === 'light' ? '#111827' : 'white' }}>{t('admin:next')}</Text></TouchableOpacity>
      </View>

      {/* User Detail Modal */}
      <Modal visible={detailVisible} transparent animationType="fade" onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Animated.ScrollView style={[styles.modalCard, { opacity: 1 }]}>
            <Text style={styles.modalTitle}>{selectedUser?.name}</Text>
            <View style={{ flexDirection:'row', gap:8, marginBottom: 8 }}>
              <TextInput
                style={[styles.modalInput, { borderColor:'#E5E7EB', flex:1 }]}
                placeholder="Search users..."
                placeholderTextColor="#9CA3AF"
                onSubmitEditing={async (e)=>{
                  const q = e.nativeEvent.text || '';
                  if (!q.trim()) return;
                  try { 
                    const res = await adminAPI.getUsers({ search: q, limit: 10 });
                    const first = res?.data?.data?.users?.[0];
                    if (first) { openDetail(first); }
                    else Alert.alert('Not found','No users matched.');
                  } catch(_){}
                }}
              />
            </View>
            {selectedUser && (
              <View style={styles.modalContent}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Email:</Text>
                  <Text style={styles.modalValue}>{selectedUser.email}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Role:</Text>
                  {editMode ? (
                    <View style={{ flex:2 }}>
                      <TextInput
                        style={[styles.modalInput, { borderColor: errors.role ? '#EF4444' : (theme === 'light' ? '#E5E7EB' : '#374151'), color: theme === 'light' ? '#111827' : 'white' }]}
                        value={editUser.role}
                        onChangeText={(text) => { setEditUser({...editUser, role: text}); if (errors.role) setErrors({...errors, role: undefined}); }}
                        placeholder="Role"
                      />
                      {!!errors.role && <Text style={styles.errorText}>{errors.role}</Text>}
                    </View>
                  ) : (
                    <Text style={styles.modalValue}>{selectedUser.role}</Text>
                  )}
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Active:</Text>
                  {editMode ? (
                    <Switch
                      value={editUser.isActive}
                      onValueChange={(value) => setEditUser({...editUser, isActive: value})}
                    />
                  ) : (
                    <Text style={styles.modalValue}>{selectedUser.isActive ? 'Yes' : 'No'}</Text>
                  )}
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Plan:</Text>
                  {editMode ? (
                    <View style={{ flex:2 }}>
                      <TextInput
                        style={[styles.modalInput, { borderColor: errors.plan ? '#EF4444' : (theme === 'light' ? '#E5E7EB' : '#374151'), color: theme === 'light' ? '#111827' : 'white' }]}
                        value={editUser.subscription?.plan || 'free'}
                        onChangeText={(text) => { setEditUser({...editUser, subscription: {...editUser.subscription, plan: text}}); if (errors.plan) setErrors({...errors, plan: undefined}); }}
                        placeholder="Plan"
                      />
                      {!!errors.plan && <Text style={styles.errorText}>{errors.plan}</Text>}
                    </View>
                  ) : (
                    <Text style={styles.modalValue}>{selectedUser.subscription?.plan || 'free'}</Text>
                  )}
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Created:</Text>
                  <Text style={styles.modalValue}>{new Date(selectedUser.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Last Login:</Text>
                  <Text style={styles.modalValue}>{selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleDateString() : 'Never'}</Text>
                </View>
              </View>
            )}
            <View style={styles.modalActions}>
              {editMode ? (
                <>
                  <TouchableOpacity style={styles.modalSaveBtn} onPress={saveUser}>
                    <Text style={styles.modalSaveBtnText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditMode(false)}>
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.modalEditBtn} onPress={() => setEditMode(true)}>
                    <Text style={styles.modalEditBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalDeleteBtn} onPress={deleteUser}>
                    <Text style={styles.modalDeleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailVisible(false)}>
                    <Text style={styles.modalCloseBtnText}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Animated.ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#F9FAFB' },
  header: { paddingTop: 20, paddingHorizontal: 16, paddingBottom: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 12 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  headerActions: { flexDirection:'row', gap: 8, marginTop: 10 },
  headerBtn: { backgroundColor:'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  headerBtnText: { color:'#FFF', fontWeight:'700' },
  statsRow: { flexDirection:'row', gap: 10, paddingHorizontal: 12, marginTop: 8 },
  statBox: { flex:1, borderRadius: 16, padding: 16, shadowColor:'#000', shadowOpacity:0.1, shadowRadius:8, elevation:4 },
  statValue: { fontSize: 22, fontWeight:'800' },
  statLabel: { color:'#6B7280', marginTop: 4, fontWeight:'600' },
  filters: { flexDirection:'row', padding: 12, alignItems:'center' },
  input: { flex:1, backgroundColor:'#FFF', borderRadius: 10, borderWidth:1, borderColor:'#E5E7EB', paddingHorizontal: 10, marginRight: 8 },
  quickBtn: { borderWidth:1, borderColor:'#4F46E5', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  btn: { backgroundColor:'#4F46E5', paddingHorizontal: 12, justifyContent:'center', borderRadius: 10 },
  btnText: { color:'#FFF', fontWeight:'700' },
  card: { backgroundColor:'#FFF', padding: 12, borderRadius: 12, borderWidth:1, borderColor:'#E5E7EB', marginBottom: 10 },
  name: { fontWeight:'800' },
  muted: { color:'#6B7280' },
  pager: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding: 12 },
  pagerBtn: { borderWidth:1, borderColor:'#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  dateRow: { flexDirection:'row', alignItems:'center', flex:1 },
  calBtn: { marginLeft: 8, borderWidth:1, borderColor:'#E5E7EB', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, maxHeight: '80%', width: '100%' },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  modalContent: { marginBottom: 20 },
  modalRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'space-between' },
  modalLabel: { fontWeight: '600', flex: 1 },
  modalValue: { flex: 2, textAlign: 'right' },
  modalInput: { flex: 2, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#F9FAFB' },
  modalActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalEditBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  modalEditBtnText: { color: '#fff', fontWeight: '700' },
  modalSaveBtn: { backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  modalSaveBtnText: { color: '#fff', fontWeight: '700' },
  modalDeleteBtn: { backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  modalDeleteBtnText: { color: '#fff', fontWeight: '700' },
  modalCloseBtn: { backgroundColor: '#6B7280', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  modalCloseBtnText: { color: '#fff', fontWeight: '700' },
  modalCancelBtn: { backgroundColor: '#9CA3AF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  modalCancelBtnText: { color: '#fff', fontWeight: '700' },
  errorText: { color:'#EF4444', marginTop: 4, fontSize: 12, textAlign: 'right' }
});
