/** Bind the owner before GoTrue persists its session. A process can die between
 * that write and the promise resolving at the button. Only the exact in-flight
 * request can claim the intent. Credentials are compared in memory and forgotten. */
export type ExchangeFields = Readonly<Record<string, string>>;
interface Capture {
  fields: ExchangeFields;
  bind: (owner: string) => Promise<void>;
}
const exchanges = new Set<Capture>();
export async function withReaderExchange<T>(
  fields: ExchangeFields,
  bind: (owner: string) => Promise<void>,
  run: () => Promise<T>,
) {
  const capture = { fields, bind };
  exchanges.add(capture);
  try {
    return await run();
  } finally {
    exchanges.delete(capture);
  }
}

export function captureReaderExchange(body: unknown) {
  if (!exchanges.size || typeof body !== 'string') return;
  const payload: unknown = JSON.parse(body);
  if (typeof payload !== 'object' || !payload) return;
  for (const exchange of exchanges) {
    if (
      Object.entries(exchange.fields).every(([key, value]) => Reflect.get(payload, key) === value)
    )
      return exchange.bind;
  }
  return undefined;
}

export async function bindReaderResponse(bind: (owner: string) => Promise<void>, json: string) {
  const data: unknown = JSON.parse(json);
  if (typeof data !== 'object' || !data || !('access_token' in data) || !('user' in data)) return;
  const user = data.user;
  if (typeof user === 'object' && user && 'id' in user && typeof user.id === 'string')
    await bind(user.id);
}
