import { Platform, Linking } from 'react-native';
import * as FS from 'expo-file-system';
import { File, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple, robust save helpers using the new File API. Files go to app Documents.
// Users can tap "View" to open via Linking/Share.

export async function saveTextToDownloads(text, filename, mimeType = 'text/plain') {
  try {
    const f = new File(Paths.document, filename);
    // create will throw if exists and overwrite=false; we overwrite to replace silently
    f.create({ overwrite: true });
    f.write(text);
    return { uri: f.uri, persisted: true };
  } catch (e) {
    return { error: e?.message || String(e) };
  }
}

export async function saveUriToDownloads(srcUri, filename, mimeType = 'application/octet-stream') {
  try {
    const src = new File(srcUri);
    const dest = new File(Paths.document, filename);
    dest.create({ overwrite: true });
    src.copy(dest);
    return { uri: dest.uri, persisted: true };
  } catch (e) {
    return { error: e?.message || String(e) };
  }
}

export async function openFile(uri, mimeType = undefined) {
  try {
    // Prefer Share sheet which can preview and export to other apps
    try {
      const Sharing = await import('expo-sharing');
      await Sharing.shareAsync(uri, { mimeType });
      return true;
    } catch {}
    // Fallback to Linking
    const can = await Linking.canOpenURL(uri);
    if (can) { await Linking.openURL(uri); return true; }
  } catch {}
  return false;
}
