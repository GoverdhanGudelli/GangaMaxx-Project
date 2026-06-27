import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Table from '../components/Table';
import { 
  FileText, 
  HelpCircle, 
  Plus, 
  Layers, 
  AlertCircle, 
  BookOpen, 
  Sparkles, 
  FileCheck
} from 'lucide-react';
export default function Products({ showToast, user }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  // Kit builder state
  const [selectedItems, setSelectedItems] = useState([]);
  const [kitName, setKitName] = useState('');
  const [customKits, setCustomKits] = useState([]);
  const [showKitBuilder, setShowKitBuilder] = useState(false);

  // Safety sheet drawer state
  const [activeSafetyProduct, setActiveSafetyProduct] = useState(null);

  const fetchProducts = async () => {
    try {
      const data = await products ? await api.getProducts() : [];
      setProducts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const getContractPrice = (basePrice) => {
    if (user?.role !== 'Customer') return basePrice;
    
    let discount = 0;
    if (user.tier === 'Platinum') discount = 0.15;
    if (user.tier === 'Gold') discount = 0.10;
    if (user.tier === 'Silver') discount = 0.05;
    if (user.tier === 'Dealer') discount = 0.20;

    return basePrice * (1 - discount);
  };

  const handleToggleKitItem = (prod) => {
    if (selectedItems.some(item => item.id === prod.id)) {
      setSelectedItems(selectedItems.filter(item => item.id !== prod.id));
    } else {
      setSelectedItems([...selectedItems, prod]);
    }
  };

  const handleBuildKit = (e) => {
    e.preventDefault();
    if (!kitName || selectedItems.length === 0) return;

    const newKit = {
      id: 'k' + (customKits.length + 1),
      name: kitName,
      items: selectedItems,
      totalPrice: selectedItems.reduce((sum, item) => sum + item.price, 0) * 0.9 // 10% discount on kits!
    };

    setCustomKits([...customKits, newKit]);
    showToast('Bundle Created', `Cleaning kit "${kitName}" compiled with 10% discount!`, 'success');
    
    // reset
    setKitName('');
    setSelectedItems([]);
    setShowKitBuilder(false);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || p.category === category;
    return matchesSearch && matchesCategory;
  });

  const headers = [
    { label: 'SKU / Code' },
    { label: 'Product Detail' },
    { label: 'Category' },
    { label: 'Unit Price' },
    { label: 'Warehouse Stock' },
    { label: 'MSDS Compliance' }
  ];

  if (loading) return <div className="loading-spinner">Loading catalog...</div>;

  return (
    <div className="products-page animate-fade">
      <div className="products-header-banner card glow-effect">
        <div className="banner-content">
          <div className="compliance-tag">
            <BookOpen size={14} />
            <span>WHO & HAZMAT Safe compliance verified</span>
          </div>
          <h3>Chemical Handling & Safety Sheets</h3>
          <p>Click on the MSDS icon of any chemical agent to read safety guidelines, handling precautions, and diluting instructions.</p>
        </div>
      </div>

      {user?.role === 'Customer' && (
        <div className="contract-pricing-banner card glow-effect" style={{ marginBottom: '20px', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Sparkles size={24} color="#059669" />
            <div>
              <h4 style={{ color: '#065f46', margin: 0 }}>Contract Pricing Active</h4>
              <p style={{ color: '#047857', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
                You are currently viewing your customized negotiated rates for the <strong>{user.tier} Tier</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="catalog-actions">
        <div className="filter-controls">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="All">All Categories</option>
            <option value="Sanitizers">Sanitizers</option>
            <option value="Floor Care">Floor Care</option>
            <option value="Hand Hygiene">Hand Hygiene</option>
            <option value="Disinfectants">Disinfectants</option>
            <option value="Air Care">Air Care</option>
          </select>
        </div>
      </div>

      {/* Main product register table */}
      <Table 
        title="B2B Commercial Product Catalog"
        headers={headers}
        data={filteredProducts}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search product or SKU..."
        renderRow={(prod) => (
          <>
            <td>
              <span className="sku-code">{prod.sku}</span>
            </td>
            <td>
              <div className="product-info-cell">
                <span className="prod-name">{prod.name}</span>
              </div>
            </td>
            <td>
              <span className="category-badge">{prod.category}</span>
            </td>
            <td>
              {user?.role === 'Customer' ? (
                <div className="price-display">
                  <span className="base-price" style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.85rem' }}>
                    ₹{prod.price.toFixed(2)}
                  </span>
                  <br />
                  <span className="contract-price" style={{ color: '#059669', fontWeight: 'bold', fontSize: '1.1rem' }}>
                    ₹{getContractPrice(prod.price).toFixed(2)}
                  </span>
                </div>
              ) : (
                <span>₹{prod.price.toFixed(2)}</span>
              )}
            </td>
            <td>
              <div className="stock-level-cell">
                <span className={`stock-number ${prod.stock < 50 ? 'stock-low' : 'stock-ok'}`}>
                  {prod.stock} units
                </span>
                {prod.stock < 50 && <span className="low-stock-alert">Low Stock</span>}
              </div>
            </td>
            <td>
              <button 
                className={`msds-btn ${prod.msds ? 'msds-ok' : 'msds-missing'}`}
                onClick={() => setActiveSafetyProduct(prod)}
              >
                {prod.msds ? <FileCheck size={18} /> : <AlertCircle size={18} />}
                <span>{prod.msds ? 'MSDS Info' : 'Pending'}</span>
              </button>
            </td>
          </>
        )}
      />

      {/* Custom Kit bundles display */}
      {customKits.length > 0 && (
        <div className="custom-kits-section">
          <h4>Custom Institutional Bundles</h4>
          <div className="kits-grid">
            {customKits.map(kit => (
              <div key={kit.id} className="kit-card card-solid">
                <div className="kit-header">
                  <h5>{kit.name}</h5>
                  <span className="kit-badge-discount">10% Off</span>
                </div>
                <div className="kit-items-list">
                  {kit.items.map(i => (
                    <span key={i.id} className="kit-item-tag">{i.name}</span>
                  ))}
                </div>
                <div className="kit-footer">
                  <span className="kit-price">Price: <strong>₹{kit.totalPrice.toFixed(2)}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kit Builder Modal */}
      {showKitBuilder && (
        <div className="modal-overlay">
          <div className="modal-content-card card kit-builder-modal">
            <div className="modal-header">
              <h3>Cleaning Kit Compiler</h3>
              <button className="close-btn" onClick={() => setShowKitBuilder(false)}>×</button>
            </div>
            
            <form onSubmit={handleBuildKit}>
              <div className="form-group">
                <label>Kit / Bundle Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Standard School Reopening Kit" 
                  value={kitName}
                  onChange={(e) => setKitName(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Select Products to Bundle (10% Discount applied)</label>
                <div className="kit-selection-list">
                  {products.map(p => {
                    const isSelected = selectedItems.some(item => item.id === p.id);
                    return (
                      <div 
                        key={p.id} 
                        className={`kit-select-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleToggleKitItem(p)}
                      >
                        <div className="checkbox-box">
                          {isSelected ? '✓' : ''}
                        </div>
                        <div className="item-text">
                          <h6>{p.name}</h6>
                          <p>{p.category} • ₹{p.price.toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowKitBuilder(false)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={selectedItems.length === 0}
                >
                  <Plus size={16} />
                  <span>Build Kit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MSDS / Safety Precautions Info modal */}
      {activeSafetyProduct && (
        <div className="modal-overlay">
          <div className="modal-content-card card msds-modal">
            <div className="modal-header">
              <h3>Material Safety Data Sheet (MSDS)</h3>
              <button className="close-btn" onClick={() => setActiveSafetyProduct(null)}>×</button>
            </div>
            <div className="msds-body">
              <div className="msds-header-block">
                <h4>{activeSafetyProduct.name}</h4>
                <span className="msds-sku">SKU Code: {activeSafetyProduct.sku}</span>
              </div>
              
              <div className="msds-info-section">
                <h5>Hazard Classification</h5>
                <p>Commercial Cleaning Chemical Concentrate. Category 2 Irritant.</p>
              </div>

              <div className="msds-info-section">
                <h5>Safe Handling Precautions</h5>
                <div className="safety-instruction-box">
                  {activeSafetyProduct.safety}
                </div>
              </div>

              <div className="msds-info-section">
                <h5>First Aid Measures</h5>
                <ul>
                  <li><strong>Eye Contact:</strong> Flush with fresh water for 15 minutes.</li>
                  <li><strong>Skin Contact:</strong> Wash immediately with running water and soap.</li>
                  <li><strong>Inhalation:</strong> Shift to open air environment immediately.</li>
                </ul>
              </div>

              <div className="msds-footer-status">
                <FileText size={18} className="msds-doc-icon" />
                <span>Verified by Ganga Maxx Compliance Board</span>
              </div>

              <div className="modal-footer">
                <button className="btn btn-primary" onClick={() => setActiveSafetyProduct(null)}>
                  Close Safety Sheet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
