import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Briefcase, 
  Building2, 
  Phone, 
  Mail, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Trash2, 
  X,
  Warehouse,
  Store,
  Truck,
  KeyRound,
  Link2,
  Copy,
  HelpCircle
} from 'lucide-react';
import { useAdminRole, ROLES } from '../context/AdminRoleContext';
import { useToast } from '../context/ToastContext';
import { employees as employeeResource, warehouses as warehouseResource } from '../hooks/resources';
import { exportToExcel } from '../utils/excelExporter';
import AdminPagination from '../components/common/AdminPagination';

export default function EmployeeManagementPage() {
  const { currentUser } = useAdminRole();
  const { showToast } = useToast();

  const { data: employees = [], isLoading } = employeeResource.useList();
  const { data: warehouses = [] } = warehouseResource.useList();

  const createEmployeeMutation = employeeResource.useCreate();
  const updateEmployeeMutation = employeeResource.useUpdate();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [facilityFilter, setFacilityFilter] = useState('ALL'); // 'ALL' | 'WAREHOUSE' | 'CITYWIDE'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    roles: ['WAREHOUSE_MANAGER'], // Multi-role support
    assignedWarehouseId: 'ALL',
    assignedLocationType: 'WAREHOUSE',
    assignedLocationName: 'All Hubs & Warehouses (Citywide)',
    status: 'ACTIVE',
    authMethod: 'PASSWORD', // 'PASSWORD' | 'INVITE'
    password: 'admin123',
    inviteStatus: 'ACTIVE', // 'ACTIVE' | 'INVITED'
    inviteToken: '',
    notes: ''
  });

  const [formError, setFormError] = useState('');

  // Available operational roles in Direct-to-Society Model
  const AVAILABLE_ROLES = [
    { id: 'SUPER_ADMIN', label: 'Super Admin', desc: 'Full Master Platform Control & Executive Financial Reports', badgeColor: '#234B3C', isMain: true },
    { id: 'WAREHOUSE_MANAGER', label: 'Warehouse & Procurement Manager', desc: 'Mandi sourcing, stock receiving, packing lines, and central hub dispatch', badgeColor: '#059669' },
    { id: 'WAREHOUSE_STAFF', label: 'Warehouse Staff / Packer', desc: 'Produce grading, weighing, bagging, and attaching society order tags', badgeColor: '#0D9488' },
    { id: 'DELIVERY_EXECUTIVE', label: 'Delivery Executive / Rider', desc: 'Morning society drop desk last-mile dispatch rider', badgeColor: '#EA580C' },
    { id: 'SALES_OFFICER', label: 'Field Sales Officer', desc: 'Society & hostel onboarding and GPS tagging', badgeColor: '#2563EB' }
  ];

  const handleCopyInviteLink = (emp) => {
    const token = emp.inviteToken || `inv-${emp.id}`;
    const url = `https://admin.freshioz.com/activate?token=${token}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    showToast(`✓ Copied link for ${emp.name}: ${url}`, 'info');
  };

  const handleOpenAddModal = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      roles: ['WAREHOUSE_MANAGER'],
      assignedWarehouseId: warehouses[0]?.id || 'ALL',
      assignedLocationType: warehouses[0] ? 'WAREHOUSE' : 'ALL',
      assignedLocationName: warehouses[0]?.name || 'All Hubs & Warehouses (Citywide)',
      status: 'ACTIVE',
      authMethod: 'PASSWORD',
      password: 'admin123',
      inviteStatus: 'ACTIVE',
      inviteToken: '',
      notes: ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      phone: emp.phone,
      email: emp.email || '',
      roles: emp.roles || ['WAREHOUSE_MANAGER'],
      assignedWarehouseId: emp.assignedWarehouseId || 'ALL',
      assignedLocationType: emp.assignedLocationType || 'WAREHOUSE',
      assignedLocationName: emp.assignedLocationName || '',
      status: emp.status || 'ACTIVE',
      authMethod: emp.authMethod || (emp.inviteStatus === 'INVITED' ? 'INVITE' : 'PASSWORD'),
      password: emp.password || 'admin123',
      inviteStatus: emp.inviteStatus || 'ACTIVE',
      inviteToken: emp.inviteToken || '',
      notes: emp.notes || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const toggleRoleSelection = (roleId) => {
    setFormData(prev => {
      const current = prev.roles || [];
      if (current.includes(roleId)) {
        if (current.length === 1) return prev; // Keep at least one role
        return { ...prev, roles: current.filter(r => r !== roleId) };
      } else {
        return { ...prev, roles: [...current, roleId] };
      }
    });
  };

  const handlePreSubmitEmployee = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.email.trim()) {
      setFormError('Please enter employee name, email address, and 10-digit mobile number.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setFormError('Please enter a valid official email address (used for portal login).');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
      setFormError('Please enter a valid 10-digit Indian phone number.');
      return;
    }

    if (formData.roles.length === 0) {
      setFormError('Please select at least one operational role.');
      return;
    }

    setFormError('');
    setIsConfirmModalOpen(true);
  };

  const handleConfirmCommitEmployee = async () => {
    // Determine location name & type
    let locName = 'All Hubs & Warehouses (Citywide)';
    let locType = 'ALL';

    if (formData.assignedWarehouseId !== 'ALL') {
      const wh = warehouses.find(w => w.id === formData.assignedWarehouseId);
      if (wh) {
        locName = wh.name;
        locType = 'WAREHOUSE';
      }
    }

    const resolvedInviteStatus = formData.authMethod === 'INVITE' ? 'INVITED' : 'ACTIVE';
    const resolvedInviteToken = formData.authMethod === 'INVITE'
      ? (formData.inviteToken || `inv_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`)
      : null;
    const resolvedPassword = formData.authMethod === 'PASSWORD' ? (formData.password || 'admin123') : null;

    const augmentedRoles = Array.isArray(formData.roles) ? [...formData.roles] : [];
    if (augmentedRoles.includes('WAREHOUSE_MANAGER') && !augmentedRoles.includes('PROCUREMENT_OFFICER')) {
      augmentedRoles.push('PROCUREMENT_OFFICER');
    }

    const payload = {
      ...formData,
      roles: augmentedRoles,
      inviteStatus: resolvedInviteStatus,
      inviteToken: resolvedInviteToken,
      password: resolvedPassword,
      assignedLocationType: locType,
      assignedLocationName: locName,
    };

    if (editingEmployee) {
      try {
        await updateEmployeeMutation.mutateAsync({
          id: editingEmployee.id,
          data: payload,
        });
        showToast(`✓ Updated employee "${formData.name}"`, 'success');
        setIsConfirmModalOpen(false);
        setIsModalOpen(false);
      } catch (err) {
        console.error('Backend employee update failed:', err);
        showToast(`Failed to update employee on server: ${err?.message || 'Server error'}`, 'error');
        return;
      }
    } else {
      try {
        await createEmployeeMutation.mutateAsync({
          ...payload,
          id: `FRZ_EMP_${Date.now()}`,
        });
        showToast(`✓ Added new employee "${formData.name}"`, 'success');
        setIsConfirmModalOpen(false);
        setIsModalOpen(false);
      } catch (err) {
        console.error('Backend employee create failed:', err);
        showToast(`Failed to create employee on server: ${err?.message || 'Server error'}`, 'error');
        return;
      }
    }
  };

  const handleToggleStatus = async (empId) => {
    const target = employees.find(e => e.id === empId);
    if (!target) return;
    const newStatus = target.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      await updateEmployeeMutation.mutateAsync({
        id: empId,
        data: { status: newStatus },
      });
      showToast('Employee account status updated on server', 'info');
    } catch (err) {
      console.error('Backend employee status update failed:', err);
      showToast(`Failed to update employee status on server: ${err?.message || 'Server error'}`, 'error');
    }
  };

  const handleDeleteEmployee = async (empId) => {
    if (empId === 'FRZ_EMP_101' || empId === 'emp-101') {
      showToast('Master Super Admin account cannot be removed.', 'error');
      return;
    }
    if (confirm('Are you sure you want to deactivate and remove this employee from active duty?')) {
      try {
        await updateEmployeeMutation.mutateAsync({
          id: empId,
          data: { status: 'INACTIVE' },
        });
        showToast('Employee removed from directory', 'info');
      } catch (err) {
        console.error('Backend employee removal failed:', err);
        showToast(`Failed to remove employee on server: ${err?.message || 'Server error'}`, 'error');
      }
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const headers = [
      'Employee ID',
      'Name',
      'Phone',
      'Email',
      'Primary Role',
      'All Assigned Roles',
      'Facility Type (Warehouse/Citywide)',
      'Assigned Location Name',
      'Account Status',
      'Date Joined',
      'Notes'
    ];

    const rows = employees.map(e => [
      e.id,
      e.name,
      e.phone,
      e.email || 'N/A',
      e.roles?.includes('SUPER_ADMIN') ? 'SUPER ADMIN (Main Executive)' : (e.roles?.[0] || 'N/A'),
      e.roles?.join(', ') || 'N/A',
      e.assignedLocationType || (e.assignedWarehouseId === 'ALL' ? 'CITYWIDE' : 'WAREHOUSE'),
      e.assignedLocationName || 'All Hubs',
      e.status,
      e.dateJoined,
      e.notes || ''
    ]);

    exportToExcel('Freshioz_Staff_Directory_Warehouses', headers, rows);
  };

  // Filtered List
  const filteredEmployees = employees.filter(emp => {
    const matchesQuery = 
      emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.phone?.includes(searchQuery) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.assignedLocationName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'ALL' || (emp.roles && emp.roles.includes(roleFilter));
    const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;

    const empType = emp.assignedLocationType || (emp.assignedWarehouseId === 'ALL' ? 'ALL' : 'WAREHOUSE');
    const matchesFacility = 
      facilityFilter === 'ALL' ||
      (facilityFilter === 'WAREHOUSE' && empType === 'WAREHOUSE') ||
      (facilityFilter === 'CITYWIDE' && empType === 'ALL');

    return matchesQuery && matchesRole && matchesStatus && matchesFacility;
  });

  // Stable deterministic sorting: Super Admin always on top, then newest personnel first
  const sortedEmployees = React.useMemo(() => {
    return [...filteredEmployees].sort((a, b) => {
      // 1. Super Admin always pinned to the top
      const aIsSuper = a.roles?.includes('SUPER_ADMIN') || a.email === 'superadmin@gmail.com';
      const bIsSuper = b.roles?.includes('SUPER_ADMIN') || b.email === 'superadmin@gmail.com';
      if (aIsSuper && !bIsSuper) return -1;
      if (!aIsSuper && bIsSuper) return 1;

      // 2. Stable chronological order by creation date or date joined
      const dateA = new Date(a.createdAt || a.dateJoined || 0).getTime();
      const dateB = new Date(b.createdAt || b.dateJoined || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;

      // 3. Fallback stable sort by ID
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
  }, [filteredEmployees]);

  // Reset pagination on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, facilityFilter, statusFilter]);

  const paginatedEmployees = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedEmployees.slice(start, start + pageSize);
  }, [sortedEmployees, currentPage, pageSize]);

  return (
    <div className="admin-page-container">
      {/* High-Density Compact Page Header (Under 55px) */}
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
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '18px', color: '#0F172A', fontWeight: 800, margin: 0 }}>
              Employee Management & Roles
            </h1>
            <span style={{ background: '#E0F2FE', color: '#0369A1', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
              {employees.length} Personnel
            </span>
          </div>

          {/* Compact Inline Role Breakdown Strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11.5px', color: '#64748B', marginTop: '3px', flexWrap: 'wrap' }}>
            <span>• Active: <strong style={{ color: '#059669' }}>{employees.filter(e => e.status === 'ACTIVE').length}</strong></span>
            <span>• 👑 Super Admin: <strong>{employees.filter(e => e.roles?.includes('SUPER_ADMIN')).length}</strong></span>
            <span>• 🏢 WH Leads: <strong>{employees.filter(e => e.roles?.includes('WAREHOUSE_MANAGER')).length}</strong></span>
            <span>• 📦 Warehouse Staff: <strong>{employees.filter(e => e.roles?.includes('WAREHOUSE_STAFF')).length}</strong></span>
            <span>• 🚚 Dispatch & Riders: <strong>{employees.filter(e => e.roles?.includes('DELIVERY_EXECUTIVE')).length}</strong></span>
            <span>• 📋 Field Sales: <strong>{employees.filter(e => e.roles?.includes('SALES_OFFICER')).length}</strong></span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleExportExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#FFFFFF',
              border: '1.5px solid #CBD5E1',
              color: '#334155',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <Download size={13} />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="admin-btn-accent"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px', fontSize: '12px' }}
          >
            <UserPlus size={14} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* High-Density Search & Filter Bar */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '12px 16px',
        marginBottom: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="#64748B" />
          <input
            type="text"
            placeholder="Search by name, phone, warehouse, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '13px', color: '#0F172A' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Facility Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B' }}>
            <span>Facility:</span>
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              style={{ border: '1px solid #CBD5E1', borderRadius: '6px', padding: '5px 8px', fontSize: '12px', background: '#FFF' }}
            >
              <option value="ALL">All Facilities</option>
              <option value="WAREHOUSE">🏢 Regional Warehouses</option>
              <option value="CITYWIDE">🌐 Citywide Access</option>
            </select>
          </div>

          {/* Role Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B' }}>
            <Filter size={13} />
            <span>Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ border: '1px solid #CBD5E1', borderRadius: '6px', padding: '5px 8px', fontSize: '12px', background: '#FFF' }}
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">👑 Super Admin (Main)</option>
              <option value="WAREHOUSE_MANAGER">🏢 Warehouse & Procurement</option>
              <option value="WAREHOUSE_STAFF">📦 Warehouse Staff / Packers</option>
              <option value="DELIVERY_EXECUTIVE">🚚 Delivery Executives</option>
              <option value="SALES_OFFICER">📋 Field Sales</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B' }}>
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ border: '1px solid #CBD5E1', borderRadius: '6px', padding: '5px 8px', fontSize: '12px', background: '#FFF' }}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Enterprise Staff Data Table */}
      <div className="admin-table-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Staff Name & Contact</th>
                <th>Assigned Roles (Multi-Role)</th>
                <th>Assigned Store / Warehouse Facility</th>
                <th>Status & Auth</th>
                <th>Joined Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                    No employees matching the selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map(emp => {
                  const isCitywide = emp.assignedWarehouseId === 'ALL';

                  return (
                    <tr key={emp.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: emp.roles?.includes('SUPER_ADMIN') ? '#234B3C' : emp.roles?.includes('WAREHOUSE_MANAGER') ? '#059669' : '#475569',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '13px',
                            flexShrink: 0
                          }}>
                            {emp.name?.[0]?.toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0, maxWidth: '240px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ fontSize: '13px', color: '#0F172A' }}>{emp.name}</strong>
                              <span style={{ fontSize: '11px', color: '#64748B' }}>• +91 {emp.phone}</span>
                            </div>
                            {emp.email && (
                              <div style={{ fontSize: '10.5px', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {emp.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                          {(() => {
                            const sortedRoles = [...(emp.roles || [])].sort((a, b) => (a === 'SUPER_ADMIN' ? -1 : b === 'SUPER_ADMIN' ? 1 : 0));
                            const primaryRole = sortedRoles[0];
                            const roleDef = AVAILABLE_ROLES.find(r => r.id === primaryRole) || { label: primaryRole || 'STAFF', badgeColor: '#64748B' };
                            const isSuper = primaryRole === 'SUPER_ADMIN';

                            return (
                              <>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: isSuper ? '#234B3C' : '#F8FAFC',
                                    color: isSuper ? '#FFFFFF' : roleDef.badgeColor,
                                    border: isSuper ? '1px solid #19352A' : `1px solid ${roleDef.badgeColor}35`,
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    padding: '2px 8px',
                                    borderRadius: '6px'
                                  }}
                                >
                                  {isSuper ? '👑 Super Admin' : roleDef.label}
                                </span>
                                {sortedRoles.length > 1 && (
                                  <span style={{ fontSize: '10px', background: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }} title={sortedRoles.slice(1).join(', ')}>
                                    +{sortedRoles.length - 1}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#1E293B', fontWeight: 700 }}>
                          {isCitywide ? (
                            <span style={{ color: '#234B3C', background: '#DCFCE7', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>
                              🌐 CITYWIDE
                            </span>
                          ) : (
                            <span style={{ color: '#059669', background: '#ECFDF5', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>
                              🏢 WAREHOUSE
                            </span>
                          )}
                          <span>{emp.assignedLocationName || 'All Hubs'}</span>
                        </div>
                        {emp.notes && (
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            {emp.notes}
                          </div>
                        )}
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(emp.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                            title="Click to toggle status"
                          >
                            <span className={`status-pill ${emp.status === 'ACTIVE' ? 'approved' : 'rejected'}`}>
                              {emp.status}
                            </span>
                          </button>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            {emp.inviteStatus === 'INVITED' ? (
                              <span style={{
                                background: '#FEF3C7',
                                color: '#B45309',
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                <Mail size={9} />
                                <span>Invited</span>
                              </span>
                            ) : (
                              <span style={{
                                background: '#ECFDF5',
                                color: '#047857',
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                <KeyRound size={9} />
                                <span>Pass Set</span>
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCopyInviteLink(emp)}
                              style={{
                                background: '#F1F5F9',
                                border: '1px solid #CBD5E1',
                                borderRadius: '4px',
                                padding: '1px 5px',
                                fontSize: '10px',
                                color: '#334155',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px'
                              }}
                              title="Copy activation or login link"
                            >
                              <Copy size={9} />
                              <span>Link</span>
                            </button>
                          </div>
                        </div>
                      </td>

                      <td style={{ fontSize: '12px', color: '#64748B' }}>
                        {emp.dateJoined || '2026-02-01'}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(emp)}
                            style={{
                              background: '#F8FAFC',
                              border: '1px solid #CBD5E1',
                              padding: '5px 9px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              color: '#334155',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 700
                            }}
                            title="Edit staff member"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteEmployee(emp.id)}
                            style={{
                              background: '#FFF1F2',
                              border: '1px solid #FECDD3',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              color: '#E11D48'
                            }}
                            title="Remove staff member"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          currentPage={currentPage}
          totalItems={filteredEmployees.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="staff personnel"
        />
      </div>

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#234B3C', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    {editingEmployee ? 'Edit Staff Member' : 'Register Operational Staff'}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    Assign multiple roles and link to either a Central Warehouse or a Hub Store
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '10px 14px', borderRadius: '8px', fontSize: '12.5px', marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handlePreSubmitEmployee}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label-title">Full Name *</label>
                  <input
                    type="text"
                    className="form-input-control"
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label-title">Phone Number (10 Digits) *</label>
                  <input
                    type="tel"
                    className="form-input-control"
                    placeholder="e.g. 9845012345"
                    value={formData.phone}
                    maxLength={10}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="form-label-title">Official Email Address (Login ID) *</label>
                <input
                  type="email"
                  className="form-input-control"
                  placeholder="e.g. ramesh@freshioz.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              {/* Multi-Role Assignment Checkboxes */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Assign Operational Roles * (Multi-Role Allowed)</span>
                  <span style={{ fontSize: '11px', color: '#0369A1', fontWeight: 700 }}>Select all that apply</span>
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  {AVAILABLE_ROLES.map(role => {
                    const isSelected = formData.roles?.includes(role.id);
                    return (
                      <div
                        key={role.id}
                        onClick={() => toggleRoleSelection(role.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: isSelected ? '1.5px solid #234B3C' : '1px solid #E2E8F0',
                          background: isSelected ? '#F0F7F4' : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ cursor: 'pointer', accentColor: '#234B3C', width: '16px', height: '16px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>{role.label}</span>
                            {role.isMain && (
                              <span style={{ background: '#234B3C', color: '#FFF', fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                                MAIN ROLE
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '1px' }}>
                            {role.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Assigned Facility (Warehouse or Store) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label-title">Assigned Hub / Regional Warehouse</label>
                  <select
                    className="form-input-control"
                    value={formData.assignedWarehouseId}
                    onChange={(e) => setFormData({ ...formData, assignedWarehouseId: e.target.value })}
                  >
                    <optgroup label="Citywide Access">
                      <option value="ALL">🌐 All Hubs & Warehouses (Citywide)</option>
                    </optgroup>
                    <optgroup label="Regional Warehouse Logistics Hubs">
                      {warehouses.map(wh => (
                        <option key={wh.id} value={wh.id}>
                          🏢 {wh.name} ({wh.code || wh.id})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="form-label-title">Status</label>
                  <select
                    className="form-input-control"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              {/* Account Password & Activation Invite Flow */}
              <div style={{ marginBottom: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="form-label-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <KeyRound size={14} color="#234B3C" />
                    <span>Portal Login Authentication *</span>
                  </label>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>Store Hub & Rider desks</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, authMethod: 'PASSWORD' })}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: formData.authMethod === 'PASSWORD' ? '1.5px solid #234B3C' : '1px solid #CBD5E1',
                      background: formData.authMethod === 'PASSWORD' ? '#EBF2EE' : '#FFF',
                      color: formData.authMethod === 'PASSWORD' ? '#234B3C' : '#475569',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    🔑 Set Direct Password
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, authMethod: 'INVITE' })}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: formData.authMethod === 'INVITE' ? '1.5px solid #234B3C' : '1px solid #CBD5E1',
                      background: formData.authMethod === 'INVITE' ? '#EBF2EE' : '#FFF',
                      color: formData.authMethod === 'INVITE' ? '#234B3C' : '#475569',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    📧 Send Invite Link
                  </button>
                </div>

                {formData.authMethod === 'PASSWORD' ? (
                  <div style={{ marginTop: '10px' }}>
                    <label style={{ fontSize: '11.5px', color: '#475569', fontWeight: 700 }}>
                      Portal Login Password
                    </label>
                    <input
                      type="text"
                      className="form-input-control"
                      placeholder="e.g. admin123"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      style={{ marginTop: '4px' }}
                    />
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                      Staff can log in immediately using their phone/email and this password.
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: '10px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '6px', padding: '8px 10px', fontSize: '11.5px', color: '#0369A1' }}>
                    An activation invite link will be issued. The staff member can verify their phone and choose a password on first login.
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label-title">Operations Notes / Scope</label>
                <input
                  type="text"
                  className="form-input-control"
                  placeholder="e.g. In charge of Indiranagar morning dispatch and flat delivery"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    background: '#F8FAFC',
                    color: '#64748B',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#234B3C',
                    color: '#FFF',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  {editingEmployee ? 'Update Staff Member' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CONFIRMATION POPUP MODAL (YES / NO) ================= */}
      {isConfirmModalOpen && (
        <div 
          className="admin-modal-overlay" 
          style={{ zIndex: 1100, background: 'rgba(15, 23, 42, 0.72)' }}
        >
          <div 
            className="admin-modal-card" 
            style={{ 
              maxWidth: '500px', 
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
                  {editingEmployee ? 'Confirm Employee Profile Updates?' : 'Confirm New Employee Onboarding?'}
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px', marginBottom: 0, lineHeight: 1.4 }}>
                  Please verify roles, contact credentials, and facility mapping:
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #CBD5E1' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Employee Name:</span>
                <span style={{ color: '#0F172A', fontWeight: 800 }}>{formData.name}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #CBD5E1' }}>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600, display: 'block', fontSize: '11px' }}>Contact Phone:</span>
                  <span style={{ color: '#0F172A', fontWeight: 800 }}>+91 {formData.phone}</span>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600, display: 'block', fontSize: '11px' }}>Status:</span>
                  <span style={{ color: '#059669', fontWeight: 800 }}>{formData.status}</span>
                </div>
              </div>

              <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #CBD5E1' }}>
                <span style={{ color: '#64748B', fontWeight: 600, display: 'block', fontSize: '11px', marginBottom: '4px' }}>Assigned Roles:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {formData.roles?.map(rId => {
                    const rObj = AVAILABLE_ROLES.find(r => r.id === rId);
                    return (
                      <span key={rId} style={{ background: '#E0F2FE', color: '#0369A1', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                        {rObj?.label || rId}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Assigned Facility:</span>
                <span style={{ color: '#234B3C', fontWeight: 800 }}>
                  {formData.assignedWarehouseId === 'ALL'
                    ? 'All Hubs & Warehouses (Citywide)'
                    : (warehouses.find(w => w.id === formData.assignedWarehouseId)?.name || formData.assignedWarehouseId)}
                </span>
              </div>
            </div>

            {/* Action Buttons: No vs Yes */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
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
                onClick={handleConfirmCommitEmployee}
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
                <span>Yes, Confirm & Save</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
