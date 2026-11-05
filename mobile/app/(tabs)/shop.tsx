import { useMemo, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { img } from '../../src/api';
import { useCart } from '../../src/cart';
import { Button, Card, Chip, Chips, Eyebrow, Field, Screen, Status, Txt, money, useFetch, useTheme } from '../../src/ui';

export default function Shop() {
  const router = useRouter();
  const t = useTheme();
  const cart = useCart();
  const { data, error, refreshing, refresh } = useFetch<any[]>('/products');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const cats = useMemo(() => [...new Set((data ?? []).map((p) => p.category))], [data]);
  const rows = useMemo(() => (data ?? []).filter((p) => (!cat || p.category === cat) && `${p.name} ${p.seller}`.toLowerCase().includes(q.trim().toLowerCase())), [data, q, cat]);

  return <Screen refresh={refresh} refreshing={refreshing}>
    <Eyebrow>Marketplace</Eyebrow>
    <Txt bold size={30}>Things for the place you love.</Txt>
    <Field label="Search products" value={q} onChangeText={setQ} />
    <Chips><Chip title="All" on={!cat} onPress={() => setCat('')} />{cats.map((c) => <Chip key={c} title={c} on={cat === c} onPress={() => setCat(c)} />)}</Chips>
    <Status error={error} loading={!data && !error} empty={data && !rows.length ? 'No products match.' : undefined} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {rows.map((p) => <View key={p.id} style={{ width: '47.5%', flexGrow: 1 }}>
        <Card style={{ flex: 1 }}>
          <Pressable onPress={() => router.push(`/product/${p.id}`)} accessibilityRole="link" accessibilityLabel={p.name} style={{ gap: 6 }}>
          <Image source={{ uri: img(p.img) }} style={{ width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: t.idleBg }} resizeMode="cover" accessibilityLabel={p.name} />
          <Txt bold numberOfLines={2}>{p.name}</Txt>
          <Txt muted size={12}>{p.seller}</Txt>
          <Txt bold color={t.brand}>{money(p.price)} <Txt muted size={12} style={{ textDecorationLine: 'line-through' }}>{money(p.oldPrice)}</Txt></Txt>
          </Pressable>
          <Button title="Add to cart" kind="ghost" onPress={() => cart.add(p)} style={{ paddingVertical: 8 }} />
        </Card>
      </View>)}
    </View>
  </Screen>;
}
