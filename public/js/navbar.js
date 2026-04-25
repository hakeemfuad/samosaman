(function() {
    // 1. PRE-CALCULATE CART STATE
    let cartCount = 0;
    try {
        const cart = JSON.parse(localStorage.getItem('samosaman_cart') || '[]');
        cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    } catch (e) { console.error(e); }

    const badgeOpacity = 'opacity-100';
    const badgePop = cartCount > 0 ? 'animate-pop' : '';

    // 2. DEFINE NAVBAR HTML
    const navbarHTML = `
    <nav class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div class="md:px-6 flex h-20 max-w-[1400px] mr-auto ml-auto pr-4 pl-4 items-center justify-between relative z-50">
            <div class="flex items-center gap-10">
                <a href="index.html" class="flex items-center gap-2 group">
                    <img src="assets/yellow_heart.png" alt="Samosaman Logo" class="h-16 w-auto transition-transform duration-300 group-hover:scale-110">
                </a>
                <div class="hidden lg:flex items-center gap-8">
                    <a href="burlington.html" class="nav-link text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Menu</a>
                    <a href="delivery.html" class="nav-link text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Delivery</a>
                    <a href="rewards-signup.html" class="nav-link text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Rewards</a>
                    <a href="catering.html" class="nav-link text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Catering</a>
                    <a href="our-story.html" class="nav-link flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                        Our Story
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down w-4 h-4"><path d="m6 9 6 6 6-6"></path></svg>
                    </a>
                </div>
            </div>
            <div class="flex items-center gap-4 md:gap-6">
                <div class="hidden xl:flex flex-col items-end text-right leading-tight border-r border-slate-200 pr-6 mr-2">
                    <span id="location-label" class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Ordering Pickup?</span>
                    <a href="burlington.html" id="location-trigger" class="text-sm font-medium text-slate-900 hover:underline decoration-brand-500 underline-offset-4 flex items-center gap-1">
                        Select your location
                    </a>
                </div>

                <a href="burlington.html" class="hidden md:flex bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold py-3 px-6 rounded-md shadow-sm transition-all duration-200 transform active:scale-95 uppercase tracking-wide">Start Your Order</a>
                <div class="flex items-center gap-4 border-l border-slate-200 pl-6 h-8">
                    <button id="nav-user-btn" class="text-slate-500 hover:text-brand-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user w-6 h-6"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </button>
                    <button id="open-cart-btn" class="relative text-slate-500 hover:text-brand-600 transition-colors group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shopping-bag"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                        <span id="cart-badge" class="absolute -top-1 -right-1 bg-brand-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center transition-all duration-300 ${badgeOpacity} ${badgePop}">${cartCount}</span>
                    </button>
                    <button id="mobile-menu-btn" class="lg:hidden text-slate-900 transition-colors hover:text-brand-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-menu w-6 h-6"><path d="M4 5h16"></path><path d="M4 12h16"></path><path d="M4 19h16"></path></svg>
                    </button>
                </div>
            </div>
        </div>

        <div id="mobile-menu-overlay" class="fixed inset-0 bg-white z-40 transform translate-x-full transition-transform duration-300 lg:hidden pt-24 px-6 flex flex-col h-screen overflow-y-auto">
            <div class="flex flex-col gap-6">
                <a href="burlington.html" class="text-3xl font-oswald font-bold uppercase text-slate-900 border-b border-slate-100 pb-4 hover:text-brand-600 transition-colors">Menu</a>
                <a href="delivery.html" class="text-3xl font-oswald font-bold uppercase text-slate-900 border-b border-slate-100 pb-4 hover:text-brand-600 transition-colors">Delivery</a>
                <a href="rewards-signup.html" class="text-3xl font-oswald font-bold uppercase text-slate-900 border-b border-slate-100 pb-4 hover:text-brand-600 transition-colors">Rewards</a>
                <a href="catering.html" class="text-3xl font-oswald font-bold uppercase text-slate-900 border-b border-slate-100 pb-4 hover:text-brand-600 transition-colors">Catering</a>
                <a href="our-story.html" class="text-3xl font-oswald font-bold uppercase text-slate-900 border-b border-slate-100 pb-4 hover:text-brand-600 transition-colors">Our Story</a>
            </div>
            
            <div class="mt-8 flex flex-col gap-4">
                <a href="burlington.html" class="w-full bg-brand-600 text-white text-center font-bold py-4 rounded-md uppercase tracking-wide shadow-lg">Start Your Order</a>
                <button onclick="document.getElementById('nav-user-btn')?.click()" class="w-full bg-slate-100 text-slate-900 text-center font-bold py-4 rounded-md uppercase tracking-wide">My Account</button>
            </div>
        </div>
    </nav>`;

    // 3. DEFINE CART DRAWER HTML
    const cartDrawerHTML = `
    <div id="cart-overlay" class="fixed inset-0 bg-slate-900/60 z-[60] hidden opacity-0 transition-opacity duration-300 backdrop-blur-sm"></div>

    <div id="cart-sidebar" class="fixed top-0 right-0 h-full w-full sm:w-[500px] bg-[#fdfbf7] z-[70] shadow-2xl transform translate-x-full transition-transform duration-300 ease-in-out flex flex-col">
        <div class="p-6 border-b border-slate-200 flex items-center justify-between bg-white">
            <h2 class="font-oswald text-3xl font-bold uppercase text-slate-900">Your Order</h2>
            <button id="close-cart-btn" class="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="M6 6 18 18"/></svg>
            </button>
        </div>

        <div id="cart-items-container" class="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
        </div>

        <div id="cart-empty-state" class="absolute inset-0 flex flex-col items-center justify-center p-8 text-center hidden z-10 bg-[#fdfbf7] mt-20">

            <img src="assets/cart_empty.svg" alt="Your bag is empty" class="w-300 h-auto mb-8">

            <a href="burlington.html" class="w-full bg-[#3f2a1d] hover:bg-[#2a1c13] text-white font-oswald text-xl font-bold py-4 rounded-md uppercase tracking-wider shadow-md transition-all duration-200 active:scale-95 flex items-center justify-center">
                Order Now
            </a>
        </div>

        <div id="cart-footer" class="p-6 border-t border-slate-100 bg-white shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] relative z-20">
            <div class="space-y-3 mb-8">
                <div class="flex justify-between text-slate-600 text-lg"><span>Subtotal</span><span id="cart-subtotal" class="font-medium">$0.00</span></div>
                <div class="flex justify-between text-slate-600 text-lg"><span>Estimated Tax</span><span id="cart-tax" class="font-medium">$0.00</span></div>
                <div class="flex justify-between text-xl font-bold text-slate-900 pt-4 border-t border-slate-100 mt-4"><span>Total</span><span id="cart-total">$0.00</span></div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <button id="add-items-btn" class="w-full py-4 rounded-full border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors">
                    Add items
                </button>
                <button class="w-full py-4 rounded-full bg-brand-600 text-white font-bold hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0">
                    Check out
                </button>
            </div>
        </div>
    </div>`;

    // 4. DEFINE AUTH MODAL HTML
    // Updated: Added `novalidate`, Confirm Password, moved Requirements, added error msg placeholders
    const authModalHTML = `
    <div id="auth-modal" class="fixed inset-0 z-[100] hidden">
        <div id="auth-backdrop" class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity opacity-0 duration-300" onclick="toggleAuthModal(false)"></div>
        <div class="relative flex min-h-full items-center justify-center p-4">
            <div id="auth-panel" class="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-8 text-left shadow-2xl transition-all opacity-0 translate-y-4 duration-300 max-h-[90vh] overflow-y-auto scrollbar-hide">
                <button onclick="toggleAuthModal(false)" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                </button>
                <div class="text-center mb-6">
                    <img src="assets/m_logo.svg" alt="Samosaman" class="h-12 w-auto mx-auto mb-4">
                    <h2 id="auth-modal-title" class="font-oswald text-3xl font-bold text-slate-900 uppercase tracking-wide">Welcome Back</h2>
                    <p class="text-slate-500 text-sm mt-2">Sign in to your SamosaMan Clan® account so you can get rewards and order your favorites even faster.</p>
                </div>
                <div id="auth-error-message" class="hidden mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md font-medium text-center border border-red-100"></div>
                
                <form id="auth-form" class="space-y-5" novalidate>
                    
                    <div class="signup-only hidden space-y-4">
                        <div class="relative">
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">First Name</label>
                            <input type="text" id="signup-fname" class="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 py-3 px-4 bg-slate-50 border">
                            <p class="text-red-600 text-xs mt-1 hidden error-message"></p>
                        </div>
                        <div class="relative">
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Last Name</label>
                            <input type="text" id="signup-lname" class="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 py-3 px-4 bg-slate-50 border">
                            <p class="text-red-600 text-xs mt-1 hidden error-message"></p>
                        </div>
                    </div>

                    <div class="relative">
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                        <input type="email" id="auth-email" required class="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 py-3 px-4 bg-slate-50 border">
                        <p class="text-red-600 text-xs mt-1 hidden error-message"></p>
                    </div>

                    <div class="relative">
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                        <div class="relative">
                            <input type="password" id="auth-password" required minlength="8" class="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 py-3 pl-4 pr-10 bg-slate-50 border">
                            <button type="button" id="toggle-password-btn" class="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 focus:outline-none">
                                <svg id="eye-icon-open" class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                <svg id="eye-icon-closed" class="h-5 w-5 hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                            </button>
                        </div>
                        <p class="text-red-600 text-xs mt-1 hidden error-message"></p>
                    </div>

                    <div class="signup-only hidden relative">
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm Password</label>
                        <input type="password" id="signup-confirm-password" class="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 py-3 px-4 bg-slate-50 border">
                        <p class="text-red-600 text-xs mt-1 hidden error-message"></p>

                         <div id="password-requirements-container" class="hidden mt-4 pt-2 text-center border-t border-slate-100">
                            <p class="text-[10px] text-slate-400 mb-2 uppercase tracking-wide font-semibold">Create a password with these requirements:</p>
                            <div class="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
                                <div id="req-upper" class="flex flex-col items-center"><span class="text-xs">ABC</span><svg class="req-icon w-3 h-3 text-green-600 mt-1 opacity-0 transform scale-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                <div id="req-lower" class="flex flex-col items-center"><span class="text-xs">abc</span><svg class="req-icon w-3 h-3 text-green-600 mt-1 opacity-0 transform scale-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                <div id="req-num" class="flex flex-col items-center"><span class="text-xs">123</span><svg class="req-icon w-3 h-3 text-green-600 mt-1 opacity-0 transform scale-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                <div id="req-spec" class="flex flex-col items-center"><span class="text-xs">!@%</span><svg class="req-icon w-3 h-3 text-green-600 mt-1 opacity-0 transform scale-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                <div id="req-len" class="flex flex-col items-center"><span class="text-xs">8+</span><svg class="req-icon w-3 h-3 text-green-600 mt-1 opacity-0 transform scale-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                            </div>
                        </div>
                    </div>

                    <div class="signup-only hidden relative">
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile Number</label>
                        <input type="tel" id="signup-mobile" class="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 py-3 px-4 bg-slate-50 border">
                        <p class="text-red-600 text-xs mt-1 hidden error-message"></p>
                    </div>

                    <div class="signup-only hidden relative">
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Birthday MM/DD/YYYY</label>
                        <input type="text" id="signup-birthday" placeholder="MM/DD/YYYY" maxlength="10" class="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 py-3 px-4 bg-slate-50 border">
                        <p class="text-red-600 text-xs mt-1 hidden error-message"></p>
                    </div>

                    <div class="signup-only hidden relative">
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Receive text offers and promotions?*</label>
                        <div class="flex items-center gap-6">
                            <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="signup-promo" value="yes" class="w-4 h-4 text-brand-600 border-slate-300 focus:ring-brand-500"><span class="text-sm text-slate-700">Yes</span></label>
                            <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="signup-promo" value="no" class="w-4 h-4 text-brand-600 border-slate-300 focus:ring-brand-500"><span class="text-sm text-slate-700">No</span></label>
                        </div>
                    </div>
                    <button type="submit" id="auth-submit-btn" class="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-full shadow-lg shadow-brand-500/30 transition-all transform active:scale-95 uppercase tracking-wide mt-2">Sign In</button>
                </form>
                <div class="relative my-6"><div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-200"></div></div><div class="relative flex justify-center text-sm"><span class="bg-white px-2 text-slate-500">Or continue with</span></div></div>
                <button onclick="handleGoogleLogin()" class="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-full hover:bg-slate-50 transition-colors">
                    <svg class="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Google
                </button>
                <p id="auth-toggle-text" class="text-center text-slate-500 text-sm mt-8">New to the SamosaMan Clan®? <button type="button" onclick="switchAuthMode()" class="text-brand-600 font-bold hover:underline">Create Account</button></p>
            </div>
        </div>
    </div>`;

    // 5. INJECT HTML
    // Inject Nav
    const placeholder = document.getElementById('navbar-placeholder');
    if (placeholder) placeholder.innerHTML = navbarHTML;

    // Inject Auth Modal (if not present)
    if (!document.getElementById('auth-modal')) {
        document.body.insertAdjacentHTML('beforeend', authModalHTML);
    }

    // Inject Cart Drawer (if not present)
    if (!document.getElementById('cart-sidebar')) {
        document.body.insertAdjacentHTML('beforeend', cartDrawerHTML);
    }

    // 6. UPDATE LOCATION IF SELECTED
    try {
        const storedLoc = localStorage.getItem('samosaman_location');
        if (storedLoc) {
            const locData = JSON.parse(storedLoc);
            const trigger = document.getElementById('location-trigger');
            const label = document.getElementById('location-label');
            
            if (trigger && label) {
                label.innerText = "Ordering From";
                trigger.classList.add('font-bold', 'text-brand-600', 'flex', 'items-center', 'gap-1');
                trigger.classList.remove('text-slate-900');
                
                trigger.innerHTML = `
                    ${locData.city}, ${locData.state} 
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                `;
            }
        }
    } catch (e) {
        console.error("Error parsing location:", e);
    }

    // 7. HIGHLIGHT ACTIVE LINK
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const links = placeholder ? placeholder.querySelectorAll('.nav-link') : [];
    links.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.remove('font-medium', 'text-slate-600', 'hover:text-slate-900');
            link.classList.add('font-bold', 'text-brand-600');
        }
    });

    // 8. INITIALIZE ICONS
    if (window.lucide) window.lucide.createIcons();

    // 9. HOOK EVENTS
    const cartBtn = document.getElementById('open-cart-btn');
    if (cartBtn && typeof openCart === 'function') {
        cartBtn.addEventListener('click', (e) => { e.preventDefault(); openCart(); });
    }

    // NEW: Mobile Menu Logic
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu-overlay');

    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Check if menu is currently hidden (has translate-x-full)
            const isClosed = mobileMenu.classList.contains('translate-x-full');

            if (isClosed) {
                // Open Menu
                mobileMenu.classList.remove('translate-x-full');
                document.body.style.overflow = 'hidden'; // Prevent background scrolling
                // Switch icon to X
                mobileBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="M6 6 18 18"/></svg>`;
            } else {
                // Close Menu
                mobileMenu.classList.add('translate-x-full');
                document.body.style.overflow = '';
                // Switch icon back to Menu
                mobileBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-menu w-6 h-6"><path d="M4 5h16"></path><path d="M4 12h16"></path><path d="M4 19h16"></path></svg>`;
            }
        });
    }

    firebase.auth().onAuthStateChanged((user) => {
    const rewardsLinks = document.querySelectorAll('a[href="rewards-signup.html"], a[href="rewards.html"], a[href="myaccount.html"]');
    rewardsLinks.forEach(link => {
        // If user is logged in, go to Account Dashboard. If not, go to Signup page.
        link.href = user ? 'myaccount.html' : 'rewards-signup.html';
    });

    // Update user button to go to account page
    const userBtn = document.getElementById('nav-user-btn');
    if (userBtn && user) {
        userBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'myaccount.html';
        });
    }
});

})();