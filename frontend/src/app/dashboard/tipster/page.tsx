'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { productsApi, referralsApi, payoutsApi, authApi, telegramApi, ordersApi } from '@/lib/api';

type ViewType = 'dashboard' | 'products' | 'referrals' | 'payouts' | 'profile' | 'telegram';

export default function TipsterDashboard() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [salesStats, setSalesStats] = useState<any>(null);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priceCents: '',
    billingType: 'ONE_TIME',
    telegramChannelId: '',
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Telegram state
  const [telegramChannel, setTelegramChannel] = useState<any>(null);
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramChannelInput, setTelegramChannelInput] = useState('');
  const [telegramError, setTelegramError] = useState('');
  const [publishingProduct, setPublishingProduct] = useState<string | null>(null);
  const [premiumChannelLink, setPremiumChannelLink] = useState('');
  const [savingPremiumChannel, setSavingPremiumChannel] = useState(false);

  useEffect(() => {
    // Verificar autenticación antes de cargar datos
    const checkAuthAndLoadData = async () => {
      // Pequeño delay para asegurar que localStorage está disponible
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }
      
      loadData();
    };
    
    checkAuthAndLoadData();
  }, []);

  const loadData = async () => {
    try {
      // Load products
      try {
        const productsRes = await productsApi.getMy();
        setProducts(productsRes.data);
      } catch (error) {
        console.error('Error loading products:', error);
      }
      
      // Load metrics (optional)
      try {
        const metricsRes = await referralsApi.getMetrics();
        setMetrics(metricsRes.data);
      } catch (error) {
        console.error('Error loading metrics:', error);
        setMetrics({ clicks: 0, registers: 0, ftds: 0, deposits: 0, totalDeposits: 0, conversionRate: 0 });
      }

      // Load Telegram channel info
      try {
        const telegramRes = await telegramApi.getChannelInfo();
        if (telegramRes.data.connected) {
          setTelegramConnected(true);
          setTelegramChannel(telegramRes.data.channel);
        }
        if (telegramRes.data.premiumChannelLink) {
          setPremiumChannelLink(telegramRes.data.premiumChannelLink);
        }
      } catch (error) {
        console.error('Error loading Telegram info:', error);
      }

      // Load sales stats
      try {
        const statsRes = await ordersApi.getMyStats();
        setSalesStats(statsRes.data);
      } catch (error) {
        console.error('Error loading sales stats:', error);
        setSalesStats({ totalSales: 0, totalEarningsCents: 0, currency: 'EUR' });
      }

      // Load recent sales
      try {
        const salesRes = await ordersApi.getMySales();
        setRecentSales(salesRes.data.slice(0, 10)); // Last 10 sales
      } catch (error) {
        console.error('Error loading recent sales:', error);
        setRecentSales([]);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      localStorage.removeItem('access_token');
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
      localStorage.removeItem('access_token');
      router.push('/');
    }
  };

  // Telegram functions
  const handleConnectTelegram = async () => {
    if (!telegramChannelInput.trim()) {
      setTelegramError('Por favor, ingresa el ID o @username del canal');
      return;
    }

    setTelegramLoading(true);
    setTelegramError('');

    try {
      const response = await telegramApi.connect(telegramChannelInput.trim());
      
      if (response.data.success) {
        setTelegramConnected(true);
        setTelegramChannel(response.data.channelInfo);
        setTelegramChannelInput('');
        alert('✅ Canal conectado exitosamente');
      } else {
        setTelegramError(response.data.message || 'Error al conectar el canal');
      }
    } catch (error: any) {
      setTelegramError(error.response?.data?.message || 'Error al conectar el canal');
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    if (!confirm('¿Estás seguro de que deseas desconectar tu canal de Telegram?')) {
      return;
    }

    setTelegramLoading(true);
    try {
      await telegramApi.disconnect();
      setTelegramConnected(false);
      setTelegramChannel(null);
      alert('Canal desconectado');
    } catch (error) {
      alert('Error al desconectar el canal');
    } finally {
      setTelegramLoading(false);
    }
  };

  const handlePublishToTelegram = async (productId: string) => {
    if (!telegramConnected) {
      alert('Primero debes conectar tu canal de Telegram');
      return;
    }

    if (!confirm('¿Deseas publicar este producto en tu canal de Telegram?')) {
      return;
    }

    setPublishingProduct(productId);
    try {
      const response = await telegramApi.publishProduct(productId);
      
      if (response.data.success) {
        alert('✅ Producto publicado en Telegram exitosamente');
      } else {
        alert('❌ ' + (response.data.message || 'Error al publicar'));
      }
    } catch (error: any) {
      alert('❌ Error: ' + (error.response?.data?.message || 'Error al publicar en Telegram'));
    } finally {
      setPublishingProduct(null);
    }
  };

  const handleCreateProduct = () => {
    setSelectedProduct(null);
    setFormData({
      title: '',
      description: '',
      priceCents: '',
      billingType: 'ONE_TIME',
      telegramChannelId: '',
      active: true,
    });
    setFormError('');
    setShowProductForm(true);
  };

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setFormData({
      title: product.title || '',
      description: product.description || '',
      priceCents: product.priceCents ? (product.priceCents / 100).toString() : '',
      billingType: product.billingType || 'ONE_TIME',
      telegramChannelId: product.telegramChannelId || '',
      active: product.active ?? true,
    });
    setFormError('');
    setShowProductForm(true);
  };

  const handleViewProduct = (product: any) => {
    setSelectedProduct(product);
    setShowProductDetail(true);
  };

  const handleSaveProduct = async () => {
    try {
      // Validación
      if (!formData.title.trim()) {
        setFormError('El título es obligatorio');
        return;
      }
      
      const price = parseFloat(formData.priceCents);
      if (isNaN(price) || price < 0) {
        setFormError('El precio debe ser un número válido mayor o igual a 0');
        return;
      }

      setSaving(true);
      setFormError('');

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priceCents: Math.round(price * 100), // Convertir euros a centavos
        billingType: formData.billingType,
        telegramChannelId: formData.telegramChannelId.trim() || undefined,
        currency: 'EUR',
      };

      if (selectedProduct) {
        // Actualizar producto existente
        await productsApi.update(selectedProduct.id, payload);
        
        // Actualizar el estado del producto (activo/pausado)
        if (formData.active !== selectedProduct.active) {
          if (formData.active) {
            await productsApi.publish(selectedProduct.id);
          } else {
            await productsApi.pause(selectedProduct.id);
          }
        }
      } else {
        // Crear nuevo producto
        const response = await productsApi.create(payload);
        
        // Si se creó como activo, publicarlo
        if (formData.active && response.data?.id) {
          await productsApi.publish(response.data.id);
        }
      }

      // Recargar productos
      await loadData();

      // Cerrar modal
      closeModals();
      
    } catch (error: any) {
      console.error('Error saving product:', error);
      setFormError(error.response?.data?.message || 'Error al guardar el producto. Por favor, intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const closeModals = () => {
    setShowProductForm(false);
    setShowProductDetail(false);
    setSelectedProduct(null);
    setFormError('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 w-64 h-full bg-white border-r border-gray-200">
        <div className="p-6">
          <div className="text-2xl font-bold text-blue-600 mb-8">Antia</div>
          
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="text-sm text-gray-500">Fausto Perez</div>
            <div className="text-xs text-gray-400">#5203</div>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`w-full text-left px-4 py-2 rounded-lg ${activeView === 'dashboard' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveView('products')}
              className={`w-full text-left px-4 py-2 rounded-lg ${activeView === 'products' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              Mis Productos
            </button>
            <button
              onClick={() => setActiveView('telegram')}
              className={`w-full text-left px-4 py-2 rounded-lg ${activeView === 'telegram' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <span className="flex items-center justify-between">
                <span>📱 Telegram</span>
                {telegramConnected && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    ✓
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveView('referrals')}
              className={`w-full text-left px-4 py-2 rounded-lg ${activeView === 'referrals' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              Afiliación
            </button>
            <button
              onClick={() => setActiveView('payouts')}
              className={`w-full text-left px-4 py-2 rounded-lg ${activeView === 'payouts' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              Liquidaciones
            </button>
            <button
              onClick={() => setActiveView('profile')}
              className={`w-full text-left px-4 py-2 rounded-lg ${activeView === 'profile' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              Perfil
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 rounded-lg text-red-600 hover:bg-red-50"
            >
              Cerrar Sesión
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {activeView === 'dashboard' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Hola Fausto, Bienvenido de nuevo!</h1>
              <p className="text-gray-600 mt-1">Aquí está un resumen de tu actividad</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-500">Productos Activos</div>
                  <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">+8.5%</div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{products.length}</div>
                <div className="text-xs text-gray-500 mt-1">{products.filter((p: any) => p.active).length} activos</div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-500">💰 Ingresos Totales</div>
                  {salesStats?.totalSales > 0 && (
                    <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Activo</div>
                  )}
                </div>
                <div className="text-3xl font-bold text-green-600">
                  €{((salesStats?.totalEarningsCents || 0) / 100).toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Total acumulado</div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-500">🛒 Ventas</div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{salesStats?.totalSales || 0}</div>
                <div className="text-xs text-gray-500 mt-1">Total de ventas</div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-500">📦 Productos</div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{products.length}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {products.filter((p: any) => p.active).length} activos
                </div>
              </div>
            </div>

            {/* Recent Sales Section */}
            {recentSales.length > 0 && (
              <div className="bg-white rounded-lg shadow mb-6">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">🧾 Últimas Ventas</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {recentSales.map((sale: any) => (
                      <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">
                            {sale.telegramUsername || sale.email || 'Cliente anónimo'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {sale.paidAt ? new Date(sale.paidAt.$date || sale.paidAt).toLocaleString('es-ES') : 'Fecha no disponible'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">
                            +€{((sale.amountCents || 0) / 100).toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">{sale.paymentProvider || 'stripe'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Products Preview */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Mis Productos</h2>
                  <button
                    onClick={handleCreateProduct}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                  >
                    + Crear Producto
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No tienes productos aún</p>
                    <button
                      onClick={handleCreateProduct}
                      className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                      Crear tu primer producto
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products.slice(0, 3).map((product: any) => (
                      <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{product.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">{product.description}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm font-medium text-green-600">
                                €{(product.priceCents / 100).toFixed(2)}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${product.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {product.active ? 'Activo' : 'Pausado'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {product.billingType === 'SUBSCRIPTION' ? 'Suscripción' : 'Pago único'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleViewProduct(product)}
                              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                            >
                              Ver
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeView === 'products' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Mis Productos</h1>
              <p className="text-gray-600 mt-1">Gestiona tus pronósticos y suscripciones</p>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Lista de Productos</h2>
                  <button 
                    onClick={handleCreateProduct}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                  >
                    + Crear Producto
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No tienes productos aún</p>
                    <button 
                      onClick={handleCreateProduct}
                      className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                      Crear tu primer producto
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products.map((product: any) => (
                      <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{product.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">{product.description}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm font-medium text-green-600">
                                €{(product.priceCents / 100).toFixed(2)}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${product.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {product.active ? 'Activo' : 'Pausado'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {product.billingType === 'SUBSCRIPTION' ? 'Suscripción' : 'Pago único'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {telegramConnected && (
                              <button 
                                onClick={() => handlePublishToTelegram(product.id)}
                                disabled={publishingProduct === product.id}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Publicar en Telegram"
                              >
                                {publishingProduct === product.id ? (
                                  <span>Publicando...</span>
                                ) : (
                                  <>
                                    <span>📱</span>
                                    <span>Publicar</span>
                                  </>
                                )}
                              </button>
                            )}
                            <button 
                              onClick={() => handleEditProduct(product)}
                              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                            >
                              Editar
                            </button>
                            <button 
                              onClick={() => handleViewProduct(product)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            >
                              Ver
                            </button>
                          </div>
                        </div>
                        {/* Link único del producto para Telegram */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-blue-600 font-medium mb-1">🔗 Link de Compra (Bot)</p>
                              <div className="flex items-center gap-2">
                                <code className="text-xs text-blue-800 bg-white px-2 py-1 rounded border border-blue-200 overflow-x-auto">
                                  https://t.me/Antiabetbot?start=product_{product.id}
                                </code>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`https://t.me/Antiabetbot?start=product_${product.id}`);
                                alert('✅ Link copiado al portapapeles');
                              }}
                              className="flex-shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 whitespace-nowrap"
                            >
                              📋 Copiar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeView === 'referrals' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Afiliación</h1>
              <p className="text-gray-600 mt-1">Gestiona tus enlaces de afiliado y comisiones</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500 mb-2">Clicks Totales</div>
                <div className="text-3xl font-bold text-gray-900">{metrics?.clicks || 0}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500 mb-2">Registros</div>
                <div className="text-3xl font-bold text-gray-900">{metrics?.registers || 0}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-500 mb-2">FTDs</div>
                <div className="text-3xl font-bold text-gray-900">{metrics?.ftds || 0}</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Enlaces de Afiliado</h2>
              <p className="text-gray-500">Funcionalidad en desarrollo</p>
            </div>
          </>
        )}

        {activeView === 'payouts' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Liquidaciones</h1>
              <p className="text-gray-600 mt-1">Historial de pagos y comisiones</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Historial de Pagos</h2>
              <div className="text-center py-12">
                <p className="text-gray-500">No hay liquidaciones aún</p>
              </div>
            </div>
          </>
        )}

        {activeView === 'telegram' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">📱 Telegram</h1>
              <p className="text-gray-600 mt-1">Conecta tu canal de Telegram para publicar pronósticos automáticamente</p>
            </div>

            {/* Estado de conexión */}
            {telegramConnected ? (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">✓</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Canal Conectado</h3>
                      {telegramChannel && (
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><strong>Canal:</strong> {telegramChannel.title || 'N/A'}</p>
                          <p><strong>Username:</strong> {telegramChannel.name || 'N/A'}</p>
                          <p><strong>ID:</strong> {telegramChannel.id}</p>
                          <p><strong>Conexión:</strong> {telegramChannel.connectionType === 'manual' ? 'Manual' : 'Automática'}</p>
                          {telegramChannel.connectedAt && (
                            <p><strong>Conectado el:</strong> {new Date(telegramChannel.connectedAt).toLocaleDateString('es-ES')}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnectTelegram}
                    disabled={telegramLoading}
                    className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
                  >
                    {telegramLoading ? 'Desconectando...' : 'Desconectar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📱</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Conecta tu Canal de Telegram</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Conecta tu canal de Telegram para publicar tus pronósticos directamente desde la plataforma.
                    </p>
                  </div>
                </div>

                {/* Formulario de conexión */}
                <div className="border-t pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID o @username del Canal
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={telegramChannelInput}
                      onChange={(e) => setTelegramChannelInput(e.target.value)}
                      placeholder="Ej: @mi_canal o -1001234567890"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={telegramLoading}
                    />
                    <button
                      onClick={handleConnectTelegram}
                      disabled={telegramLoading || !telegramChannelInput.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {telegramLoading ? 'Conectando...' : 'Conectar'}
                    </button>
                  </div>
                  {telegramError && (
                    <p className="mt-2 text-sm text-red-600">{telegramError}</p>
                  )}
                </div>
              </div>
            )}

            {/* Canal Premium para Clientes */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">⭐</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Canal Premium para Clientes</h3>
                  <p className="text-sm text-gray-600">
                    Configura el enlace del canal donde tus clientes recibirán acceso después de la compra. 
                    Este enlace se enviará automáticamente por el bot de Telegram.
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enlace del Canal Premium (Opcional)
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={premiumChannelLink}
                    onChange={(e) => setPremiumChannelLink(e.target.value)}
                    placeholder="Ej: https://t.me/+AbCdEf123456 o https://t.me/mi_canal_premium"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={savingPremiumChannel}
                  />
                  <button
                    onClick={async () => {
                      setSavingPremiumChannel(true);
                      try {
                        await telegramApi.setPremiumChannel(premiumChannelLink || null);
                        alert('✅ Canal premium actualizado correctamente');
                      } catch (error) {
                        alert('Error al guardar el canal premium');
                      } finally {
                        setSavingPremiumChannel(false);
                      }
                    }}
                    disabled={savingPremiumChannel}
                    className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingPremiumChannel ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  💡 Este es el enlace que recibirán tus clientes después de comprar. Puede ser un enlace de invitación de Telegram.
                </p>
                {premiumChannelLink && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✅ Canal premium configurado: <a href={premiumChannelLink} target="_blank" rel="noopener noreferrer" className="underline">{premiumChannelLink}</a>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Instrucciones */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">📖 Cómo conectar tu canal</h3>
              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <p className="font-medium mb-1">Opción 1: Conexión Manual</p>
                  <ol className="list-decimal ml-5 space-y-1">
                    <li>Añade el bot como administrador a tu canal de Telegram</li>
                    <li>Obtén el ID o @username de tu canal</li>
                    <li>Ingresa el ID o @username arriba y haz clic en "Conectar"</li>
                  </ol>
                </div>
                <div>
                  <p className="font-medium mb-1">Opción 2: Conexión Automática</p>
                  <ol className="list-decimal ml-5 space-y-1">
                    <li>Añade el bot como administrador a tu canal de Telegram</li>
                    <li>La conexión se realizará automáticamente</li>
                  </ol>
                </div>
                <div className="pt-2 border-t border-blue-300">
                  <p className="font-medium mb-1">💡 Nota:</p>
                  <p>El bot debe tener permisos de administrador para poder publicar mensajes en tu canal.</p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeView === 'profile' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
              <p className="text-gray-600 mt-1">Configuración de tu cuenta</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Información Personal</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Público</label>
                  <input 
                    type="text" 
                    defaultValue="Fausto Perez"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input 
                    type="email" 
                    defaultValue="fausto.perez@antia.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usuario de Telegram</label>
                  <input 
                    type="text" 
                    placeholder="@tu_usuario"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                  Guardar Cambios
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal: Formulario de Producto */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeModals}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
                </h2>
                <button onClick={closeModals} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{formError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título del Producto <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ej: Pronósticos Premium Mensuales"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea 
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe tu producto..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Precio (€) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0"
                      value={formData.priceCents}
                      onChange={(e) => setFormData({ ...formData, priceCents: e.target.value })}
                      placeholder="29.99"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Facturación</label>
                    <select 
                      value={formData.billingType}
                      onChange={(e) => setFormData({ ...formData, billingType: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ONE_TIME">Pago único</option>
                      <option value="SUBSCRIPTION">Suscripción</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Canal de Telegram</label>
                  <input 
                    type="text" 
                    value={formData.telegramChannelId}
                    onChange={(e) => setFormData({ ...formData, telegramChannelId: e.target.value })}
                    placeholder="@canal_premium"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="active" className="ml-2 text-sm text-gray-700">
                    Producto activo
                  </label>
                </div>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button 
                  onClick={closeModals}
                  disabled={saving}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveProduct}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Guardando...
                    </>
                  ) : (
                    selectedProduct ? 'Guardar Cambios' : 'Crear Producto'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detalle de Producto */}
      {showProductDetail && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeModals}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{selectedProduct.title}</h2>
                <button onClick={closeModals} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Descripción</h3>
                  <p className="text-gray-900">{selectedProduct.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Precio</h3>
                    <p className="text-2xl font-bold text-green-600">€{(selectedProduct.priceCents / 100).toFixed(2)}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Estado</h3>
                    <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${selectedProduct.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {selectedProduct.active ? 'Activo' : 'Pausado'}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Tipo de Facturación</h3>
                  <p className="text-gray-900">
                    {selectedProduct.billingType === 'SUBSCRIPTION' ? 'Suscripción' : 'Pago único'}
                  </p>
                </div>

                {selectedProduct.telegramChannelId && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Canal de Telegram</h3>
                    <p className="text-gray-900">{selectedProduct.telegramChannelId}</p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Estadísticas</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">0</div>
                      <div className="text-xs text-gray-600">Ventas</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">€0.00</div>
                      <div className="text-xs text-gray-600">Ingresos</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">0</div>
                      <div className="text-xs text-gray-600">Suscriptores</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button 
                  onClick={closeModals}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cerrar
                </button>
                <button 
                  onClick={() => {
                    setShowProductDetail(false);
                    handleEditProduct(selectedProduct);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Editar Producto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
