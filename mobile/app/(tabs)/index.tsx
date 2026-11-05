import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Card, Chip, Eyebrow, Chips, Field, Row, Screen, Status, Stars, Txt, money, useFetch, useTheme } from '../../src/ui';

export default function Services() {
  const router = useRouter();
  const t = useTheme();
  const { data, error, refreshing, refresh } = useFetch<any[]>('/services');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');

  const cats = useMemo(() => [...new Set((data ?? []).map((s) => s.category))], [data]);
  const rows = useMemo(() => (data ?? []).filter((s) => (!cat || s.category === cat)
    && `${s.name} ${s.description} ${s.terms}`.toLowerCase().includes(q.trim().toLowerCase())), [data, q, cat]);

  return <Screen refresh={refresh} refreshing={refreshing}>
    <Eyebrow>Our services</Eyebrow>
    <Txt bold size={30}>What needs fixing today?</Txt>
    <Field label="Search services" value={q} onChangeText={setQ} placeholder="Plumbing, AC, cleaning…" />
    <Chips>
      <Chip title="All" on={!cat} onPress={() => setCat('')} />
      {cats.map((c) => <Chip key={c} title={c} on={cat === c} onPress={() => setCat(c)} />)}
    </Chips>
    <Status error={error} loading={!data && !error} empty={data && !rows.length ? 'No services match.' : undefined} />
    {rows.map((s) => <Card key={s.id} onPress={() => router.push(`/service/${s.id}`)}>
      <Row between><Txt bold size={17}>{s.name}</Txt><Txt bold color={t.brand}>from {money(s.fromPrice)}</Txt></Row>
      <Txt muted>{s.description}</Txt>
      <Row>
        {s.rating ? <><Stars value={Math.round(s.rating)} /><Txt muted size={13}>{s.rating.toFixed(1)} ({s.reviews})</Txt></> : <Txt muted size={13}>No reviews yet</Txt>}
        <Txt muted size={13}>· {s.duration} min</Txt>
      </Row>
    </Card>)}
  </Screen>;
}
