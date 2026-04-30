// Authentication Functions
// File: assets/js/auth.js

import { auth, db, generateMemberID } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { 
    doc, 
    setDoc, 
    getDoc,
    collection,
    query,
    where,
    getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Open Auth Modal
window.openAuthModal = function() {
    document.getElementById('authModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close Auth Modal
window.closeAuthModal = function() {
    document.getElementById('authModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Switch between Login/Register tabs
window.switchAuthTab = function(tab) {
    const tabs = document.querySelectorAll('.auth-tab');
    const contents = document.querySelectorAll('.auth-tab-content');
    
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    
    if(tab === 'login') {
        tabs[0].classList.add('active');
        document.getElementById('loginTab').classList.add('active');
    } else if(tab === 'register') {
        tabs[1].classList.add('active');
        document.getElementById('registerTab').classList.add('active');
    }
}

// Toggle Password Visibility
window.togglePassword = function(fieldId) {
    const field = document.getElementById(fieldId);
    const icon = field.nextElementSibling.querySelector('i');
    
    if(field.type === 'password') {
        field.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        field.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Show/Hide Loading
function showLoading(type) {
    document.getElementById(`${type}Form`).style.display = 'none';
    document.getElementById(`${type}Loading`).classList.add('show');
}

function hideLoading(type) {
    document.getElementById(`${type}Form`).style.display = 'block';
    document.getElementById(`${type}Loading`).classList.remove('show');
}

// Show Error Message
function showError(type, message) {
    const errorElement = document.getElementById(`${type}Error`);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

// Show Success Message
function showSuccess(type, message) {
    const successElement = document.getElementById(`${type}Success`);
    successElement.textContent = message;
    successElement.classList.add('show');
    setTimeout(() => {
        successElement.classList.remove('show');
    }, 5000);
}

// Get User Role and Redirect URL
async function getUserRoleAndRedirect(user) {
    try {
        // First check if admin
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (adminDoc.exists() && adminDoc.data().email === 'edea.rangpur@gmail.com') {
            return 'admin-dashboard.html';
        }
        
        // Check user document for special role
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Check if user has special role
            if (userData.specialRole || userData.accountType === 'special') {
                const role = userData.specialRole || userData.role;
                
                // Return appropriate page based on role
                if (role === 'finance_secretary') {
                    return 'finance-secretary-profile.html';
                } else if (role === 'office_secretary') {
                    return 'office-secretary-profile.html';
                } else if (role === 'president') {
                    return 'profile.html'; // Or create president-profile.html
                }
            }
        }
        
        // Check special accounts collection as backup
        const specialAccountsRef = collection(db, 'specialAccounts');
        const roles = ['president', 'office_secretary', 'finance_secretary'];
        
        for (const role of roles) {
            const roleDoc = await getDoc(doc(db, 'specialAccounts', role));
            if (roleDoc.exists() && roleDoc.data().uid === user.uid) {
                if (role === 'finance_secretary') {
                    return 'finance-secretary-profile.html';
                } else if (role === 'office_secretary') {
                    return 'office-secretary-profile.html';
                } else if (role === 'president') {
                    return 'profile.html';
                }
            }
        }
        
        // Default: regular member profile
        return 'profile.html';
        
    } catch (error) {
        console.error('Error determining user role:', error);
        return 'profile.html'; // Default fallback
    }
}

// Handle Login
window.handleLogin = async function(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    showLoading('login');
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Check if email is verified
        if(!user.emailVerified) {
            showError('login', 'Please verify your email before logging in. Check your inbox.');
            hideLoading('login');
            return;
        }
        
        // Update emailVerified status in ALL relevant Firestore documents
        try {
            // Update users collection
            await setDoc(doc(db, 'users', user.uid), {
                emailVerified: true
            }, { merge: true });
            
            // Check if this is a special account and update that too
            const roles = ['president', 'office_secretary', 'finance_secretary'];
            for (const role of roles) {
                const roleDoc = await getDoc(doc(db, 'specialAccounts', role));
                if (roleDoc.exists() && roleDoc.data().uid === user.uid) {
                    await setDoc(doc(db, 'specialAccounts', role), {
                        emailVerified: true
                    }, { merge: true });
                    break;
                }
            }
        } catch (updateError) {
            console.log('Could not update verification status:', updateError);
        }

        // Get appropriate redirect URL based on role
        const redirectUrl = await getUserRoleAndRedirect(user);

        hideLoading('login');
        showSuccess('login', 'Login successful! Redirecting...');
        
        // Redirect based on role
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 1500);
        
    } catch (error) {
        hideLoading('login');
        console.error('Login error:', error);
        
        let errorMessage = 'Login failed. Please try again.';
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address.';
        }
        
        showError('login', errorMessage);
    }
}

// Handle Registration
window.handleRegister = async function(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const phone = document.getElementById('registerPhone').value.trim();
    const session = document.getElementById('registerSession').value;
    
    if (!fullName || !email || !password || !phone || !session) {
        showError('register', 'Please fill all required fields.');
        return;
    }
    
    showLoading('register');
    
    try {
        console.log('Creating user with email and password...');
        
        // Create user with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log('User created successfully!');
        
        // Generate unique member ID
        const memberID = generateMemberID();
        
        // Prepare user data
        const userData = {
            uid: user.uid,
            fullName: fullName,
            email: email,
            phone: phone,
            session: session,
            shift: '',
            memberID: memberID,
            bloodGroup: '',
            address: '',
            dateOfBirth: '',
            professionalTitle: '',
            profilePicture: '',
            role: 'member',
            accountType: 'regular',
            specialRole: null,
            createdAt: new Date().toISOString(),
            emailVerified: false
        };
        
        console.log('Saving user data to Firestore...');
        
        // Save user data to Firestore
        await setDoc(doc(db, 'users', user.uid), userData);
        
        console.log('User data saved successfully!');
        
        // Send email verification
        console.log('Sending verification email...');
        await sendEmailVerification(user);
        
        console.log('Verification email sent!');
        
        hideLoading('register');
        showSuccess('register', 'âœ“ Account created successfully! Please check your email to verify your account.');
        
        // Clear form
        document.getElementById('registerForm').reset();
        
        // Show login tab after 4 seconds
        setTimeout(() => {
            switchAuthTab('login');
            showSuccess('login', 'Please verify your email and then login.');
        }, 4000);
        
    } catch (error) {
        console.error('Registration error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        hideLoading('register');
        
        let errorMessage = 'Registration failed. Please try again.';
        
        if(error.code === 'auth/email-already-in-use') {
            errorMessage = 'An account with this email already exists.';
        } else if(error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address.';
        } else if(error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak. Use at least 6 characters.';
        } else if(error.code === 'permission-denied') {
            errorMessage = 'Database permission denied. Please contact administrator.';
        } else {
            errorMessage = `Error: ${error.message}`;
        }
        
        showError('register', errorMessage);
    }
}

// Show Forgot Password Tab
window.showForgotPassword = function(event) {
    event.preventDefault();
    
    const tabs = document.querySelectorAll('.auth-tab');
    const contents = document.querySelectorAll('.auth-tab-content');
    
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    
    document.getElementById('forgotPasswordTab').classList.add('active');
}

// Back to Login
window.backToLogin = function(event) {
    event.preventDefault();
    switchAuthTab('login');
}

// Handle Forgot Password
window.handleForgotPassword = async function(event) {
    event.preventDefault();
    
    const email = document.getElementById('forgotEmail').value;
    
    try {
        await sendPasswordResetEmail(auth, email);
        showSuccess('forgot', 'Password reset link sent! Check your email.');
        
        setTimeout(() => {
            switchAuthTab('login');
        }, 3000);
        
    } catch (error) {
        let errorMessage = 'Failed to send reset link.';
        
        if(error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email.';
        } else if(error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address.';
        }
        
        showError('forgot', errorMessage);
    }
}

// Handle Logout
window.handleLogout = async function() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Check Auth State on Page Load
auth.onAuthStateChanged(async (user) => {
    const loginBtn = document.querySelector('.header-login');
    
    if(user && user.emailVerified) {
        // User is logged in
        const redirectUrl = await getUserRoleAndRedirect(user);

        if(loginBtn) {
            loginBtn.textContent = 'My Profile';
            loginBtn.onclick = () => window.location.href = redirectUrl;
        }
    } else {
        // User is not logged in
        if(loginBtn) {
            loginBtn.textContent = 'Login / Signup';
            loginBtn.onclick = openAuthModal;
        }
    }
});