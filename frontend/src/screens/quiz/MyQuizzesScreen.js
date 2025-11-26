import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { quizAPI, classesAPI } from '../../services/api';
import { useI18n } from '../../i18n';
import { useTheme } from '../../hooks/useTheme';

export default function MyQuizzesScreen({ route }) {
  const assignToClassId = route?.params?.assignToClassId;
  const { t } = useI18n();
  const [myQuizzes, setMyQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const { theme } = useTheme();

  useEffect(() => {
    (async () => {
      try {
        const res = await quizAPI.getAll({});
        const quizzes = res?.data?.data?.quizzes || [];
        setMyQuizzes(quizzes);
      } catch (e) {
        setMyQuizzes([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const assign = async (quizId) => {
    if (!assignToClassId) return;
    try {
      setAssigningId(quizId);
      await classesAPI.assign(assignToClassId, quizId);
      Alert.alert(t('common:appName'), t('teacher:assignToClass'));
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setAssigningId(null);
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: theme === 'light' ? '#FFF' : '#1e1e1e', borderColor: theme === 'light' ? '#E5E7EB' : '#272727' }]}>
      <Text style={[styles.title, { color: theme === 'light' ? '#111827' : 'white' }]}>{item.title}</Text>
      <Text style={[styles.sub, { color: theme === 'light' ? '#6B7280' : '#9CA3AF' }]}>{item.category}</Text>
      {assignToClassId && (
        <TouchableOpacity style={styles.assignBtn} onPress={() => assign(item._id)} disabled={assigningId === item._id}>
          <Text style={styles.assignText}>{assigningId === item._id ? '...' : t('teacher:assignToClass')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) return <View style={[styles.center, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#121212' }]}><ActivityIndicator /></View>;

  return (
    <View style={[styles.container, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#121212' }]}>
      <FlatList data={myQuizzes} renderItem={renderItem} keyExtractor={(q) => q._id} contentContainerStyle={{ padding: 16 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  sub: { color: '#6B7280', marginTop: 4 },
  assignBtn: { marginTop: 10, backgroundColor: '#2563EB', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  assignText: { color: '#FFF', fontWeight: '700' }
});
