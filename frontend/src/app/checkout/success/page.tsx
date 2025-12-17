'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { CheckCircle, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [orderData, setOrderData] = useState<any>(null);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 10;

  useEffect(() => {
    if (sessionId && orderId) {
      pollPaymentStatus();
    } else {
      setError('Sesión de pago no válida');
      setLoading(false);
    }
  }, [sessionId, orderId]);

  const pollPaymentStatus = async () => {
    if (attempts >= maxAttempts) {
      setError('El pago está siendo procesado. Revisa tu correo para la confirmación.');
      setVerifying(false);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/checkout/verify', {
        params: { session_id: sessionId, order_id: orderId },
      });

      setOrderData(res.data);

      if (res.data.paymentStatus === 'paid') {
        setVerifying(false);
        setLoading(false);
      } else if (res.data.status === 'expired') {
        setError('La sesión de pago ha expirado');
        setLoading(false);
      } else {
        // Continue polling
        setAttempts((prev) => prev + 1);
        setTimeout(pollPaymentStatus, 2000);
      }
    } catch (err) {
      setError('Error al verificar el pago');
      setLoading(false);
    }
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full mx-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verificando pago...</h2>
          <p className="text-gray-500">Por favor espera mientras confirmamos tu pago</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full mx-4">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verificación pendiente</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Success Card */}
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Pago Confirmado!
          </h1>
          <p className="text-gray-500 mb-6">
            Gracias por tu compra. Tu pago ha sido procesado exitosamente.
          </p>

          {/* Order Details */}
          {orderData?.product && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-3">Detalles de la compra</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Producto</span>
                  <span className="font-medium">{orderData.product.title}</span>
                </div>
                {orderData.tipster && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipster</span>
                    <span className="font-medium">{orderData.tipster.publicName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Total pagado</span>
                  <span className="font-bold text-green-600">
                    {formatPrice(orderData.amountTotal, orderData.currency?.toUpperCase() || 'EUR')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Access Instructions */}
          <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-2">Próximos pasos</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>✅ Recibirás un email con los detalles de tu compra</li>
              <li>✅ Si viniste desde Telegram, recibirás el enlace de acceso al canal premium</li>
              <li>✅ El acceso se activa de forma inmediata</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
            >
              Volver al inicio
            </Link>
          </div>
        </div>

        {/* Support */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            ¿Tienes problemas?{' '}
            <a href="mailto:soporte@antia.com" className="text-blue-600 hover:underline">
              Contacta con soporte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
