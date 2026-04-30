// Finance Secretary Dashboard Functions
// File: assets/js/finance-secretary.js

import { auth, db } from './firebase-config.js';
import { 
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    setDoc,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentFS = null;
let allPayments = [];

// Show/Hide Loading
function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

// Show Toast Notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
        color: white;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-weight: 500;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Check Finance Secretary Access
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        // Check if user is Finance Secretary
        const fsDoc = await getDoc(doc(db, 'specialAccounts', 'finance_secretary'));
        
        if (!fsDoc.exists() || fsDoc.data().uid !== user.uid) {
            await signOut(auth);
            alert('Access Denied: You are not authorized to access this page.');
            window.location.href = 'index.html';
            return;
        }
        
        currentFS = {
            uid: user.uid,
            email: user.email,
            name: fsDoc.data().name || 'Finance Secretary'
        };
        
        // Update FS info in header
        document.getElementById('fsName').textContent = currentFS.name;
        document.getElementById('fsEmail').textContent = currentFS.email;
        
        // Load dashboard data
        await loadDashboardData();
        
    } catch (error) {
        console.error('Finance Secretary verification error:', error);
        alert('Error verifying access. Please try again.');
        window.location.href = 'index.html';
    }
});

// Load Dashboard Data
async function loadDashboardData() {
    showLoading();
    
    try {
        // Get all payments from Firestore
        const paymentsRef = collection(db, 'payments');
        const paymentsSnapshot = await getDocs(paymentsRef);
        
        allPayments = [];
        let pendingCount = 0;
        let approvedCount = 0;
        let rejectedCount = 0;
        
        paymentsSnapshot.forEach((doc) => {
            const paymentData = {
                id: doc.id,
                ...doc.data()
            };
            allPayments.push(paymentData);
            
            if (paymentData.status === 'pending') pendingCount++;
            else if (paymentData.status === 'approved') approvedCount++;
            else if (paymentData.status === 'rejected') rejectedCount++;
        });
        
        // Update statistics
        document.getElementById('pendingCount').textContent = pendingCount;
        document.getElementById('approvedCount').textContent = approvedCount;
        document.getElementById('rejectedCount').textContent = rejectedCount;
        
        // Display payments in tabs
        displayPayments('pending');
        displayPayments('approved');
        displayPayments('rejected');
        
        hideLoading();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        hideLoading();
        showToast('Failed to load dashboard data', 'error');
    }
}

// Display Payments in Tab
function displayPayments(status) {
    const payments = allPayments.filter(p => p.status === status);
    const containerId = status + 'Payments';
    const container = document.getElementById(containerId);
    
    if (payments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h4>No ${status} payments</h4>
                <p>There are currently no ${status} payment submissions.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = payments.map(payment => {
        const submittedDate = new Date(payment.submittedAt).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let approvedDate = '';
        if (payment.approvedAt) {
            approvedDate = new Date(payment.approvedAt).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        return `
            <div class="payment-card">
                <div class="card-header-section">
                    <div class="member-info">
                        <h5>${payment.memberName || 'N/A'}</h5>
                        <p>ID: ${payment.memberID || 'N/A'} | Session: ${payment.session || 'N/A'}</p>
                        <p>${payment.email || 'N/A'} | ${payment.phone || 'N/A'}</p>
                    </div>
                    <span class="status-badge ${status}">${status.toUpperCase()}</span>
                </div>
                
                <div class="payment-details">
                    <div class="detail-item">
                        <i class="fas fa-wallet"></i>
                        <div>
                            <p class="label">Payment Mode</p>
                            <p class="value">${payment.paymentMode || 'N/A'}</p>
                        </div>
                    </div>
                    
                    <div class="detail-item">
                        <i class="fas fa-hashtag"></i>
                        <div>
                            <p class="label">Transaction Number</p>
                            <p class="value">${payment.transactionNumber || 'N/A'}</p>
                        </div>
                    </div>
                    
                    <div class="detail-item">
                        <i class="fas fa-money-bill-wave"></i>
                        <div>
                            <p class="label">Amount</p>
                            <p class="value">${payment.amount || 0} BDT</p>
                        </div>
                    </div>
                    
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <div>
                            <p class="label">Submitted At</p>
                            <p class="value">${submittedDate}</p>
                        </div>
                    </div>
                </div>
                
                ${payment.note ? `
                    <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                        <p style="margin: 0; font-size: 13px; color: #757575;"><strong>Note:</strong> ${payment.note}</p>
                    </div>
                ` : ''}
                
                ${status === 'pending' ? `
                    <div class="card-actions">
                        <button class="btn-approve" onclick="approvePayment('${payment.id}')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn-reject" onclick="rejectPayment('${payment.id}')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </div>
                ` : ''}
                
                ${status === 'approved' && approvedDate ? `
                    <p class="approved-date">
                        <i class="fas fa-check-circle"></i> Approved on ${approvedDate}
                    </p>
                ` : ''}
                
                ${status === 'rejected' && approvedDate ? `
                    <p class="approved-date" style="color: #dc3545;">
                        <i class="fas fa-times-circle"></i> Rejected on ${approvedDate}
                    </p>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Approve Payment
window.approvePayment = async function(paymentId) {
    if (!confirm('Are you sure you want to approve this payment?')) return;
    
    showLoading();
    
    try {
        const now = new Date().toISOString();
        
        // Update payment document
        await updateDoc(doc(db, 'payments', paymentId), {
            status: 'approved',
            approvedAt: now,
            approvedBy: currentFS.uid,
            approvedByName: currentFS.name
        });
        
        // Update user document
        await updateDoc(doc(db, 'users', paymentId), {
            paymentStatus: 'approved',
            paymentApprovedAt: now
        });
        
        // Create approval record
        await setDoc(doc(db, 'payment_approvals', paymentId), {
            userId: paymentId,
            approvedBy: currentFS.uid,
            approvedByName: currentFS.name,
            approvedAt: now
        });
        
        hideLoading();
        showToast('Payment approved successfully!', 'success');
        
        // Reload dashboard
        await loadDashboardData();
        
    } catch (error) {
        console.error('Error approving payment:', error);
        hideLoading();
        showToast('Failed to approve payment', 'error');
    }
}

// Reject Payment
window.rejectPayment = async function(paymentId) {
    const reason = prompt('Please enter reason for rejection (optional):');
    if (reason === null) return; // User cancelled
    
    showLoading();
    
    try {
        const now = new Date().toISOString();
        
        // Update payment document
        await updateDoc(doc(db, 'payments', paymentId), {
            status: 'rejected',
            approvedAt: now,
            approvedBy: currentFS.uid,
            approvedByName: currentFS.name,
            rejectionReason: reason || 'No reason provided'
        });
        
        // Update user document
        await updateDoc(doc(db, 'users', paymentId), {
            paymentStatus: 'rejected',
            paymentRejectedAt: now,
            paymentRejectionReason: reason || 'No reason provided'
        });
        
        hideLoading();
        showToast('Payment rejected', 'error');
        
        // Reload dashboard
        await loadDashboardData();
        
    } catch (error) {
        console.error('Error rejecting payment:', error);
        hideLoading();
        showToast('Failed to reject payment', 'error');
    }
}

// Switch Tab
window.switchTab = function(tab) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update tab contents
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tab + 'Tab').classList.add('active');
}

// Finance Secretary Logout
window.handleFSLogout = async function() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Failed to logout', 'error');
        }
    }
}