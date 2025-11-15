import { useEffect, useMemo, useState } from 'react'

function App() {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

  const [loading, setLoading] = useState(false)
  const [restaurants, setRestaurants] = useState([])
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [menu, setMenu] = useState([])
  const [cart, setCart] = useState({}) // key: menuItemId, value: {item, qty}
  const [customer, setCustomer] = useState({ name: '', address: '' })
  const [orderResult, setOrderResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRestaurants()
  }, [])

  const fetchRestaurants = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`${baseUrl}/restaurants`)
      const data = await res.json()
      setRestaurants(Array.isArray(data) ? data : [])
    } catch (e) {
      setError('Failed to load restaurants')
    } finally {
      setLoading(false)
    }
  }

  const selectRestaurant = async (r) => {
    setSelectedRestaurant(r)
    setCart({})
    setOrderResult(null)
    try {
      setLoading(true)
      const res = await fetch(`${baseUrl}/restaurants/${r._id}/menu`)
      const data = await res.json()
      setMenu(Array.isArray(data) ? data : [])
    } catch (e) {
      setError('Failed to load menu')
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (item) => {
    setCart((prev) => {
      const current = prev[item._id]?.qty || 0
      return { ...prev, [item._id]: { item, qty: current + 1 } }
    })
  }

  const updateQty = (id, delta) => {
    setCart((prev) => {
      const entry = prev[id]
      if (!entry) return prev
      const newQty = Math.max(0, (entry.qty || 0) + delta)
      const next = { ...prev }
      if (newQty === 0) {
        delete next[id]
      } else {
        next[id] = { ...entry, qty: newQty }
      }
      return next
    })
  }

  const total = useMemo(() => {
    return Object.values(cart).reduce((sum, e) => sum + e.item.price * e.qty, 0)
  }, [cart])

  const placeOrder = async () => {
    if (!selectedRestaurant) return
    if (!customer.name || !customer.address) {
      setError('Please enter your name and address')
      return
    }
    const items = Object.values(cart).map((e) => ({ menu_item_id: e.item._id, quantity: e.qty }))
    if (items.length === 0) {
      setError('Your cart is empty')
      return
    }
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customer.name,
          address: customer.address,
          restaurant_id: selectedRestaurant._id,
          items,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || 'Failed to place order')
      setOrderResult(data)
      setCart({})
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const seedSampleData = async () => {
    // Simple seeding to quickly try the app if database is empty
    try {
      setLoading(true)
      setError('')
      const rRes = await fetch(`${baseUrl}/restaurants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Blue Bites',
          cuisine: 'Burgers',
          rating: 4.6,
          delivery_time_min: 25,
          image_url: 'https://images.unsplash.com/photo-1550317138-10000687a72b?q=80&w=1200&auto=format&fit=crop',
        }),
      })
      const rData = await rRes.json()
      const rid = rData.id

      const items = [
        {
          title: 'Classic Burger',
          description: 'Juicy beef patty with cheddar and house sauce',
          price: 9.99,
          vegetarian: false,
          image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1200&auto=format&fit=crop',
        },
        {
          title: 'Veggie Delight',
          description: 'Grilled veggie patty with avocado',
          price: 8.49,
          vegetarian: true,
          image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1200&auto=format&fit=crop',
        },
        {
          title: 'Loaded Fries',
          description: 'Crispy fries with cheese and bacon bits',
          price: 5.99,
          vegetarian: false,
          image_url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop',
        },
      ]

      for (const it of items) {
        await fetch(`${baseUrl}/menu`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...it, restaurant_id: rid }),
        })
      }

      await fetchRestaurants()
    } catch (e) {
      setError('Failed to seed data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-rose-50">
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500" />
            <h1 className="text-xl sm:text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-rose-600">
              Flames Eats
            </h1>
          </div>
          <div className="text-sm text-gray-600">
            {selectedRestaurant ? (
              <span>
                Ordering from <span className="font-semibold">{selectedRestaurant.name}</span>
              </span>
            ) : (
              <span>Pick a restaurant</span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid md:grid-cols-3 gap-6">
        {/* Restaurants */}
        <section className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Restaurants</h2>
            <div className="flex gap-2">
              <button
                onClick={fetchRestaurants}
                className="text-sm px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200"
              >
                Refresh
              </button>
              {restaurants.length === 0 && (
                <button
                  onClick={seedSampleData}
                  className="text-sm px-3 py-1.5 rounded bg-orange-500 text-white hover:bg-orange-600"
                >
                  Quick Seed
                </button>
              )}
            </div>
          </div>

          {loading && (
            <div className="p-4 bg-white rounded-lg shadow-sm border">Loading...</div>
          )}

          {error && (
            <div className="p-3 mb-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {restaurants.map((r) => (
              <button
                key={r._id}
                onClick={() => selectRestaurant(r)}
                className={`group text-left bg-white rounded-xl border hover:shadow-md transition overflow-hidden ${
                  selectedRestaurant?._id === r._id ? 'ring-2 ring-orange-400' : ''
                }`}
              >
                {r.image_url && (
                  <img src={r.image_url} alt={r.name} className="h-32 w-full object-cover" />
                )}
                <div className="p-3">
                  <div className="font-semibold text-gray-800">{r.name}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <span>{r.cuisine}</span>
                    <span>•</span>
                    <span>⭐ {r.rating?.toFixed ? r.rating.toFixed(1) : r.rating}</span>
                    <span>•</span>
                    <span>{r.delivery_time_min} min</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Menu */}
          {selectedRestaurant && (
            <div className="mt-8">
              <h3 className="text-lg font-bold text-gray-800 mb-3">Menu — {selectedRestaurant.name}</h3>
              {menu.length === 0 ? (
                <div className="p-4 bg-white rounded-lg border text-gray-600">No items yet.</div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {menu.map((m) => (
                    <div key={m._id} className="bg-white rounded-xl border overflow-hidden">
                      {m.image_url && (
                        <img src={m.image_url} alt={m.title} className="h-32 w-full object-cover" />
                      )}
                      <div className="p-3 space-y-1">
                        <div className="font-semibold text-gray-800 flex items-center justify-between">
                          <span>{m.title}</span>
                          <span className="text-orange-600">${m.price.toFixed(2)}</span>
                        </div>
                        {m.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{m.description}</p>
                        )}
                        <button
                          onClick={() => addToCart(m)}
                          className="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white text-sm py-1.5 rounded"
                        >
                          Add to cart
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Cart */}
        <aside className="md:col-span-1">
          <div className="bg-white rounded-xl border p-4 sticky top-20">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Your Order</h3>

            {Object.keys(cart).length === 0 ? (
              <p className="text-gray-500 text-sm">Your cart is empty.</p>
            ) : (
              <div className="space-y-3">
                {Object.values(cart).map(({ item, qty }) => (
                  <div key={item._id} className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-gray-800">{item.title}</div>
                      <div className="text-xs text-gray-500">${item.price.toFixed(2)} each</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item._id, -1)} className="h-7 w-7 rounded bg-gray-100">-</button>
                      <span className="w-6 text-center">{qty}</span>
                      <button onClick={() => updateQty(item._id, 1)} className="h-7 w-7 rounded bg-gray-100">+</button>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t flex items-center justify-between font-semibold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <input
                type="text"
                placeholder="Your name"
                value={customer.name}
                onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Delivery address"
                value={customer.address}
                onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <button
                disabled={loading || Object.keys(cart).length === 0}
                onClick={placeOrder}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2 rounded"
              >
                Place order
              </button>

              {orderResult && (
                <div className="mt-3 p-3 rounded border border-green-200 bg-green-50 text-green-800 text-sm">
                  Order placed! Total: ${orderResult.total?.toFixed ? orderResult.total.toFixed(2) : orderResult.total}. Status: {orderResult.status}
                </div>
              )}
            </div>
          </div>
        </aside>
      </main>

      <footer className="py-6 text-center text-xs text-gray-500">
        Backend: {baseUrl}
      </footer>
    </div>
  )
}

export default App
