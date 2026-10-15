import React, { useState } from 'react';
import { 
  Database, 
  FolderPlus, 
  Plus, 
  Scale, 
  Apple, 
  Edit3, 
  Trash2, 
  Download, 
  Search, 
  CheckCircle2, 
  X,
  Package,
  Layers,
  ArrowRight,
  HelpCircle,
  Upload,
  Sparkles,
  RotateCcw,
  Image as ImageIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminRole } from '../context/AdminRoleContext';
import { useToast } from '../context/ToastContext';
import { saveFreshiozStore, generateId, generateUUID } from '../shared/freshiozStore';
import { exportToExcel } from '../utils/excelExporter';
import AdminPagination from '../components/common/AdminPagination';

const PRODUCE_PRESETS = [
  {
    name: 'Royal Gala Apple',
    category: 'FRUITS',
    icon: '🍎',
    badge: 'Orchard Fresh',
    origin: 'Shimla Apple Orchards, Himachal Pradesh',
    shelfLife: '7-10 Days',
    image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Country Vine Tomato',
    category: 'VEGETABLES',
    icon: '🍅',
    badge: 'Harvested Today at Dawn',
    origin: 'Kolar Agro Mandi, Karnataka',
    shelfLife: '4-5 Days',
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Baby Potatoes',
    category: 'VEGETABLES',
    icon: '🥔',
    badge: 'Mandi Arrival Today',
    origin: 'Hassan Farm Cluster, Karnataka',
    shelfLife: '14-20 Days',
    image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Nasik Red Onion',
    category: 'VEGETABLES',
    icon: '🧅',
    badge: 'Mandi Arrival Today',
    origin: 'Nasik APMC Mandi, Maharashtra',
    shelfLife: '15-25 Days',
    image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Fresh Palak (Spinach)',
    category: 'LEAFY_GREENS',
    icon: '🥬',
    badge: 'Harvested Today at Dawn',
    origin: 'Malur Farm Belt, Karnataka',
    shelfLife: '2-3 Days',
    image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Tender Broccoli Florets',
    category: 'EXOTIC',
    icon: '🥦',
    badge: 'Cold Chain Fresh',
    origin: 'Nilgiri Cold Farms, Ooty',
    shelfLife: '4-6 Days',
    image: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=600&auto=format&fit=crop&q=80'
  }
];

