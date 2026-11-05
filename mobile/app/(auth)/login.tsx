import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useSession } from '../../src/session';
import AuthHero from '../../src/AuthHero';
import { Button, Field, Txt, useTheme } from '../../src/ui';

export default function Login() {
  const { login } = useSession();
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setErr('');
    try { await login(email, password); } catch (e: any) { setErr(e.message); setBusy(false); }
  };

  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <AuthHero ratio={0.62} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', padding: 20, paddingBottom: 32, gap: 12 }}>
      <Txt bold size={30}>Good help for the place you love.</Txt>
      <Txt muted>Sign in to book trusted pros and shop for your home.</Txt>
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" onSubmitEditing={submit} />
      {!!err && <Txt color={t.bad}>{err}</Txt>}
      <Button title="Sign in" onPress={submit} busy={busy} disabled={!email || !password} />
      <Link href="/register" style={{ textAlign: 'center', color: t.ink, padding: 8 }}>New here? Create an account</Link>
    </ScrollView>
  </KeyboardAvoidingView>;
}
