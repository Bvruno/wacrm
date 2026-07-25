'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  Smartphone,
  CreditCard,
  QrCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type PayState =
  | 'loading'
  | 'ready'
  | 'yape_plin'
  | 'card'
  | 'processing'
  | 'success'
  | 'error';

interface PayData {
  code: string;
  amount_pen: number;
  contact_name: string | null;
  course_title: string;
  course_description: string;
}

interface OrderData {
  cip_code: string;
  cip_qr_url: string;
  amount_pen: number;
}

export default function PayPage() {
  const params = useParams();
  const code = params.code as string;

  const [state, setState] = useState<PayState>('loading');
  const [data, setData] = useState<PayData | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [cipCopied, setCipCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/pay/${code}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          setErrorMsg(json.error);
          setState('error');
        } else {
          setData(json);
          setState('ready');
        }
      })
      .catch(() => {
        setErrorMsg('Error al cargar');
        setState('error');
      });
  }, [code]);

  const handleYapePlin = async () => {
    setState('processing');
    try {
      const res = await fetch(`/api/pay/${code}/create-order`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.error) {
        setErrorMsg(json.error);
        setState('error');
      } else {
        setOrderData(json);
        setState('yape_plin');
      }
    } catch {
      setErrorMsg('Error al generar orden');
      setState('error');
    }
  };

  const handleCard = () => {
    setState('card');
  };

  const handleCardPayment = async () => {
    setState('processing');
    try {
      const res = await fetch(`/api/pay/${code}/confirm-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: 'tok_test_123' }),
      });
      const json = await res.json();
      if (json.success) {
        setState('success');
      } else {
        setErrorMsg(json.error || 'Error al procesar pago');
        setState('error');
      }
    } catch {
      setErrorMsg('Error de conexión');
      setState('error');
    }
  };

  async function copyCip() {
    if (!orderData) return;
    await navigator.clipboard.writeText(orderData.cip_code);
    setCipCopied(true);
    setTimeout(() => setCipCopied(false), 2000);
  }

  function formatPrice(cents: number) {
    return `S/ ${(cents / 100).toFixed(2)}`;
  }

  if (state === 'loading') {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-4">
        <div className="max-w-sm space-y-4 text-center">
          <AlertCircle className="mx-auto size-12 text-red-400" />
          <h1 className="text-foreground text-lg font-semibold">Error</h1>
          <p className="text-muted-foreground text-sm">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-4">
        <div className="max-w-sm space-y-4 text-center">
          <CheckCircle className="mx-auto size-16 text-green-500" />
          <h1 className="text-foreground text-xl font-bold">¡Pago exitoso!</h1>
          <p className="text-muted-foreground text-sm">
            Tu pago ha sido confirmado. Gracias por tu compra.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="from-background to-muted/30 flex min-h-screen items-center justify-center bg-gradient-to-b p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="space-y-1 text-center">
          <h1 className="text-foreground text-2xl font-bold">
            {data?.course_title}
          </h1>
          {data?.course_description && (
            <p className="text-muted-foreground text-sm">
              {data.course_description}
            </p>
          )}
          <p className="text-primary mt-2 text-3xl font-bold">
            {data && formatPrice(data.amount_pen)}
          </p>
        </div>

        {/* Yape/Plin Flow */}
        {state === 'yape_plin' && orderData && (
          <div className="space-y-4">
            <div className="border-border bg-card space-y-4 rounded-xl border p-6 text-center">
              <QrCode className="text-primary mx-auto size-8" />
              <div>
                <p className="text-muted-foreground mb-1 text-xs">Código CIP</p>
                <p className="text-foreground font-mono text-2xl font-bold tracking-widest">
                  {orderData.cip_code}
                </p>
              </div>
              {orderData.cip_qr_url && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={orderData.cip_qr_url}
                    alt="QR CIP"
                    className="border-border h-48 w-48 rounded-lg border"
                  />
                </div>
              )}
              <Button
                onClick={copyCip}
                variant="outline"
                className="border-border w-full"
              >
                <Copy className="size-4" />
                {cipCopied ? '¡Copiado!' : 'Copiar CIP'}
              </Button>
              <p className="text-muted-foreground text-xs">
                Abre Yape o Plin, elige &quot;Pagar con CIP&quot; e ingresa el
                código de arriba
              </p>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-center">
              <p className="text-xs font-medium text-amber-600">
                Esperando confirmación...
              </p>
              <p className="text-muted-foreground mt-1 text-[10px]">
                El pago se confirmará automáticamente al recibir la notificación
              </p>
            </div>
          </div>
        )}

        {/* Method selection */}
        {state === 'ready' && (
          <div className="space-y-3">
            <Button
              onClick={handleYapePlin}
              className="bg-primary hover:bg-primary/90 text-primary-foreground flex h-14 w-full items-center justify-center gap-3 text-base"
            >
              <Smartphone className="size-5" />
              Pagar con Yape / Plin
            </Button>
            <Button
              onClick={handleCard}
              variant="outline"
              className="border-border text-foreground hover:bg-muted flex h-14 w-full items-center justify-center gap-3 text-base"
            >
              <CreditCard className="size-5" />
              Pagar con tarjeta
            </Button>
          </div>
        )}

        {/* Card flow */}
        {state === 'card' && (
          <div className="space-y-4">
            <div className="border-border bg-card space-y-3 rounded-xl border p-6 text-center">
              <CreditCard className="text-primary mx-auto size-8" />
              <p className="text-foreground text-sm font-medium">
                Pago con tarjeta
              </p>
              <p className="text-muted-foreground text-xs">
                Serás redirigido al formulario seguro de pago
              </p>
              <Button
                onClick={handleCardPayment}
                className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
              >
                Pagar {data && formatPrice(data.amount_pen)}
              </Button>
            </div>
          </div>
        )}

        {state === 'processing' && (
          <div className="space-y-3 py-12 text-center">
            <Loader2 className="text-primary mx-auto size-8 animate-spin" />
            <p className="text-muted-foreground text-sm">Procesando pago...</p>
          </div>
        )}

        {/* Footer */}
        <p className="text-muted-foreground/50 text-center text-[10px]">
          Pago procesado de forma segura con Culqi
        </p>
      </div>
    </div>
  );
}
