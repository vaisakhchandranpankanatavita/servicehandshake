import { useState } from 'react';
import { useRouter } from 'expo-router';
import { api } from '../../src/api';
import { useSession } from '../../src/session';
import { Button, Card, Field, Row, Screen, Txt, useFetch, useTheme } from '../../src/ui';

export default function Account() {
  const { user, logout, updateProfile } = useSession();
  const router = useRouter();
  const t = useTheme();
  const notes = useFetch<any[]>('/notifications');
  const unread = notes.data?.filter((n) => !n.read).length ?? 0;
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState({ open: false, text: '', sent: false, err: '' });
  const dirty = name !== user?.name || phone !== user?.phone;

  const save = async () => {
    setBusy(true); setMsg('');
    try { await updateProfile({ name: name.trim(), phone }); setMsg('Saved.'); } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  };
  const send = async () => {
    try { await api('/contact', 'POST', { name: user!.name, email: user!.email, message: help.text.trim() }); setHelp({ open: false, text: '', sent: true, err: '' }); }
    catch (e: any) { setHelp((h) => ({ ...h, err: e.message })); }
  };

  return <Screen refresh={notes.refresh} refreshing={notes.refreshing}>
    <Card><Txt bold size={18}>{user?.name}</Txt><Txt muted>{user?.email}</Txt></Card>
    <Button title={unread ? `Notifications (${unread} new)` : 'Notifications'} kind="ghost" onPress={() => router.push('/notifications')} />

    <Txt bold style={{ marginTop: 8 }}>Profile</Txt>
    <Field label="Name" value={name} onChangeText={setName} />
    <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
    {!!msg && <Txt color={msg === 'Saved.' ? t.ok : t.bad}>{msg}</Txt>}
    <Button title="Save changes" onPress={save} busy={busy} disabled={!dirty || name.trim().length < 2} />

    <Txt bold style={{ marginTop: 8 }}>Help</Txt>
    {help.sent && <Txt color={t.ok}>Message sent. We will get back to you by email.</Txt>}
    {help.open
      ? <Card><Field label="How can we help? (10+ characters)" value={help.text} onChangeText={(text) => setHelp((h) => ({ ...h, text }))} multiline />
        {!!help.err && <Txt color={t.bad}>{help.err}</Txt>}
        <Row><Button title="Send" onPress={send} disabled={help.text.trim().length < 10} style={{ flex: 1 }} /><Button title="Cancel" kind="ghost" onPress={() => setHelp((h) => ({ ...h, open: false }))} style={{ flex: 1 }} /></Row></Card>
      : <Button title="Contact support" kind="ghost" onPress={() => setHelp((h) => ({ ...h, open: true, sent: false }))} />}

    <Button title="Sign out" kind="danger" onPress={logout} style={{ marginTop: 16 }} />
  </Screen>;
}
