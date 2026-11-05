import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { api } from '../src/api';
import { Card, Screen, Status, Txt, useFetch, useTheme, when } from '../src/ui';

export default function Notifications() {
  const router = useRouter();
  const t = useTheme();
  const { data, error, refreshing, refresh } = useFetch<any[]>('/notifications');

  /* Mark everything read once the list has been shown (keep the unread highlight for this visit). */
  useEffect(() => {
    if (data?.some((n) => !n.read)) { const id = setTimeout(() => api('/notifications/read-all', 'POST').catch(() => {}), 1500); return () => clearTimeout(id); }
  }, [data]);

  const go = (href?: string) => { if (href?.startsWith('/orders')) router.push('/activity'); };

  return <Screen refresh={refresh} refreshing={refreshing}>
    <Status error={error} loading={!data && !error} empty={data && !data.length ? 'You are all caught up.' : undefined} />
    {(data ?? []).map((n) => <Card key={n.id} onPress={() => go(n.href)} style={n.read ? undefined : { borderColor: t.brand, borderWidth: 1 }}>
      <Txt bold={!n.read}>{n.text}</Txt>
      <Txt muted size={12}>{when(n.createdAt)}</Txt>
    </Card>)}
  </Screen>;
}
