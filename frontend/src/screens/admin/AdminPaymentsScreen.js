import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, Alert, ScrollView, Modal, Animated, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import { saveTextToDownloads, saveUriToDownloads } from '../../services/exportUtils';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { adminPaymentsAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';

const { width } = Dimensions.get('window');

export default function AdminPaymentsScreen() {
  const [list, setList] = useState([]);
  const { theme } = useTheme();

  // Detail modal state
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const load = async () => {
    try { const res = await adminPaymentsAPI.list(); setList(res?.data?.data?.payments || []); } catch {}
  };

  useEffect(() => { load(); }, []);

  const revenueByDay = useMemo(() => {
    const map = new Map();
    list.forEach(p => {
      const d = new Date(p.createdAt).toISOString().slice(0,10);
      map.set(d, (map.get(d)||0) + Number(p.amount||0));
    });
    const entries = Array.from(map.entries()).sort((a,b) => a[0].localeCompare(b[0])).slice(-7);
    return { labels: entries.map(e=>e[0].slice(5)), data: entries.map(e=>e[1]) };
  }, [list]);

  const exportCSV = async () => {
    const header = ['user','email','amount','currency','provider','status','plan','createdAt'];
    const toCsv = (v) => `"${String(v ?? '').replace(/"/g,'""')}"`;
    const rows = list.map(p => [p.user?.name||'', p.user?.email||'', p.amount, p.currency, p.provider, p.status, p.subscriptionPlan, new Date(p.createdAt).toISOString()]);
    const csv = [header.join(','), ...rows.map(r => r.map(toCsv).join(','))].join('\n');
    const res = await saveTextToDownloads(csv, `payments_${Date.now()}.csv`, 'text/csv');
    if (res?.error) Alert.alert('Export failed', res.error); else Alert.alert('Exported', `Saved to: ${res.uri}`,[
      { text: 'Share/Save', onPress: () => import('../../services/exportUtils').then(m => m.openFile(res.uri, 'text/csv').then(ok => { if (!ok) Alert.alert('Open failed', `File saved at: ${res.uri}`); })) },
      { text: 'OK' }
    ]);
  };

  const openDetail = (item) => {
    setSelectedPayment(item);
    setDetailVisible(true);
  };

  const renderHeader = () => (
    <View style={{ alignItems:'center', marginVertical: 12 }}>
      <BarChart
        data={{ labels: revenueByDay.labels, datasets:[{ data: revenueByDay.data }] }}
        width={width - 24}
        height={220}
        chartConfig={{ backgroundGradientFrom:'#14B8A6', backgroundGradientTo:'#0D9488', color:()=>'#fff', labelColor:()=>'#fff' }}
        style={{ borderRadius: 16 }}
        onDataPointClick={({ index }) => {
          const label = revenueByDay.labels[index];
          if (!label) return;
          const todayYear = new Date().getFullYear();
          const date = new Date(`${todayYear}-${label}`);
          const y = date.getFullYear();
          const m = String(date.getMonth()+1).padStart(2,'0');
          const d = String(date.getDate()).padStart(2,'0');
          const target = `${y}-${m}-${d}`;
          const filtered = list.filter(p => new Date(p.createdAt).toISOString().slice(0,10).endsWith(label));
          setList(prev => filtered.length ? filtered : prev);
        }}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#121212' }]}>
      <LinearGradient colors={theme === 'light' ? ['#14B8A6', '#0D9488'] : ['#0f172a', '#0b1320']} style={styles.header}>
        <Text style={styles.headerTitle}>💰 Payments</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={load}><Text style={styles.headerBtnText}>Refresh</Text></TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={exportCSV}><Text style={styles.headerBtnText}>Export CSV</Text></TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={async ()=>{
            try {
              const Print = await import('expo-print');
              const rows = list.map(p => `<tr><td>${p.user?.name||''}</td><td>${p.user?.email||''}</td><td>${p.amount}</td><td>${p.currency}</td><td>${p.provider}</td><td>${p.status}</td><td>${p.subscriptionPlan}</td><td>${new Date(p.createdAt).toLocaleString()}</td></tr>`).join('');
              const html = `<!doctype html><html><head><meta charset='utf-8'><style>table{width:100%;border-collapse:collapse;font-family:Arial}th,td{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#0D9488;color:#fff;text-align:left}</style></head><body><h2>Payments Report</h2><table><thead><tr><th>User</th><th>Email</th><th>Amount</th><th>Currency</th><th>Provider</th><th>Status</th><th>Plan</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
              const { uri } = await Print.printToFileAsync({ html });
              const saved = await saveUriToDownloads(uri, `payments_report_${Date.now()}.pdf`, 'application/pdf');
              const finalUri = saved?.uri || uri;
              Alert.alert('PDF Ready', `Saved to: ${finalUri}`,[
                { text: 'Share/Save', onPress: () => import('../../services/exportUtils').then(m => m.openFile(finalUri, 'application/pdf').then(ok => { if (!ok) Alert.alert('Open failed', `File saved at: ${finalUri}`); })) },
                { text: 'OK' }
              ]);
            } catch (e) { Alert.alert('Install Required', 'Please install expo-print to export PDF: expo install expo-print'); }
          }}><Text style={styles.headerBtnText}>Export PDF</Text></TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList 
        data={list} 
        keyExtractor={(p)=>p._id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }} 
        style={{ flex: 1 }}
        renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]}
          onPress={() => openDetail(item)}
          activeOpacity={0.7}
        >
          <Text style={[styles.title, { color: theme === 'light' ? '#111827' : 'white' }]}>{item.user?.name || 'User'} — ৳{item.amount} {item.currency}</Text>
          <Text style={[styles.sub, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>{item.provider} • {item.status} • {item.subscriptionPlan}</Text>
          <Text style={[styles.sub, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>{new Date(item.createdAt).toLocaleString()}</Text>
        </TouchableOpacity>
      )} />

      {/* Payment Detail Modal */}
      <Modal visible={detailVisible} transparent animationType="fade" onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Animated.ScrollView style={[styles.modalCard, { opacity: 1 }] }>
            <Text style={styles.modalTitle}>Payment Details</Text>
            <View style={{ flexDirection:'row', gap:8, marginBottom: 8 }}>
              <TextInput
                style={{ flex:1, borderWidth:1, borderColor:'#E5E7EB', borderRadius:10, paddingHorizontal:10, backgroundColor:'#F9FAFB' }}
                placeholder="Find by user/email/txn"
                placeholderTextColor="#9CA3AF"
                onSubmitEditing={(e)=>{
                  const q = (e.nativeEvent.text||'').toLowerCase();
                  const first = list.find(p => `${p.user?.name||''} ${p.user?.email||''} ${p.transactionId||''}`.toLowerCase().includes(q));
                  if (first) setSelectedPayment(first); else Alert.alert('Not found','No payment matched.');
                }}
              />
            </View>
            {selectedPayment && (
              <View style={styles.modalContent}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>User:</Text>
                  <Text style={styles.modalValue}>{selectedPayment.user?.name || 'Unknown'}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Email:</Text>
                  <Text style={styles.modalValue}>{selectedPayment.user?.email || 'N/A'}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Amount:</Text>
                  <Text style={styles.modalValue}>৳{selectedPayment.amount} {selectedPayment.currency}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Provider:</Text>
                  <Text style={styles.modalValue}>{selectedPayment.provider}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Status:</Text>
                  <Text style={styles.modalValue}>{selectedPayment.status}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Plan:</Text>
                  <Text style={styles.modalValue}>{selectedPayment.subscriptionPlan || 'N/A'}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Transaction ID:</Text>
                  <Text style={styles.modalValue}>{selectedPayment.transactionId || 'N/A'}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Date:</Text>
                  <Text style={styles.modalValue}>{new Date(selectedPayment.createdAt).toLocaleString()}</Text>
                </View>
                {selectedPayment.meta && Object.keys(selectedPayment.meta).length > 0 ? (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Meta:</Text>
                    <Text style={styles.modalValue}>{JSON.stringify(selectedPayment.meta, null, 2)}</Text>
                  </View>
                ) : null}
              </View>
            )}
            <View style={[styles.modalActions, { justifyContent: 'space-between' }]}>
              <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#EF4444' }]} onPress={async () => {
                try { await adminPaymentsAPI.updateStatus(selectedPayment._id, 'failed'); await load(); setDetailVisible(false); } catch {}
              }}>
                <Text style={styles.modalCloseBtnText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailVisible(false)}>
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: '#10B981' }]} onPress={async () => {
                try { await adminPaymentsAPI.updateStatus(selectedPayment._id, 'succeeded'); await load(); setDetailVisible(false); } catch {}
              }}>
                <Text style={styles.modalCloseBtnText}>Approve</Text>
              </TouchableOpacity>
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
  headerTitle: { color:'#FFF', fontSize:22, fontWeight:'800' },
  headerActions: { flexDirection:'row', gap: 8, marginTop: 10 },
  headerBtn: { backgroundColor:'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  headerBtnText: { color:'#FFF', fontWeight:'700' },
  card: { backgroundColor:'#FFF', borderRadius: 12, borderWidth:1, borderColor:'#E5E7EB', padding: 12, marginBottom: 10 },
  title: { fontWeight:'800' },
  sub: { color:'#6B7280' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, maxHeight: '80%', width: '100%' },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  modalContent: { marginBottom: 20 },
  modalRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, justifyContent: 'space-between' },
  modalLabel: { fontWeight: '600', flex: 1 },
  modalValue: { flex: 2, textAlign: 'right' },
  modalActions: { flexDirection: 'row', gap: 8 },
  modalCloseBtn: { backgroundColor: '#6B7280', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  modalCloseBtnText: { color: '#fff', fontWeight: '700' }
});
