// public/js/auth.js

// DOM Elements
const authModal = document.getElementById('auth-modal');
const authForm = document.getElementById('auth-form');
const modalTitle = document.getElementById('auth-modal-title');
const submitBtn = document.getElementById('auth-submit-btn');
const toggleText = document.getElementById('auth-toggle-text');
const errorMsg = document.getElementById('auth-error-message');
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const reqContainer = document.getElementById('password-requirements-container');

// Signup Specific Elements
const signupFields = document.querySelectorAll('.signup-only');
const fNameInput = document.getElementById('signup-fname');
const lNameInput = document.getElementById('signup-lname');
const mobileInput = document.getElementById('signup-mobile');
const birthdayInput = document.getElementById('signup-birthday');
const promoRadios = document.getElementsByName('signup-promo');
const confirmPasswordInput = document.getElementById('signup-confirm-password');

// Password Toggle Elements
const togglePasswordBtn = document.getElementById('toggle-password-btn');
const eyeOpenIcon = document.getElementById('eye-icon-open');
const eyeClosedIcon = document.getElementById('eye-icon-closed');

let isLoginMode = true;

// Toggle Modal Visibility
function toggleAuthModal(show) {
    if (show) {
        authModal.classList.remove('hidden');
        setTimeout(() => {
            document.getElementById('auth-backdrop').classList.remove('opacity-0');
            document.getElementById('auth-panel').classList.remove('opacity-0', 'translate-y-4');
        }, 10);
    } else {
        document.getElementById('auth-backdrop').classList.add('opacity-0');
        document.getElementById('auth-panel').classList.add('opacity-0', 'translate-y-4');
        setTimeout(() => authModal.classList.add('hidden'), 300);

        // Reset form state
        authForm.reset();
        errorMsg.classList.add('hidden');
        clearAllInputErrors();
        resetPasswordUI();

        // Reset Password Visibility
        if (passwordInput.type === 'text') togglePasswordVisibility();

        // Default back to login mode next time it opens
        if (!isLoginMode) switchAuthMode();
    }
}

// Password Visibility Toggle Logic
function togglePasswordVisibility() {
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeOpenIcon.classList.add('hidden');
        eyeClosedIcon.classList.remove('hidden');
    } else {
        passwordInput.type = 'password';
        eyeOpenIcon.classList.remove('hidden');
        eyeClosedIcon.classList.add('hidden');
    }
}

if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
}

// Switch between Login and Signup
function switchAuthMode() {
    isLoginMode = !isLoginMode;
    clearAllInputErrors();

    if (isLoginMode) {
        // --- LOGIN MODE ---
        modalTitle.innerText = "Welcome Back";
        submitBtn.innerText = "Sign In";
        toggleText.innerHTML = `New to the SamosaMan Clan®? <button type="button" onclick="switchAuthMode()" class="text-brand-600 font-bold hover:underline">Create Account</button>`;

        // Hide Signup Fields
        signupFields.forEach(el => el.classList.add('hidden'));
        reqContainer.classList.add('hidden');

    } else {
        // --- SIGNUP MODE ---
        modalTitle.innerHTML = "Join The SamosaMan Clan<sup>®</sup>";
        submitBtn.innerText = "Create Account";
        toggleText.innerHTML = `Already have an account? <button type="button" onclick="switchAuthMode()" class="text-brand-600 font-bold hover:underline">Sign In</button>`;

        // Show Signup Fields
        signupFields.forEach(el => el.classList.remove('hidden'));
        reqContainer.classList.remove('hidden');

        // Trigger validation immediately
        checkPasswordRequirements(passwordInput.value);
    }
}

// --- HELPER: CUSTOM VALIDATION UI ---
function showInputError(input, message) {
    // 1. Change Border Color
    input.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
    input.classList.remove('border-slate-300', 'focus:border-brand-500', 'focus:ring-brand-500');

    // 2. Show Error Message (Assuming p.error-message is the next element sibling or close by)
    // In our HTML structure, <p> is usually immediately after input or the wrapping div
    let parent = input.parentElement;
    let errorEl = parent.querySelector('.error-message');

    // If input is wrapped in a relative div (like password), we might need to go up or find sibling
    if (!errorEl) {
        // Try next sibling
        if (input.nextElementSibling && input.nextElementSibling.classList.contains('error-message')) {
            errorEl = input.nextElementSibling;
        }
        // Special case for password field which has a button sibling before the error message
        else if (parent.querySelector('.error-message')) {
            errorEl = parent.querySelector('.error-message');
        }
    }

    if (errorEl) {
        errorEl.innerText = message;
        errorEl.classList.remove('hidden');
    }
}

