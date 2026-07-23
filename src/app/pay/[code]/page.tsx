'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, CheckCircle, AlertCircle, Copy, Smartphone, CreditCard, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PayState = 'loading' | 'ready' | 'yape_plin' | 'card' | 'processing' | 'success' | 'error';

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
      const res = await fetch(`/api/pay/${code}/create-order`, { method: 'POST' });
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4">
          <AlertCircle className="size-12 text-red-400 mx-auto" />
          <h1 className="text-lg font-semibold text-foreground">Error</h1>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4">
          <CheckCircle className="size-16 text-green-500 mx-auto" />
          <h1 className="text-xl font-bold text-foreground">¡Pago exitoso!</h1>
          <p className="text-sm text-muted-foreground">Tu pago ha sido confirmado. Gracias por tu compra.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">{data?.course_title}</h1>
          {data?.course_description && (
            <p className="text-sm text-muted-foreground">{data.course_description}</p>
          )}
          <p className="text-3xl font-bold text-primary mt-2">
            {data && formatPrice(data.amount_pen)}
          </p>
        </div>

        {/* Yape/Plin Flow */}
        {state === 'yape_plin' && orderData && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 text-center space-y-4">
              <QrCode className="size-8 text-primary mx-auto" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Código CIP</p>
                <p className="text-2xl font-bold font-mono tracking-widest text-foreground">
                  {orderData.cip_code}
                </p>
              </div>
              {orderData.cip_qr_url && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={orderData.cip_qr_url}
                    alt="QR CIP"
                    className="w-48 h-48 rounded-lg border border-border"
                  />
                </div>
              )}
              <Button onClick={copyCip} variant="outline" className="w-full border-border">
                <Copy className="size-4" />
                {cipCopied ? '¡Copiado!' : 'Copiar CIP'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Abre Yape o Plin, elige &quot;Pagar con CIP&quot; e ingresa el código de arriba
              </p>
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-center">
              <p className="text-xs text-amber-600 font-medium">Esperando confirmación...</p>
              <p className="text-[10px] text-muted-foreground mt-1">
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
              className="w-full h-14 text-base bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-3"
            >
              <Smartphone className="size-5" />
              Pagar con Yape / Plin
            </Button>
            <Button
              onClick={handleCard}
              variant="outline"
              className="w-full h-14 text-base border-border text-foreground hover:bg-muted flex items-center justify-center gap-3"
            >
              <CreditCard className="size-5" />
              Pagar con tarjeta
            </Button>
          </div>
        )}

        {/* Card flow */}
        {state === 'card' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
              <CreditCard className="size-8 text-primary mx-auto" />
              <p className="text-sm text-foreground font-medium">Pago con tarjeta</p>
              <p className="text-xs text-muted-foreground">
                Serás redirigido al formulario seguro de pago
              </p>
              <Button
                onClick={handleCardPayment}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Pagar {data && formatPrice(data.amount_pen)}
              </Button>
            </div>
          </div>
        )}

        {state === 'processing' && (
          <div className="text-center py-12 space-y-3">
            <Loader2 className="size-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Procesando pago...</p>
          </div>
        )}

        {/* Footer */}
        <p className="text-[10px] text-center text-muted-foreground/50">
          Pago procesado de forma segura con Culqi
        </p>
      </div>
    </div>
  );
}
