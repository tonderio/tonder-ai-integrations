const BASE_URL = process.env.TONDER_API_URL;
const SECRET_KEY = process.env.TONDER_SECRET_KEY;

export async function tonderRequest(path, { method = 'GET', body, idempotencyKey } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Token ${SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const payload = await response.json();

  if (!response.ok) {
    const error = new Error(payload.detail ?? `Tonder request failed (${response.status})`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}
