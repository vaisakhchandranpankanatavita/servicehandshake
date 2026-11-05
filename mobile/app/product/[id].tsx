import { useState } from 'react';
import { Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, img } from '../../src/api';
import { useCart } from '../../src/cart';
import { Button, Card, Row, Screen, Stars, Status, Txt, money, useFetch, useTheme } from '../../src/ui';

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();
  const cart = useCart();
  const p = useFetch<any>(`/products/${id}`);
  const reviews = useFetch<any[]>(`/reviews?kind=product&target=${id}`);
  const wish = useFetch<any[]>('/wishlist');
  const [added, setAdded] = useState(false);
  const saved = !!wish.data?.some((x) => String(x.id) === id);

  const toggleWish = async () => {
    await api(`/wishlist/${id}`, saved ? 'DELETE' : 'PUT').catch(() => {});
    wish.reload();
  };

  if (!p.data) return <Screen><Status error={p.error} loading={!p.error} /></Screen>;
  const d = p.data;
  const save = d.oldPrice > d.price ? Math.round((1 - d.price / d.oldPrice) * 100) : 0;

  return <Screen>
    <Image source={{ uri: img(d.img) }} style={{ width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: t.idleBg }} resizeMode="contain" accessibilityLabel={d.name} />
    <Txt bold size={22}>{d.name}</Txt>
    <Txt muted>Sold by {d.seller}</Txt>
    <Row><Txt bold size={20} color={t.brand}>{money(d.price)}</Txt><Txt muted style={{ textDecorationLine: 'line-through' }}>{money(d.oldPrice)}</Txt>{save > 0 && <Txt color={t.ok} bold>{save}% off</Txt>}</Row>
    {!!d.blurb && <Txt>{d.blurb}</Txt>}
    <Button title={added ? 'Added ✓  Add another' : 'Add to cart'} onPress={() => { cart.add(d); setAdded(true); }} />
    {added && <Button title="Go to cart" kind="ghost" onPress={() => router.push('/cart')} />}
    <Button title={saved ? 'Remove from wishlist' : 'Save to wishlist'} kind="ghost" onPress={toggleWish} />

    <Txt bold size={17} style={{ marginTop: 8 }}>Reviews</Txt>
    {reviews.data && !reviews.data.length && <Txt muted>No reviews yet. Buyers can review from their order.</Txt>}
    {(reviews.data ?? []).map((r) => <Card key={r.id}><Row between><Txt bold>{r.user.name}</Txt><Stars value={r.rating} /></Row>{!!r.text && <Txt>{r.text}</Txt>}</Card>)}
  </Screen>;
}