function clearInputError(input) {
    // 1. Reset Border Color
    input.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
    input.classList.add('border-slate-300', 'focus:border-brand-500', 'focus:ring-brand-500');

    // 2. Hide Error Message
    let parent = input.parentElement;
    let errorEl = parent.querySelector('.error-message');

    if (!errorEl) {
        if (input.nextElementSibling && input.nextElementSibling.classList.contains('error-message')) {
            errorEl = input.nextElementSibling;
        } else if (parent.querySelector('.error-message')) {
            errorEl = parent.querySelector('.error-message');
        }
    }

    if (errorEl) {
        errorEl.classList.add('hidden');
        errorEl.innerText = '';
    }
}

function clearAllInputErrors() {
    const inputs = authForm.querySelectorAll('input');
    inputs.forEach(input => clearInputError(input));
}

// --- VALIDATION LOGIC ---

function validateField(input) {
    const val = input.value.trim();

    // 1. Check Required
    // We enforce "Required" on:
    // - Email, Password (always)
    // - Fname, Lname, Mobile, Birthday, Confirm Password (only in signup mode)

    const isSignupField = input.closest('.signup-only') !== null;

    // If we are in Login Mode, skip validation for hidden signup fields
    if (isLoginMode && isSignupField) {
        clearInputError(input);
        return true;
    }

    if (!val) {
        showInputError(input, "This field is required.");
        return false;
    }

    // 2. Specific Format Checks
    if (input.type === 'email' && !/\S+@\S+\.\S+/.test(val)) {
        showInputError(input, "Please enter a valid email address.");
        return false;
    }

    if (input.id === 'signup-mobile' && val.length < 10) {
        showInputError(input, "Please enter a valid mobile number.");
        return false;
    }

    clearInputError(input);
    return true;
}

function validateConfirmPassword() {
    if (isLoginMode) return true;

    const pass = passwordInput.value;
    const confirm = confirmPasswordInput.value;

    if (!confirm) {
        showInputError(confirmPasswordInput, "This field is required.");
        return false;
    }

    if (pass !== confirm) {
        showInputError(confirmPasswordInput, "Passwords do not match.");
        return false;
    }

    clearInputError(confirmPasswordInput);
    return true;
}

// --- EVENT LISTENERS ---

// Confirm Password - Check on Blur (Exit field)
if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('blur', () => {
        validateConfirmPassword();
    });
    // Also clear error on input to feel responsive
    confirmPasswordInput.addEventListener('input', () => {
        if (confirmPasswordInput.classList.contains('border-red-500')) {
            validateConfirmPassword();
        }
    });
}

// Generic Blur Validation for other fields (to give immediate feedback)
const allInputs = authForm.querySelectorAll('input:not([type="hidden"]):not([type="submit"])');
allInputs.forEach(input => {
    if (input.id !== 'signup-confirm-password') {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => {
            // If error exists, try to clear it as they type
            if (input.classList.contains('border-red-500')) {
                validateField(input);
            }
        });
    }
});


// Password Validation Logic (Complexity)
function checkPasswordRequirements(password) {
    const rules = [
        { id: 'req-upper', valid: /[A-Z]/.test(password) },
        { id: 'req-lower', valid: /[a-z]/.test(password) },
        { id: 'req-num', valid: /[0-9]/.test(password) },
        { id: 'req-spec', valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
        { id: 'req-len', valid: password.length >= 8 }
    ];

    rules.forEach(rule => {
        const el = document.getElementById(rule.id);
        const icon = el.querySelector('.req-icon');

        if (rule.valid) {
            el.classList.add('text-green-700', 'font-bold');
            el.classList.remove('text-slate-400');
            icon.classList.remove('opacity-0', 'scale-0');
            icon.classList.add('opacity-100', 'scale-100');
        } else {
            el.classList.remove('text-green-700', 'font-bold');
            el.classList.add('text-slate-400');
            icon.classList.add('opacity-0', 'scale-0');
            icon.classList.remove('opacity-100', 'scale-100');
        }
    });
}

function resetPasswordUI() {
    const ids = ['req-upper', 'req-lower', 'req-num', 'req-spec', 'req-len'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        const icon = el.querySelector('.req-icon');
        if (el) {
            el.classList.remove('text-green-700', 'font-bold');
            el.classList.add('text-slate-400');
        }
        if (icon) icon.classList.add('opacity-0', 'scale-0');
    });
}

// Event Listener for typing password
passwordInput.addEventListener('input', (e) => {
    if (!isLoginMode) {
        checkPasswordRequirements(e.target.value);
    }
});

// Auto-Format Birthday (MM/DD/YYYY)
birthdayInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (val.length > 8) val = val.slice(0, 8);

    if (val.length > 4) {
        e.target.value = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
    } else if (val.length > 2) {
        e.target.value = `${val.slice(0, 2)}/${val.slice(2)}`;
    } else {
        e.target.value = val;
    }
});

