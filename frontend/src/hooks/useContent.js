import { useQuery, useMutation, useQueryClient } from 'react-query';
import { listContent, getManyContent, upsertContent, deleteContent } from '../services/contentAPI';

export function useAllContent() {
  return useQuery(['content','all'], async () => {
    const { data } = await listContent();
    return data.data || [];
  });
}

export function useContentKeys(keys = []) {
  return useQuery(['content','keys', keys.sort().join('|')], async () => {
    if (!keys.length) return [];
    const { data } = await getManyContent(keys);
    return data.data || [];
  });
}

export function useUpsertContent() {
  const qc = useQueryClient();
  return useMutation(({ key, value }) => upsertContent(key, value), {
    onSuccess: () => {
      qc.invalidateQueries(['content']);
    }
  });
}

export function useDeleteContent() {
  const qc = useQueryClient();
  return useMutation(({ key }) => deleteContent(key), {
    onSuccess: () => {
      qc.invalidateQueries(['content']);
    }
  });
}

export function pickContent(items = [], key, fallback) {
  const found = items.find(i => i.key === key);
  return found?.value ?? fallback;
}
