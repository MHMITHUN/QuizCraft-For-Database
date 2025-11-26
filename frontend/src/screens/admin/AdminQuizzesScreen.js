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
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function AdminQuizzesScreen({ route, navigation }) {
  const { t } = useI18n();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [isPublic, setIsPublic] = useState('');
  const { theme } = useTheme();

  // Detail modal state
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editQuiz, setEditQuiz] = useState({});
  const [highlightId, setHighlightId] = useState(null);

  const load = async (p = page) => {
    try {
      setLoading(true);
      const res = await adminAPI.getQuizzes({ page: p, limit: 50, status: status || undefined });
      setList(res?.data?.data?.quizzes || []);
      setPage(res?.data?.data?.pagination?.page || p);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const preset = route?.params?.preset || {};
    if (preset?.status) setStatus(preset.status);
    if (preset?.from) setFrom(preset.from);
    if (preset?.to) setTo(preset.to);
    load(1);
  }, []);

  useEffect(() => {
    if (!route?.params?.refreshToken) return;
    const newQuizId = route?.params?.newQuizId;

    if (newQuizId) {
      setHighlightId(newQuizId);
    }

    setPage(1);
    load(1);

    if (navigation?.setParams) {
      navigation.setParams({ ...route.params, refreshToken: undefined, newQuizId: undefined });
    }

    let timeoutId;
    if (newQuizId) {
      timeoutId = setTimeout(() => {
        setHighlightId((current) => (current === newQuizId ? null : current));
      }, 8000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [route?.params?.refreshToken]);

  const filtered = useMemo(() => (Array.isArray(list) ? list.filter(q => {
    const txt = (q.title || '') + ' ' + (q.description || '');
    if (search && !txt.toLowerCase().includes(search.toLowerCase())) return false;
    if (isPublic && String(q.isPublic) !== String(isPublic).toLowerCase()) return false;
    if (from && new Date(q.createdAt) < new Date(from)) return false;
    if (to && new Date(q.createdAt) > new Date(to)) return false;
    return true;
  }) : []), [list, search, isPublic, from, to]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const pub = filtered.filter(q => q.isPublic).length;
    const priv = total - pub;
    return { total, pub, priv };
  }, [filtered]);

  const handleCreateQuiz = () => {
    navigation.navigate('MainTabs', {
      screen: 'Upload',
      params: {
        redirectTo: 'AdminQuizzes',
        redirectParams: {},
      },
    });
  };

  const exportCSV = async () => {
    const header = ['title', 'createdAt', 'public', 'questions'];
    const toCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = filtered.map(q => [q.title, new Date(q.createdAt).toISOString(), q.isPublic ? 'Yes' : 'No', q.questions?.length || 0]);
    const csv = [header.join(','), ...rows.map(r => r.map(toCsv).join(','))].join('\n');
    const res = await saveTextToDownloads(csv, `quizzes_${Date.now()}.csv`, 'text/csv');
    if (res?.error) Alert.alert('Export failed', res.error); else Alert.alert('Exported', `Saved to: ${res.uri}`, [
      { text: 'Share/Save', onPress: () => import('../../services/exportUtils').then(m => m.openFile(res.uri, 'text/csv').then(ok => { if (!ok) Alert.alert('Open failed', `File saved at: ${res.uri}`); })) },
      { text: 'OK' }
    ]);
  };

  let DateTimePicker;
  try { DateTimePicker = require('@react-native-community/datetimepicker').default; } catch (e) { DateTimePicker = null; }
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  const openDetail = (item) => {
    setSelectedQuiz(item);
    setEditQuiz({ ...item });
    setEditMode(false);
    setDetailVisible(true);
  };

  const saveQuiz = async () => {
    const allowedStatus = ['draft', 'published', 'archived'];
    if (!allowedStatus.includes((editQuiz.status || '').trim())) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => { });
      Alert.alert('Invalid', `Status must be one of: ${allowedStatus.join(', ')}`);
      return;
    }
    try {
      await adminAPI.updateQuizStatus(selectedQuiz._id, editQuiz.status || 'published');

      // Update public/private status if changed
      if (editQuiz.isPublic !== selectedQuiz.isPublic) {
        await adminAPI.toggleQuizVisibility(selectedQuiz._id, editQuiz.isPublic);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      Alert.alert('Success', 'Quiz updated successfully');
      load(page);
      setDetailVisible(false);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => { });
      Alert.alert('Error', 'Failed to update quiz');
    }
  };

  const renderItem = ({ item }) => {
    const isHighlighted = highlightId === item._id;
    const cardBackground = theme === 'light' ? '#FFF' : '#1e1e1e';
    const cardBorder = theme === 'light' ? '#E5E7EB' : '#272727';

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: cardBackground, borderColor: cardBorder },
          isHighlighted && styles.cardHighlighted,
        ]}
        onPress={() => openDetail(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeaderRow}>
          <Text
            style={[styles.title, { color: theme === 'light' ? '#111827' : 'white' }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {isHighlighted ? (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>New</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.sub, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
          {t('admin:createdAt')}: {new Date(item.createdAt).toLocaleDateString()} | {t('admin:public')}: {item.isPublic ? 'Yes' : 'No'}
        </Text>
        <Text style={[styles.sub, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>
          Questions: {item.questions?.length || 0} | Status: {item.status || 'published'}
        </Text>
      </TouchableOpacity>
    );
  };
  const renderHeader = () => (
    <>
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: theme === 'light' ? '#ffffff' : '#1e1e1e' }]}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme === 'light' ? '#ffffff' : '#1e1e1e' }]}>
          <Text style={styles.statValue}>{stats.pub}</Text>
          <Text style={styles.statLabel}>Public</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme === 'light' ? '#ffffff' : '#1e1e1e' }]}>
          <Text style={styles.statValue}>{stats.priv}</Text>
          <Text style={styles.statLabel}>Private</Text>
        </View>
      </View>

      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        <BarChart
          data={{ labels: ['Public', 'Private'], datasets: [{ data: [stats.pub, stats.priv] }] }}
          width={width - 24}
          height={220}
          chartConfig={{ backgroundGradientFrom: '#EC4899', backgroundGradientTo: '#7C3AED', color: () => '#fff', labelColor: () => '#fff' }}
          style={{ borderRadius: 16 }}
          onDataPointClick={({ index }) => {
            const val = index === 0 ? 'true' : 'false';
            setIsPublic(val);
            load(1);
          }}
        />
      </View>

      <View style={styles.filters}>
        <TextInput style={[styles.input, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', color: theme === 'light' ? '#111827' : 'white', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]} placeholder={t('admin:search')} value={search} onChangeText={setSearch} placeholderTextColor={theme === 'light' ? '#9CA3AF' : '#6B7280'} />
        <TextInput style={[styles.input, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', color: theme === 'light' ? '#111827' : 'white', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]} placeholder={t('admin:status')} value={status} onChangeText={setStatus} placeholderTextColor={theme === 'light' ? '#9CA3AF' : '#6B7280'} />
      </View>
      <View style={styles.filters}>
        <View style={styles.dateRow}><TextInput style={[styles.input, { flex: 1, backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', color: theme === 'light' ? '#111827' : 'white', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]} placeholder={t('admin:from')} value={from} onChangeText={setFrom} placeholderTextColor={theme === 'light' ? '#9CA3AF' : '#6B7280'} /><TouchableOpacity style={[styles.calBtn, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]} onPress={() => setShowFrom(true)}><Ionicons name="calendar-outline" size={16} color={theme === 'light' ? '#4F46E5' : '#C7D2FE'} /></TouchableOpacity></View>
        <View style={styles.dateRow}><TextInput style={[styles.input, { flex: 1, backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', color: theme === 'light' ? '#111827' : 'white', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]} placeholder={t('admin:to')} value={to} onChangeText={setTo} placeholderTextColor={theme === 'light' ? '#9CA3AF' : '#6B7280'} /><TouchableOpacity style={[styles.calBtn, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]} onPress={() => setShowTo(true)}><Ionicons name="calendar-outline" size={16} color={theme === 'light' ? '#4F46E5' : '#C7D2FE'} /></TouchableOpacity></View>
        <TextInput style={[styles.input, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', color: theme === 'light' ? '#111827' : 'white', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]} placeholder={t('admin:public')} value={isPublic} onChangeText={setIsPublic} placeholderTextColor={theme === 'light' ? '#9CA3AF' : '#6B7280'} />
        <TouchableOpacity style={styles.btn} onPress={() => load(1)}><Text style={styles.btnText}>{t('admin:filter')}</Text></TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#121212' }]}>
      <LinearGradient
        colors={theme === 'light' ? ['#312E81', '#5B21B6'] : ['#111827', '#1F2937']}
        style={styles.header}
      >
        <View style={styles.headerTopRow}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.headerEyebrow}>Admin workspace</Text>
            <Text style={styles.headerTitle}>Quizzes</Text>
            <Text style={[styles.headerSubtitle, { color: theme === 'light' ? '#E0E7FF' : '#C7D2FE' }]}>
              Monitor activity and spin up new assessments in a single place.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateQuiz}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={20} color="#0F172A" />
            <Text style={styles.createButtonText}>New quiz</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => { setPage(1); load(1); }}>
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.headerBtnText}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={exportCSV}>
            <Ionicons name="download-outline" size={16} color="#FFFFFF" />
            <Text style={styles.headerBtnText}>Export CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={async () => {
              try {
                const Print = await import('expo-print');
                const rows = filtered.map(q => `<tr><td>${q.title}</td><td>${new Date(q.createdAt).toLocaleDateString()}</td><td>${q.isPublic ? 'Yes' : 'No'}</td><td>${q.questions?.length || 0}</td></tr>`).join('');
                const html = `<!doctype html><html><head><meta charset='utf-8'><style>table{width:100%;border-collapse:collapse;font-family:Arial}th,td{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#7C3AED;color:#fff;text-align:left}</style></head><body><h2>Quizzes Report</h2><table><thead><tr><th>Title</th><th>Created</th><th>Public</th><th># Questions</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
                const { uri } = await Print.printToFileAsync({ html });
                const saved = await saveUriToDownloads(uri, `quizzes_report_${Date.now()}.pdf`, 'application/pdf');
                const finalUri = saved?.uri || uri;
                Alert.alert('PDF Ready', `Saved to: ${finalUri}`, [
                  { text: 'Share/Save', onPress: () => import('../../services/exportUtils').then(m => m.openFile(finalUri, 'application/pdf').then(ok => { if (!ok) Alert.alert('Open failed', `File saved at: ${finalUri}`); })) },
                  { text: 'OK' }
                ]);
              } catch (e) { Alert.alert('Install Required', 'Please install expo-print to export PDF: expo install expo-print'); }
            }}
          >
            <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
            <Text style={styles.headerBtnText}>Export PDF</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={filtered}
        keyExtractor={(q) => q._id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        extraData={highlightId}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        style={{ flex: 1 }}
      />
      <View style={[styles.pager, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#121212' }]}>
        <TouchableOpacity style={[styles.pagerBtn, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]} onPress={() => { if (page > 1) { setPage(page - 1); load(page - 1); } }}><Text style={{ color: theme === 'light' ? '#111827' : 'white' }}>{t('admin:prev')}</Text></TouchableOpacity>
        <Text style={{ color: theme === 'light' ? '#111827' : 'white' }}>{t('admin:page')}: {page}</Text>
        <TouchableOpacity style={[styles.pagerBtn, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]} onPress={() => { const np = page + 1; setPage(np); load(np); }}><Text style={{ color: theme === 'light' ? '#111827' : 'white' }}>{t('admin:next')}</Text></TouchableOpacity>
      </View>

      {/* Quiz Detail Modal */}
      <Modal visible={detailVisible} transparent animationType="fade" onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Animated.ScrollView style={[styles.modalCard, { opacity: 1 }]}>
            <Text style={styles.modalTitle}>{selectedQuiz?.title}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <TextInput
                style={[styles.modalInput, { borderColor: '#E5E7EB', flex: 1 }]}
                placeholder="Search in current list..."
                placeholderTextColor="#9CA3AF"
                onSubmitEditing={(e) => {
                  const q = (e.nativeEvent.text || '').toLowerCase();
                  const first = filtered.find(x => (x.title || '').toLowerCase().includes(q));
                  if (first) { openDetail(first); } else { Alert.alert('Not found', 'No quizzes matched.'); }
                }}
              />
            </View>
            {selectedQuiz && (
              <View style={styles.modalContent}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Creator:</Text>
                  <Text style={styles.modalValue}>{selectedQuiz.creator?.name || 'Unknown'}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Questions:</Text>
                  <Text style={styles.modalValue}>{selectedQuiz.questions?.length || 0}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Category:</Text>
                  <Text style={styles.modalValue}>{selectedQuiz.category || 'General'}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Public:</Text>
                  {editMode ? (
                    <Switch
                      value={editQuiz.isPublic ?? false}
                      onValueChange={(value) => {
                        setEditQuiz({ ...editQuiz, isPublic: value });
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                      }}
                      trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                      thumbColor={editQuiz.isPublic ? '#FFFFFF' : '#9CA3AF'}
                    />
                  ) : (
                    <Text style={styles.modalValue}>{selectedQuiz.isPublic ? 'Yes' : 'No'}</Text>
                  )}
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Status:</Text>
                  {editMode ? (
                    <TextInput
                      style={[styles.modalInput, { borderColor: theme === 'light' ? '#E5E7EB' : '#374151', color: theme === 'light' ? '#111827' : 'white' }]}
                      value={editQuiz.status || 'published'}
                      onChangeText={(text) => setEditQuiz({ ...editQuiz, status: text })}
                      placeholder="Status"
                    />
                  ) : (
                    <Text style={styles.modalValue}>{selectedQuiz.status || 'published'}</Text>
                  )}
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Created:</Text>
                  <Text style={styles.modalValue}>{new Date(selectedQuiz.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Views:</Text>
                  <Text style={styles.modalValue}>{selectedQuiz.viewCount || 0}</Text>
                </View>
                {selectedQuiz.description ? (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Description:</Text>
                    <Text style={styles.modalValue}>{selectedQuiz.description}</Text>
                  </View>
                ) : null}
              </View>
            )}
            <View style={styles.modalActions}>
              {editMode ? (
                <>
                  <TouchableOpacity style={styles.modalSaveBtn} onPress={saveQuiz}>
                    <Text style={styles.modalSaveBtnText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditMode(false)}>
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.modalEditBtn} onPress={() => setEditMode(true)}>
                    <Text style={styles.modalEditBtnText}>Edit Status</Text>
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingTop: 28, paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  headerTextGroup: { flex: 1 },
  headerEyebrow: { color: '#C7D2FE', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1.2, fontWeight: '700' },
  headerTitle: { color: '#FFF', fontSize: 26, fontWeight: '800', marginTop: 6 },
  headerSubtitle: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  headerBtnText: { color: '#FFF', fontWeight: '700' },
  createButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, elevation: 5 },
  createButtonText: { color: '#0F172A', fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, marginTop: 8 },
  statBox: { flex: 1, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#6B7280', marginTop: 4, fontWeight: '600' },
  filters: { flexDirection: 'row', padding: 12, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, marginRight: 8 },
  btn: { backgroundColor: '#4F46E5', paddingHorizontal: 12, justifyContent: 'center', borderRadius: 10 },
  btnText: { color: '#FFF', fontWeight: '700' },
  card: { backgroundColor: '#FFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10 },
  cardHighlighted: { borderColor: '#4F46E5', shadowColor: '#4F46E5', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  newBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginLeft: 12 },
  newBadgeText: { color: '#4338CA', fontWeight: '700', fontSize: 12 },
  title: { fontWeight: '800' },
  sub: { color: '#6B7280' },
  pager: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  pagerBtn: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  calBtn: { marginLeft: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
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
  modalCloseBtn: { backgroundColor: '#6B7280', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  modalCloseBtnText: { color: '#fff', fontWeight: '700' },
  modalCancelBtn: { backgroundColor: '#9CA3AF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  modalCancelBtnText: { color: '#fff', fontWeight: '700' }
});








