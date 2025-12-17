'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { CheckCircle, Loader2, ExternalLink, AlertCircle, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orderData, setOrderData] = useState<any>(null);
  const [telegramLink, setTelegramLink] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      completePayment();
    } else {
      setError('Sesión de pago no válida');
      setLoading(false);
    }
  }, [orderId, sessionId]);

  const completePayment = async () => {
    try {
      // Complete payment and trigger notifications
      const res = await api.post('/checkout/complete-payment', {
        orderId,
        sessionId,
      });

      setOrderData(res.data);
      
      // If there's a Telegram invite link, save it
      if (res.data.telegramNotification?.inviteLink) {
        setTelegramLink(res.data.telegramNotification.inviteLink);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error completing payment:', err);
      // Try to get order details even if completion failed
      try {
        const orderRes = await api.get(`/checkout/order/${orderId}`);
        setOrderData(orderRes.data);
      } catch (orderErr) {
        setError('Error al procesar el pago');
      }
      setLoading(false);
    }
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const getBotUsername = () => {
    // Get bot username from environment or use default
    return 'Antiabetbot';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full mx-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Procesando pago...</h2>
          <p className="text-gray-500">Por favor espera mientras confirmamos tu pago</p>
        </div>
      </div>
    );
  }

  if (error && !orderData) {
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

  const order = orderData?.order;
  const product = orderData?.product;
  const tipster = orderData?.tipster;
  const hasTelegram = order?.telegramUserId;

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
          {product && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-3">Detalles de la compra</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Producto</span>
                  <span className="font-medium">{product.title}</span>
                </div>
                {tipster && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipster</span>
                    <span className="font-medium">{tipster.publicName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Total pagado</span>
                  <span className="font-bold text-green-600">
                    {formatPrice(order?.amountCents || product.priceCents, order?.currency || product.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado</span>
                  <span className="font-medium text-green-600">✓ Pagado</span>
                </div>
              </div>
            </div>
          )}

          {/* Telegram Access - Primary Action */}
          {hasTelegram && (
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Acceso vía Telegram</h3>
              </div>
              <p className="text-sm text-blue-800 mb-4">
                Hemos enviado el enlace de acceso al canal premium a tu chat de Telegram. 
                Haz clic en el botón para volver al bot y acceder.
              </p>
              <div className="space-y-2">
                {/* Link para app de Telegram */}
                <a
                  href={`tg://resolve?domain=${getBotUsername()}`}
                  className="block w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Abrir en App de Telegram
                </a>
                {/* Link alternativo para web */}
                <a
                  href={`https://t.me/${getBotUsername()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-white border border-blue-300 text-blue-600 py-3 rounded-xl font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  Abrir en Telegram Web
                </a>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-green-50 rounded-xl p-4 mb-6 text-left">
            <h3 className="font-semibold text-green-900 mb-2">Próximos pasos</h3>
            <ul className="text-sm text-green-800 space-y-2">
              {hasTelegram ? (
                <>
                  <li>✅ Ve a Telegram para ver el mensaje de confirmación</li>
                  <li>✅ Haz clic en el enlace para unirte al canal premium</li>
                  <li>✅ Empieza a recibir los pronósticos del tipster</li>
                </>
              ) : (
                <>
                  <li>✅ Recibirás un email con los detalles de tu compra</li>
                  <li>✅ El tipster te contactará con los detalles de acceso</li>
                  <li>✅ Revisa tu bandeja de entrada y spam</li>
                </>
              )}
            </ul>
          </div>

          {/* Direct Channel Link (if available) */}
          {telegramLink && (
            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 mb-4"
            >
              <ExternalLink className="w-5 h-5" />
              Entrar al Canal Premium Directamente
            </a>
          )}

          {/* Secondary Actions */}
          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full bg-gray-100 text-gray-900 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
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
