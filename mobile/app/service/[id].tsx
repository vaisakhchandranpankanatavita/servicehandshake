import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Row, Screen, Status, Stars, Txt, money, useFetch, useTheme } from '../../src/ui';

export default function ServiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();
  const svc = useFetch<any>(`/services/${id}`);
  const reviews = useFetch<any[]>(`/reviews?kind=service&target=${id}`);
  const s = svc.data;

  if (!s) return <Screen><Status error={svc.error} loading={!svc.error} /></Screen>;
  const book = (providerId?: number) => router.push({ pathname: '/service/book', params: { serviceId: String(s.id), ...(providerId ? { providerId: String(providerId) } : {}) } });

  return <Screen refresh={() => { svc.refresh(); reviews.refresh(); }} refreshing={svc.refreshing}>
    <Txt bold size={24}>{s.name}</Txt>
    <Txt muted>{s.description}</Txt>
    <Row><Txt bold color={t.brand}>from {money(s.fromPrice)}</Txt><Txt muted>· about {s.duration} min</Txt></Row>
    <Button title="Book with the first available pro" onPress={() => book()} />

    <Txt bold size={17} style={{ marginTop: 8 }}>Choose a pro</Txt>
    {!s.providers.length && <Txt muted>No pros listed for this service yet.</Txt>}
    {s.providers.map((p: any) => <Card key={p.id}>
      <Row between><Txt bold>{p.name}{p.verified ? '  ✓' : ''}</Txt><Txt muted size={13}>{p.years} yrs</Txt></Row>
      <Txt muted size={13}>Typically responds in {p.response}</Txt>
      <Button title={`Book ${p.name.split(' ')[0]}`} kind="ghost" onPress={() => book(p.id)} style={{ marginTop: 6 }} />
    </Card>)}

    <Txt bold size={17} style={{ marginTop: 8 }}>Reviews</Txt>
    {reviews.data && !reviews.data.length && <Txt muted>No reviews yet.</Txt>}
    {(reviews.data ?? []).map((r) => <Card key={r.id}>
      <Row between><Txt bold>{r.user.name}</Txt><Stars value={r.rating} /></Row>
      {!!r.text && <Txt>{r.text}</Txt>}
    </Card>)}
  </Screen>;
}
