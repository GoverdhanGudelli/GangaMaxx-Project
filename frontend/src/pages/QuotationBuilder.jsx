import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Calculator, Package, CheckCircle2, FileText, Printer, ArrowRight } from 'lucide-react';

export default function QuotationBuilder({ showToast }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkDiscount, setBulkDiscount] = useState(0); // 0, 5, 10, 15
  
  const [quotation, setQuotation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const custData = await api.getCustomers();
      const prodData = await api.getProducts();
      setCustomers(custData);
      setProducts(prodData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleItem = (prod) => {
    if (selectedItems.some(i => i.id === prod.id)) {
      setSelectedItems(selectedItems.filter(i => i.id !== prod.id));
    } else {
      setSelectedItems([...selectedItems, { ...prod, qty: 1 }]);
    }
  };

  const handleQtyChange = (id, newQty) => {
    if (newQty < 1) return;
    setSelectedItems(selectedItems.map(i => i.id === id ? { ...i, qty: newQty } : i));
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Math
  const getCustomerTierDiscount = (tier) => {
    if (tier === 'Platinum') return 0.15;
    if (tier === 'Gold') return 0.10;
    if (tier === 'Silver') return 0.05;
    if (tier === 'Dealer') return 0.20;
    return 0;
  };

  const tierDiscount = selectedCustomer ? getCustomerTierDiscount(selectedCustomer.tier) : 0;
  
  const calculateTotals = () => {
    let subtotal = 0;
    selectedItems.forEach(item => {
      subtotal += item.price * item.qty;
    });

    const tierSavings = subtotal * tierDiscount;
    const discretionarySavings = (subtotal - tierSavings) * (bulkDiscount / 100);
    const finalTotal = subtotal - tierSavings - discretionarySavings;

    return { subtotal, tierSavings, discretionarySavings, finalTotal };
  };

  const totals = calculateTotals();

  const handleGenerateQuote = () => {
    if (!selectedCustomer || selectedItems.length === 0) {
      showToast('Error', 'Please select a customer and at least one product.', 'error');
      return;
    }

    setQuotation({
      quoteNo: `QT-${Math.floor(Math.random() * 9000) + 1000}`,
      date: new Date().toLocaleDateString(),
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      customer: selectedCustomer,
      items: selectedItems,
      totals
    });
    
    showToast('Quote Generated', 'Quotation document successfully created.', 'success');
  };

  const handleConvertToOrder = async () => {
    if (!quotation) return;
    setIsSubmitting(true);
    
    try {
      await api.addOrder({
        customerId: quotation.customer.id,
        customerName: quotation.customer.name,
        total: quotation.totals.finalTotal,
        items: quotation.items.map(i => ({
          productId: i.id,
          name: i.name,
          qty: i.qty,
          price: (i.price * (1 - tierDiscount) * (1 - (bulkDiscount/100))) // Storing final unit price
        }))
      });
      showToast('Order Placed!', 'Quotation successfully converted into a live bulk order.', 'success');
      setQuotation(null);
      setSelectedItems([]);
      setSelectedCustomerId('');
      setBulkDiscount(0);
    } catch (err) {
      showToast('Error', 'Failed to convert to order.', 'error');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="quotation-builder animate-fade" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
      
      {/* LEFT COLUMN: Controls */}
      <div className="hide-on-print" style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="card glow-effect">
          <div className="card-header">
            <h3><Calculator size={20} /> Configuration Panel</h3>
          </div>
          
          <div style={{ padding: '20px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>1. Select Institutional Customer</label>
            <select 
              value={selectedCustomerId} 
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}
            >
              <option value="">-- Choose Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.tier} Tier)</option>
              ))}
            </select>

            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>2. Apply Discretionary Bulk Discount</label>
            <select 
              value={bulkDiscount} 
              onChange={(e) => setBulkDiscount(Number(e.target.value))}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}
            >
              <option value={0}>No extra discount (0%)</option>
              <option value={5}>5% Bulk Promo</option>
              <option value={10}>10% High Volume Promo</option>
              <option value={15}>15% VIP Director Exception</option>
            </select>
            
            <button 
              onClick={handleGenerateQuote}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1.1rem' }}
              disabled={!selectedCustomerId || selectedItems.length === 0}
            >
              <FileText size={20} /> Generate Formal Quotation
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3><Package size={20} /> Catalog Selection</h3>
            <span style={{ background: '#e2e8f0', padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
              {selectedItems.length} selected
            </span>
          </div>
          <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '10px' }}>
            {products.map(p => {
              const isSelected = selectedItems.some(i => i.id === p.id);
              return (
                <div 
                  key={p.id} 
                  style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '12px', borderBottom: '1px solid #f1f5f9',
                    background: isSelected ? '#f0fdf4' : 'transparent'
                  }}
                >
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => handleToggleItem(p)}>
                    <h5 style={{ margin: '0 0 4px 0' }}>{p.name}</h5>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>₹{p.price.toFixed(2)} - {p.category}</span>
                  </div>
                  
                  {isSelected ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="number" 
                        min="1"
                        value={selectedItems.find(i => i.id === p.id).qty}
                        onChange={(e) => handleQtyChange(p.id, parseInt(e.target.value))}
                        style={{ width: '60px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                      <button onClick={() => handleToggleItem(p)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleToggleItem(p)}
                      style={{ padding: '6px 12px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Output Document */}
      <div className="print-fullscreen" style={{ flex: '2 1 500px' }}>
        {quotation ? (
          <div className="card" style={{ padding: '40px', background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '20px', marginBottom: '30px' }}>
              <div>
                <h1 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '2.5rem' }}>GangaMaxx</h1>
                <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>Official Commercial Quotation</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ margin: 0 }}>Quote #: {quotation.quoteNo}</h3>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem' }}>Date: {quotation.date}</p>
                <p style={{ margin: '0', fontSize: '0.9rem', color: '#ef4444' }}>Valid Until: {quotation.validUntil}</p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
              <div>
                <h4 style={{ margin: '0 0 8px 0', color: '#64748b', textTransform: 'uppercase', fontSize: '0.8rem' }}>Prepared For</h4>
                <h3 style={{ margin: 0 }}>{quotation.customer.name}</h3>
                <p style={{ margin: '5px 0 0 0' }}>{quotation.customer.address}</p>
                <p style={{ margin: '2px 0 0 0', fontWeight: 'bold', color: 'var(--color-primary)' }}>{quotation.customer.tier} Tier Partner</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#64748b', textTransform: 'uppercase', fontSize: '0.8rem' }}>Prepared By</h4>
                <h3 style={{ margin: 0 }}>Sales Administration</h3>
                <p style={{ margin: '5px 0 0 0' }}>GangaMaxx Headquarters</p>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Unit Price (Base)</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((i, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px' }}><strong>{i.name}</strong><br/><span style={{fontSize:'0.8rem', color:'#64748b'}}>{i.sku}</span></td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{i.qty}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>₹{i.price.toFixed(2)}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>₹{(i.price * i.qty).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
              <div style={{ width: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: '#64748b' }}>
                  <span>Subtotal (Base)</span>
                  <span>₹{quotation.totals.subtotal.toFixed(2)}</span>
                </div>
                {quotation.totals.tierSavings > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: '#059669' }}>
                    <span>{quotation.customer.tier} Tier Discount</span>
                    <span>-₹{quotation.totals.tierSavings.toFixed(2)}</span>
                  </div>
                )}
                {quotation.totals.discretionarySavings > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: '#059669' }}>
                    <span>Special Bulk Discount ({bulkDiscount}%)</span>
                    <span>-₹{quotation.totals.discretionarySavings.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderTop: '2px solid #0f172a', fontWeight: 'bold', fontSize: '1.4rem' }}>
                  <span>Final Total</span>
                  <span>₹{quotation.totals.finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Document Actions */}
            <div style={{ display: 'flex', gap: '15px', borderTop: '1px dashed #cbd5e1', paddingTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => window.print()} style={{ flex: 1 }}>
                <Printer size={18} /> Print / Export PDF
              </button>
              <button className="btn btn-primary glow-effect" onClick={handleConvertToOrder} disabled={isSubmitting} style={{ flex: 2, background: '#0f172a' }}>
                {isSubmitting ? 'Processing...' : <><CheckCircle2 size={18} /> Convert Quote to Live Order <ArrowRight size={18}/></>}
              </button>
            </div>
            
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e1', borderRadius: '16px', color: '#94a3b8' }}>
            <div style={{ textAlign: 'center' }}>
              <Calculator size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
              <h2>No Quotation Generated</h2>
              <p>Select a customer and products to build a commercial quote.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
