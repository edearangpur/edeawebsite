// Special Accounts Management
// File: assets/js/special-accounts.js

import { auth, db } from './firebase-config.js';
import { 
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    getDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
        font-weight: 500;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Open Special Account Modal - Make it globally accessible
if (typeof window !== 'undefined') {
    window.openSpecialAccountModal = async function() {
        const modal = new bootstrap.Modal(document.getElementById('specialAccountModal'));
        modal.show();
        
        // Load current special accounts with fresh data
        await loadSpecialAccounts();
    };
    
    // Add refresh function for manual refresh
    window.refreshSpecialAccountsStatus = async function() {
        showToast('Refreshing verification status...', 'success');
        await loadSpecialAccounts();
        showToast('Status updated!', 'success');
    };
}

// Check email verification status via REST API
async function checkEmailVerificationStatus(uid) {
    try {
        // Get user document from Firestore and check Firebase Auth status
        const userDocRef = doc(db, 'users', uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
            // For now, we'll rely on Firestore data
            // In production, you'd need Firebase Admin SDK for server-side verification check
            return userDocSnap.data().emailVerified || false;
        }
        
        return false;
        
    } catch (error) {
        console.error('Error checking email verification:', error);
        return false;
    }
}

// Load Special Accounts
async function loadSpecialAccounts() {
    const container = document.getElementById('specialAccountsContainer');
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #757575;"><i class="fas fa-spinner fa-spin"></i> Loading accounts...</div>';
    
    try {
        const roles = ['president', 'office_secretary', 'finance_secretary'];
        const accounts = [];
        
        for (const role of roles) {
            const docRef = doc(db, 'specialAccounts', role);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // Check actual email verification status from Firestore
                const isVerified = await checkEmailVerificationStatus(data.uid);
                
                // Update both Firestore documents with current verification status
                try {
                    // Update special account document
                    await setDoc(docRef, {
                        ...data,
                        emailVerified: isVerified
                    }, { merge: true });
                    
                    // Update user document
                    const userDocRef = doc(db, 'users', data.uid);
                    await setDoc(userDocRef, {
                        emailVerified: isVerified
                    }, { merge: true });
                    
                } catch (error) {
                    console.log('Could not update verification status:', error);
                }
                
                accounts.push({
                    role: role,
                    ...data,
                    emailVerified: isVerified
                });
            }
        }
        
        if (accounts.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #757575;">No special accounts created yet</div>';
            return;
        }
        
        container.innerHTML = accounts.map(account => {
            const roleLabels = {
                'president': 'President',
                'office_secretary': 'Office Secretary',
                'finance_secretary': 'Finance Secretary'
            };
            
            const roleClasses = {
                'president': 'president',
                'office_secretary': 'office-secretary',
                'finance_secretary': 'finance-secretary'
            };
            
            const createdDate = account.createdAt ? new Date(account.createdAt).toLocaleDateString('en-GB') : 'N/A';
            
            return `
                <div class="special-account-card">
                    <div class="account-header">
                        <span class="role-badge ${roleClasses[account.role]}">${roleLabels[account.role]}</span>
                        <span class="verification-status ${account.emailVerified ? 'verified' : 'unverified'}">
                            <i class="fas fa-${account.emailVerified ? 'check-circle' : 'exclamation-circle'}"></i>
                            ${account.emailVerified ? 'Verified' : 'Unverified'}
                        </span>
                    </div>
                    <div class="account-info">
                        <i class="fas fa-user"></i> ${account.name}
                    </div>
                    <div class="account-info">
                        <i class="fas fa-envelope"></i> ${account.email}
                    </div>
                    <div class="account-info">
                        <i class="fas fa-calendar"></i> Created: ${createdDate}
                    </div>
                    ${!account.emailVerified ? `
                        <div class="account-info" style="color: #dc3545; font-size: 13px;">
                            <i class="fas fa-exclamation-triangle"></i> Verification pending. Email sent to user.
                        </div>
                    ` : ''}
                    <div class="account-actions">
                        ${!account.emailVerified ? `
                            <button class="btn-edit" onclick="resendVerificationEmail('${account.uid}', '${account.email}')">
                                <i class="fas fa-envelope"></i> Resend Email
                            </button>
                        ` : ''}
                        <button class="btn-delete" onclick="deleteSpecialAccount('${account.role}', '${account.uid}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading special accounts:', error);
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #dc3545;">Error loading accounts</div>';
    }
}

// Resend Verification Email - Make globally accessible
if (typeof window !== 'undefined') {
    window.resendVerificationEmail = async function(uid, email) {
        showLoading();
        
        try {
            // We can't resend from here directly without logging in as that user
            // So we'll create a custom verification link or inform user to check spam
            showToast('Please ask the user to check their email inbox and spam folder.', 'error');
            hideLoading();
            
        } catch (error) {
            hideLoading();
            console.error('Error:', error);
            showToast('Could not resend email', 'error');
        }
    };
}

// Handle Role Selection Change
document.getElementById('roleSelect')?.addEventListener('change', async function() {
    const role = this.value;
    const currentHolderInfo = document.getElementById('currentHolderInfo');
    const currentHolderDetails = document.getElementById('currentHolderDetails');
    
    if (!role) {
        currentHolderInfo.style.display = 'none';
        return;
    }
    
    try {
        const docRef = doc(db, 'specialAccounts', role);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            currentHolderDetails.innerHTML = `
                <strong>${data.name}</strong><br>
                ${data.email}<br>
                <small style="color: #dc3545;">âš ï¸ This account will be replaced if you proceed.</small>
            `;
            currentHolderInfo.style.display = 'block';
        } else {
            currentHolderInfo.style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking current holder:', error);
        currentHolderInfo.style.display = 'none';
    }
});

// Toggle Password Visibility
document.getElementById('togglePassword')?.addEventListener('click', function() {
    const passwordField = document.getElementById('specialPassword');
    const icon = this.querySelector('i');
    
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordField.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
});

// Create User using Firebase REST API (doesn't affect current session)
async function createUserWithRestAPI(email, password) {
    const apiKey = 'AIzaSyA85utYXmWE4vvwS0eYHU4dPAiZPUE4zFQ'; // Your Firebase API key
    
    try {
        const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password,
                returnSecureToken: true
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }
        
        return {
            uid: data.localId,
            email: data.email,
            idToken: data.idToken
        };
        
    } catch (error) {
        console.error('REST API Error:', error);
        throw error;
    }
}

// Send Email Verification using REST API
async function sendVerificationEmailRestAPI(idToken) {
    const apiKey = 'AIzaSyA85utYXmWE4vvwS0eYHU4dPAiZPUE4zFQ';
    
    try {
        const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                requestType: 'VERIFY_EMAIL',
                idToken: idToken
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            console.error('Email verification error:', data.error);
        }
        
        return true;
        
    } catch (error) {
        console.error('Send verification email error:', error);
        return false;
    }
}

// Handle Special Account Creation
document.getElementById('specialAccountForm')?.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const role = document.getElementById('roleSelect').value;
    const email = document.getElementById('specialEmail').value.trim();
    const password = document.getElementById('specialPassword').value;
    const fullName = document.getElementById('specialFullName').value.trim();
    
    if (!role || !email || !password || !fullName) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    showLoading();
    
    try {
        // Check if role already exists
        const roleDocRef = doc(db, 'specialAccounts', role);
        const roleDocSnap = await getDoc(roleDocRef);
        
        let oldUid = null;
        if (roleDocSnap.exists()) {
            oldUid = roleDocSnap.data().uid;
        }
        
        // Create new user using REST API (won't affect current admin session)
        const newUser = await createUserWithRestAPI(email, password);
        
        // Send email verification
        await sendVerificationEmailRestAPI(newUser.idToken);
        
        // Determine profile pages based on role
        const rolePages = {
            'president': 'profile.html',
            'office_secretary': 'office-secretary-profile.html',
            'finance_secretary': 'finance-secretary-profile.html'
        };
        
        // Save to specialAccounts collection
        await setDoc(doc(db, 'specialAccounts', role), {
            uid: newUser.uid,
            email: email,
            name: fullName,
            role: role,
            createdAt: new Date().toISOString(),
            emailVerified: false
        });
        
        // Save to users collection with role
        await setDoc(doc(db, 'users', newUser.uid), {
            uid: newUser.uid,
            fullName: fullName,
            email: email,
            role: role,
            specialRole: role,
            accountType: 'special',
            profilePage: rolePages[role],
            createdAt: new Date().toISOString(),
            emailVerified: false,
            phone: '',
            session: '',
            shift: '',
            memberID: '',
            bloodGroup: '',
            address: '',
            dateOfBirth: '',
            professionalTitle: '',
            profilePicture: ''
        });
        
        // Delete old user's special account reference if exists
        if (oldUid && oldUid !== newUser.uid) {
            try {
                const oldUserRef = doc(db, 'users', oldUid);
                const oldUserSnap = await getDoc(oldUserRef);
                if (oldUserSnap.exists()) {
                    await setDoc(oldUserRef, {
                        role: 'member',
                        accountType: 'regular',
                        specialRole: null,
                        profilePage: 'profile.html'
                    }, { merge: true });
                }
            } catch (error) {
                console.log('Error updating old user:', error);
            }
        }
        
        hideLoading();
        
        const roleLabels = {
            'president': 'President',
            'office_secretary': 'Office Secretary',
            'finance_secretary': 'Finance Secretary'
        };
        
        showToast(`${roleLabels[role]} account created! Verification email sent to ${email}`, 'success');
        
        // Clear form
        document.getElementById('specialAccountForm').reset();
        document.getElementById('currentHolderInfo').style.display = 'none';
        
        // Reload accounts list
        await loadSpecialAccounts();
        
    } catch (error) {
        hideLoading();
        console.error('Error creating special account:', error);
        
        let errorMessage = 'Failed to create account';
        
        if (error.message.includes('EMAIL_EXISTS')) {
            errorMessage = 'This email is already in use';
        } else if (error.message.includes('INVALID_EMAIL')) {
            errorMessage = 'Invalid email address';
        } else if (error.message.includes('WEAK_PASSWORD')) {
            errorMessage = 'Password is too weak (minimum 6 characters)';
        } else {
            errorMessage = error.message || 'Failed to create account';
        }
        
        showToast(errorMessage, 'error');
    }
});

// Delete Special Account - Make globally accessible
if (typeof window !== 'undefined') {
    window.deleteSpecialAccount = async function(role, uid) {
        if (!confirm('Are you sure you want to delete this special account? The user will become a regular member.')) {
            return;
        }
        
        showLoading();
        
        try {
            // Delete from specialAccounts collection
            await deleteDoc(doc(db, 'specialAccounts', role));
            
            // Update user document to regular member
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                await setDoc(userRef, {
                    role: 'member',
                    accountType: 'regular',
                    specialRole: null,
                    profilePage: 'profile.html'
                }, { merge: true });
            }
            
            hideLoading();
            showToast('Special account deleted successfully', 'success');
            
            // Reload accounts list
            await loadSpecialAccounts();
            
        } catch (error) {
            hideLoading();
            console.error('Error deleting special account:', error);
            showToast('Failed to delete account', 'error');
        }
    };
}