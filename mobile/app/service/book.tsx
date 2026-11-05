import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/api';
import { useSession } from '../../src/session';
import { Button, Chip, Field, Screen, Status, Txt, dayLabel, money, useFetch, useTheme } from '../../src/ui';

const isoDay = (offset: number) => {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function Book() {
  const { serviceId, providerId } = useLocalSearchParams<{ serviceId: string; providerId?: string }>();
  const router = useRouter();
  const { user } = useSession();
  const t = useTheme();
  const svc = useFetch<any>(`/services/${serviceId}`);
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => isoDay(i + 1)), []);
  const [day, setDay] = useState(days[0]);
  const [slot, setSlot] = useState('');
  const avail = useFetch<any>(`/services/${serviceId}/availability?day=${day}${providerId ? `&providerId=${providerId}` : ''}`);
  const [f, setF] = useState({ name: user?.name ?? '', phone: user?.phone ?? '', address: '', notes: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setSlot(''), [day]);

  const pro = svc.data?.providers.find((p: any) => String(p.id) === providerId);
  const set = (k: string) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const ready = slot && f.name.trim() && /^[0-9+\s-]{8,15}$/.test(f.phone) && f.address.trim();

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const b = await api('/bookings', 'POST', { serviceId: Number(serviceId), ...(providerId ? { providerId: Number(providerId) } : {}), day, slot, name: f.name.trim(), phone: f.phone, address: f.address.trim(), ...(f.notes.trim() ? { notes: f.notes.trim() } : {}) });
      router.replace(`/booking/${b.id}`);
    } catch (e: any) { setErr(e.message); setBusy(false); if (e.status === 409) avail.reload(); }
  };

  if (!svc.data) return <Screen><Status error={svc.error} loading={!svc.error} /></Screen>;

  return <Screen>
    <Txt bold size={20}>{svc.data.name}{pro ? ` with ${pro.name}` : ''}</Txt>
    <Txt muted>Estimate from {money(svc.data.fromPrice)} · final price confirmed by your pro</Txt>

    <Txt bold style={{ marginTop: 6 }}>Day</Txt>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{days.map((d) => <Chip key={d} title={dayLabel(d)} on={d === day} onPress={() => setDay(d)} />)}</View>

    <Txt bold style={{ marginTop: 6 }}>Time</Txt>
    {!avail.data ? <Status error={avail.error} loading={!avail.error} /> :
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {avail.data.slots.map((s: any) => <Chip key={s.slot} title={s.available ? s.slot : `${s.slot} · taken`} on={slot === s.slot} disabled={!s.available} onPress={() => setSlot(s.slot)} />)}
      </View>}

    <Txt bold style={{ marginTop: 6 }}>Your details</Txt>
    <Field label="Name" value={f.name} onChangeText={set('name')} />
    <Field label="Phone" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
    <Field label="Address" value={f.address} onChangeText={set('address')} multiline />
    <Field label="Notes for the pro (optional)" value={f.notes} onChangeText={set('notes')} multiline />
    {!!err && <Txt color={t.bad}>{err}</Txt>}
    <Button title="Confirm booking" onPress={submit} busy={busy} disabled={!ready} />
  </Screen>;
}
