// Admin Authentication
// File: assets/js/admin-auth.js

import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Show/Hide Loading
function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

// Show Error Message
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.classList.add('show');
    
    setTimeout(() => {
        errorElement.classList.remove('show');
    }, 5000);
}

// Handle Admin Login
window.handleAdminLogin = async function(event) {
    event.preventDefault();
    
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    
    // Validate admin email
    if (email !== 'edea.rangpur@gmail.com') {
        showError('Access Denied: Only admin can login here.');
        return;
    }
    
    showLoading();
    
    try {
        // Sign in with Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Check if user is admin in Firestore
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        
        if (!adminDoc.exists() || adminDoc.data().email !== 'edea.rangpur@gmail.com') {
            // Not an admin, sign out
            await auth.signOut();
            hideLoading();
            showError('Access Denied: You do not have admin privileges.');
            return;
        }
        
        // Admin verified, redirect to dashboard
        hideLoading();
        window.location.href = 'admin-dashboard.html';
        
    } catch (error) {
        hideLoading();
        console.error('Admin login error:', error);
        
        let errorMessage = 'Login failed. Please try again.';
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Admin account not found.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address.';
        }
        
        showError(errorMessage);
    }
}

// Check if already logged in as admin
onAuthStateChanged(auth, async (user) => {
    if (user && window.location.pathname.includes('admin-login.html')) {
        // Check if admin
        try {
            const adminDoc = await getDoc(doc(db, 'admins', user.uid));
            if (adminDoc.exists() && adminDoc.data().email === 'edea.rangpur@gmail.com') {
                window.location.href = 'admin-dashboard.html';
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
        }
    }
});