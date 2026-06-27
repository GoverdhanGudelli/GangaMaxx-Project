import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Table from '../components/Table';
import { 
  FileSpreadsheet, 
  FileDown, 
  TrendingUp, 
  Users, 
  Mail, 
  AlertCircle,
  Calendar
} from 'lucide-react';

export default function Reports({ showToast }) {
  const [visits, setVisits] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Salesman visit form state
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [salesmanName, setSalesmanName] = useState('Arjun Mehta');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState(false);
  const [repeatReorder, setRepeatReorder] = useState(false);

  const fetchData = async () => {
    try {
      const visitsData = await api.getVisits();
      const customersData = await api.getCustomers();
      setVisits(visitsData);
      setCustomers(customersData);
      if (customersData.length > 0) setCustomerName(customersData[0].name);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateVisit = async (e) => {
    e.preventDefault();
    if (!notes) return;

    try {
      await api.addVisit({
        salesmanName,
        customerName,
        notes,
        followUpRequired: followUp,
        repeatReorderCheckbox: repeatReorder
      });

      showToast('Sales Visit Logged', `Visit to ${customerName} recorded.`, 'success');
      setShowVisitModal(false);
      setNotes('');
      setFollowUp(false);
      setRepeatReorder(false);
      fetchData();
    } catch (err) {
      showToast('Error', 'Failed to log visit details', 'error');
    }
  };

  const handleExportCSV = async () => {
    try {
      showToast('Preparing CSV...', 'Fetching delivery data, please wait.', 'info');

      const [runs, orders] = await Promise.all([
        api.getDeliveries(),
        api.getOrders()
      ]);

      // Build rows
      const rows = [];

      // Header row
      rows.push([
        'Run Number',
        'Driver Name',
        'Vehicle No',
        'Date',
        'Run Status',
        'Stop #',
        'Order ID',
        'Customer Name',
        'Address',
        'Allocated Qty (Cases)',
        'Delivered Qty',
        'Stop Status',
        'Signed By',
        'Failed Reason',
        'Order Total (INR)'
      ]);

      for (const run of runs) {
        if (run.stops.length === 0) {
          rows.push([
            run.runNumber, run.driverName, run.vehicleNo, run.date,
            run.status, '', '', '', '', '', '', '', '', '', ''
          ]);
        } else {
          for (const stop of run.stops) {
            const order = orders.find(o => o.id === stop.orderId);
            const total = order ? `₹${order.total.toFixed(2)}` : '';
            rows.push([
              run.runNumber,
              run.driverName,
              run.vehicleNo,
              run.date,
              run.status,
              stop.sequence,
              stop.orderId,
              stop.customerName,
              `"${(stop.address || '').replace(/"/g, '""')}"`,
              stop.qty,
              stop.deliveredQty,
              stop.status,
              stop.signedBy || '',
              stop.failedReason || '',
              total
            ]);
          }
        }
      }

      // Convert to CSV string
      const csvContent = rows.map(row =>
        row.map(cell => {
          const val = String(cell ?? '');
          // Wrap in quotes if contains comma, newline, or quote
          if (val.startsWith('"')) return val; // already quoted (address)
          return val.includes(',') || val.includes('\n') ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(',')
      ).join('\n');

      // Trigger download
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const today = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `GangaMaxx_DeliveryLog_${today}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('CSV Downloaded', `GangaMaxx_DeliveryLog_${today}.csv saved to your downloads.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Export Failed', 'Could not fetch delivery data. Is the server running?', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      showToast('Generating Invoice Ledger...', 'Compiling accounts data, please wait.', 'info');

      const [customersRaw, orders] = await Promise.all([
        api.getCustomers(),
        api.getOrders()
      ]);

      const today = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric'
      });

      const totalRevenue = orders
        .filter(o => o.status === 'Delivered')
        .reduce((s, o) => s + o.total, 0);

      const pendingRevenue = orders
        .filter(o => o.status === 'Pending' || o.status === 'Dispatched')
        .reduce((s, o) => s + o.total, 0);

      // Build customer rows
      const customerRows = customersRaw.map(c => {
        const custOrders = orders.filter(o => o.customerId === c.id);
        const delivered = custOrders.filter(o => o.status === 'Delivered').reduce((s, o) => s + o.total, 0);
        const outstanding = custOrders.filter(o => o.status !== 'Delivered').reduce((s, o) => s + o.total, 0);
        const isOverlimit = c.creditStatus === 'Overlimit';
        return `
          <tr>
            <td>${c.id}</td>
            <td><strong>${c.name}</strong></td>
            <td>${c.tier}</td>
            <td>₹${c.creditLimit.toLocaleString('en-IN')}</td>
            <td>₹${delivered.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td style="color:${outstanding > 0 ? '#dc2626' : '#16a34a'}; font-weight:600">
              ₹${outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
            <td>
              <span style="
                background:${isOverlimit ? '#fee2e2' : '#dcfce7'};
                color:${isOverlimit ? '#dc2626' : '#16a34a'};
                padding:2px 8px; border-radius:4px; font-size:11px; font-weight:700;
              ">${isOverlimit ? 'CREDIT ALERT' : 'ACTIVE'}</span>
            </td>
          </tr>`;
      }).join('');

      // Build order rows
      const orderRows = orders.slice(0, 50).map(o => `
        <tr>
          <td>${o.id}</td>
          <td>${o.customerName}</td>
          <td>${o.orderDate}</td>
          <td>₹${o.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td>
            <span style="
              background:${ o.status === 'Delivered' ? '#dcfce7' : o.status === 'Failed' ? '#fee2e2' : '#fef3c7'};
              color:${o.status === 'Delivered' ? '#16a34a' : o.status === 'Failed' ? '#dc2626' : '#d97706'};
              padding:2px 8px; border-radius:4px; font-size:11px; font-weight:700;
            ">${o.status}</span>
          </td>
        </tr>`
      ).join('');

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>GangaMaxx — Invoice Ledger ${today}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: #fff; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #166534; padding-bottom: 20px; margin-bottom: 24px; }
    .company-name { font-size: 28px; font-weight: 800; color: #166534; }
    .company-sub  { font-size: 12px; color: #555; margin-top: 4px; }
    .doc-meta { text-align: right; font-size: 12px; color: #555; }
    .doc-meta strong { font-size: 14px; color: #111; display: block; margin-bottom: 4px; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
    .summary-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 18px; }
    .summary-box .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .summary-box .value { font-size: 22px; font-weight: 700; color: #166534; margin-top: 4px; }
    h2 { font-size: 15px; font-weight: 700; color: #166534; margin: 24px 0 10px; border-left: 4px solid #166534; padding-left: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #166534; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
    tr:nth-child(even) td { background: #f9fafb; }
    .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 14px; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">GangaMaxx Marketplace</div>
      <div class="company-sub">B2B Cleaning Supplies — Last-Mile Delivery Operations</div>
      <div class="company-sub">Ranga Reddy District, Hyderabad, Telangana</div>
    </div>
    <div class="doc-meta">
      <strong>Credit Aging Invoice Ledger</strong>
      Generated: ${today}<br>
      Document Ref: GM-INV-${Date.now().toString().slice(-6)}
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-box">
      <div class="label">Total Customers</div>
      <div class="value">${customersRaw.length}</div>
    </div>
    <div class="summary-box">
      <div class="label">Revenue Collected</div>
      <div class="value">₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="summary-box">
      <div class="label">Outstanding Balance</div>
      <div class="value" style="color:#dc2626">₹${pendingRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
  </div>

  <h2>Institutional Accounts — Credit Status</h2>
  <table>
    <thead>
      <tr>
        <th>ID</th><th>Customer Name</th><th>Tier</th>
        <th>Credit Limit</th><th>Delivered (Paid)</th>
        <th>Outstanding</th><th>Status</th>
      </tr>
    </thead>
    <tbody>${customerRows}</tbody>
  </table>

  <h2>Order History (Last 50 Orders)</h2>
  <table>
    <thead>
      <tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr>
    </thead>
    <tbody>${orderRows}</tbody>
  </table>

  <div class="footer">
    <span>GangaMaxx Marketplace — Confidential Business Document</span>
    <span>Page 1 of 1 &nbsp;|&nbsp; Printed: ${today}</span>
  </div>

  <script>
    window.onload = () => { window.print(); }
  </script>
</body>
</html>`;

      const win = window.open('', '_blank');
      if (!win) {
        showToast('Popup Blocked', 'Please allow popups for this site, then try again.', 'error');
        return;
      }
      win.document.write(html);
      win.document.close();

      showToast('Invoice PDF Ready', 'Print dialog opened. Choose "Save as PDF" to download.', 'success');
    } catch (err) {
      console.error(err);
      showToast('PDF Failed', 'Could not fetch account data. Is the server running?', 'error');
    }
  };

  const visitHeaders = [
    { label: 'Salesman' },
    { label: 'Client Visited' },
    { label: 'Visit Date' },
    { label: 'Field Notes' },
    { label: 'Follow Up Status' },
    { label: 'Auto Reorder Setup' }
  ];

  if (loading) return <div className="loading-spinner">Compiling metrics...</div>;

  return (
    <div className="reports-page animate-fade">
      {/* Export operations */}
      <div className="export-cards-grid">
        <div className="export-card card">
          <div className="card-top">
            <div className="card-title-block">
              <h5>Route Execution Log</h5>
              <p>Download complete route metrics, delivery timing, and sequences.</p>
            </div>
            <div className="export-icon csv-type">
              <FileSpreadsheet size={20} />
            </div>
          </div>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <FileSpreadsheet size={16} />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="export-card card">
          <div className="card-top">
            <div className="card-title-block">
              <h5>Credit Aging Invoice Ledger</h5>
              <p>Summarize accounts status and outstanding balances for invoice review.</p>
            </div>
            <div className="export-icon pdf-type">
              <FileDown size={20} />
            </div>
          </div>
          <button className="btn btn-secondary" onClick={handleExportPDF}>
            <FileDown size={16} />
            <span>Generate Invoices PDF</span>
          </button>
        </div>
      </div>

      {/* Credit Ledger Breakdown */}
      <div className="ledger-breakdown card-solid">
        <h4>Accounts Receivable Credit Aging</h4>
        <div className="ledger-matrix">
          <div className="matrix-row header">
            <span>Customer Name</span>
            <span>0-30 Days</span>
            <span>31-60 Days</span>
            <span>Over 60 Days</span>
            <span>Status</span>
          </div>
          {customers.map(c => {
            const hasOverlimit = c.creditStatus === 'Overlimit';
            return (
              <div key={c.id} className="matrix-row">
                <span className="matrix-customer">{c.name}</span>
                <span>₹{(c.creditBalance * 0.7).toFixed(0)}</span>
                <span>₹{(c.creditBalance * 0.25).toFixed(0)}</span>
                <span>₹{(c.creditBalance * 0.05).toFixed(0)}</span>
                <span>
                  <span className={`status-badge-mini ${hasOverlimit ? 'danger' : 'success'}`}>
                    {hasOverlimit ? 'Credit Alert' : 'Active Account'}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Salesman Field Visits */}
      <div className="visits-table-wrapper">
        <div className="visits-header">
          <h4>Salesman Site Visits & Reorder Reminders</h4>
          <button className="btn btn-primary btn-sm" onClick={() => setShowVisitModal(true)}>
            <Calendar size={14} />
            <span>Log Field Visit</span>
          </button>
        </div>

        <Table 
          headers={visitHeaders}
          data={visits}
          renderRow={(visit) => (
            <>
              <td><strong>{visit.salesmanName}</strong></td>
              <td>{visit.customerName}</td>
              <td>{visit.visitDate}</td>
              <td className="notes-cell">{visit.notes}</td>
              <td>
                <span className={`badge-mini ${visit.followUpRequired ? 'warn' : 'ok'}`}>
                  {visit.followUpRequired ? 'Followup Required' : 'Complete'}
                </span>
              </td>
              <td>
                <span className={`badge-mini ${visit.repeatReorderCheckbox ? 'ok' : 'disabled'}`}>
                  {visit.repeatReorderCheckbox ? 'Subscribed' : 'Manual Booking'}
                </span>
              </td>
            </>
          )}
        />
      </div>

      {/* Add Visit Modal */}
      {showVisitModal && (
        <div className="modal-overlay">
          <div className="modal-content-card card visit-modal">
            <div className="modal-header">
              <h3>Log Salesman Field Visit</h3>
              <button className="close-btn" onClick={() => setShowVisitModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateVisit}>
              <div className="form-group">
                <label>Salesman Representative</label>
                <select value={salesmanName} onChange={(e) => setSalesmanName(e.target.value)}>
                  <option value="Arjun Mehta">Arjun Mehta (Senior Executive)</option>
                  <option value="Devendra Singh">Devendra Singh (Regional Sales)</option>
                  <option value="Sanya Ray">Sanya Ray (Institutional Lead)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Client Visited</label>
                <select value={customerName} onChange={(e) => setCustomerName(e.target.value)}>
                  {customers.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Field Visit Findings & Notes</label>
                <textarea 
                  placeholder="Summarize client request details or reorder requirements..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="3"
                  required
                ></textarea>
              </div>

              <div className="checkbox-toggles-block">
                <div className="toggle-row">
                  <input 
                    type="checkbox" 
                    id="follow" 
                    checked={followUp}
                    onChange={(e) => setFollowUp(e.target.checked)}
                  />
                  <label htmlFor="follow" className="checkbox-label">Schedule Urgent Admin Followup</label>
                </div>

                <div className="toggle-row">
                  <input 
                    type="checkbox" 
                    id="reorder" 
                    checked={repeatReorder}
                    onChange={(e) => setRepeatReorder(e.target.checked)}
                  />
                  <label htmlFor="reorder" className="checkbox-label">Enroll in Monthly Repeat Reorders</label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowVisitModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <span>Record Visit Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .reports-page {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .export-cards-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }

        @media (max-width: 768px) {
          .export-cards-grid {
            grid-template-columns: 1fr;
          }
        }

        .export-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 160px;
        }

        .export-card .card-top {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
        }

        .card-title-block h5 {
          font-size: 0.95rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 0.25rem;
        }

        .card-title-block p {
          font-size: 0.775rem;
          color: var(--text-secondary);
          line-height: 1.35;
        }

        .export-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .export-icon.csv-type {
          background: rgba(16, 185, 129, 0.1);
          color: var(--color-success);
        }

        .export-icon.pdf-type {
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-error);
        }

        .export-card button {
          width: max-content;
        }

        /* Ledger matrix */
        .ledger-breakdown h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 1rem;
        }

        .ledger-breakdown {
          padding: 1.25rem;
        }

        .ledger-matrix {
          display: flex;
          flex-direction: column;
        }

        .matrix-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 1.2fr;
          padding: 0.75rem 0.5rem;
          font-size: 0.85rem;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          color: var(--text-secondary);
        }

        .matrix-row.header {
          font-size: 0.775rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-muted);
        }

        .matrix-customer {
          font-weight: 600;
          color: var(--text-primary);
        }

        .status-badge-mini {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
        }

        .status-badge-mini.success {
          background: var(--color-success-bg);
          color: var(--color-success);
        }

        .status-badge-mini.danger {
          background: var(--color-error-bg);
          color: var(--color-error);
        }

        /* Visits table styling */
        .visits-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .visits-header h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .notes-cell {
          font-size: 0.825rem;
          color: var(--text-secondary);
          max-width: 250px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .badge-mini {
          font-size: 0.725rem;
          font-weight: 600;
          padding: 0.15rem 0.35rem;
          border-radius: 4px;
          display: inline-block;
        }

        .badge-mini.warn {
          background: var(--color-warning-bg);
          color: var(--color-warning);
        }

        .badge-mini.ok {
          background: var(--color-success-bg);
          color: var(--color-success);
        }

        .badge-mini.disabled {
          background: rgba(255,255,255,0.03);
          color: var(--text-muted);
        }

        /* Checkbox selectors inside modal */
        .checkbox-toggles-block {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          background: rgba(0,0,0,0.15);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 0.75rem;
          margin-top: 1rem;
        }

        .toggle-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .toggle-row input {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
