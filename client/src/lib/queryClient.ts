import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false, // Desabilitado por padrão, ativar por query específica
      refetchOnWindowFocus: true, // ✅ Atualizar quando usuário voltar à aba
      refetchOnReconnect: true, // ✅ Atualizar quando reconectar à internet
      staleTime: 1000 * 60 * 2, // 2 minutos - dados considerados "frescos"
      gcTime: 1000 * 60 * 5, // 5 minutos - tempo que dados ficam em cache (era cacheTime)
      retry: 1, // Tentar novamente uma vez em caso de erro
      retryDelay: 1000, // 1 segundo entre tentativas
    },
    mutations: {
      retry: false,
    },
  },
});
