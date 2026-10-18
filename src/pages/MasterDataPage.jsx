import React, { useState, useEffect } from 'react';
import { 
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
  Upload,
  Sparkles,
  RotateCcw,
  Image as ImageIcon
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdminRole } from '../context/AdminRoleContext';
import { useToast } from '../context/ToastContext';
import { products as productResource, categories as categoryResource, units as unitResource } from '../hooks/resources';
import { uploadService } from '../services/uploadService';
import { exportToExcel } from '../utils/excelExporter';
import { resolveImageUrl, handleImageError } from '../utils/imageUtils';
import AdminPagination from '../components/common/AdminPagination';

export { resolveImageUrl };

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
  const { currentUser } = useAdminRole();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const { data: rawCategories = [], isLoading: isLoadingCategories } = categoryResource.useList();
  const { data: rawProducts = [], isLoading: isLoadingProducts } = productResource.useList();
  const { data: rawUnits = [], isLoading: isLoadingUnits } = unitResource.useList();

  const createCategoryMutation = categoryResource.useCreate();
  const updateCategoryMutation = categoryResource.useUpdate();
  const removeCategoryMutation = categoryResource.useRemove();

  const createProductMutation = productResource.useCreate();
  const updateProductMutation = productResource.useUpdate();
  const removeProductMutation = productResource.useRemove();

  const createUnitMutation = unitResource.useCreate();
  const updateUnitMutation = unitResource.useUpdate();
  const removeUnitMutation = unitResource.useRemove();

  const categories = Array.isArray(rawCategories) ? rawCategories : [];
  const products = Array.isArray(rawProducts) ? rawProducts : [];
  const units = Array.isArray(rawUnits) ? rawUnits : [];

  const getTabFromHash = (hashStr) => {
    const raw = (hashStr || '').toLowerCase().replace('#', '').trim();
    if (raw === 'categories') return 'CATEGORIES';
    if (raw === 'units') return 'UNITS';
    if (raw === 'produce' || raw === 'products') return 'PRODUCTS';
    return null;
  };

  const [activeTab, setActiveTab] = useState(() => getTabFromHash(location.hash) || 'PRODUCTS');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Sync hash to URL bar on mount and on route changes
  useEffect(() => {
    const currentTab = getTabFromHash(location.hash);
    if (currentTab) {
      if (activeTab !== currentTab) {
        setActiveTab(currentTab);
        setCurrentPage(1);
      }
    } else {
      // If URL has no hash (e.g. /admin/master-data), explicitly set #produce
      navigate({ hash: '#produce' }, { replace: true });
    }
  }, [location.hash]);

  const handleTabSwitch = (tabKey) => {
    setActiveTab(tabKey);
    setSearchQuery('');
    setCurrentPage(1);
    const hash = tabKey === 'CATEGORIES' ? '#categories' : tabKey === 'UNITS' ? '#units' : '#produce';
    navigate({ hash }, { replace: true });
  };

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
    const headers = ['Produce ID', 'Item Name', 'Category', 'Retail Unit', 'Origin Mandi', 'Shelf Life', 'Description', 'Status'];
    const rows = products.map(p => [
      p.id,
      p.name,
      p.category,
      p.defaultUnit || p.retailUnit || 'kg',
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

  // Add / Edit Category (Wired to backend REST API with canonical store sync)
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    const catId = editingId || categoryForm.name.toUpperCase().replace(/\s+/g, '_');
    const slug = categoryForm.slug || categoryForm.name.toLowerCase().replace(/\s+/g, '-');

    try {
      if (editingId) {
        await updateCategoryMutation.mutateAsync({
          id: editingId,
          data: {
            name: categoryForm.name.trim(),
            slug,
            icon: categoryForm.icon,
            description: categoryForm.description,
            status: categoryForm.status || 'ACTIVE',
          }
        });
      } else {
        await createCategoryMutation.mutateAsync({
          name: categoryForm.name.trim(),
          slug,
          icon: categoryForm.icon,
          description: categoryForm.description,
          status: categoryForm.status || 'ACTIVE',
        });
      }

      setIsCategoryModalOpen(false);
      setEditingId(null);
      showToast(`✓ Category "${categoryForm.name}" saved!`, 'success');
    } catch (err) {
      console.error('Backend category persistence failed:', err);
      showToast(`Failed to save category on server: ${err?.message || 'Server error'}`, 'error');
      return;
    }
  };

  // Soft Delete / Toggle Category Status (Active <-> Inactive)
  const handleToggleCategoryStatus = async (cat) => {
    const isCurrentlyInactive = cat.status === 'INACTIVE';
    const newStatus = isCurrentlyInactive ? 'ACTIVE' : 'INACTIVE';

    if (!isCurrentlyInactive) {
      const linkedProducts = products.filter(p => p.category === cat.id);
      const msg = linkedProducts.length > 0 
        ? `Category "${cat.name}" currently has ${linkedProducts.length} product(s). Soft deleting will hide this category from user storefront navigation, but existing products remain safe in database. Deactivate category?`
        : `Soft delete category "${cat.name}"? It will be hidden from customer storefronts but can be restored anytime.`;
      
      if (!confirm(msg)) return;
    }

    try {
      await updateCategoryMutation.mutateAsync({
        id: cat.id,
        data: { status: newStatus }
      });

      showToast(
        newStatus === 'ACTIVE'
          ? `✓ Category "${cat.name}" restored to Active!`
          : `✓ Category "${cat.name}" soft deleted (deactivated).`,
        newStatus === 'ACTIVE' ? 'success' : 'info'
      );
    } catch (err) {
      console.error('Backend category status update failed:', err);
      showToast(`Failed to update category status on server: ${err?.message || 'Server error'}`, 'error');
      return;
    }
  };

  // Add / Edit Unit (Wired to backend REST API with canonical store sync)
  const handleSaveUnit = async (e) => {
    e.preventDefault();
    if (!unitForm.name.trim()) return;

    const unitCode = unitForm.name.trim().toLowerCase();
    const unitLabel = unitForm.label.trim() || unitCode;

    try {
      let savedServerUnit = null;
      if (editingId) {
        await updateUnitMutation.mutateAsync({
          id: editingId,
          data: {
            name: unitCode,
            label: unitLabel,
            isBulk: Boolean(unitForm.isBulk),
            description: unitForm.description,
          }
        });
      } else {
        await createUnitMutation.mutateAsync({
          name: unitCode,
          label: unitLabel,
          isBulk: Boolean(unitForm.isBulk),
          description: unitForm.description,
        });
      }

      setIsUnitModalOpen(false);
      setEditingId(null);
      showToast(`✓ Packaging Unit "${unitCode}" saved!`, 'success');
    } catch (err) {
      console.error('Backend unit persistence failed:', err);
      showToast(`Failed to save packaging unit on server: ${err?.message || 'Server error'}`, 'error');
      return;
    }
  };

  const handleDeleteUnit = async (id) => {
    if (confirm('Delete this packaging unit?')) {
      try {
        await removeUnitMutation.mutateAsync(id);
        showToast('Unit deleted.', 'success');
      } catch (err) {
        console.error('Backend unit delete failed:', err);
        showToast(`Failed to delete unit on server: ${err?.message || 'Server error'}`, 'error');
        return;
      }
    }
  };

  // Image File Upload with server upload and automatic browser canvas compression fallback
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WebP).', 'error');
      return;
    }

    try {
      const uploadRes = await uploadService.uploadFile(file);
      if (uploadRes && uploadRes.url) {
        const fullUrl = resolveImageUrl(uploadRes.url);
        setProductForm(prev => ({ ...prev, image: fullUrl }));
        showToast('✓ Photo uploaded and stored on server!');
        return;
      }
    } catch (err) {
      console.warn('Server upload fallback to canvas image:', err?.message);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 500;
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

        const compressedDataUrl = canvas.toDataURL('image/webp', 0.8);
        setProductForm(prev => ({ ...prev, image: compressedDataUrl }));
        showToast('✓ Photo optimized!');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Add / Edit Produce Item (Item Specs ONLY, NO PRICING)
  // Add / Edit Produce Item (Item Specs ONLY, NO PRICING)
  const handlePreSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      showToast('Please enter produce name.', 'error');
      return;
    }
    // Directly commit changes smoothly to avoid double-modal layering issues
    await handleConfirmCommitProduct();
  };

  const handleConfirmCommitProduct = async () => {
    const prodId = editingId || generateId('FRZ_PRD');
    const tagsArray = typeof productForm.tags === 'string' 
      ? productForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      : (Array.isArray(productForm.tags) ? productForm.tags : []);

    // Resolve freshness badge
    let finalBadge = productForm.badge;
    if (finalBadge === 'CUSTOM') {
      finalBadge = productForm.customBadge?.trim() || 'Fresh Harvest';
    }

    // Fallback image if somehow still missing
    const fallbackPreset = PRODUCE_PRESETS.find(p => p.category === productForm.category) || PRODUCE_PRESETS[1];
    const finalImage = productForm.image || fallbackPreset.image;

    // Preserve existing daily prices from store if editing, but don't configure prices here
    const existingProd = products.find(p => p.id === prodId || p.uuid === prodId) || {};
    const hasWholesale = Boolean(productForm.hasWholesale);
    const wholesaleUnit = hasWholesale ? (productForm.wholesaleUnit || '20 kg Mandi Crate') : null;
    const resolvedUnit = productForm.defaultUnit || productForm.retailUnit || existingProd.retailUnit || '1 kg';

    const newProd = {
      wholesalePrice: 0,
      wholesaleUnit: '20 kg Mandi Crate',
      wholesaleSavings: '',
      gstPercent: 0,
      ...existingProd,
      ...productForm,
      id: prodId,
      uuid: existingProd?.uuid || generateUUID(),
      categoryId: productForm.category,
      category: productForm.category,
      retailPrice: existingProd.retailPrice ?? productForm.retailPrice ?? 40,
      retailMarketPrice: existingProd.retailMarketPrice ?? productForm.retailMarketPrice ?? 55,
      image: finalImage,
      badge: finalBadge,
      hasWholesale,
      wholesaleUnit,
      retailUnit: resolvedUnit,
      defaultUnit: resolvedUnit,
      tags: tagsArray,
      createdAt: existingProd.createdAt || new Date().toISOString(),
      createdBy: existingProd.createdBy || currentUser?.name || 'Super Admin',
      createdById: existingProd.createdById || currentUser?.id || 'emp-101',
      lastEditedAt: new Date().toISOString(),
      lastEditedBy: currentUser?.name || 'Super Admin',
      lastEditedById: currentUser?.id || 'emp-101'
    };

    // 1. Persist directly to backend database via React Query mutations
    try {
      if (editingId) {
        await updateProductMutation.mutateAsync({
          id: prodId,
          data: {
            name: newProd.name,
            categoryId: newProd.categoryId,
            category: newProd.category,
            retailUnit: newProd.retailUnit,
            defaultUnit: newProd.retailUnit,
            retailPrice: Number(newProd.retailPrice) || 0,
            retailMarketPrice: Number(newProd.retailMarketPrice) || 0,
            origin: newProd.origin,
            shelfLife: newProd.shelfLife,
            desc: newProd.desc,
            image: newProd.image,
            badge: newProd.badge,
            tags: tagsArray,
            status: newProd.status || 'ACTIVE'
          }
        });
      } else {
        await createProductMutation.mutateAsync({
          id: prodId,
          name: newProd.name,
          categoryId: newProd.categoryId,
          retailUnit: newProd.retailUnit,
          retailPrice: Number(newProd.retailPrice) || 40,
          retailMarketPrice: Number(newProd.retailMarketPrice) || 55,
          origin: newProd.origin,
          shelfLife: newProd.shelfLife,
          desc: newProd.desc,
          image: newProd.image,
          badge: newProd.badge,
          tags: tagsArray,
          status: newProd.status || 'ACTIVE'
        });
      }

      setIsConfirmProductModalOpen(false);
      setIsProductModalOpen(false);
      setEditingId(null);
      showToast(`✓ Produce item "${productForm.name}" ${editingId ? 'updated' : 'cataloged'} successfully!`, 'success');
    } catch (apiErr) {
      console.error('Backend product API save failed:', apiErr);
      showToast(`Failed to save produce item on server: ${apiErr?.message || 'Server error'}`, 'error');
      // Keep form modal open so the user can fix the issue without losing typed input!
      setIsConfirmProductModalOpen(false);
    }
  };

  const handleDeleteProduct = async (id, name = 'Produce item') => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from the master produce catalog?`)) return;

    try {
      await removeProductMutation.mutateAsync(id);
      showToast(`✓ "${name}" removed from catalog.`, 'success');
    } catch (err) {
      console.warn('Backend product delete error:', err);
      showToast(`Failed to delete product: ${err?.message || 'Server error'}`, 'error');
    }
  };

  // Filtered datasets
  const filteredProducts = products.filter(p => {
    const pName = String(p.name || '');
    const rawCat = p.category;
    const pCat = typeof rawCat === 'object' && rawCat !== null 
      ? String(rawCat.name || rawCat.id || '') 
      : String(p.categoryId || rawCat || '');
    const pOrigin = String(p.origin || '');
    const q = (searchQuery || '').toLowerCase();
    return (
      pName.toLowerCase().includes(q) ||
      pCat.toLowerCase().includes(q) ||
      pOrigin.toLowerCase().includes(q)
    );
  });

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const filteredCategories = categories.filter(c => 
    String(c?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(c?.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUnits = units.filter(u => 
    String(u?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(u?.label || '').toLowerCase().includes(searchQuery.toLowerCase())
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
            onClick={() => handleTabSwitch('PRODUCTS')}
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
            onClick={() => handleTabSwitch('CATEGORIES')}
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
            onClick={() => handleTabSwitch('UNITS')}
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
                    <td colSpan="8">
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
                            src={resolveImageUrl(prod.image)}
                            alt={prod.name}
                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80'; }}
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
                          color: '#1E293B',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '5px',
                          display: 'inline-block'
                        }}>
                          {(() => {
                            const rawCat = prod.category;
                            const catKey = typeof rawCat === 'object' && rawCat !== null 
                              ? String(rawCat.id || rawCat.name || '')
                              : String(prod.categoryId || rawCat || '');
                            const target = catKey.toLowerCase();
                            const matchedCat = categories.find(c => {
                              const cId = String(c?.id || '').toLowerCase();
                              const cName = String(c?.name || '').toLowerCase();
                              return c?.id === catKey || cId === target || cName === target;
                            });
                            if (matchedCat?.name) return matchedCat.name;
                            if (catKey) {
                              return catKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                            }
                            return 'Produce';
                          })()}
                        </span>
                      </td>

                      <td>
                        <strong style={{ fontSize: '12px', color: '#234B3C' }}>
                          {prod.defaultUnit || prod.retailUnit || 'kg'}
                        </strong>
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
                              const rawCat = prod.category;
                              const resolvedCatId = typeof rawCat === 'object' && rawCat !== null 
                                ? (rawCat.id || rawCat.slug || 'VEGETABLES') 
                                : (prod.categoryId || rawCat || 'VEGETABLES');
                              setProductForm({
                                id: prod.id,
                                name: prod.name,
                                category: resolvedCatId,
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
                            onClick={() => handleDeleteProduct(prod.id || prod.uuid, prod.name)}
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
        <div 
          className="admin-modal-overlay" 
          style={{ zIndex: 1050, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <div 
            className="admin-modal-card" 
            style={{ 
              maxWidth: '620px', 
              width: '100%', 
              maxHeight: '92vh', 
              display: 'flex', 
              flexDirection: 'column', 
              padding: 0, 
              borderRadius: '16px', 
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ 
              padding: '18px 24px', 
              borderBottom: '1px solid #E2E8F0', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              background: '#F8FAFC'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Apple size={20} color="#059669" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    {editingId ? 'Edit Produce Item Specs' : 'Register New Produce Item'}
                  </h3>
                  {editingId && (
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                      Item Code: <code style={{ color: '#059669', background: '#E2E8F0', padding: '1px 5px', borderRadius: '4px' }}>{editingId}</code>
                    </span>
                  )}
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsProductModalOpen(false)} 
                style={{ background: '#F1F5F9', border: 'none', cursor: 'pointer', color: '#64748B', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body & Form */}
            <form 
              noValidate
              onSubmit={handlePreSaveProduct} 
              onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault(); }}
              style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, margin: 0 }}
            >
              <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', color: '#92400E', marginBottom: '16px' }}>
                  ℹ️ <strong>Daily Pricing Separation:</strong> Market buying rates, consumer retail selling prices, wholesale crate rates, and GST % are managed daily at <strong>/daily-pricing</strong> based on morning APMC arrivals.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label className="form-label-title" style={{ fontSize: '11px', fontWeight: 700 }}>Produce Name *</label>
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
                    <label className="form-label-title" style={{ fontSize: '11px', fontWeight: 700 }}>Category *</label>
                    <select
                      className="form-input-control"
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.icon || '🥦'} {c.name}</option>
                      ))}
                      {!categories.some(c => c.id === productForm.category) && productForm.category && (
                        <option value={productForm.category}>{productForm.category}</option>
                      )}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label className="form-label-title" style={{ fontSize: '11px', fontWeight: 700 }}>Consumer Retail Unit *</label>
                    <select
                      className="form-input-control"
                      value={productForm.defaultUnit}
                      onChange={(e) => setProductForm({ ...productForm, defaultUnit: e.target.value })}
                    >
                      <option value="1 kg">1 kg (Standard Retail)</option>
                      <option value="500 g">500 g (Half Kilo)</option>
                      <option value="250 g">250 g (Quarter Kilo)</option>
                      <option value="100 g">100 g (Micro/Herbs)</option>
                      <option value="1 bunch">1 bunch (Greens / Herbs)</option>
                      <option value="1 pc">1 pc (Single Item / Coconut / Melon)</option>
                      <option value="1 box">1 box (Packaged / Berries)</option>
                      <option value="1 crate">1 crate (Bulk / Wholesale)</option>
                      {units.map(u => {
                        const val = u.label || u.name;
                        if (['1 kg', '500 g', '250 g', '100 g', '1 bunch', '1 pc', '1 box', '1 crate'].includes(val)) return null;
                        return <option key={u.id} value={val}>{val} ({u.name})</option>;
                      })}
                      {!['1 kg', '500 g', '250 g', '100 g', '1 bunch', '1 pc', '1 box', '1 crate'].includes(productForm.defaultUnit) && !units.some(u => (u.label || u.name) === productForm.defaultUnit) && productForm.defaultUnit && (
                        <option value={productForm.defaultUnit}>{productForm.defaultUnit}</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="form-label-title" style={{ fontSize: '11px', fontWeight: 700 }}>Shelf Life</label>
                    <input
                      type="text"
                      className="form-input-control"
                      placeholder="e.g. 4-5 Days"
                      value={productForm.shelfLife}
                      onChange={(e) => setProductForm({ ...productForm, shelfLife: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label className="form-label-title" style={{ fontSize: '11px', fontWeight: 700 }}>Mandi Origin / Source</label>
                  <input
                    type="text"
                    className="form-input-control"
                    placeholder="e.g. Kolar Agro Mandi, Karnataka"
                    value={productForm.origin}
                    onChange={(e) => setProductForm({ ...productForm, origin: e.target.value })}
                  />
                </div>

                {/* Freshness Badge / Status */}
                <div style={{ marginBottom: '14px' }}>
                  <label className="form-label-title" style={{ fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                  <div style={{ marginBottom: '14px' }}>
                    <label className="form-label-title" style={{ fontSize: '11px', fontWeight: 700 }}>Custom Badge Text</label>
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
                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label-title" style={{ fontSize: '11px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ImageIcon size={12} color="#2563EB" />
                      <span>Produce Photo *</span>
                    </span>
                    <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>Supports JPG, PNG, WebP</span>
                  </label>

                  {productForm.image ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: '#F8FAFC',
                      border: '1.5px solid #CBD5E1'
                    }}>
                      <div style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #CBD5E1', flexShrink: 0, background: '#FFF' }}>
                        <img 
                          src={resolveImageUrl(productForm.image)} 
                          alt="Preview" 
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80'; }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <CheckCircle2 size={13} color="#059669" />
                          <span>Produce Photo Attached</span>
                        </div>
                        <p style={{ fontSize: '10.5px', color: '#64748B', margin: '2px 0 6px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(typeof productForm.image === 'string' && productForm.image.startsWith('data:')) ? 'Local file optimized' : 'Server/Online photo linked'}
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
                            <span>Replace</span>
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
                      borderRadius: '10px',
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
                        Click to Upload Produce Photo
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

                  {/* Quick Produce Stock Presets */}
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600, marginBottom: '5px' }}>
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
                  <div style={{ marginTop: '8px' }}>
                    <details style={{ fontSize: '11px', color: '#64748B' }}>
                      <summary style={{ cursor: 'pointer', userSelect: 'none', color: '#475569', fontWeight: 600 }}>
                        Paste direct web URL instead
                      </summary>
                      <input
                        type="text"
                        name="produceDirectImageUrl"
                        className="form-input-control"
                        style={{ marginTop: '6px', fontSize: '11.5px' }}
                        placeholder="https://... or /uploads/..."
                        value={productForm.image}
                        onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                      />
                    </details>
                  </div>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <label className="form-label-title" style={{ fontSize: '11px', fontWeight: 700 }}>Freshness Description & Tags</label>
                  <input
                    type="text"
                    className="form-input-control"
                    placeholder="e.g. Farm picked, hydroponic, crisp"
                    value={productForm.desc}
                    onChange={(e) => setProductForm({ ...productForm, desc: e.target.value })}
                  />
                </div>
              </div>

              {/* Fixed Modal Footer Action Bar */}
              <div style={{ 
                padding: '14px 24px', 
                borderTop: '1px solid #E2E8F0', 
                background: '#F8FAFC', 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: '10px' 
              }}>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: '8px', 
                    border: '1px solid #CBD5E1', 
                    background: '#FFFFFF', 
                    color: '#475569',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ 
                    padding: '8px 22px', 
                    borderRadius: '8px', 
                    border: 'none', 
                    background: '#234B3C', 
                    color: '#FFFFFF', 
                    fontWeight: 800, 
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(35, 75, 60, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>Save Item Specs</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CATEGORY */}
      {isCategoryModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Category Master Setup</h3>
              <button type="button" onClick={() => setIsCategoryModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault(); }}>
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
          <div className="admin-modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Scale size={18} color="#234B3C" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Packaging Unit Setup</h3>
              </div>
              <button type="button" onClick={() => setIsUnitModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault(); }}>
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
