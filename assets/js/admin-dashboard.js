// Admin Dashboard Functions
// File: assets/js/admin-dashboard.js

import { auth, db } from './firebase-config.js';
import { 
    onAuthStateChanged,
    updatePassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    collection,
    getDocs,
    doc,
    getDoc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let allMembers = [];
let currentAdmin = null;

// Show/Hide Loading
function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

// Check Admin Access
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'admin-login.html';
        return;
    }
    
    try {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        
        if (!adminDoc.exists() || adminDoc.data().email !== 'edea.rangpur@gmail.com') {
            await signOut(auth);
            window.location.href = 'admin-login.html';
            return;
        }
        
        currentAdmin = {
            uid: user.uid,
            email: user.email,
            name: adminDoc.data().name || 'Admin'
        };
        
        // Update admin info in header
        document.getElementById('adminName').textContent = currentAdmin.name;
        document.getElementById('adminEmail').textContent = currentAdmin.email;
        
        // Load dashboard data
        await loadDashboardData();
        
    } catch (error) {
        console.error('Admin verification error:', error);
        window.location.href = 'admin-login.html';
    }
});

// Load Dashboard Data
async function loadDashboardData() {
    showLoading();
    
    try {
        // Get all users from Firestore
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        
        allMembers = [];
        let verifiedCount = 0;
        let pendingCount = 0;
        const sessionsSet = new Set();
        
        usersSnapshot.forEach((doc) => {
            const userData = doc.data();
            // Add these lines here, BEFORE the push
    userData.paymentStatus = userData.paymentStatus || 'pending';
    userData.verificationStatus = userData.verificationStatus || 'pending';
    userData.overallStatus = (userData.paymentStatus === 'approved' && userData.verificationStatus === 'completed') ? 'approved' : 'pending';
            allMembers.push({
                id: doc.id,
                ...userData
            });
            
            if (userData.emailVerified) {
                verifiedCount++;
            } else {
                pendingCount++;
            }
            
            if (userData.session) {
                sessionsSet.add(userData.session);
            }
            // Inside the usersSnapshot.forEach loop, after if (userData.session)...
userData.paymentStatus = userData.paymentStatus || 'pending';
userData.verificationStatus = userData.verificationStatus || 'pending';
userData.overallStatus = (userData.paymentStatus === 'approved' && userData.verificationStatus === 'completed') ? 'approved' : 'pending';

        });
        
        // Update statistics
        document.getElementById('totalMembers').textContent = allMembers.length;
        document.getElementById('verifiedMembers').textContent = verifiedCount;
        document.getElementById('pendingMembers').textContent = pendingCount;
        document.getElementById('totalSessions').textContent = sessionsSet.size;
        
        // Populate session filter
        populateSessionFilter(sessionsSet);
        
        // Display members
        displayMembers(allMembers);
        
        hideLoading();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        hideLoading();
        alert('Failed to load dashboard data. Please refresh the page.');
    }
}

// Populate Session Filter
function populateSessionFilter(sessionsSet) {
    const sessionFilter = document.getElementById('sessionFilter');
    const sessions = Array.from(sessionsSet).sort();
    
    sessions.forEach(session => {
        const option = document.createElement('option');
        option.value = session;
        option.textContent = session;
        sessionFilter.appendChild(option);
    });
}

