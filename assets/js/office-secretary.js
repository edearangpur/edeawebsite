// Office Secretary Dashboard Functions
// File: assets/js/office-secretary.js

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
    where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentOS = null;
let allMembers = [];

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

// Check Office Secretary Access
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        // Check if user is Office Secretary
        const osDoc = await getDoc(doc(db, 'specialAccounts', 'office_secretary'));
        
        if (!osDoc.exists() || osDoc.data().uid !== user.uid) {
            await signOut(auth);
            alert('Access Denied: You are not authorized to access this page.');
            window.location.href = 'index.html';
            return;
        }
        
        currentOS = {
            uid: user.uid,
            email: user.email,
            name: osDoc.data().name || 'Office Secretary'
        };
        
        // Update OS info in header
        document.getElementById('osName').textContent = currentOS.name;
        document.getElementById('osEmail').textContent = currentOS.email;
        
        // Load dashboard data
        await loadDashboardData();
        
    } catch (error) {
        console.error('Office Secretary verification error:', error);
        alert('Error verifying access. Please try again.');
        window.location.href = 'index.html';
    }
});

// Load Dashboard Data
async function loadDashboardData() {
    showLoading();
    
    try {
        // Get all users where paymentStatus == 'approved'
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('paymentStatus', '==', 'approved'));
        const querySnapshot = await getDocs(q);
        
        allMembers = [];
        let pendingCount = 0;
        let completedCount = 0;
        
        for (const userDoc of querySnapshot.docs) {
            const userData = {
                id: userDoc.id,
                ...userDoc.data()
            };
            
            // Check verification status
            const verDoc = await getDoc(doc(db, 'verifications', userDoc.id));
            userData.verificationStatus = verDoc.exists() ? verDoc.data().status : 'pending';
            
            allMembers.push(userData);
            
            if (userData.verificationStatus === 'pending') pendingCount++;
            else if (userData.verificationStatus === 'completed') completedCount++;
        }
        
        // Update statistics
        document.getElementById('pendingCount').textContent = pendingCount;
        document.getElementById('completedCount').textContent = completedCount;
        
        // Display members in tabs
        displayMembers('pending');
        displayMembers('completed');
        
        hideLoading();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        hideLoading();
        showToast('Failed to load dashboard data', 'error');
    }
}

// Display Members in Tab
function displayMembers(status) {
    const members = allMembers.filter(m => m.verificationStatus === status);
    const containerId = status + 'Verifications';
    const container = document.getElementById(containerId);
    
    if (members.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-info-circle"></i>
                <h4>No ${status} verifications</h4>
                <p>${status === 'pending' ? 'No members awaiting verification.' : 'No completed verifications yet.'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = members.map(member => {
        const verifiedDate = member.verificationStatus === 'completed' && member.verifiedAt 
            ? new Date(member.verifiedAt).toLocaleString() 
            : null;
        
        return `
            <div class="member-card">
                <div class="member-header">
                    <h5>${member.fullName || 'Unnamed Member'}</h5>
                    <span class="member-id">${member.memberID || 'N/A'}</span>
                </div>
                
                <div class="member-details">
                    <div class="detail-item">
                        <i class="fas fa-envelope"></i>
                        <span>${member.email || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-phone"></i>
                        <span>${member.phone || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <span>Session: ${member.session || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-clock"></i>
                        <span>Joined: ${member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                </div>
                
                <div class="card-actions">
                    <button class="btn-view" onclick="viewMemberDetails('${member.id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    ${status === 'pending' ? `
                        <button class="btn-verify" onclick="verifyMember('${member.id}')">
                            <i class="fas fa-check"></i> Verify Member
                        </button>
                    ` : ''}
                </div>
                
                ${status === 'completed' && verifiedDate ? `
                    <p class="verified-date">
                        <i class="fas fa-check-circle"></i> Verified on ${verifiedDate}
                    </p>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Verify Member
window.verifyMember = async function(memberId) {
    if (!confirm('Are you sure you want to verify this member? This action cannot be undone.')) return;
    
    showLoading();
    
    try {
        const now = new Date().toISOString();
        
        // Update user document
        await updateDoc(doc(db, 'users', memberId), {
            verificationStatus: 'completed',
            verifiedAt: now,
            verifiedBy: currentOS.uid,
            verifiedByName: currentOS.name
        });
        
        // Create verification record
        await setDoc(doc(db, 'verifications', memberId), {
            userId: memberId,
            verifiedBy: currentOS.uid,
            verifiedByName: currentOS.name,
            verifiedAt: now,
            status: 'completed'
        });
        
        hideLoading();
        showToast('Member verified successfully!', 'success');
        
        // Reload dashboard
        await loadDashboardData();
        
    } catch (error) {
        console.error('Error verifying member:', error);
        hideLoading();
        showToast('Failed to verify member', 'error');
    }
}

// View Member Details
window.viewMemberDetails = async function(memberId) {
    showLoading();
    
    try {
        const memberDoc = await getDoc(doc(db, 'users', memberId));
        if (!memberDoc.exists()) {
            showToast('Member not found', 'error');
            hideLoading();
            return;
        }
        
        const member = memberDoc.data();
        
        const details = `
            <div style="text-align: left; max-height: 500px; overflow-y: auto; padding: 20px;">
                <h5 style="margin-bottom: 20px; color: #ff758c;">Member Details</h5>
                <p><strong>Full Name:</strong> ${member.fullName || 'N/A'}</p>
                <p><strong>Email:</strong> ${member.email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${member.phone || 'N/A'}</p>
                <p><strong>Member ID:</strong> ${member.memberID || 'N/A'}</p>
                <p><strong>Session:</strong> ${member.session || 'N/A'}</p>
                <p><strong>Shift:</strong> ${member.shift || 'N/A'}</p>
                <p><strong>Blood Group:</strong> ${member.bloodGroup || 'N/A'}</p>
                <p><strong>Date of Birth:</strong> ${member.dateOfBirth || 'N/A'}</p>
                <p><strong>Professional Title:</strong> ${member.professionalTitle || 'N/A'}</p>
                <p><strong>Address:</strong> ${member.address || 'N/A'}</p>
                <p><strong>Payment Status:</strong> ${member.paymentStatus || 'N/A'}</p>
                <p><strong>Verification Status:</strong> ${member.verificationStatus || 'Pending'}</p>
                <p><strong>Joined:</strong> ${member.createdAt ? new Date(member.createdAt).toLocaleString() : 'N/A'}</p>
            </div>
        `;
        
        hideLoading();
        
        // Use alert or create a custom modal for better UX
        // For simplicity, using alert here
        alert(details.replace(/<[^>]*>/g, ''));  // Strip HTML for alert, or implement a modal
        
    } catch (error) {
        console.error('Error viewing member details:', error);
        hideLoading();
        showToast('Failed to load member details', 'error');
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

// Office Secretary Logout
window.handleOSLogout = async function() {
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