// Enforce Mobile Number Format (Digits Only, max 11)
mobileInput.addEventListener('input', (e) => {
    // Remove non-digits
    let val = e.target.value.replace(/\D/g, '');

    // Limit to 11 digits
    if (val.length > 11) {
        val = val.slice(0, 11);
    }

    e.target.value = val;
});

// Handle Form Submission
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.classList.add('hidden');

    // --- 1. VALIDATION CHECK ---
    let isValid = true;

    // Validate all fields
    allInputs.forEach(input => {
        // Skip hidden fields (signup fields when in login mode)
        const isHidden = input.closest('.hidden');
        if (isHidden) return;

        if (input.id === 'signup-confirm-password') {
            if (!validateConfirmPassword()) isValid = false;
        } else if (input.type !== 'radio' && input.type !== 'checkbox') {
            if (!validateField(input)) isValid = false;
        }
    });

    if (!isValid) return; // Stop if validation fails

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="animate-pulse">Processing...</span>';

    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    try {
        if (isLoginMode) {
            // LOGIN
            await auth.signInWithEmailAndPassword(email, password);
        } else {
            // SIGNUP
            // Password Validation Check (Logic Constraint)
            if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password) || password.length < 8) {
                showInputError(passwordInput, "Please meet all password requirements.");
                throw new Error("Please meet all password requirements.");
            }

            // Collect New Data
            const fName = fNameInput.value.trim();
            const lName = lNameInput.value.trim();
            const mobile = mobileInput.value.trim();
            const birthday = birthdayInput.value.trim();

            // Get Radio Value
            let marketingOptIn = false;
            promoRadios.forEach(r => { if (r.checked && r.value === 'yes') marketingOptIn = true; });

            // Create User
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Update Profile & Save to Firestore
            await user.updateProfile({ displayName: `${fName} ${lName}` });

            await db.collection('users').doc(user.uid).set({
                firstName: fName,
                lastName: lName,
                email: email,
                mobile: mobile,
                birthday: birthday,
                marketingOptIn: marketingOptIn,
                rewardPoints: 100, // WELCOME BONUS APPLIED HERE
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Record Welcome Bonus in history
            await db.collection('users').doc(user.uid).collection('points_history').add({
                type: 'earn',
                points: 100,
                description: 'Welcome Bonus - Joined the SamosaMan Clan®',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        toggleAuthModal(false);
    } catch (error) {
        console.error(error);
        if (!error.message.includes("requirements")) {
            errorMsg.innerText = error.message.replace("Firebase: ", "");
            errorMsg.classList.remove('hidden');
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = isLoginMode ? "Sign In" : "Create Account";
    }
});

// Google Login
async function handleGoogleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        const userDoc = await db.collection('users').doc(user.uid).get();

        if (!userDoc.exists) {
            // Note: Google doesn't provide birthday/mobile usually, so we save what we can
            const names = user.displayName ? user.displayName.split(' ') : ['', ''];
            await db.collection('users').doc(user.uid).set({
                firstName: names[0] || '',
                lastName: names.slice(1).join(' ') || '',
                email: user.email,
                rewardPoints: 100, // WELCOME BONUS APPLIED HERE
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Record Welcome Bonus in history
            await db.collection('users').doc(user.uid).collection('points_history').add({
                type: 'earn',
                points: 100,
                description: 'Welcome Bonus - Joined the SamosaMan Clan®',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        toggleAuthModal(false);
    } catch (error) {
        console.error(error);
        errorMsg.innerText = error.message;
        errorMsg.classList.remove('hidden');
    }
}

// Auth State Listener
auth.onAuthStateChanged((user) => {
    const userBtn = document.getElementById('nav-user-btn');

    if (user) {
        if (userBtn) {
            // 1. Get First Name (or default to 'Me')
            const firstName = user.displayName ? user.displayName.split(' ')[0] : 'Me';

            // 2. Adjust Layout for Vertical Stacking
            userBtn.classList.remove('text-slate-500');
            userBtn.classList.add('text-slate-900', 'flex', 'flex-col', 'items-center', 'justify-center', 'gap-0.5', 'leading-none');

            // 3. Render Icon + Name
            userBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span class="text-[10px] font-bold uppercase tracking-wide">${firstName}</span>
            `;

            // Redirect to rewards on click
            userBtn.onclick = () => window.location.href = 'myaccount.html';
        }
    } else {
        if (userBtn) {
            // 4. Reset Layout for Guest (Icon Only)
            userBtn.classList.remove('text-slate-900', 'flex', 'flex-col', 'items-center', 'justify-center', 'gap-0.5', 'leading-none');
            userBtn.classList.add('text-slate-500');

            userBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user w-6 h-6"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

            // Open Login Modal on click
            userBtn.onclick = () => toggleAuthModal(true);
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const userBtn = document.getElementById('nav-user-btn');
    if (userBtn && !auth.currentUser) {
        userBtn.onclick = (e) => { e.preventDefault(); toggleAuthModal(true); };
    }
});