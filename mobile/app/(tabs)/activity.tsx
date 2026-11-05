import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Badge, Card, Chip, Row, Screen, Status, Txt, dayLabel, money, useFetch, when } from '../../src/ui';

export default function Activity() {
  const router = useRouter();
  const [tab, setTab] = useState<'bookings' | 'orders'>('bookings');
  const { data, error, refreshing, refresh } = useFetch<any[]>(`/${tab}`);

  return <Screen refresh={refresh} refreshing={refreshing}>
    <Row><Chip title="Bookings" on={tab === 'bookings'} onPress={() => setTab('bookings')} /><Chip title="Orders" on={tab === 'orders'} onPress={() => setTab('orders')} /></Row>
    <Status error={error} loading={!data && !error} empty={data && !data.length ? (tab === 'bookings' ? 'No bookings yet. Book a service to get started.' : 'No orders yet.') : undefined} />
    {tab === 'bookings' && (data ?? []).map((b) => <Card key={b.id} onPress={() => router.push(`/booking/${b.id}`)}>
      <Row between><Txt bold>{b.service.name}</Txt><Badge v={b.status} /></Row>
      <Txt muted>{dayLabel(b.day)} · {b.slot}</Txt>
      <Txt muted size={13}>#{b.id}{b.provider ? ` · ${b.provider.name}` : ''}</Txt>
    </Card>)}
    {tab === 'orders' && (data ?? []).map((o) => <Card key={o.id} onPress={() => router.push(`/order/${o.id}`)}>
      <Row between><Txt bold>#{o.id}</Txt><Badge v={o.status} /></Row>
      <Txt muted>{o.items.length} item{o.items.length === 1 ? '' : 's'} · {money(o.total)}</Txt>
      <Txt muted size={13}>{when(o.createdAt)}</Txt>
    </Card>)}
  </Screen>;
}
