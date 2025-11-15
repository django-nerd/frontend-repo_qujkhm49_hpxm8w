import { useEffect, useMemo, useState } from 'react'

function App() {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [restaurants, setRestaurants] = useState([])
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [menu, setMenu] = useState([])
  const [orders, setOrders] = useState([])

  // Forms
  const [newRestaurant, setNewRestaurant] = useState({ name: '', cuisine: '', rating: 4.5, delivery_time_min: 30, image_url: '' })
  const [newMenuItem, setNewMenuItem] = useState({ title: '', description: '', price: '', vegetarian: false, image_url: '' })

  const [cart, setCart] = useState({})
  const [customer, setCustomer] = useState({ name: '', address: '' })
  const [orderResult, setOrderResult] = useState(null)

  // Fetch initial data
  useEffect(() => {
    refreshAll()
  }, [])

  const refreshAll = async () => {
    setError('')
    await fetchRestaurants()
    await fetchOrders()
  }

  const fetchRestaurants = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${baseUrl}/restaurants`)
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      setRestaurants(list)
      // Auto-select first restaurant so menu is visible on the dashboard
      if (!selectedRestaurant && list.length > 0) {
        await selectRestaurant(list[0])
      }
    } catch (e) {
      setError('Failed to load restaurants')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${baseUrl}/orders`)
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch (e) {
      // soft fail
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

  const createRestaurant = async (e) => {
    e?.preventDefault()
    if (!newRestaurant.name || !newRestaurant.cuisine) {
      setError('Please provide restaurant name and cuisine')
      return
    }
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`${baseUrl}/restaurants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRestaurant.name,
          cuisine: newRestaurant.cuisine,
          rating: Number(newRestaurant.rating) || 4.5,
          delivery_time_min: Number(newRestaurant.delivery_time_min) || 30,
          image_url: newRestaurant.image_url || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || 'Failed to create restaurant')
      setNewRestaurant({ name: '', cuisine: '', rating: 4.5, delivery_time_min: 30, image_url: '' })
      await fetchRestaurants()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const createMenuItem = async (e) => {
    e?.preventDefault()
    if (!selectedRestaurant) {
      setError('Select a restaurant first')
      return
    }
    if (!newMenuItem.title || !newMenuItem.price) {
      setError('Provide menu item title and price')
      return
    }
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`${baseUrl}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: selectedRestaurant._id,
          title: newMenuItem.title,
          description: newMenuItem.description || undefined,
          price: Number(newMenuItem.price),
          vegetarian: Boolean(newMenuItem.vegetarian),
          image_url: newMenuItem.image_url || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || 'Failed to add menu item')
      setNewMenuItem({ title: '', description: '', price: '', vegetarian: false, image_url: '' })
      await selectRestaurant(selectedRestaurant) // refresh menu
    } catch (e) {
      setError(e.message)
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
      await fetchOrders()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const seedSampleData = async () => {
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500" />
            <h1 className="text-xl sm:text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-rose-600">
              Food Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refreshAll} className="text-sm px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200">Refresh</button>
            {restaurants.length === 0 && (
              <button onClick={seedSampleData} className="text-sm px-3 py-1.5 rounded bg-orange-500 text-white hover:bg-orange-600">Quick Seed</button>
            )}
          </div>
        </div>
      </header>

      {/* KPI Bar */}
      <div className="max-w-7xl mx-auto px-4 py-4 grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-500">Restaurants</div>
          <div className="text-2xl font-bold">{restaurants.length}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-500">Menu Items</div>
          <div className="text-2xl font-bold">{menu.length}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-500">Orders</div>
          <div className="text-2xl font-bold">{orders.length}</div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4">
          <div className="p-3 mb-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
        </div>
      )}

      {/* Dashboard body */}
      <main className="max-w-7xl mx-auto px-4 pb-8 grid lg:grid-cols-3 gap-6">
        {/* Restaurants Manager */}
        <section className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h2 className="text-lg font-bold mb-3">Restaurants</h2>
            <div className="space-y-2 max-h-[360px] overflow-auto pr-2">
              {restaurants.map((r) => (
                <button
                  key={r._id}
                  onClick={() => selectRestaurant(r)}
                  className={`w-full text-left p-3 rounded border hover:border-orange-300 hover:bg-orange-50 transition ${selectedRestaurant?._id === r._id ? 'border-orange-400 bg-orange-50' : 'border-transparent bg-gray-50'}`}
                >
                  <div className="font-medium text-gray-800">{r.name}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span>{r.cuisine}</span>
                    <span>•</span>
                    <span>⭐ {r.rating?.toFixed ? r.rating.toFixed(1) : r.rating}</span>
                    <span>•</span>
                    <span>{r.delivery_time_min} min</span>
                  </div>
                </button>
              ))}
              {restaurants.length === 0 && (
                <div className="text-sm text-gray-500">No restaurants yet. Use Quick Seed or add one below.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold mb-3">Add Restaurant</h3>
            <form onSubmit={createRestaurant} className="space-y-2">
              <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Name" value={newRestaurant.name} onChange={(e) => setNewRestaurant((s) => ({ ...s, name: e.target.value }))} />
              <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Cuisine" value={newRestaurant.cuisine} onChange={(e) => setNewRestaurant((s) => ({ ...s, cuisine: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Rating" value={newRestaurant.rating} onChange={(e) => setNewRestaurant((s) => ({ ...s, rating: e.target.value }))} />
                <input className="w-full border rounded px-3 py-2 text-sm" placeholder="ETA (min)" value={newRestaurant.delivery_time_min} onChange={(e) => setNewRestaurant((s) => ({ ...s, delivery_time_min: e.target.value }))} />
              </div>
              <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Image URL (optional)" value={newRestaurant.image_url} onChange={(e) => setNewRestaurant((s) => ({ ...s, image_url: e.target.value }))} />
              <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2 rounded">Save</button>
            </form>
          </div>
        </section>

        {/* Menu and Cart */}
        <section className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">Menu {selectedRestaurant ? `— ${selectedRestaurant.name}` : ''}</h2>
              {selectedRestaurant && (
                <span className="text-xs text-gray-500">{menu.length} items</span>
              )}
            </div>

            {selectedRestaurant ? (
              menu.length === 0 ? (
                <div className="p-4 rounded border bg-gray-50 text-gray-600">No items yet.</div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {menu.map((m) => (
                    <div key={m._id} className="bg-white rounded-xl border overflow-hidden">
                      {m.image_url && <img src={m.image_url} alt={m.title} className="h-32 w-full object-cover" />}
                      <div className="p-3 space-y-1">
                        <div className="font-semibold text-gray-800 flex items-center justify-between">
                          <span>{m.title}</span>
                          <span className="text-orange-600">${m.price.toFixed(2)}</span>
                        </div>
                        {m.description && <p className="text-sm text-gray-600 line-clamp-2">{m.description}</p>}
                        <button onClick={() => addToCart(m)} className="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white text-sm py-1.5 rounded">
                          Add to cart
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="p-4 rounded border bg-gray-50 text-gray-600">Select a restaurant to view its menu.</div>
            )}
          </div>

          {/* Add Menu Item */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold mb-3">Add Menu Item</h3>
            {selectedRestaurant ? (
              <form onSubmit={createMenuItem} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <input className="border rounded px-3 py-2 text-sm" placeholder="Title" value={newMenuItem.title} onChange={(e) => setNewMenuItem((s) => ({ ...s, title: e.target.value }))} />
                <input className="border rounded px-3 py-2 text-sm" placeholder="Price" value={newMenuItem.price} onChange={(e) => setNewMenuItem((s) => ({ ...s, price: e.target.value }))} />
                <input className="border rounded px-3 py-2 text-sm" placeholder="Image URL" value={newMenuItem.image_url} onChange={(e) => setNewMenuItem((s) => ({ ...s, image_url: e.target.value }))} />
                <input className="sm:col-span-2 lg:col-span-3 border rounded px-3 py-2 text-sm" placeholder="Description" value={newMenuItem.description} onChange={(e) => setNewMenuItem((s) => ({ ...s, description: e.target.value }))} />
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={newMenuItem.vegetarian} onChange={(e) => setNewMenuItem((s) => ({ ...s, vegetarian: e.target.checked }))} />
                  Vegetarian
                </label>
                <div className="sm:col-span-2 lg:col-span-3">
                  <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded">Add Item</button>
                </div>
              </form>
            ) : (
              <div className="text-sm text-gray-600">Select a restaurant first</div>
            )}
          </div>

          {/* Cart + Checkout */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="text-lg font-bold mb-3">Checkout</h3>
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

            <div className="mt-4 grid sm:grid-cols-2 gap-2">
              <input type="text" placeholder="Your name" value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} className="w-full border rounded px-3 py-2 text-sm" />
              <input type="text" placeholder="Delivery address" value={customer.address} onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <button disabled={loading || Object.keys(cart).length === 0 || !selectedRestaurant} onClick={placeOrder} className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2 rounded">
              Place order
            </button>

            {orderResult && (
              <div className="mt-3 p-3 rounded border border-green-200 bg-green-50 text-green-800 text-sm">
                Order placed! Total: ${orderResult.total?.toFixed ? orderResult.total.toFixed(2) : orderResult.total}. Status: {orderResult.status}
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Recent Orders</h3>
              <button onClick={fetchOrders} className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">Reload</button>
            </div>
            {orders.length === 0 ? (
              <div className="text-sm text-gray-500">No orders yet.</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-auto pr-2">
                {orders.slice().reverse().map((o) => (
                  <div key={o._id} className="p-3 rounded border bg-gray-50">
                    <div className="text-sm font-medium">{o.customer_name}</div>
                    <div className="text-xs text-gray-500">${o.total?.toFixed ? o.total.toFixed(2) : o.total} • {o.status}</div>
                    <div className="mt-1 text-xs text-gray-600 line-clamp-2">{o.items?.length} items</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="py-6 text-center text-xs text-gray-500">Backend: {baseUrl}</footer>
    </div>
  )
}

export default App
