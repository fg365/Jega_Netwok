/*
 * Replace the corresponding localStorage/admin JS functions in your current
 * Jega Printing HTML with these functions.
 * API files are in /api.
 */

let invoiceCache = [];

async function apiRequest(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({
        success: false,
        message: 'Invalid server response.'
    }));

    if (response.status === 401) {
        sessionStorage.removeItem('jegaAdmin');
        document.getElementById('loginBox').style.display = 'block';
        document.getElementById('adminPanel').style.display = 'none';
    }

    return data;
}

function getAllInvoices() {
    return invoiceCache;
}

async function refreshInvoices() {
    const result = await apiRequest('api/get_invoices.php');
    if (!result.success) {
        console.error(result.message);
        return false;
    }

    invoiceCache = result.invoices || [];
    return true;
}

function generateInvoiceNumber() {
    let maxNumber = 0;

    invoiceCache.forEach(function(inv) {
        const match = String(inv.invoiceNo || '').match(/(\d+)$/);
        if (match) {
            maxNumber = Math.max(maxNumber, parseInt(match[1], 10));
        }
    });

    return 'INV-' + String(maxNumber + 1).padStart(4, '0');
}

async function saveInvoice() {
    const data = getInvoiceData();

    if (!data.invoiceNo) {
        alert('Please enter invoice number.');
        return;
    }

    if (!data.customerName) {
        alert('Please enter customer name.');
        return;
    }

    if (data.items.length === 0) {
        alert('Please add at least one item.');
        return;
    }

    const oldInvoice = invoiceCache.find(function(inv) {
        return String(inv.invoiceNo).toLowerCase() === data.invoiceNo.toLowerCase();
    });

    if (oldInvoice && !confirm(
        'This invoice number already exists.\n\nDo you want to update it?'
    )) {
        return;
    }

    try {
        const result = await apiRequest('api/save_invoice.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!result.success) {
            alert(result.message || 'Unable to save invoice.');
            return;
        }

        await refreshInvoices();
        alert(result.message || 'Invoice saved successfully!');

        document.getElementById('invoiceNo').value = generateInvoiceNumber();
        loadSavedInvoices();
    } catch (error) {
        console.error(error);
        alert('Server connection failed. Make sure WAMP Apache and MySQL are running.');
    }
}

async function adminLogin() {
    const username = document.getElementById('adminUser').value.trim();
    const password = document.getElementById('adminPass').value;

    try {
        const result = await apiRequest('api/login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!result.success) {
            document.getElementById('loginError').innerText =
                result.message || 'Invalid username or password.';
            return;
        }

        sessionStorage.setItem('jegaAdmin', 'true');
        document.getElementById('loginError').innerText = '';
        document.getElementById('loginBox').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';

        await refreshInvoices();
        loadSavedInvoices();
    } catch (error) {
        console.error(error);
        document.getElementById('loginError').innerText =
            'Server connection failed.';
    }
}

async function adminLogout() {
    try {
        await apiRequest('api/logout.php', { method: 'POST' });
    } catch (error) {
        console.error(error);
    }

    sessionStorage.removeItem('jegaAdmin');
    document.getElementById('loginBox').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
}

async function loadSavedInvoices() {
    if (sessionStorage.getItem('jegaAdmin') !== 'true') {
        document.getElementById('loginBox').style.display = 'block';
        document.getElementById('adminPanel').style.display = 'none';
        return;
    }

    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';

    await refreshInvoices();

    const container = document.getElementById('savedInvoices');
    container.innerHTML = '';

    let totalSales = 0;

    invoiceCache.forEach(function(inv) {
        totalSales += Number(inv.grandTotal) || 0;

        const div = document.createElement('div');
        div.className = 'saved-invoice';

        div.innerHTML = `
            <div>
                <strong>${escapeHTML(inv.invoiceNo)}</strong><br>
                <small>Date: ${escapeHTML(inv.date)}</small><br>
                <small>${escapeHTML(inv.customerName)}</small><br>
                <span class="badge">₹${Number(inv.grandTotal).toFixed(2)}</span>
            </div>
            <div class="saved-actions">
                <button class="btn btn-primary"
                    onclick="openSavedInvoice('${encodeURIComponent(inv.invoiceNo)}')">Open</button>
                <button class="btn btn-print"
                    onclick="printSavedInvoice('${encodeURIComponent(inv.invoiceNo)}')">🖨 Print</button>
                <button class="btn btn-primary"
                    onclick="downloadSavedInvoice('${encodeURIComponent(inv.invoiceNo)}')">📥 PDF</button>
                <button class="btn btn-danger"
                    onclick="deleteInvoice('${encodeURIComponent(inv.invoiceNo)}')">Delete</button>
            </div>
        `;

        container.appendChild(div);
    });

    document.getElementById('invoiceCount').innerText = invoiceCache.length;
    document.getElementById('salesTotal').innerText = '₹' + totalSales.toFixed(2);

    if (invoiceCache.length === 0) {
        container.innerHTML = '<div class="empty-message">No invoices saved yet.</div>';
    }
}

function findInvoice(invoiceNo) {
    return invoiceCache.find(function(inv) {
        return String(inv.invoiceNo).toLowerCase() === String(invoiceNo).toLowerCase();
    });
}

function searchInvoice() {
    const search = document.getElementById('invoiceSearch').value.trim().toLowerCase();
    const result = document.getElementById('searchResult');

    if (!search) {
        result.innerHTML = '<div class="empty-message">Enter invoice number.</div>';
        return;
    }

    const matches = invoiceCache.filter(function(inv) {
        return String(inv.invoiceNo).toLowerCase().includes(search);
    });

    result.innerHTML = '';

    if (matches.length === 0) {
        result.innerHTML = `<div class="empty-message">❌ Invoice not found.<br><br>Search: <strong>${escapeHTML(search)}</strong></div>`;
        return;
    }

    matches.forEach(function(inv) {
        const div = document.createElement('div');
        div.className = 'saved-invoice';
        div.innerHTML = `
            <div>
                <strong>${escapeHTML(inv.invoiceNo)}</strong><br>
                Date: ${escapeHTML(inv.date)}<br>
                Customer: ${escapeHTML(inv.customerName)}<br>
                Total: <span class="badge">₹${Number(inv.grandTotal).toFixed(2)}</span>
            </div>
            <div class="saved-actions">
                <button class="btn btn-primary" onclick="openSavedInvoice('${encodeURIComponent(inv.invoiceNo)}')">Open</button>
                <button class="btn btn-print" onclick="printSavedInvoice('${encodeURIComponent(inv.invoiceNo)}')">🖨 Print</button>
                <button class="btn btn-primary" onclick="downloadSavedInvoice('${encodeURIComponent(inv.invoiceNo)}')">📥 PDF</button>
            </div>
        `;
        result.appendChild(div);
    });
}

async function deleteInvoice(encodedNo) {
    const invoiceNo = decodeURIComponent(encodedNo);

    if (!confirm('Are you sure you want to delete invoice ' + invoiceNo + '?')) {
        return;
    }

    try {
        const result = await apiRequest('api/delete_invoice.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceNo })
        });

        if (!result.success) {
            alert(result.message || 'Unable to delete invoice.');
            return;
        }

        await refreshInvoices();
        await loadSavedInvoices();

        if (document.getElementById('invoiceSearch').value) {
            searchInvoice();
        }
    } catch (error) {
        console.error(error);
        alert('Server connection failed.');
    }
}

/* Initial server load. */
(async function() {
    try {
        await refreshInvoices();
        document.getElementById('invoiceNo').value = generateInvoiceNumber();
    } catch (error) {
        console.error(error);
    }
})();
