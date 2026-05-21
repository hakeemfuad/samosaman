// Footer Component - Dynamically injected into all pages
(function () {
    const howItWorksModalHTML = `
    <div id="how-it-works-modal" class="fixed inset-0 z-[100] hidden">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onclick="toggleHowItWorks(false)"></div>
        <div class="relative flex min-h-full items-center justify-center p-4">
            <div
                class="relative w-full max-w-lg bg-white rounded-xl p-0 shadow-2xl transform transition-all overflow-hidden">

                <div class="bg-brand-600 p-8 text-center relative">
                    <button onclick="toggleHowItWorks(false)" class="absolute top-3 right-3 text-white/80 hover:text-white bg-transparent border-0 cursor-pointer text-2xl leading-none p-1" aria-label="Close">&times;</button>
                    <h3 class="font-oswald text-3xl font-bold uppercase text-white mb-2">Samosa Math 101</h3>
                    <p class="text-brand-100 font-medium">Class is in session. Don't worry, it's tasty.</p>
                </div>

                <div class="p-8 space-y-8">

                    <div class="flex gap-5">
                        <div
                            class="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-2xl">
                            &#x1F44B;</div>
                        <div>
                            <h4 class="font-oswald text-xl font-bold text-slate-900 uppercase">1. The Welcome High-Five
                            </h4>
                            <p class="text-slate-600 text-sm mt-1 leading-relaxed">
                                Join the Clan, get <span class="font-bold text-brand-600">1,250 points</span> instantly.
                                That equates to <span class="font-bold text-brand-600">1 Free Apple Pie Samosa</span>. Instant
                                gratification is kinda our thing.
                            </p>
                        </div>
                    </div>

                    <div class="flex gap-5">
                        <div
                            class="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-2xl">
                            &#x1F504;</div>
                        <div>
                            <h4 class="font-oswald text-xl font-bold text-slate-900 uppercase">2. The Crunch Cycle</h4>
                            <p class="text-slate-600 text-sm mt-1 leading-relaxed">
                                Every cent you spend on qualifying food becomes <span class="font-bold text-brand-600">1 point</span>.
                                Save up for free samosas, curry bowls, and future snack-powered victories. It's the circle of life,
                                but crunchier.
                            </p>
                        </div>
                    </div>

                    <div class="flex gap-5">
                        <div
                            class="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                            &#x1F48E;</div>
                        <div>
                            <h4 class="font-oswald text-xl font-bold text-slate-900 uppercase">3. The Infinite Glitch
                            </h4>
                            <p class="text-slate-600 text-sm mt-1 leading-relaxed">
                                Redeem your points from the Rewards Exchange, add the reward to your order, and keep rolling. Basically, if you try hard enough, you
                                can unlock an infinite samosa glitch.
                            </p>
                        </div>
                    </div>

                    <div class="pt-4">
                        <button onclick="toggleHowItWorks(false)"
                            class="w-full bg-slate-900 text-white font-oswald font-bold uppercase tracking-wide py-3 rounded hover:bg-slate-800 transition-colors">
                            Got It. Let's Eat.
                        </button>
                    </div>

                </div>

            </div>
        </div>
    </div>
    `;

    const footerHTML = `
        <footer class="bg-white border-t border-gray-200 pt-16 pb-10 px-5 font-sans text-[#451400]">
            <div class="max-w-[1200px] mx-auto flex flex-col md:flex-row flex-wrap justify-between gap-10">

                <!-- First row on mobile: Combined Links + Join Rewards side by side -->
                <div class="flex flex-row justify-between gap-6 w-full md:w-auto md:flex-row md:gap-10 md:min-w-[400px]">

                    <div class="flex flex-col md:flex-row gap-6 md:gap-12 flex-1">
                        <!-- Column 1: Core Links -->
                        <div class="flex flex-col gap-3">
                            <a href="#" class="text-sm font-extrabold uppercase tracking-wide hover:underline">Contact Support</a>
                            <a href="#" class="text-sm font-extrabold uppercase tracking-wide hover:underline">Careers</a>
                        </div>

                        <!-- Column 2: Additional Links -->
                        <div class="flex flex-col gap-2">
                            <a href="our-story.html" class="text-xs font-medium hover:underline">Our Values</a>
                            <a href="#" class="text-xs font-medium hover:underline">News & Events</a>
                            <a href="#" class="text-xs font-medium hover:underline">Health & Safety</a>
                            <a href="burlington.html" class="text-xs font-medium hover:underline">All Locations</a>
                            <a href="#" class="text-xs font-medium hover:underline">Sustainability</a>
                        </div>
                    </div>

                    <!-- Join Rewards - visible on mobile only in this position -->
                    <div class="text-center md:hidden min-w-[120px]">
                        <img src="assets/rewards.svg" alt="Rewards Logo" class="w-12 h-auto mx-auto mb-2 block">
                        <h3 class="text-sm font-extrabold uppercase tracking-wider mb-1">Join Rewards</h3>
                        <p class="text-[10px] text-gray-600 mb-2 leading-tight">Earn points towards free food</p>
                        <a href="rewards-signup.html"
                            class="inline-block bg-[#451400] text-white font-bold text-[10px] uppercase px-4 py-2 rounded-full hover:bg-[#6d2000] transition-colors mb-1">
                            Join Now
                        </a>
                        <button onclick="toggleHowItWorks(true)" class="block text-[10px] font-semibold underline hover:text-gray-600 bg-transparent border-0 cursor-pointer mx-auto">
                            Learn More
                        </button>
                    </div>
                </div>

                <!-- Join Rewards - visible on desktop only -->
                <div class="hidden md:flex flex-1 justify-end mt-6 md:mt-0">
                    <div class="text-center max-w-[300px]">
                        <img src="assets/rewards.svg" alt="Rewards Logo" class="w-16 h-auto mx-auto mb-4 block">
                        <h3 class="text-lg font-extrabold uppercase tracking-wider mb-1">Join Rewards</h3>
                        <p class="text-xs text-gray-600 mb-4">Earn points towards free food</p>
                        <a href="rewards-signup.html"
                            class="inline-block bg-[#451400] text-white font-bold text-xs uppercase px-6 py-2.5 rounded-full hover:bg-[#6d2000] transition-colors mb-2">
                            Join Now
                        </a>
                        <button onclick="toggleHowItWorks(true)" class="block text-[11px] font-semibold underline hover:text-gray-600 bg-transparent border-0 cursor-pointer mx-auto">
                            Learn More
                        </button>
                    </div>
                </div>
            </div>

            <div class="max-w-[1200px] mx-auto mt-16 pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">

                <div class="flex gap-3">
                    <a href="#"
                        class="h-9 px-3 border border-gray-300 rounded flex items-center justify-center text-[11px] font-bold hover:bg-gray-50 transition-colors">
                        Download on the App Store
                    </a>
                    <a href="#"
                        class="h-9 px-3 border border-gray-300 rounded flex items-center justify-center text-[11px] font-bold hover:bg-gray-50 transition-colors">
                        Get it on Google Play
                    </a>
                </div>

                <div class="text-center md:text-right">
                    <div class="flex justify-center md:justify-end gap-5 mb-3 text-lg">
                        <a href="https://www.instagram.com/samosamanvt/" target="_blank" rel="noopener noreferrer"
                            class="hover:text-gray-600 transition-colors">
                            <iconify-icon icon="mdi:instagram"></iconify-icon>
                        </a>
                        <a href="#" class="hover:text-gray-600 transition-colors">
                            <iconify-icon icon="mdi:twitter"></iconify-icon>
                        </a>
                        <a href="#" class="hover:text-gray-600 transition-colors">
                            <iconify-icon icon="mdi:facebook"></iconify-icon>
                        </a>
                    </div>
                    <p class="text-[10px] text-gray-500 mb-2">© 2026 Samosaman. All rights reserved.</p>
                    <div class="flex justify-center md:justify-end gap-4">
                        <a href="privacy-policy.html" class="text-[10px] text-gray-500 hover:underline">Privacy Policy</a>
                        <a href="#" class="text-[10px] text-gray-500 hover:underline">Terms of Use</a>
                        <a href="#" class="text-[10px] text-gray-500 hover:underline">Accessibility</a>
                    </div>
                </div>
            </div>
        </footer>
    `;

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectFooter);
    } else {
        injectFooter();
    }

    function injectFooter() {
        const placeholder = document.getElementById('footer-placeholder');
        if (placeholder) {
            placeholder.innerHTML = footerHTML;
        }

        if (!document.getElementById('how-it-works-modal')) {
            document.body.insertAdjacentHTML('beforeend', howItWorksModalHTML);
        }
    }

    window.toggleHowItWorks = function(show) {
        const modal = document.getElementById('how-it-works-modal');
        if (!modal) return;
        if (show) {
            modal.classList.remove('hidden');
        } else {
            modal.classList.add('hidden');
        }
    };
})();