export default function MasterDataPage() {
  const { store, currentUser } = useAdminRole();
  const { showToast } = useToast();
  const categories = store.categories || [];
  const products = store.products || [];
  const units = store.units || [];

  const [activeTab, setActiveTab] = useState('PRODUCTS'); // 'PRODUCTS' | 'CATEGORIES' | 'UNITS'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isConfirmProductModalOpen, setIsConfirmProductModalOpen] = useState(false);

  // Simplified Form states
  const [categoryForm, setCategoryForm] = useState({ id: '', name: '', slug: '', icon: '🥦', description: '', status: 'ACTIVE' });
  const [unitForm, setUnitForm] = useState({ id: '', name: '', label: '', description: '', isBulk: false, status: 'ACTIVE' });
  
  // Product Master Form: Specifications only (Pricing managed at /daily-pricing)
  const [productForm, setProductForm] = useState({
    id: '',
    name: '',
    category: 'VEGETABLES',
    defaultUnit: '1 kg',
    hasWholesale: false,
    wholesaleUnit: '20 kg Mandi Crate',
    origin: 'Kolar Agro Mandi, Karnataka',
    shelfLife: '4-5 Days',
    desc: '',
    image: '',
    badge: 'Harvested Today at Dawn',
    customBadge: '',
    tags: 'Farm Fresh, Mandi Direct',
    status: 'ACTIVE'
  });

  const [editingId, setEditingId] = useState(null);

  // Export handlers
  const handleExportProductsExcel = () => {
    const headers = ['Produce ID', 'Item Name', 'Category', 'Retail Unit', 'Wholesale Packaging', 'Origin Mandi', 'Shelf Life', 'Description', 'Status'];
    const rows = products.map(p => [
      p.id,
      p.name,
      p.category,
      p.defaultUnit || p.retailUnit || 'kg',
      p.hasWholesale !== false && p.wholesaleUnit ? p.wholesaleUnit : 'Retail Pack Only',
      p.origin || 'APMC Mandi',
      p.shelfLife || '3-5 Days',
      p.desc || '',
      p.status || 'ACTIVE'
    ]);
    exportToExcel('Freshioz_Produce_Master_Catalog', headers, rows);
  };

  const handleExportCategoriesExcel = () => {
    const headers = ['Category ID', 'Category Name', 'Slug', 'Icon', 'Description', 'Item Count', 'Status'];
    const rows = categories.map(c => [c.id, c.name, c.slug, c.icon, c.description, c.itemCount || 0, c.status]);
    exportToExcel('Freshioz_Categories_Master', headers, rows);
  };

  const handleExportUnitsExcel = () => {
    const headers = ['Unit Code', 'Display Label', 'Packaging Type', 'Description', 'Status'];
    const rows = units.map(u => [u.name, u.label || u.name, u.isBulk ? 'Bulk / Mandi Crate' : 'Consumer / Retail', u.description || '', u.status || 'ACTIVE']);
    exportToExcel('Freshioz_Packaging_Units_Master', headers, rows);
  };

  // Add / Edit Category
  const handleSaveCategory = (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    const catId = editingId || categoryForm.name.toUpperCase().replace(/\s+/g, '_');
    const newCat = {
      ...categoryForm,
      id: catId,
      status: categoryForm.status || 'ACTIVE',
      slug: categoryForm.slug || categoryForm.name.toLowerCase().replace(/\s+/g, '-'),
      itemCount: products.filter(p => p.category === catId).length
    };

    saveFreshiozStore(prev => ({
      ...prev,
      categories: editingId 
        ? prev.categories.map(c => c.id === editingId ? newCat : c)
        : [...(prev.categories || []), newCat]
    }));

    setIsCategoryModalOpen(false);
    setEditingId(null);
    showToast(`✓ Category "${categoryForm.name}" saved!`);
  };

  // Soft Delete / Toggle Category Status (Active <-> Inactive)
  const handleToggleCategoryStatus = (cat) => {
    const isCurrentlyInactive = cat.status === 'INACTIVE';
    const newStatus = isCurrentlyInactive ? 'ACTIVE' : 'INACTIVE';

    if (!isCurrentlyInactive) {
      const linkedProducts = products.filter(p => p.category === cat.id);
      const msg = linkedProducts.length > 0 
        ? `Category "${cat.name}" currently has ${linkedProducts.length} product(s). Soft deleting will hide this category from user storefront navigation, but existing products remain safe in database. Deactivate category?`
        : `Soft delete category "${cat.name}"? It will be hidden from customer storefronts but can be restored anytime.`;
      
      if (!confirm(msg)) return;
    }

    saveFreshiozStore(prev => ({
      ...prev,
      categories: (prev.categories || []).map(c => c.id === cat.id ? { ...c, status: newStatus } : c)
    }));

    showToast(
      newStatus === 'ACTIVE'
        ? `✓ Category "${cat.name}" restored to Active!`
        : `✓ Category "${cat.name}" soft deleted (deactivated).`,
      newStatus === 'ACTIVE' ? 'success' : 'info'
    );
  };

  // Add / Edit Unit (Simplified to: kg, tones, crate, etc.)
  const handleSaveUnit = (e) => {
    e.preventDefault();
    if (!unitForm.name.trim()) return;

    const unitCode = unitForm.name.trim().toLowerCase();
    const unitId = editingId || `u-${unitCode}`;
    const newUnit = { 
      ...unitForm, 
      id: unitId,
      name: unitCode,
      label: unitForm.label.trim() || unitCode,
      isBulk: Boolean(unitForm.isBulk)
    };

    saveFreshiozStore(prev => ({
      ...prev,
      units: editingId
        ? prev.units.map(u => u.id === editingId ? newUnit : u)
        : [...(prev.units || []), newUnit]
    }));

    setIsUnitModalOpen(false);
    setEditingId(null);
    showToast(`✓ Packaging Unit "${unitCode}" saved!`);
  };

  const handleDeleteUnit = (id) => {
    if (confirm('Delete this packaging unit?')) {
      saveFreshiozStore(prev => ({
        ...prev,
        units: prev.units.filter(u => u.id !== id)
      }));
      showToast('Unit deleted.');
    }
  };

  // Image File Upload with automatic browser canvas compression (~40KB WebP)
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WebP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 600;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/webp', 0.85);
        setProductForm(prev => ({ ...prev, image: compressedDataUrl }));
        showToast('✓ Photo uploaded and optimized!');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Add / Edit Produce Item (Item Specs ONLY, NO PRICING)
  const handlePreSaveProduct = (e) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      showToast('Please enter produce name.', 'error');
      return;
    }
    if (!productForm.image) {
      // Pick matching preset or fallback image if user didn't upload
      const fallbackPreset = PRODUCE_PRESETS.find(p => p.category === productForm.category) || PRODUCE_PRESETS[1];
      setProductForm(prev => ({ ...prev, image: fallbackPreset.image }));
    }
    setIsConfirmProductModalOpen(true);
  };

  const handleConfirmCommitProduct = () => {
    const prodId = editingId || generateId('FRZ_PRD');
    const tagsArray = typeof productForm.tags === 'string' 
      ? productForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      : productForm.tags;

    // Resolve freshness badge
    let finalBadge = productForm.badge;
    if (finalBadge === 'CUSTOM') {
      finalBadge = productForm.customBadge?.trim() || 'Fresh Harvest';
    }

    // Fallback image if somehow still missing
    const finalImage = productForm.image || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80';

    // Preserve existing daily prices from store if editing, but don't configure prices here
    const existingProd = products.find(p => p.id === prodId) || {};
    const hasWholesale = Boolean(productForm.hasWholesale);
    const wholesaleUnit = hasWholesale ? (productForm.wholesaleUnit || '20 kg Mandi Crate') : null;

    const newProd = {
      wholesalePrice: 0,
      wholesaleUnit: '20 kg Mandi Crate',
      wholesaleSavings: '',
      gstPercent: 0,
      ...existingProd,
      ...productForm,
      retailPrice: existingProd.retailPrice || 0,
      retailMarketPrice: existingProd.retailMarketPrice || 0,
      id: prodId,
      uuid: existingProd?.uuid || generateUUID(),
      image: finalImage,
      badge: finalBadge,
      hasWholesale,
      wholesaleUnit,
      retailUnit: productForm.defaultUnit || '1 kg',
      tags: tagsArray,
      createdAt: existingProd.createdAt || new Date().toISOString(),
      createdBy: existingProd.createdBy || currentUser?.name || 'Super Admin',
      createdById: existingProd.createdById || currentUser?.id || 'emp-101',
      lastEditedAt: new Date().toISOString(),
      lastEditedBy: currentUser?.name || 'Super Admin',
      lastEditedById: currentUser?.id || 'emp-101'
    };

    saveFreshiozStore(prev => ({
      ...prev,
      products: editingId
        ? prev.products.map(p => p.id === editingId ? newProd : p)
        : [...(prev.products || []), newProd]
    }));

    setIsConfirmProductModalOpen(false);
    setIsProductModalOpen(false);
    setEditingId(null);
    showToast(`✓ Produce item "${productForm.name}" cataloged! Daily rates managed at /daily-pricing.`);
  };

  const handleDeleteProduct = (id) => {
    if (confirm('Delete this produce item from the master catalog?')) {
      saveFreshiozStore(prev => ({
        ...prev,
        products: prev.products.filter(p => p.id !== id)
      }));
      showToast('Item removed from catalog.');
    }
  };

  // Filtered datasets
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.origin?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUnits = units.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.label && u.label.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="admin-page-container">
      {/* High-Density Compact Header Strip (Under 55px) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        paddingBottom: '10px',
        borderBottom: '1.5px solid #E2E8F0',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ fontSize: '18px', color: '#0F172A', fontWeight: 800, margin: 0 }}>
            Master Data Catalog
          </h1>
          <span style={{ fontSize: '11px', color: '#64748B' }}>
            Taxonomies for Produce, Categories & Packing Units
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link
            to="/daily-pricing"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#FEF3C7',
              border: '1px solid #FDE68A',
              color: '#92400E',
              fontSize: '11.5px',
              fontWeight: 800,
              textDecoration: 'none'
            }}
            title="Produce pricing is updated daily at /daily-pricing"
          >
            <span>Daily Pricing Desk &rarr;</span>
          </Link>

          <button
            type="button"
            onClick={
              activeTab === 'PRODUCTS' 
                ? handleExportProductsExcel 
                : activeTab === 'CATEGORIES' 
                ? handleExportCategoriesExcel 
                : handleExportUnitsExcel
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '6px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#334155',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <Download size={13} />
            <span>Export</span>
          </button>

          {activeTab === 'PRODUCTS' && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setProductForm({
                  id: '',
                  name: '',
                  category: 'VEGETABLES',
                  defaultUnit: '1 kg',
                  hasWholesale: true,
                  wholesaleUnit: '20 kg Mandi Crate',
                  origin: 'Kolar Agro Mandi, Karnataka',
                  shelfLife: '4-5 Days',
                  desc: '',
                  image: '',
                  badge: 'Harvested Today at Dawn',
                  customBadge: '',
                  tags: 'Farm Fresh, Mandi Direct',
                  status: 'ACTIVE'
                });
                setIsProductModalOpen(true);
              }}
              className="admin-btn-accent"
              style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={14} />
              <span>Add Produce</span>
            </button>
          )}

          {activeTab === 'CATEGORIES' && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setCategoryForm({ id: '', name: '', slug: '', icon: '🥦', description: '', status: 'ACTIVE' });
                setIsCategoryModalOpen(true);
              }}
              className="admin-btn-accent"
              style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={14} />
              <span>Add Category</span>
            </button>
          )}

          {activeTab === 'UNITS' && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setUnitForm({ id: '', name: '', label: '', description: '', isBulk: false, status: 'ACTIVE' });
                setIsUnitModalOpen(true);
              }}
              className="admin-btn-accent"
              style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={14} />
              <span>Add Unit</span>
            </button>
          )}
        </div>
      </div>

      {/* Compact High-Density Tabs & Search Bar (Unified in single row!) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        marginBottom: '12px'
      }}>
        {/* Sleek Pill Tab Switcher */}
        <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: '3px', borderRadius: '8px', gap: '3px' }}>
          <button
            type="button"
            onClick={() => { setActiveTab('PRODUCTS'); setSearchQuery(''); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
              background: activeTab === 'PRODUCTS' ? '#234B3C' : 'transparent',
              color: activeTab === 'PRODUCTS' ? '#FFFFFF' : '#475569'
            }}
          >
            <Apple size={14} />
            <span>Produce Catalog</span>
            <span style={{ fontSize: '10.5px', background: activeTab === 'PRODUCTS' ? 'rgba(255,255,255,0.2)' : '#E2E8F0', padding: '1px 6px', borderRadius: '10px' }}>
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('CATEGORIES'); setSearchQuery(''); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
              background: activeTab === 'CATEGORIES' ? '#234B3C' : 'transparent',
              color: activeTab === 'CATEGORIES' ? '#FFFFFF' : '#475569'
            }}
          >
            <Layers size={14} />
            <span>Categories</span>
            <span style={{ fontSize: '10.5px', background: activeTab === 'CATEGORIES' ? 'rgba(255,255,255,0.2)' : '#E2E8F0', padding: '1px 6px', borderRadius: '10px' }}>
              {categories.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('UNITS'); setSearchQuery(''); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
              background: activeTab === 'UNITS' ? '#234B3C' : 'transparent',
              color: activeTab === 'UNITS' ? '#FFFFFF' : '#475569'
            }}
          >
            <Scale size={14} />
            <span>Packing Units</span>
            <span style={{ fontSize: '10.5px', background: activeTab === 'UNITS' ? 'rgba(255,255,255,0.2)' : '#E2E8F0', padding: '1px 6px', borderRadius: '10px' }}>
              {units.length}
            </span>
          </button>
        </div>

        {/* Compact Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: '6px',
          padding: '5px 10px',
          minWidth: '240px'
        }}>
          <Search size={14} color="#64748B" />
          <input
            type="text"
            placeholder={
              activeTab === 'PRODUCTS' 
                ? 'Search fruit/vegetable, origin...'
                : activeTab === 'CATEGORIES'
                ? 'Search categories...'
                : 'Search units (kg, crate...)...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: '12px', width: '100%' }}
          />
        </div>
      </div>

      {/* TAB 1: PRODUCE CATALOG (Taxonomy Specs ONLY, zero duplicate prices) */}
      {activeTab === 'PRODUCTS' && (
        <div className="admin-table-card">
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="admin-data-table" style={{ width: '100%', minWidth: '760px' }}>
              <thead>
                <tr>
                  <th>Produce Item & Code</th>
                  <th>Category</th>
                  <th>Retail Unit</th>
                  <th>Wholesale Packaging</th>
                  <th>Mandi Origin</th>
                  <th>Shelf Life</th>
                  <th>Daily Pricing</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="9">
                      <div className="admin-empty-state">
                        <div className="admin-empty-state-icon">
                          <Apple size={22} />
                        </div>
                        <div className="admin-empty-state-title">Produce Catalog Empty</div>
                        <div className="admin-empty-state-desc">
                          {searchQuery ? `No produce items matching "${searchQuery}"` : 'Click "+ Add Produce" above to catalog your first vegetable or fruit with origin and shelf-life specs.'}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map(prod => (
                    <tr key={prod.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={prod.image}
                            alt={prod.name}
                            style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
                          />
                          <div>
                            <strong style={{ fontSize: '13px', color: '#0F172A' }}>{prod.name}</strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span style={{ fontSize: '10.5px', color: '#64748B' }}>
                                Code: <code>{prod.id}</code>
                              </span>
                              {prod.badge && prod.badge !== 'NONE' && (
                                <span style={{
                                  fontSize: '10px',
                                  background: prod.badge.includes('Harvested') ? '#ECFDF5' : '#EFF6FF',
                                  color: prod.badge.includes('Harvested') ? '#047857' : '#1D4ED8',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '4px'
                                }}>
                                  {prod.badge}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span style={{
                          background: '#F1F5F9',
                          color: '#334155',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '4px'
                        }}>
                          {prod.category}
                        </span>
                      </td>

                      <td>
                        <strong style={{ fontSize: '12px', color: '#234B3C' }}>
                          {prod.defaultUnit || prod.retailUnit || 'kg'}
                        </strong>
                      </td>

                      <td>
                        {prod.hasWholesale !== false && prod.wholesaleUnit ? (
                          <span style={{ fontSize: '11px', background: '#EEF2FF', color: '#4338CA', padding: '2px 7px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Package size={11} />
                            <span>{prod.wholesaleUnit}</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', background: '#F1F5F9', color: '#64748B', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>
                            🛒 Retail Only
                          </span>
                        )}
                      </td>

                      <td>
                        <div style={{ fontSize: '11.5px', color: '#475569', maxWidth: '200px' }}>
                          {prod.origin || 'APMC Mandi'}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                          {prod.shelfLife || '3-5 Days'}
                        </div>
                      </td>

                      <td>
                        <Link
                          to="/daily-pricing"
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#166534',
                            background: '#F0FDF4',
                            border: '1px solid #BBF7D0',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Click to view and edit live morning prices in Daily Pricing"
                        >
                          <span>₹{prod.retailPrice || 0}</span>
                          {prod.retailMarketPrice && (
                            <span style={{ textDecoration: 'line-through', color: '#94A3B8', fontSize: '10px' }}>
                              ₹{prod.retailMarketPrice}
                            </span>
                          )}
                          <ArrowRight size={10} color="#059669" />
                        </Link>
                      </td>

                      <td>
                        <span className={`status-pill ${prod.status === 'INACTIVE' ? 'rejected' : 'approved'}`} style={{ fontSize: '10.5px' }}>
                          {prod.status || 'ACTIVE'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(prod.id);
                              const isStandardBadge = ['Harvested Today', 'Harvested Today at Dawn', 'Mandi Arrival Today', 'Orchard Fresh', 'Cold Chain Fresh', '100% Certified Organic', 'Hydroponic Fresh', 'NONE'].includes(prod.badge);
                              setProductForm({
                                id: prod.id,
                                name: prod.name,
                                category: prod.category,
                                defaultUnit: prod.defaultUnit || prod.retailUnit || '1 kg',
                                retailMarketPrice: prod.retailMarketPrice ?? 55,
                                retailPrice: prod.retailPrice ?? 40,
                                hasWholesale: prod.hasWholesale !== false,
                                wholesaleUnit: prod.wholesaleUnit || '20 kg Mandi Crate',
                                origin: prod.origin || '',
                                shelfLife: prod.shelfLife || '',
                                desc: prod.desc || '',
                                image: prod.image || '',
                                badge: isStandardBadge ? prod.badge : (prod.badge ? 'CUSTOM' : 'Harvested Today at Dawn'),
                                customBadge: isStandardBadge ? '' : (prod.badge || ''),
                                tags: Array.isArray(prod.tags) ? prod.tags.join(', ') : prod.tags || '',
                                status: prod.status || 'ACTIVE'
                              });
                              setIsProductModalOpen(true);
                            }}
                            style={{
                              background: '#F8FAFC',
                              border: '1px solid #CBD5E1',
                              padding: '5px 7px',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              color: '#334155'
                            }}
                            title="Edit Produce Item Specs"
                          >
                            <Edit3 size={12} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(prod.id)}
                            style={{
                              background: '#FFF1F2',
                              border: '1px solid #FECDD3',
                              padding: '5px 6px',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              color: '#E11D48'
                            }}
                            title="Delete Item"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination
            currentPage={currentPage}
            totalItems={filteredProducts.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            itemLabel="produce items"
          />
        </div>
      )}

      {/* TAB 2: CATEGORIES MASTER TABLE */}
      {activeTab === 'CATEGORIES' && (
        <div className="admin-table-card">
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="admin-data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Category Name & Icon</th>
                  <th>Category Code</th>
                  <th>URL Slug</th>
                  <th>Total Produce Items</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map(cat => (
                  <tr key={cat.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>{cat.icon || '🌱'}</span>
                        <div>
                          <strong style={{ fontSize: '13px', color: '#0F172A' }}>{cat.name}</strong>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{cat.description}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontSize: '11.5px', color: '#0F172A' }}>
                        {cat.id}
                      </code>
                    </td>

                    <td style={{ fontSize: '12px', color: '#64748B' }}>
                      {cat.slug}
                    </td>

                    <td>
                      <span style={{ fontWeight: 800, color: '#234B3C', fontSize: '12px' }}>
                        {products.filter(p => p.category === cat.id).length} Items
                      </span>
                    </td>

                    <td>
                      {cat.status === 'INACTIVE' ? (
                        <span className="status-pill rejected" style={{ fontSize: '10.5px', background: '#FEE2E2', color: '#991B1B' }}>
                          INACTIVE (HIDDEN)
                        </span>
                      ) : (
                        <span className="status-pill approved" style={{ fontSize: '10.5px' }}>
                          ACTIVE
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(cat.id);
                            setCategoryForm({ ...cat });
                            setIsCategoryModalOpen(true);
                          }}
                          style={{
                            background: '#F8FAFC',
                            border: '1px solid #CBD5E1',
                            padding: '5px 8px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            color: '#334155',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11.5px'
                          }}
                        >
                          <Edit3 size={11} />
                          <span>Edit</span>
                        </button>

                        {cat.status === 'INACTIVE' ? (
                          <button
                            type="button"
                            onClick={() => handleToggleCategoryStatus(cat)}
                            style={{
                              background: '#ECFDF5',
                              border: '1px solid #A7F3D0',
                              padding: '5px 8px',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              color: '#059669',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11.5px',
                              fontWeight: 700
                            }}
                            title="Restore Category to Active"
                          >
                            <RotateCcw size={11} />
                            <span>Restore</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleCategoryStatus(cat)}
                            style={{
                              background: '#FFF1F2',
                              border: '1px solid #FECDD3',
                              padding: '5px 8px',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              color: '#E11D48',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11.5px'
                            }}
                            title="Soft delete (hide from customer storefront navigation)"
                          >
                            <Trash2 size={11} />
                            <span>Soft Delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PACKAGING UNITS MASTER (SIMPLIFIED: kg, tones, crate) */}
      {activeTab === 'UNITS' && (
        <div className="admin-table-card">
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="admin-data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Packaging Unit Code</th>
                  <th>Display Label</th>
                  <th>Packaging Type</th>
                  <th>Operational Description</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map(unit => (
                  <tr key={unit.id}>
                    <td>
                      <code style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', background: '#F1F5F9', padding: '3px 8px', borderRadius: '5px' }}>
                        {unit.name}
                      </code>
                    </td>

                    <td>
                      <strong style={{ fontSize: '13px', color: '#234B3C' }}>
                        {unit.label || unit.name}
                      </strong>
                    </td>

                    <td>
                      {unit.isBulk ? (
                        <span style={{ fontSize: '11px', background: '#EEF2FF', color: '#4338CA', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Package size={11} />
                          <span>Bulk / Mandi Crate</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', background: '#ECFDF5', color: '#047857', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Scale size={11} />
                          <span>Consumer / Retail</span>
                        </span>
                      )}
                    </td>

                    <td style={{ fontSize: '12px', color: '#64748B' }}>
                      {unit.description || 'Standard packaging unit'}
                    </td>

                    <td>
                      <span className="status-pill approved" style={{ fontSize: '10.5px' }}>ACTIVE</span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(unit.id);
                            setUnitForm({
                              id: unit.id,
                              name: unit.name,
                              label: unit.label || unit.name,
                              description: unit.description || '',
                              isBulk: Boolean(unit.isBulk),
                              status: unit.status || 'ACTIVE'
                            });
                            setIsUnitModalOpen(true);
                          }}
                          style={{
                            background: '#F8FAFC',
                            border: '1px solid #CBD5E1',
                            padding: '4px 7px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            color: '#334155'
                          }}
                        >
                          <Edit3 size={11} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteUnit(unit.id)}
                          style={{
                            background: '#FFF1F2',
                            border: '1px solid #FECDD3',
                            padding: '4px 6px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            color: '#E11D48'
                          }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PRODUCE ITEM (Taxonomy Specs ONLY, NO Pricing Fields) */}
      {isProductModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Apple size={20} color="#234B3C" />
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {editingId ? 'Edit Produce Item Specs' : 'Register New Produce Item'}
                </h3>
              </div>
              <button type="button" onClick={() => setIsProductModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', color: '#92400E', marginBottom: '14px' }}>
              ℹ️ <strong>Daily Pricing Separation:</strong> Market buying rates, consumer retail selling prices, wholesale crate rates, and GST % are managed daily at <strong>/daily-pricing</strong> based on morning APMC arrivals.
            </div>

            <form onSubmit={handlePreSaveProduct}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label-title" style={{ fontSize: '11px' }}>Produce Name *</label>
                  <input
                    type="text"
                    className="form-input-control"
                    placeholder="e.g. Crisp Green Capsicum (Shimla Mirch)"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label-title" style={{ fontSize: '11px' }}>Category *</label>
                  <select
                    className="form-input-control"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label-title" style={{ fontSize: '11px' }}>Consumer Retail Unit *</label>
                  <select
                    className="form-input-control"
                    value={productForm.defaultUnit}
                    onChange={(e) => setProductForm({ ...productForm, defaultUnit: e.target.value })}
                  >
                    {units.filter(u => !u.isBulk).map(u => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.label || u.name})
                      </option>
                    ))}
                    {units.some(u => u.isBulk) && (
                      <optgroup label="Bulk Units">
                        {units.filter(u => u.isBulk).map(u => (
                          <option key={u.id} value={u.name}>
                            {u.name} ({u.label || u.name})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label className="form-label-title" style={{ fontSize: '11px' }}>Shelf Life</label>
                  <input
                    type="text"
                    className="form-input-control"
                    placeholder="e.g. 4-5 Days"
                    value={productForm.shelfLife}
                    onChange={(e) => setProductForm({ ...productForm, shelfLife: e.target.value })}
                  />
                </div>
              </div>

              {/* Wholesale / Bulk Crates Packaging Option */}
              <div style={{
                background: productForm.hasWholesale ? '#F8FAFC' : '#F1F5F9',
                border: productForm.hasWholesale ? '1.5px solid #CBD5E1' : '1px dashed #CBD5E1',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <Package size={15} color={productForm.hasWholesale ? '#4338CA' : '#64748B'} />
                      <span>Available for Wholesale / Bulk Crates?</span>
                    </label>
                    <p style={{ fontSize: '10.5px', color: '#64748B', margin: '2px 0 0 0' }}>
                      Enable if this produce item is sold in mandi crates, sacks, or bulk boxes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProductForm(prev => ({ 
                      ...prev, 
                      hasWholesale: !prev.hasWholesale,
                      wholesaleUnit: !prev.hasWholesale ? (prev.wholesaleUnit || '20 kg Mandi Crate') : ''
                    }))}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '20px',
                      border: 'none',
                      background: productForm.hasWholesale ? '#234B3C' : '#E2E8F0',
                      color: productForm.hasWholesale ? '#FFF' : '#64748B',
                      fontWeight: 800,
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {productForm.hasWholesale ? '✓ Enabled' : 'Off (Retail Only)'}
                  </button>
                </div>

                {productForm.hasWholesale && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #E2E8F0' }}>
                    <label className="form-label-title" style={{ fontSize: '11px', color: '#334155' }}>
                      Wholesale Packaging Unit *
                    </label>
                    <select
                      className="form-input-control"
                      value={productForm.wholesaleUnit || '20 kg Mandi Crate'}
                      onChange={(e) => setProductForm({ ...productForm, wholesaleUnit: e.target.value })}
                      style={{ fontWeight: 700, color: '#0F172A' }}
                    >
                      <option value="20 kg Mandi Crate">Standard APMC Crate (20 kg)</option>
                      <option value="10 kg Corrugated Box">Corrugated Master Box (10 kg)</option>
                      <option value="25 kg Gunny Sack">Mandi Gunny Sack (25 kg)</option>
                      <option value="50 kg Mandi Sack">Mandi Gunny Sack (50 kg)</option>
                      <option value="1 Metric Ton (tones)">Metric Ton (tones - Mandi Truckload)</option>
                      {units.filter(u => u.isBulk && !['20 kg Mandi Crate', '10 kg Corrugated Box', '25 kg Gunny Sack', '50 kg Mandi Sack', '1 Metric Ton (tones)'].includes(u.label || u.name)).map(u => (
                        <option key={u.id} value={u.label || u.name}>{u.label || u.name}</option>
                      ))}
                    </select>
                    <span style={{ fontSize: '10px', color: '#64748B', marginTop: '3px', display: 'block' }}>
                      Wholesale crate pricing and margin savings are managed at /daily-pricing.
                    </span>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="form-label-title" style={{ fontSize: '11px' }}>Mandi Origin / Source</label>
                <input
                  type="text"
                  className="form-input-control"
                  placeholder="e.g. Kolar Agro Mandi, Karnataka"
                  value={productForm.origin}
                  onChange={(e) => setProductForm({ ...productForm, origin: e.target.value })}
                />
              </div>

              {/* Freshness Badge / Status */}
              <div style={{ marginBottom: '12px' }}>
                <label className="form-label-title" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={12} color="#059669" />
                  <span>Freshness Badge / Status *</span>
                </label>
                <select
                  className="form-input-control"
                  value={productForm.badge}
                  onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })}
                >
                  <option value="Harvested Today at Dawn">🌿 Harvested Today at Dawn (Daily Greens & Country)</option>
                  <option value="Harvested Today">✨ Harvested Today (Daily Farm Picked)</option>
                  <option value="Mandi Arrival Today">🚛 Mandi Arrival Today (APMC Direct)</option>
                  <option value="Orchard Fresh">🍎 Orchard Fresh (Apples, Pears, Citrus)</option>
                  <option value="Cold Chain Fresh">❄️ Cold Chain Fresh (Berries & Exotics)</option>
                  <option value="100% Certified Organic">🌱 100% Certified Organic</option>
                  <option value="Hydroponic Fresh">💧 Hydroponic Fresh</option>
                  <option value="NONE">🚫 No Badge (Clean display)</option>
                  <option value="CUSTOM">✏️ Custom Badge...</option>
                </select>
              </div>

              {productForm.badge === 'CUSTOM' && (
                <div style={{ marginBottom: '12px' }}>
                  <label className="form-label-title" style={{ fontSize: '11px' }}>Custom Badge Text</label>
                  <input
                    type="text"
                    className="form-input-control"
                    placeholder="e.g. Direct from Shimla Orchards"
                    value={productForm.customBadge || ''}
                    onChange={(e) => setProductForm({ ...productForm, customBadge: e.target.value })}
                  />
                </div>
              )}

              {/* Image Upload Area */}
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label-title" style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ImageIcon size={12} color="#2563EB" />
                    <span>Produce Photo *</span>
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>Upload file (auto compressed)</span>
                </label>

                {productForm.image ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#F8FAFC',
                    border: '1.5px solid #CBD5E1'
                  }}>
                    <div style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0', flexShrink: 0, background: '#FFF' }}>
                      <img 
                        src={productForm.image} 
                        alt="Preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <CheckCircle2 size={13} color="#059669" />
                        <span>Produce Photo Attached</span>
                      </div>
                      <p style={{ fontSize: '10.5px', color: '#64748B', margin: '2px 0 6px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {productForm.image.startsWith('data:') ? 'Local file uploaded & optimized' : 'Online produce photo linked'}
                      </p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <label style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#2563EB',
                          cursor: 'pointer',
                          padding: '3px 8px',
                          background: '#EFF6FF',
                          borderRadius: '4px',
                          border: '1px solid #DBEAFE',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Upload size={11} />
                          <span>Change Photo</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            style={{ display: 'none' }} 
                            onChange={handleImageUpload} 
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setProductForm(prev => ({ ...prev, image: '' }))}
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#DC2626',
                            cursor: 'pointer',
                            padding: '3px 8px',
                            background: '#FEF2F2',
                            borderRadius: '4px',
                            border: '1px solid #FEE2E2',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Trash2 size={11} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    border: '2px dashed #94A3B8',
                    borderRadius: '8px',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: '#ECFDF5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '6px',
                      color: '#059669'
                    }}>
                      <Upload size={18} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                      Click or Drag to Upload Produce Photo
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                      Supports JPG, PNG, WEBP • Automatically compressed
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={handleImageUpload} 
                    />
                  </label>
                )}

                {/* Quick 1-Click Produce Stock Presets */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, marginBottom: '5px' }}>
                    Or select a Quick Produce Photo preset:
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {PRODUCE_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setProductForm(prev => ({
                            ...prev,
                            name: prev.name || preset.name,
                            category: preset.category,
                            origin: prev.origin || preset.origin,
                            shelfLife: prev.shelfLife || preset.shelfLife,
                            badge: preset.badge,
                            image: preset.image
                          }));
                          showToast(`Applied ${preset.name} photo!`);
                        }}
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          border: productForm.image === preset.image ? '1.5px solid #059669' : '1px solid #CBD5E1',
                          background: productForm.image === preset.image ? '#ECFDF5' : '#FFFFFF',
                          color: productForm.image === preset.image ? '#059669' : '#334155',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional direct URL fallback */}
                <div style={{ marginTop: '6px' }}>
                  <details style={{ fontSize: '11px', color: '#64748B' }}>
                    <summary style={{ cursor: 'pointer', userSelect: 'none', color: '#475569', fontWeight: 600 }}>
                      Paste direct web URL instead
                    </summary>
                    <input
                      type="url"
                      className="form-input-control"
                      style={{ marginTop: '6px', fontSize: '11.5px' }}
                      placeholder="https://..."
                      value={productForm.image}
                      onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                    />
                  </details>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label-title" style={{ fontSize: '11px' }}>Freshness Description & Tags</label>
                <input
                  type="text"
                  className="form-input-control"
                  placeholder="e.g. Farm picked, hydroponic, crisp"
                  value={productForm.desc}
                  onChange={(e) => setProductForm({ ...productForm, desc: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFF', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '7px 18px', borderRadius: '6px', border: 'none', background: '#234B3C', color: '#FFF', fontWeight: 800, fontSize: '12px' }}
                >
                  Save Item Specs
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CONFIRMATION POPUP MODAL (YES / NO) ================= */}
      {isConfirmProductModalOpen && (
        <div 
          className="admin-modal-overlay" 
          style={{ zIndex: 1100, background: 'rgba(15, 23, 42, 0.72)' }}
        >
          <div 
            className="admin-modal-card" 
            style={{ 
              maxWidth: '480px', 
              border: '2px solid #E2E8F0',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              padding: '24px 26px',
              animation: 'adminModalEnter 0.2s ease-out'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '18px' }}>
              <div style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '10px', 
                background: '#FEF3C7', 
                color: '#D97706', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <HelpCircle size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {editingId ? 'Confirm Produce Updates?' : 'Confirm Produce Registration?'}
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px', marginBottom: 0, lineHeight: 1.4 }}>
                  Please review the produce taxonomy & harvesting origin before saving:
                </p>
              </div>
            </div>

            {/* Summary Review Card */}
            <div style={{ 
              background: '#F8FAFC', 
              borderRadius: '10px', 
              border: '1.5px solid #E2E8F0', 
              padding: '14px 16px', 
              marginBottom: '20px',
              fontSize: '12.5px'
            }}>
              {/* Produce Header with Photo Thumbnail */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px dashed #CBD5E1' }}>
                {productForm.image ? (
                  <img
                    src={productForm.image}
                    alt={productForm.name}
                    style={{ width: '46px', height: '46px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #CBD5E1', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: '46px', height: '46px', borderRadius: '8px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Apple size={22} color="#94A3B8" />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                    {productForm.name || 'Unnamed Produce'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '10.5px',
                      background: '#ECFDF5',
                      color: '#047857',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: 700
                    }}>
                      {productForm.badge === 'CUSTOM' ? (productForm.customBadge || 'Fresh') : productForm.badge}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #CBD5E1' }}>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600, display: 'block', fontSize: '11px' }}>Category:</span>
                  <span style={{ color: '#059669', fontWeight: 800 }}>
                    {categories.find(c => c.id === productForm.category)?.name || productForm.category}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600, display: 'block', fontSize: '11px' }}>Retail Unit:</span>
                  <span style={{ color: '#0F172A', fontWeight: 800 }}>{productForm.defaultUnit}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #CBD5E1' }}>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600, display: 'block', fontSize: '11px' }}>Wholesale Packaging:</span>
                  <span style={{ color: productForm.hasWholesale ? '#4338CA' : '#64748B', fontWeight: 800 }}>
                    {productForm.hasWholesale ? `📦 ${productForm.wholesaleUnit || '20 kg Mandi Crate'}` : '🛒 Retail Only'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600, display: 'block', fontSize: '11px' }}>Shelf Life:</span>
                  <span style={{ color: '#334155', fontWeight: 700 }}>{productForm.shelfLife}</span>
                </div>
              </div>

              <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #CBD5E1' }}>
                <span style={{ color: '#64748B', fontWeight: 600, display: 'block', fontSize: '11px' }}>Mandi Origin:</span>
                <span style={{ color: '#334155', fontWeight: 700 }}>{productForm.origin || 'APMC Yard'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Pricing Notice:</span>
                <span style={{ color: '#B45309', fontWeight: 700, fontSize: '11.5px' }}>
                  Live price managed at /daily-pricing
                </span>
              </div>
            </div>

            {/* Action Buttons: No vs Yes */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsConfirmProductModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <X size={15} />
                <span>No, Keep Editing</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmCommitProduct}
                style={{
                  flex: 1,
                  padding: '11px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#234B3C',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(35, 75, 60, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle2 size={16} />
                <span>Yes, Confirm & Catalog</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CATEGORY */}
      {isCategoryModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Category Master Setup</h3>
              <button type="button" onClick={() => setIsCategoryModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory}>
              <div style={{ marginBottom: '12px' }}>
                <label className="form-label-title" style={{ fontSize: '11px' }}>Category Name *</label>
                <input
                  type="text"
                  className="form-input-control"
                  placeholder="e.g. Exotic & Salads"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label-title" style={{ fontSize: '11px' }}>Emoji Icon</label>
                  <input
                    type="text"
                    className="form-input-control"
                    placeholder="🥦"
                    value={categoryForm.icon}
                    onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label-title" style={{ fontSize: '11px' }}>URL Slug</label>
                  <input
                    type="text"
                    className="form-input-control"
                    placeholder="exotic-salads"
                    value={categoryForm.slug}
                    onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label-title" style={{ fontSize: '11px' }}>Description</label>
                <input
                  type="text"
                  className="form-input-control"
                  placeholder="Short description"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label-title" style={{ fontSize: '11px' }}>Category Status *</label>
                <select
                  className="form-input-control"
                  value={categoryForm.status || 'ACTIVE'}
                  onChange={(e) => setCategoryForm({ ...categoryForm, status: e.target.value })}
                  style={{ height: '38px', fontWeight: 700 }}
                >
                  <option value="ACTIVE">🟢 ACTIVE (Live on Storefront Navigation)</option>
                  <option value="INACTIVE">🔴 INACTIVE (Soft Deleted / Hidden)</option>
                </select>
                <span style={{ fontSize: '10.5px', color: '#64748B', display: 'block', marginTop: '4px' }}>
                  Soft-deleted categories are hidden from resident catalog menus, but existing catalog items remain safe.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '7px 18px', borderRadius: '6px', border: 'none', background: '#234B3C', color: '#FFF', fontWeight: 800, fontSize: '12px' }}>
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PACKAGING UNIT (SIMPLIFIED: kg, tones, crate) */}
      {isUnitModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Scale size={18} color="#234B3C" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Packaging Unit Setup</h3>
              </div>
              <button type="button" onClick={() => setIsUnitModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUnit}>
              <div style={{ marginBottom: '12px' }}>
                <label className="form-label-title" style={{ fontSize: '11px' }}>Unit Code / Short Form *</label>
                <input
                  type="text"
                  className="form-input-control"
                  placeholder="e.g. kg, tones, crate, pack"
                  value={unitForm.name}
                  onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                  required
                />
                <span style={{ fontSize: '10.5px', color: '#64748B' }}>Enter standard unit abbreviation: kg, tones, crate, etc.</span>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="form-label-title" style={{ fontSize: '11px' }}>Display Label</label>
                <input
                  type="text"
                  className="form-input-control"
                  placeholder="e.g. Kilogram (kg), Metric Ton, Standard Crate"
                  value={unitForm.label}
                  onChange={(e) => setUnitForm({ ...unitForm, label: e.target.value })}
                />
              </div>

              {/* Packaging Unit Classification: Retail vs Bulk */}
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label-title" style={{ fontSize: '11px' }}>Packaging Classification *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setUnitForm({ ...unitForm, isBulk: false })}
                    style={{
                      padding: '9px 10px',
                      borderRadius: '6px',
                      border: !unitForm.isBulk ? '2px solid #059669' : '1px solid #CBD5E1',
                      background: !unitForm.isBulk ? '#ECFDF5' : '#FFFFFF',
                      color: !unitForm.isBulk ? '#047857' : '#475569',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Scale size={14} />
                    <span>🛒 Consumer / Retail</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitForm({ ...unitForm, isBulk: true })}
                    style={{
                      padding: '9px 10px',
                      borderRadius: '6px',
                      border: unitForm.isBulk ? '2px solid #4338CA' : '1px solid #CBD5E1',
                      background: unitForm.isBulk ? '#EEF2FF' : '#FFFFFF',
                      color: unitForm.isBulk ? '#4338CA' : '#475569',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Package size={14} />
                    <span>📦 Commercial / Bulk</span>
                  </button>
                </div>
                <span style={{ fontSize: '10px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                  {unitForm.isBulk 
                    ? '📦 Bulk unit: Used for wholesale Mandi crates, sacks, and ton truckloads.' 
                    : '🛒 Retail unit: Used for standard consumer weight (kg, g, bunches, tray packs).'}
                </span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label-title" style={{ fontSize: '11px' }}>Operational Description</label>
                <input
                  type="text"
                  className="form-input-control"
                  placeholder="e.g. Standard 20kg APMC harvesting crate"
                  value={unitForm.description}
                  onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsUnitModalOpen(false)} style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '7px 18px', borderRadius: '6px', border: 'none', background: '#234B3C', color: '#FFF', fontWeight: 800, fontSize: '12px' }}>
                  Save Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
