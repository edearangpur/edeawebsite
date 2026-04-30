// Enhanced Profile Page Functions
// File: assets/js/profile.js

import { auth, db } from './firebase-config.js';
import { 
    onAuthStateChanged,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    updateDoc,
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


// Generate Session Options (2006-07 to 2025-26, excluding 2008-09)
function generateSessionOptions() {
    const sessionSelect = document.getElementById('session');
    for (let year = 2006; year <= 2025; year++) {
        if (year === 2008) continue; // Skip 2008-09
        const nextYear = (year + 1).toString().slice(-2);
        const sessionValue = `${year}-${nextYear}`;
        const option = document.createElement('option');
        option.value = sessionValue;
        option.textContent = sessionValue;
        sessionSelect.appendChild(option);
    }
}

// Initialize session options on page load
generateSessionOptions();

// Show/Hide Loading Overlay
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
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Calculate Profile Completion Percentage
function calculateCompletion(userData) {
    const fields = [
        userData.fullName,
        userData.phone,
        userData.bloodGroup,
        userData.dateOfBirth,
        userData.session,
        userData.shift,
        userData.professionalTitle,
        userData.address,
        userData.profilePicture,
        userData.machineSkills
    ];
    
    const filledFields = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
}

// Update Status Badges
function updateStatusBadges(user, userData) {
    // Email Verification Status
    const statusEmail = document.getElementById('statusEmail');
    if (user.emailVerified) {
        statusEmail.className = 'status-badge status-verified';
        statusEmail.innerHTML = '<i class="fas fa-check-circle"></i> Email: Verified';
    } else {
        statusEmail.className = 'status-badge status-pending';
        statusEmail.innerHTML = '<i class="fas fa-exclamation-circle"></i> Email: Not Verified';
    }
    
    // Profile Creation Status
    const statusProfile = document.getElementById('statusProfile');
    if (userData.fullName && userData.phone) {
        statusProfile.className = 'status-badge status-verified';
        statusProfile.innerHTML = '<i class="fas fa-check-circle"></i> Profile: Created';
    } else {
        statusProfile.className = 'status-badge status-pending';
        statusProfile.innerHTML = '<i class="fas fa-user-edit"></i> Profile: Incomplete';
    }
    
    // Profile Completion Status
    const completion = calculateCompletion(userData);
    const statusCompletion = document.getElementById('statusCompletion');
    document.getElementById('completionPercent').textContent = completion;
    
    if (completion === 100) {
        statusCompletion.className = 'status-badge status-verified';
    } else if (completion >= 50) {
        statusCompletion.className = 'status-badge status-pending';
    } else {
        statusCompletion.className = 'status-badge status-inactive';
    }
    // Verification Status (Office Secretary approval)
    const statusVerification = document.getElementById('statusVerification');
    if (userData.verificationStatus === 'completed') {
        statusVerification.className = 'status-badge status-verified';
        statusVerification.innerHTML = '<i class="fas fa-check-circle"></i> Verification: Done';
    } else {
        statusVerification.className = 'status-badge status-inactive';
        statusVerification.innerHTML = '<i class="fas fa-shield-alt"></i> Verification: Pending';
    }
    
    // Complete Status (All requirements met)
    const statusComplete = document.getElementById('statusComplete');
    const isComplete = user.emailVerified && 
                       userData.fullName && 
                       userData.phone && 
                       userData.paymentStatus === 'approved' && 
                       userData.verificationStatus === 'completed';
    
    if (isComplete) {
        statusComplete.className = 'status-badge status-verified';
        statusComplete.innerHTML = '<i class="fas fa-check-circle"></i> Complete: Yes';
    } else {
        statusComplete.className = 'status-badge status-inactive';
        statusComplete.innerHTML = '<i class="fas fa-times-circle"></i> Complete: No';
    }
}

// Add Work Experience Field
window.addWorkExperience = function() {
    const container = document.getElementById('workExperienceContainer');
    const index = container.children.length;
    
    const fieldHTML = `
        <div class="dynamic-field-container" data-index="${index}">
            <button type="button" class="remove-field-btn" onclick="removeWorkExperience(${index})">
                <i class="fas fa-times"></i>
            </button>
            <div class="profile-info-grid">
                <div class="profile-form-group">
                    <label>Company Name</label>
                    <input type="text" class="work-company" placeholder="e.g., ABC Hospital">
                </div>
                <div class="profile-form-group">
                    <label>Designation</label>
                    <input type="text" class="work-designation" placeholder="e.g., Biomedical Engineer">
                </div>
                <div class="profile-form-group">
                    <label>Start Date</label>
                    <input type="month" class="work-start">
                </div>
                <div class="profile-form-group">
                    <label>End Date</label>
                    <input type="month" class="work-end" placeholder="Leave empty if currently working">
                </div>
            </div>
            <div class="profile-form-group">
                <label>Job Description</label>
                <textarea class="work-description" rows="2" placeholder="Brief description of your responsibilities"></textarea>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', fieldHTML);
}

// Remove Work Experience Field
window.removeWorkExperience = function(index) {
    const field = document.querySelector(`[data-index="${index}"]`);
    if (field) {
        field.remove();
    }
}

// Load Work Experience Fields
function loadWorkExperience(experiences) {
    if (!experiences || experiences.length === 0) return;
    
    const container = document.getElementById('workExperienceContainer');
    container.innerHTML = '';
    
    experiences.forEach((exp, index) => {
        addWorkExperience();
        const field = container.children[index];
        field.querySelector('.work-company').value = exp.company || '';
        field.querySelector('.work-designation').value = exp.designation || '';
        field.querySelector('.work-start').value = exp.startDate || '';
        field.querySelector('.work-end').value = exp.endDate || '';
        field.querySelector('.work-description').value = exp.description || '';
    });
}

// Get Work Experience Data
function getWorkExperienceData() {
    const container = document.getElementById('workExperienceContainer');
    const experiences = [];
    
    container.querySelectorAll('.dynamic-field-container').forEach(field => {
        const company = field.querySelector('.work-company').value.trim();
        if (company) {
            experiences.push({
                company: company,
                designation: field.querySelector('.work-designation').value.trim(),
                startDate: field.querySelector('.work-start').value,
                endDate: field.querySelector('.work-end').value,
                description: field.querySelector('.work-description').value.trim()
            });
        }
    });
    
    return experiences;
}

// Check Authentication and Load Profile
onAuthStateChanged(auth, async (user) => {
    if (user) {
        await loadUserProfile(user);
    } else {
        window.location.href = 'index.html';
    }
});

// Load User Profile Data
async function loadUserProfile(user) {
    showLoading();
    
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Update profile header
            document.getElementById('profileName').textContent = userData.fullName || 'User';
            document.getElementById('profileMemberID').textContent = userData.memberID || 'N/A';
            
            // Update profile picture
            if (userData.profilePicture) {
                document.getElementById('profilePicture').src = userData.profilePicture;
            }
            
            // Fill form fields
            document.getElementById('fullName').value = userData.fullName || '';
            document.getElementById('email').value = user.email || '';
            document.getElementById('phone').value = userData.phone || '';
            document.getElementById('bloodGroup').value = userData.bloodGroup || '';
            document.getElementById('dateOfBirth').value = userData.dateOfBirth || '';
            document.getElementById('session').value = userData.session || '';
            document.getElementById('shift').value = userData.shift || '';
            document.getElementById('professionalTitle').value = userData.professionalTitle || '';
            document.getElementById('address').value = userData.address || '';
            
            // Social Media
            document.getElementById('facebook').value = userData.facebook || '';
            document.getElementById('linkedin').value = userData.linkedin || '';
            document.getElementById('twitter').value = userData.twitter || '';
            document.getElementById('instagram').value = userData.instagram || '';
            
            // Machine Skills
            document.getElementById('machineSkills').value = userData.machineSkills || '';
            
            // Work Experience
            loadWorkExperience(userData.workExperience);
            
            // Update status badges
            updateStatusBadges(user, userData);
        }
        // Load payment status
await loadPaymentStatus(user.uid);
        hideLoading();
        
    } catch (error) {
        console.error('Error loading profile:', error);
        hideLoading();
        showToast('Failed to load profile data', 'error');
    }
}

// Handle Profile Form Submission
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) return;
    
    showLoading();
    
    try {
        const profileData = {
            fullName: document.getElementById('fullName').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            bloodGroup: document.getElementById('bloodGroup').value,
            dateOfBirth: document.getElementById('dateOfBirth').value,
            session: document.getElementById('session').value,
            shift: document.getElementById('shift').value,
            professionalTitle: document.getElementById('professionalTitle').value.trim(),
            address: document.getElementById('address').value.trim(),
            facebook: document.getElementById('facebook').value.trim(),
            linkedin: document.getElementById('linkedin').value.trim(),
            twitter: document.getElementById('twitter').value.trim(),
            instagram: document.getElementById('instagram').value.trim(),
            machineSkills: document.getElementById('machineSkills').value.trim(),
            workExperience: getWorkExperienceData(),
            updatedAt: new Date().toISOString()
        };
        
        await updateDoc(doc(db, 'users', user.uid), profileData);
        
        // Update profile name in header
        document.getElementById('profileName').textContent = profileData.fullName;
        
        // Reload to update status badges
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            updateStatusBadges(user, userDoc.data());
        }
        
        hideLoading();
        showToast('Profile updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating profile:', error);
        hideLoading();
        showToast('Failed to update profile', 'error');
    }
});

// Handle Profile Picture Upload (Base64 - No Storage needed)
window.handleProfilePictureUpload = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
        showToast('Image size should be less than 500KB', 'error');
        return;
    }
    
    const user = auth.currentUser;
    if (!user) return;
    
    showLoading();
    
    try {
        // Resize and convert to base64
        const base64Image = await resizeImageToBase64(file, 413, 531);
        
        // Update Firestore with base64 image
        await updateDoc(doc(db, 'users', user.uid), {
            profilePicture: base64Image
        });
        
        // Update image on page
        document.getElementById('profilePicture').src = base64Image;
        
        // Update status badges
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            updateStatusBadges(user, userDoc.data());
        }
        
        hideLoading();
        showToast('Profile picture updated!', 'success');
        
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        hideLoading();
        showToast('Failed to upload picture', 'error');
    }
}

// Resize Image and Convert to Base64
function resizeImageToBase64(file, maxWidth, maxHeight) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Calculate aspect ratio
                const aspectRatio = width / height;
                const targetRatio = maxWidth / maxHeight;
                
                if (aspectRatio > targetRatio) {
                    width = maxWidth;
                    height = width / aspectRatio;
                } else {
                    height = maxHeight;
                    width = height * aspectRatio;
                }
                
                canvas.width = maxWidth;
                canvas.height = maxHeight;
                
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, maxWidth, maxHeight);
                
                const x = (maxWidth - width) / 2;
                const y = (maxHeight - height) / 2;
                
                ctx.drawImage(img, x, y, width, height);
                
                // Convert to base64 with compression
                const base64 = canvas.toDataURL('image/jpeg', 0.8);
                resolve(base64);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Resend Email Verification
window.resendVerification = async function() {
    event.preventDefault();
    
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        await sendEmailVerification(user);
        showToast('Verification email sent! Check your inbox.', 'success');
    } catch (error) {
        console.error('Error sending verification:', error);
        showToast('Failed to send verification email', 'error');
    }
}

// Handle Logout
window.handleLogout = async function() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await auth.signOut();
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Failed to logout', 'error');
        }
    }
}
// Open Payment Modal
window.openPaymentModal = function() {
    // Universal method that works with both Bootstrap 4 and 5
    $('#paymentModal').modal('show');
}

document.getElementById('paymentSubmissionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) return;
    
    const paymentMode = document.getElementById('paymentMode').value;
    const transactionNumber = document.getElementById('transactionNumber').value.trim();
    const paymentNote = document.getElementById('paymentNote').value.trim();
    
    if (!paymentMode || !transactionNumber) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    showLoading();
    
    try {
        // Get user data
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        // Create payment submission
        const paymentData = {
            userId: user.uid,
            memberName: userData.fullName,
            memberID: userData.memberID,
            email: userData.email,
            phone: userData.phone,
            session: userData.session,
            paymentMode: paymentMode,
            transactionNumber: transactionNumber,
            note: paymentNote,
            amount: 100,
            status: 'pending', // pending, approved, rejected
            submittedAt: new Date().toISOString(),
            approvedAt: null,
            approvedBy: null,
            verifiedAt: null,
            verifiedBy: null
        };
        
        // Save to Firestore
        await setDoc(doc(db, 'payments', user.uid), paymentData);
        
        // Update user document
        await updateDoc(doc(db, 'users', user.uid), {
            paymentSubmitted: true,
            paymentStatus: 'pending'
        });
        
        // Close modal using jQuery (works with Bootstrap 4 & 5)
        $('#paymentModal').modal('hide');
        
        // Update button
        updatePaymentButton('pending');
        
        // Clear form
        document.getElementById('paymentSubmissionForm').reset();
        
        hideLoading();
        showToast('Payment information submitted successfully!', 'success');
        
    } catch (error) {
        console.error('Error submitting payment:', error);
        hideLoading();
        showToast('Failed to submit payment information', 'error');
    }
});

// Update Payment Button Status
function updatePaymentButton(status) {
    const btn = document.getElementById('statusPaymentBtn');
    
    if (status === 'pending') {
        btn.className = 'status-badge status-payment-pending payment-trigger-btn';
        btn.innerHTML = '<i class="fas fa-clock"></i> Payment Pending';
        btn.onclick = null; // Disable click
    } else if (status === 'approved') {
        btn.className = 'status-badge status-payment-done';
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Payment Done';
        btn.onclick = null;
    } else if (status === 'rejected') {
        btn.className = 'status-badge status-payment-rejected payment-trigger-btn';
        btn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Payment Rejected - Resubmit';
        btn.onclick = openPaymentModal;
    } else {
        btn.className = 'status-badge status-inactive payment-trigger-btn';
        btn.innerHTML = '<i class="fas fa-credit-card"></i> Submit Payment';
        btn.onclick = openPaymentModal;
    }
}

// Load Payment Status on Page Load
async function loadPaymentStatus(userId) {
    try {
        const paymentDoc = await getDoc(doc(db, 'payments', userId));
        
        if (paymentDoc.exists()) {
            const paymentData = paymentDoc.data();
            updatePaymentButton(paymentData.status);
        }
    } catch (error) {
        console.error('Error loading payment status:', error);
    }
}