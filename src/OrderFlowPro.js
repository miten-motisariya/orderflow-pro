import React, { useState, useEffect, useCallback, useMemo } from "react";
import Papa from 'papaparse';
import { ChevronUp, ChevronDown, Upload, Download, Search, Filter, X, FileText, Package, Globe } from 'lucide-react';
import { exportToShipGlobalCSV } from './exportShipGlobal';
import { exportToShipRocketCSV } from './exportShipRocket';


const ITEMS_PER_PAGE_OPTIONS = [10, 20, 30, 50, 100];
const EXPORT_TYPES = [
  { value: 'shipRocket', label: 'Ship Rocket', icon: Package },
  { value: 'shipGlobal', label: 'Ship Global', icon: Globe }
];

const OrderFlowPro = () => {
  // Core data states
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ 
    country: '', 
    startDate: '', 
    endDate: '' 
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Selection states
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState('manual'); // 'manual', 'page', 'all'

  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });

  // Export states
  const [exportType, setExportType] = useState('');
  const [startInvoice, setStartInvoice] = useState('');
  const [exporting, setExporting] = useState(false);

  // File upload state
  const [fileName, setFileName] = useState('');

  // Memoized filtered and sorted data
  const filteredOrders = useMemo(() => {
    let filteredData = [...orders];

    // Apply search filter
    if (searchTerm) {
      filteredData = filteredData.filter(order =>
        (order.orderId?.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.fullName?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply country filter
    if (filters.country) {
      filteredData = filteredData.filter(order =>
        order.country?.toLowerCase().includes(filters.country.toLowerCase())
      );
    }

    // Apply date filters
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filteredData = filteredData.filter(order => {
        const orderDate = new Date(order.saleDate?.split('/').reverse().join('/'));
        return orderDate >= startDate;
      });
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      filteredData = filteredData.filter(order => {
        const orderDate = new Date(order.saleDate?.split('/').reverse().join('/'));
        return orderDate <= endDate;
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filteredData;
  }, [orders, searchTerm, filters, sortConfig]);

  // Memoized paginated data
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  // Total pages calculation
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  // File import handler
  const handleImport = useCallback((event) => {
    const files = event.target.files;
    if (!files.length) return;

    const file = files[0];
    setFileName(file.name);
    setLoading(true);
    setError('');

    Papa.parse(file, {
      header: true,
      dynamicTyping: (field) => {
        return field !== 'Order ID' && field !== 'Ship Zipcode';
      },
      transform: (value, field) => {
        if (field === 'Ship Zipcode') {
          return value?.toString().padStart(5, '0');
        }
        return value;
      },
      complete: (results) => {
        try {
          const rows = results.data;
          const validRows = rows.filter(row => 
            Object.values(row).some(value => value !== null && value !== '')
          );
          
          const processedOrders = validRows.map((row, index) => ({
            id: `order_${index}`,
            saleDate: formatDate(row['Sale Date']),
            orderId: row['Order ID'],
            firstName: row['First Name'],
            lastName: row['Last Name'],
            fullName: row['Full Name'],
            noOfItems: row['Number of Items'],
            addressLine1: row['Street 1'],
            addressLine2: row['Street 2'],
            city: row['Ship City'],
            state: row['Ship State'],
            zipCode: row['Ship Zipcode'],
            country: row['Ship Country'],
            orderValue: row['Order Value'],
            email: row['Email'] || null,
            mobileNo: row['Mobile'] || null
          }));

          setOrders(processedOrders);
          setCurrentPage(1);
          setSelectedOrders(new Set());
          setSelectionMode('manual');
        } catch (err) {
          setError('Error processing CSV file. Please check the format.');
        } finally {
          setLoading(false);
        }
      },
      error: (error) => {
        setError('Error parsing CSV file: ' + error.message);
        setLoading(false);
      }
    });
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-GB');
  };

  // Selection handlers
  const handleRowSelect = useCallback((orderId) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
    setSelectionMode('manual');
  }, []);

  const handleSelectPage = useCallback(() => {
    const pageOrderIds = paginatedOrders.map(order => order.orderId);
    setSelectedOrders(new Set(pageOrderIds));
    setSelectionMode('page');
  }, [paginatedOrders]);

  const handleSelectAll = useCallback(() => {
    const allOrderIds = filteredOrders.map(order => order.orderId);
    setSelectedOrders(new Set(allOrderIds));
    setSelectionMode('all');
  }, [filteredOrders]);

  const handleDeselectAll = useCallback(() => {
    setSelectedOrders(new Set());
    setSelectionMode('manual');
  }, []);

  // Sort handler
  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // Filter handlers
  const handleSearch = useCallback((event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  }, []);

  const handleFilterChange = useCallback((event) => {
    const { name, value } = event.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  }, []);

  const handleClear = useCallback(() => {
    setSearchTerm('');
    setFilters({ country: '', startDate: '', endDate: '' });
    setStartInvoice('');
    setCurrentPage(1);
  }, []);

  // Export handler
  const handleExport = useCallback(async () => {
    if (!exportType) {
      alert('Please select an export type.');
      return;
    }
    if (!startInvoice.trim()) {
      alert('Please enter a Start Invoice number before exporting.');
      return;
    }
    if (selectedOrders.size === 0) {
      alert('Please select at least one order to export.');
      return;
    }

    setExporting(true);
    try {
      const exportData = filteredOrders.filter(order => selectedOrders.has(order.orderId));
      
      if (exportType === 'shipRocket') {
        await exportToShipRocketCSV(exportData, startInvoice);
      } else if (exportType === 'shipGlobal') {
        await exportToShipGlobalCSV(exportData, startInvoice);
      }
      
      // Reset selection after successful export
      setSelectedOrders(new Set());
      setSelectionMode('manual');
    } catch (err) {
      setError('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  }, [exportType, startInvoice, selectedOrders, filteredOrders]);

  // Pagination handlers
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback((event) => {
    setItemsPerPage(Number(event.target.value));
    setCurrentPage(1);
  }, []);

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <ChevronUp className="w-4 h-4 opacity-30" />;
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-4 h-4 text-blue-600" /> : 
      <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Package className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">OrderFlow Pro</h1>
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                Shipping CSV Processor
              </span>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Import CSV File
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImport}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <Upload className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
              </div>
              {fileName && (
                <div className="flex items-center mt-2 text-sm text-green-600">
                  <FileText className="w-4 h-4 mr-1" />
                  {fileName}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Type
              </label>
              <select
                value={exportType}
                onChange={(e) => setExportType(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !exportType ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Select Export Type</option>
                {EXPORT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Invoice
              </label>
              <input
                type="text"
                value={startInvoice}
                onChange={(e) => setStartInvoice(e.target.value)}
                placeholder="Enter invoice number"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !startInvoice ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end">
            <button
              onClick={handleExport}
              disabled={exporting || selectedOrders.size === 0}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting ? 'Exporting...' : `Export (${selectedOrders.size})`}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm border p-12 mb-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Processing CSV file...</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        {orders.length > 0 && !loading && (
          <div className="bg-white rounded-lg shadow-sm border">
            {/* Filters and Search */}
            <div className="p-6 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by Order ID or Name"
                    value={searchTerm}
                    onChange={handleSearch}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                </div>

                <input
                  type="text"
                  name="country"
                  placeholder="Filter by Country"
                  value={filters.country}
                  onChange={handleFilterChange}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSelectPage}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                  >
                    Select Page ({paginatedOrders.length})
                  </button>
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                  >
                    Select All ({filteredOrders.length})
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    Deselect All
                  </button>
                  {selectedOrders.size > 0 && (
                    <span className="text-sm text-blue-600 font-medium">
                      {selectedOrders.size} selected
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={handleClear}
                    className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear Filters
                  </button>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Show:</span>
                    <select
                      value={itemsPerPage}
                      onChange={handleItemsPerPageChange}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      {ITEMS_PER_PAGE_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <span className="text-gray-600">per page</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={paginatedOrders.length > 0 && paginatedOrders.every(order => selectedOrders.has(order.orderId))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleSelectPage();
                          } else {
                            handleDeselectAll();
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    {[
                      { key: 'saleDate', label: 'Sale Date' },
                      { key: 'orderId', label: 'Order ID' },
                      { key: 'fullName', label: 'Full Name' },
                      { key: 'noOfItems', label: 'Items' },
                      { key: 'city', label: 'City' },
                      { key: 'state', label: 'State' },
                      { key: 'country', label: 'Country' },
                      { key: 'orderValue', label: 'Value' }
                    ].map(({ key, label }) => (
                      <th
                        key={key}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort(key)}
                      >
                        <div className="flex items-center gap-1">
                          {label}
                          <SortIcon column={key} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedOrders.map((order) => (
                    <tr
                      key={order.orderId}
                      className={`hover:bg-gray-50 ${selectedOrders.has(order.orderId) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.has(order.orderId)}
                          onChange={() => handleRowSelect(order.orderId)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{order.saleDate}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.orderId}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{order.fullName}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{order.noOfItems}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{order.city}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{order.state}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{order.country}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{order.orderValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} results
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                    if (page > totalPages) return null;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 text-sm border rounded-md ${
                          currentPage === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {orders.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
            <p className="text-gray-600">Upload a CSV file to get started</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>OrderFlow Pro - Streamline your shipping operations with ease</p>
          <div className="flex justify-center items-center space-x-4 mt-2">
            <span className="flex items-center space-x-1">
              <Package className="w-4 h-4" />
              <span>ShipRocket Compatible</span>
            </span>
            <span className="flex items-center space-x-1">
              <Globe className="w-4 h-4" />
              <span>ShipGlobal Ready</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderFlowPro;