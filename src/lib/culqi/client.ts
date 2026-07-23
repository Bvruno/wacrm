const CULQI_API = 'https://api.culqi.com/v2';

function getHeaders() {
  const secretKey = process.env.CULQI_SECRET_KEY;
  if (!secretKey) throw new Error('CULQI_SECRET_KEY no está configurada');
  return {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
  };
}

export interface CulqiOrderResponse {
  id: string;
  amount: number;
  currency_code: string;
  description: string;
  order_number: string;
  cip_code: string;
  cip_url: string;
  cip_qr: string;
  state: string;
  creation_date: string;
  expiration_date: string;
}

export interface CulqiChargeResponse {
  id: string;
  amount: number;
  currency_code: string;
  email: string;
  source_id: string;
  outcome: {
    type: string;
    code: string;
    merchant_message: string;
    user_message: string;
  };
  state: string;
  creation_date: string;
}

function generateOrderNumber(): string {
  return `CRM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createCulqiOrder(params: {
  amount: number;
  description: string;
  email?: string;
  name?: string;
}): Promise<CulqiOrderResponse> {
  const body = {
    amount: params.amount,
    currency_code: 'PEN',
    description: params.description.slice(0, 80),
    order_number: generateOrderNumber(),
    client_details: {
      email: params.email || 'comprador@email.com',
      first_name: params.name || 'Comprador',
      last_name: '',
    },
    expiration_date: Math.floor(Date.now() / 1000) + 86400, // 24h
  };

  const res = await fetch(`${CULQI_API}/orders`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Culqi order error (${res.status}): ${err}`);
  }

  return res.json();
}

export async function createCulqiCharge(params: {
  amount: number;
  currency_code?: string;
  email: string;
  source_id: string;
}): Promise<CulqiChargeResponse> {
  const body = {
    amount: params.amount,
    currency_code: params.currency_code || 'PEN',
    email: params.email,
    source_id: params.source_id,
  };

  const res = await fetch(`${CULQI_API}/charges`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Culqi charge error (${res.status}): ${err}`);
  }

  return res.json();
}

export async function getCulqiOrder(orderId: string): Promise<CulqiOrderResponse> {
  const res = await fetch(`${CULQI_API}/orders/${orderId}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Culqi get order error (${res.status}): ${err}`);
  }

  return res.json();
}
