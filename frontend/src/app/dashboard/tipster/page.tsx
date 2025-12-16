'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { productsApi, referralsApi, payoutsApi, authApi } from '@/lib/api';

type ViewType = 'dashboard' | 'products' | 'referrals' | 'payouts' | 'profile';

export default function TipsterDashboard() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);

  useEffect(() => {
    loadData();
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
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleCreateProduct = () => {
    setSelectedProduct(null);
    setShowProductForm(true);
  };

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setShowProductForm(true);
  };

  const handleViewProduct = (product: any) => {
    setSelectedProduct(product);
    setShowProductDetail(true);
  };

  const closeModals = () => {
    setShowProductForm(false);
    setShowProductDetail(false);
    setSelectedProduct(null);
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
                  <div className="text-sm text-gray-500">Clicks Únicos</div>
                  <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">+1.3%</div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{metrics?.clicks || 0}</div>
                <div className="text-xs text-gray-500 mt-1">Este mes</div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-500">Registros</div>
                  <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">+4.3%</div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{metrics?.registers || 0}</div>
                <div className="text-xs text-gray-500 mt-1">Conversión: {metrics?.conversionRate || 0}%</div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-500">Ingresos</div>
                  <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">+1.8%</div>
                </div>
                <div className="text-3xl font-bold text-gray-900">€{(metrics?.totalDeposits / 100 || 0).toFixed(2)}</div>
                <div className="text-xs text-gray-500 mt-1">Este mes</div>
              </div>
            </div>

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
                        <div className="flex items-center justify-between">
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
    </div>
  );
}
