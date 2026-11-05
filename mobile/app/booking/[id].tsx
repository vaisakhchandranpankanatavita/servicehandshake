import { useMemo, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../src/api';
import { Badge, Button, Card, Chip, Field, Row, Screen, Stars, Status, Txt, dayLabel, label, money, useFetch, useTheme } from '../../src/ui';

const FLOW = ['REQUESTED', 'CONFIRMED', 'ON_THE_WAY', 'IN_PROGRESS', 'DONE'];
const isoDay = (offset: number) => {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const confirm = (title: string, ok: () => void) => {
  if (Platform.OS === 'web') { if (window.confirm(title)) ok(); return; }
  Alert.alert(title, undefined, [{ text: 'Keep it', style: 'cancel' }, { text: 'Yes', style: 'destructive', onPress: ok }]);
};

export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const { data: b, error, refreshing, refresh, reload } = useFetch<any>(`/bookings/${id}`, 15000);
  const [msg, setMsg] = useState('');
  const [resched, setResched] = useState(false);
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => isoDay(i + 1)), []);
  const [day, setDay] = useState(days[0]);
  const avail = useFetch<any>(b && resched ? `/services/${b.serviceId}/availability?day=${day}${b.providerId ? `&providerId=${b.providerId}` : ''}` : null);
  const [slot, setSlot] = useState('');
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  if (!b) return <Screen><Status error={error} loading={!error} /></Screen>;

  const run = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true); setMsg('');
    try { await fn(); setMsg(ok); await reload(); } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  };
  const open = b.status !== 'DONE' && b.status !== 'CANCELLED';
  const canMove = b.status === 'REQUESTED' || b.status === 'CONFIRMED';
  const step = FLOW.indexOf(b.status);

  return <Screen refresh={refresh} refreshing={refreshing}>
    <Row between><Txt bold size={22}>#{b.id}</Txt><Badge v={b.status} /></Row>
    <Card>
      <Txt bold size={17}>{b.service.name}</Txt>
      <Txt>{dayLabel(b.day)} at {b.slot}</Txt>
      <Txt muted>{b.provider ? `Pro: ${b.provider.name}` : 'Pro will be assigned shortly'}</Txt>
      <Txt muted>{b.address}</Txt>
      <Txt muted>Estimate {money(b.estimate)}</Txt>
      {!!b.notes && <Txt muted>Notes: {b.notes}</Txt>}
    </Card>

    {b.status !== 'CANCELLED' && <Card>
      {FLOW.map((s, i) => <Row key={s}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: i <= step ? t.brand : t.line }} />
        <Txt bold={i === step} muted={i > step}>{label(s)}</Txt>
      </Row>)}
    </Card>}

    {!!msg && <Txt color={/fail|cannot|taken|late|closed|Cannot/.test(msg) ? t.bad : t.ok}>{msg}</Txt>}

    {canMove && !resched && <Button title="Reschedule" kind="ghost" onPress={() => setResched(true)} />}
    {resched && <Card>
      <Txt bold>Pick a new time</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{days.map((d) => <Chip key={d} title={dayLabel(d)} on={d === day} onPress={() => { setDay(d); setSlot(''); }} />)}</View>
      {avail.data && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {avail.data.slots.map((s: any) => <Chip key={s.slot} title={s.slot} on={slot === s.slot} disabled={!s.available} onPress={() => setSlot(s.slot)} />)}
      </View>}
      <Button title="Save new time" disabled={!slot} busy={busy} onPress={() => run(async () => { await api(`/bookings/${b.id}`, 'PATCH', { day, slot }); setResched(false); }, 'Rescheduled.')} />
      <Button title="Never mind" kind="ghost" onPress={() => setResched(false)} />
    </Card>}
    {open && <Button title="Cancel booking" kind="danger" busy={busy} onPress={() => confirm(`Cancel booking #${b.id}?`, () => run(() => api(`/bookings/${b.id}`, 'PATCH', { status: 'CANCELLED' }), 'Booking cancelled.'))} />}

    {b.status === 'DONE' && (b.review
      ? <Card><Txt bold>Your review</Txt><Stars value={b.review.rating} />{!!b.review.text && <Txt>{b.review.text}</Txt>}</Card>
      : <Card>
        <Txt bold>How did it go?</Txt>
        <Stars value={rating} onChange={setRating} />
        <Field label="Comment (optional)" value={text} onChangeText={setText} multiline />
        <Button title="Submit review" disabled={!rating} busy={busy} onPress={() => run(() => api('/reviews', 'POST', { kind: 'service', target: b.serviceId, bookingId: b.id, rating, ...(text.trim() ? { text: text.trim() } : {}) }), 'Thanks for your review!')} />
      </Card>)}
  </Screen>;
}
