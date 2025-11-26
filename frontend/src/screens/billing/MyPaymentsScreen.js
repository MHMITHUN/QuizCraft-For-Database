import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { paymentsAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';

export default function MyPaymentsScreen() {
  const [list, setList] = useState([]);
  const { theme } = useTheme();

  useEffect(() => { (async ()=>{
    try { const res = await paymentsAPI.mine(); setList(res?.data?.data?.payments || []); } catch {}
  })(); }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#121212' }]}>
      <FlatList data={list} keyExtractor={(p)=>p._id} contentContainerStyle={{ padding: 16 }} renderItem={({ item }) => (
        <View style={[styles.card, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]}>
          <Text style={[styles.title, { color: theme === 'light' ? '#111827' : 'white' }]}>৳{item.amount} {item.currency}</Text>
          <Text style={[styles.sub, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>{item.provider} • {item.status} • {item.subscriptionPlan}</Text>
          <Text style={[styles.sub, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
      )} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#F9FAFB' },
  card: { backgroundColor:'#FFF', borderRadius: 12, borderWidth:1, borderColor:'#E5E7EB', padding: 12, marginBottom: 10 },
  title: { fontWeight:'800' },
  sub: { color:'#6B7280' }
});