// Display Members in Table
function displayMembers(members) {
    const tbody = document.getElementById('membersTableBody');
    
    if (members.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #757575;">
                    <i class="fas fa-users" style="font-size: 48px; opacity: 0.3; margin-bottom: 15px;"></i>
                    <p style="margin: 0;">No members found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = members.map(member => {
        const statusClass = member.overallStatus === 'approved' ? 'status-verified' : 'status-pending';
        const statusText = member.overallStatus.charAt(0).toUpperCase() + member.overallStatus.slice(1);
        const onclickAttr = member.overallStatus === 'pending' ? `onclick="showStatusDetails('${member.id}')"` : '';
        const profilePic = member.profilePicture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(member.fullName || 'User') + '&size=40&background=667eea&color=fff';
        const joinDate = member.createdAt ? new Date(member.createdAt).toLocaleDateString('en-GB') : 'N/A';
        
        return `
            <tr data-member-id="${member.id}">
                <td>
                    <div class="member-info">
                        <img src="${profilePic}" alt="${member.fullName}" class="member-avatar" onerror="this.src='https://ui-avatars.com/api/?name=User&size=40&background=667eea&color=fff'">
                        <div class="info-text">
                            <h6>${member.fullName || 'N/A'}</h6>
                            <p>${member.email || 'N/A'}</p>
                        </div>
                    </div>
                </td>
                <td><strong>${member.memberID || 'N/A'}</strong></td>
                <td>${member.phone || 'N/A'}</td>
                <td>${member.session || 'N/A'}</td>
                <td>${member.shift || 'N/A'}</td>
                <td>
                    <span class="status-badge ${statusClass}" ${onclickAttr}>
                        ${statusText}
                    </span>
                </td>
                <td>${joinDate}</td>
                <td>
                    <div class="action-icons">
                        <button class="btn-view" onclick="viewMemberDetails('${member.id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Add this new function after displayMembers()
window.showStatusDetails = function(memberId) {
    const member = allMembers.find(m => m.id === memberId);
    if (!member) return;

    // Update modal content
    document.getElementById('modalMemberInfo').innerHTML = `
        <p><strong>Name:</strong> ${member.fullName}</p>
        <p><strong>Member ID:</strong> ${member.memberID}</p>
    `;

    // Payment Status
    const paymentBadge = document.getElementById('modalPaymentStatus');
    paymentBadge.textContent = member.paymentStatus.toUpperCase();
    paymentBadge.className = 'badge ' + (member.paymentStatus === 'approved' ? 'bg-success' : 
                                         member.paymentStatus === 'pending' ? 'bg-warning' : 'bg-danger');

    // Verification Status
    const verBadge = document.getElementById('modalVerificationStatus');
    verBadge.textContent = member.verificationStatus.toUpperCase();
    verBadge.className = 'badge ' + (member.verificationStatus === 'completed' ? 'bg-success' : 
                                     member.verificationStatus === 'pending' ? 'bg-warning' : 'bg-danger');

    // Overall Status
    const overallBadge = document.getElementById('modalOverallStatus');
    overallBadge.textContent = member.overallStatus.toUpperCase();
    overallBadge.className = 'badge ' + (member.overallStatus === 'approved' ? 'bg-success' : 'bg-warning');

    // Open modal
    const modal = new bootstrap.Modal(document.getElementById('memberDetailsModal'));
    modal.show();
}

// Filter Members
window.filterMembers = function() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const sessionFilter = document.getElementById('sessionFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    const filtered = allMembers.filter(member => {
        const matchSearch = !searchText || 
            (member.fullName && member.fullName.toLowerCase().includes(searchText)) ||
            (member.email && member.email.toLowerCase().includes(searchText)) ||
            (member.memberID && member.memberID.toLowerCase().includes(searchText));
        
        const matchSession = !sessionFilter || member.session === sessionFilter;
        
        const matchStatus = !statusFilter || 
            (statusFilter === 'verified' && member.emailVerified) ||
            (statusFilter === 'pending' && !member.emailVerified);
        
        return matchSearch && matchSession && matchStatus;
    });
    
    displayMembers(filtered);
}

// View Member Details
window.viewMemberDetails = function(memberId) {
    const member = allMembers.find(m => m.id === memberId);
    if (!member) return;
    
    const details = `
        <div style="text-align: left;">
            <h5 style="margin-bottom: 20px; color: #667eea;">Member Details</h5>
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
            <p><strong>Email Status:</strong> ${member.emailVerified ? 'Verified' : 'Not Verified'}</p>
            <p><strong>Joined:</strong> ${member.createdAt ? new Date(member.createdAt).toLocaleString() : 'N/A'}</p>
        </div>
    `;
    
    alert(details);
}

// Change Password
window.changePassword = async function() {
    const newPassword = prompt('Enter new password (minimum 6 characters):');
    
    if (!newPassword) return;
    
    if (newPassword.length < 6) {
        alert('Password must be at least 6 characters long.');
        return;
    }
    
    const confirmPassword = prompt('Confirm new password:');
    
    if (newPassword !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    showLoading();
    
    try {
        await updatePassword(auth.currentUser, newPassword);
        hideLoading();
        alert('Password changed successfully!');
    } catch (error) {
        hideLoading();
        console.error('Password change error:', error);
        
        if (error.code === 'auth/requires-recent-login') {
            alert('For security reasons, please logout and login again before changing password.');
        } else {
            alert('Failed to change password: ' + error.message);
        }
    }
}

// Refresh Data
window.refreshData = async function() {
    await loadDashboardData();
    alert('Data refreshed successfully!');
}

// Admin Logout
window.handleAdminLogout = async function() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await signOut(auth);
            window.location.href = 'admin-login.html';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Failed to logout. Please try again.');
        }
    }
}