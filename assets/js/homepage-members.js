// Homepage Members Display
// File: assets/js/homepage-members.js

import { db } from './firebase-config.js';
import { 
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Load and Display Approved Members
async function loadApprovedMembers() {
    try {
        // Get all users from Firestore
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        
        const approvedMembers = [];
        
        querySnapshot.forEach((doc) => {
            const userData = doc.data();
            
            // Calculate overall status manually
            const paymentStatus = userData.paymentStatus || 'pending';
            const verificationStatus = userData.verificationStatus || 'pending';
            const overallStatus = (paymentStatus === 'approved' && verificationStatus === 'completed') ? 'approved' : 'pending';
            
            // Only add if approved
            if (overallStatus === 'approved') {
                approvedMembers.push({
                    id: doc.id,
                    ...userData,
                    overallStatus: overallStatus
                });
            }
        });
        
        // Sort by creation date (newest first)
        approvedMembers.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });
        
        console.log(`Found ${approvedMembers.length} approved members`);
        
        // Display members in the slider
        displayMembersInSlider(approvedMembers);
        
    } catch (error) {
        console.error('Error loading approved members:', error);
        // Show static content if error occurs
        console.log('Showing static content due to error');
        
        // Show error state in slider
        const sliderContainer = document.querySelector('.doctor-slider.slider');
        if (sliderContainer) {
            sliderContainer.innerHTML = `
                <div class="profile-widget">
                    <div style="text-align: center; padding: 60px 40px; color: #dc3545;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
                        <p style="margin: 0; font-size: 16px;">Failed to load members</p>
                        <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.7;">Please refresh the page</p>
                    </div>
                </div>
            `;
        }
    }
}

// Display Members in Slider
function displayMembersInSlider(members) {
    const sliderContainer = document.querySelector('.doctor-slider.slider');
    
    if (!sliderContainer) {
        console.error('Slider container not found');
        return;
    }
    
    // Destroy existing slick slider if initialized
    if (typeof $.fn.slick !== 'undefined' && $('.doctor-slider').hasClass('slick-initialized')) {
        $('.doctor-slider').slick('unslick');
    }
    
    // Clear existing content
    sliderContainer.innerHTML = '';
    
    if (members.length === 0) {
        sliderContainer.innerHTML = `
            <div class="profile-widget">
                <div style="text-align: center; padding: 60px 40px; color: #757575;">
                    <i class="fas fa-user-slash" style="font-size: 48px; opacity: 0.3; margin-bottom: 15px;"></i>
                    <p style="margin: 0; font-size: 16px;">No approved members yet</p>
                    <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.7;">Members will appear here after admin approval</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Generate member cards
    members.forEach(member => {
        const memberCard = createMemberCard(member);
        sliderContainer.innerHTML += memberCard;
    });
    
    // Reinitialize Slick slider if it exists
    if (typeof $.fn.slick !== 'undefined') {
        setTimeout(() => {
            $('.doctor-slider').slick({
                dots: false,
                autoplay: true,
                infinite: true,
                variableWidth: true,
                prevArrow: false,
                nextArrow: false,
                slidesToShow: 3,
                slidesToScroll: 1,
                responsive: [
                    {
                        breakpoint: 992,
                        settings: {
                            slidesToShow: 2
                        }
                    },
                    {
                        breakpoint: 768,
                        settings: {
                            slidesToShow: 1
                        }
                    }
                ]
            });
        }, 100);
    }
}

// Create Member Card HTML
function createMemberCard(member) {
    const profilePic = member.profilePicture || 
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(member.fullName || 'User')}&size=200&background=667eea&color=fff`;
    
    const fullName = member.fullName || 'N/A';
    const company = member.professionalTitle || 'Not specified';
    const session = member.session || 'N/A';
    const shift = member.shift || 'N/A';
    const address = member.address || 'Not provided';
    
    // Truncate address if too long
    const shortAddress = address.length > 50 ? address.substring(0, 50) + '...' : address;
    
    return `
        <div class="profile-widget">
            <div class="doc-img">
                <a href="javascript:void(0)">
                    <img class="img-fluid" alt="${fullName}" src="${profilePic}" 
                         onerror="this.src='https://ui-avatars.com/api/?name=User&size=200&background=667eea&color=fff'"
                         style="width: 100%; height: 250px; object-fit: cover;">
                </a>
                <a href="javascript:void(0)" class="fav-btn">
                    <i class="far fa-bookmark"></i>
                </a>
            </div>
            <div class="pro-content">
                <h3 class="title">
                    <a href="javascript:void(0)">${fullName}</a> 
                    <i class="fas fa-check-circle verified"></i>
                </h3>
                <p class="speciality">${company}</p>
                
                <ul class="available-info">
                    <li>
                        <i class="fas fa-graduation-cap"></i> Session: ${session}
                    </li>
                    <li>
                        <i class="fas fa-clock"></i> Shift: ${shift}
                    </li>
                    <li>
                        <i class="fas fa-map-marker-alt"></i> ${shortAddress}
                    </li>
                </ul>
                
                <div class="row row-sm">
                    <div class="col-12">
                        <a href="javascript:void(0)" class="btn view-btn btn-block" style="width: 100%;">
                            See More
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the homepage (index.html)
    const isHomepage = window.location.pathname.includes('index') || 
                       window.location.pathname === '/' ||
                       window.location.pathname.endsWith('.html') === false;
    
    if (isHomepage) {
        console.log('Loading approved members for homepage...');
        loadApprovedMembers();
    }
});

// Export for use in other files if needed
export { loadApprovedMembers };