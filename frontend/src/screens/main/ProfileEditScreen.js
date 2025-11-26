import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Image } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { userAPI } from '../../services/api';
import { useI18n } from '../../i18n';
import { useAuth } from '../../context/AuthContext';

export default function ProfileEditScreen({ navigation }) {
  const { t } = useI18n();
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [address, setAddress] = useState(user?.address || {});
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const pickAvatar = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*' });
      if (result.type === 'success') {
        const formData = new FormData();
        formData.append('avatar', { uri: result.uri, name: result.name || 'avatar.jpg', type: result.mimeType || 'image/jpeg' });
        await userAPI.uploadAvatar(formData);
        setAvatar(result.uri);
        await refreshUser();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to upload avatar');
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      await userAPI.updateProfile({ name, phone, bio, address });
      await refreshUser();
      Alert.alert('QuizCraft', 'Profile updated');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}><Text style={{ fontSize: 28 }}>👤</Text></View>
        )}
        <TouchableOpacity style={styles.avatarBtn} onPress={pickAvatar}>
          <Text style={styles.avatarBtnText}>Change Photo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextInput style={[styles.input, { height: 80 }]} multiline placeholder="Bio" value={bio} onChangeText={setBio} />

        <TextInput style={styles.input} placeholder="Address Line 1" value={address.line1 || ''} onChangeText={(v)=>setAddress({ ...address, line1: v })} />
        <TextInput style={styles.input} placeholder="Address Line 2" value={address.line2 || ''} onChangeText={(v)=>setAddress({ ...address, line2: v })} />
        <TextInput style={styles.input} placeholder="City" value={address.city || ''} onChangeText={(v)=>setAddress({ ...address, city: v })} />
        <TextInput style={styles.input} placeholder="State" value={address.state || ''} onChangeText={(v)=>setAddress({ ...address, state: v })} />
        <TextInput style={styles.input} placeholder="Postal Code" value={address.postalCode || ''} onChangeText={(v)=>setAddress({ ...address, postalCode: v })} />
        <TextInput style={styles.input} placeholder="Country" value={address.country || ''} onChangeText={(v)=>setAddress({ ...address, country: v })} />

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          <Text style={styles.saveText}>{saving ? '...' : t('common:save')}</Text>
        </TouchableOpacity>

        {/* Change Password */}
        <View style={{ height: 16 }} />
        <TextInput style={styles.input} placeholder="Current Password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
        <TextInput style={styles.input} placeholder="New Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor:'#10B981' }]} onPress={async ()=>{
          try { await userAPI.resetPassword(currentPassword, newPassword); Alert.alert('QuizCraft','Password updated'); setCurrentPassword(''); setNewPassword(''); } catch (e) { Alert.alert('Error', e.message);} 
        }}>
          <Text style={styles.saveText}>Update Password</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { alignItems: 'center', padding: 20 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 8 },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#E5E7EB', alignItems:'center', justifyContent:'center', marginBottom: 8 },
  avatarBtn: { borderWidth: 1, borderColor: '#4F46E5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  avatarBtnText: { color: '#4F46E5', fontWeight: '700' },
  form: { padding: 16 },
  input: { backgroundColor:'#FFF', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth:1, borderColor:'#E5E7EB' },
  saveBtn: { backgroundColor:'#4F46E5', alignItems:'center', padding: 14, borderRadius: 12, marginTop: 8 },
  saveText: { color:'#FFF', fontWeight:'800' },
});
