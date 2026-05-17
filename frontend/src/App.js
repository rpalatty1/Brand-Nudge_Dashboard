import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

//Line chart colour palette
const COLORS = ['#1e40af', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

function App() {
  //State Management
  const [products, setProducts] = useState([]);
  const [retailers, setRetailers] = useState([]);
  const [selectedRetailers, setSelectedRetailers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  //Data Fetching + Cleaning 
  useEffect(() => {
    axios.get('http://localhost:5000/api/products?limit=15000')
      .then(res => {
        const rawData = Array.isArray(res.data) ? res.data : res.data.products || [];
        
        const processed = rawData.map(item => ({
          ...item,
          ShelfPrice: parseFloat(item['Shelf Price'] || item.ShelfPrice || 0),
          OnPromotion: String(item['On Promotion'] || item.OnPromotion || '').toLowerCase() === 'true'
        }));

        setProducts(processed);
        setRetailers([...new Set(processed.map(p => p.Retailer))].sort());
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load data:", err);
        setLoading(false);
      });
  }, []);

  //Filtering Logic
  const filteredProducts = useMemo(() => {
    let result = products;
    if (selectedRetailers.length > 0) {
      result = result.filter(p => selectedRetailers.includes(p.Retailer));
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(p => p['Product Title']?.toLowerCase().includes(term));
    }
    return result;
  }, [products, selectedRetailers, searchTerm]);

  //KPI Calculations
  const avgPrice = filteredProducts.length > 0 
    ? (filteredProducts.reduce((sum, p) => sum + p.ShelfPrice, 0) / filteredProducts.length).toFixed(2) 
    : "0.00";

  const promotionCount = filteredProducts.filter(p => p.OnPromotion).length;

  //Chart data aggregation
  const chartData = useMemo(() => {
    const dailyData = {};
    filteredProducts.forEach(p => {
      const date = p.Date;
      if (!dailyData[date]) dailyData[date] = { date };

      //all or per retailer view
      if (selectedRetailers.length === 0) {
        if (!dailyData[date].overall) dailyData[date].overall = { total: 0, count: 0 };
        dailyData[date].overall.total += p.ShelfPrice;
        dailyData[date].overall.count += 1;
      } else {
        const retailer = p.Retailer;
        if (!dailyData[date][retailer]) dailyData[date][retailer] = { total: 0, count: 0 };
        dailyData[date][retailer].total += p.ShelfPrice;
        dailyData[date][retailer].count += 1;
      }
    });

    return Object.values(dailyData)
      .map(day => {
        const entry = { date: day.date };
        if (selectedRetailers.length === 0) {
          entry.avgPrice = day.overall ? Number((day.overall.total / day.overall.count).toFixed(2)) : 0;
        } else {
          selectedRetailers.forEach(retailer => {
            if (day[retailer]) entry[retailer] = Number((day[retailer].total / day[retailer].count).toFixed(2));
          });
        }
        return entry;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredProducts, selectedRetailers]);

  //dropdown to select retailers
  const retailerOptions = retailers.map(r => ({ value: r, label: r }));

  //loading state
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>Loading Brand Nudge data...</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#1e3a8a', color: 'white', padding: '32px 0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 32px' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 'bold' }}>Brand Nudge</h1>
          <p style={{ color: '#bfdbfe' }}>Pricing & Promotions Dashboard</p>
        </div>
      </header>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px' }}>
        {/* Retailers */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', marginBottom: '32px' }}>
          <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500' }}>Retailers</label>
          <Select
            options={retailerOptions}
            isMulti
            placeholder="Select retailers to compare"
            value={retailerOptions.filter(opt => selectedRetailers.includes(opt.value))}
            onChange={(selected) => {
              const values = selected ? selected.map(s => s.value) : [];
              setSelectedRetailers(values);
            }}
          />
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '48px' }}>
          <div style={{ background: 'white', padding: '40px 24px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', textAlign: 'center' }}>
            <p style={{ color: '#64748b' }}>Average Shelf Price</p>
            <p style={{ fontSize: '52px', fontWeight: 'bold', color: '#1e3a8a', marginTop: '16px' }}>£{avgPrice}</p>
          </div>
          <div style={{ background: 'white', padding: '40px 24px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', textAlign: 'center' }}>
            <p style={{ color: '#64748b' }}>On Promotion</p>
            <p style={{ fontSize: '52px', fontWeight: 'bold', color: '#16a34a', marginTop: '16px' }}>{promotionCount}</p>
          </div>
          <div style={{ background: 'white', padding: '40px 24px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', textAlign: 'center' }}>
            <p style={{ color: '#64748b' }}>Total Shown</p>
            <p style={{ fontSize: '52px', fontWeight: 'bold', color: '#8b5cf6', marginTop: '16px' }}>{filteredProducts.length}</p>
          </div>
        </div>

        {/* Trend Chart */}
        <div style={{ background: 'white', padding: '32px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '24px' }}>Average Shelf Price Trend</h2>
          <ResponsiveContainer width="100%" height={420}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 8]} />
              <Tooltip formatter={(value) => [`£${value}`]} />
              <Legend />
              {selectedRetailers.length === 0 ? (
                <Line type="monotone" dataKey="avgPrice" stroke="#111827" strokeWidth={5} dot={{ r: 7 }} name="All Retailers" />
              ) : (
                selectedRetailers.map((retailer, idx) => (
                  <Line key={retailer} type="monotone" dataKey={retailer} stroke={COLORS[idx % COLORS.length]} strokeWidth={4} dot={{ r: 6 }} name={retailer} />
                ))
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Product Details */}
        <div style={{ background: 'white', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '32px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '600' }}>Product Details</h2>
            
            {/* Search Bar */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                placeholder="Search by product title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '420px', padding: '16px 24px', fontSize: '18px', border: '2px solid #d1d5db', borderRadius: '16px' }}
              />
              <button style={{ background: '#1e3a8a', color: 'white', padding: '16px 32px', borderRadius: '16px', fontSize: '18px', fontWeight: '500' }}>
                Search
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ maxHeight: '560px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '24px', textAlign: 'left', fontWeight: '600' }}>Retailer</th>
                  <th style={{ padding: '24px', textAlign: 'left', fontWeight: '600' }}>Product Title</th>
                  <th style={{ padding: '24px', textAlign: 'right', fontWeight: '600' }}>Shelf Price</th>
                  <th style={{ padding: '24px', textAlign: 'center', fontWeight: '600' }}>On Promotion</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.slice(0, 1000).map((p, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '24px' }}>{p.Retailer}</td>
                    <td style={{ padding: '24px', maxWidth: '500px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p['Product Title']}</td>
                    <td style={{ padding: '24px', textAlign: 'right', fontWeight: '600' }}>
                      £{p.ShelfPrice.toFixed(2)}
                    </td>
                    <td style={{ padding: '24px', textAlign: 'center' }}>
                      {p.OnPromotion ? 
                        <span style={{ background: '#dcfce7', color: '#166534', padding: '6px 16px', borderRadius: '9999px', fontSize: '14px' }}>Yes</span> : 
                        <span style={{ color: '#9ca3af' }}>No</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '16px 32px', color: '#64748b', fontSize: '15px' }}>
            Showing first 1,000 of {filteredProducts.length} results 
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;