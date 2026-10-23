// Footer Component - Dynamically injected into all pages
(function () {
    const footerHTML = `
        <footer class="bg-[#f5f5f7] px-5 font-sans text-[#424245]">
            <div class="mx-auto max-w-[980px] border-t border-[#d2d2d7]">
                <div class="grid grid-cols-2 gap-x-6 gap-y-7 py-8 text-center md:grid-cols-3 md:gap-10">
                    <nav aria-label="Explore SamosaMan" class="flex flex-col items-center text-xs">
                        <h3 class="flex min-h-[34px] items-center font-semibold">SamosaMan</h3>
                        <a href="our-story.html" class="flex min-h-[34px] items-center hover:underline">Our Values</a>
                        <a href="burlington.html" class="flex min-h-[34px] items-center hover:underline">All Locations</a>
                    </nav>

                    <div class="flex flex-col items-center text-xs">
                        <a href="https://www.instagram.com/samosamanvt/" target="_blank" rel="noopener noreferrer"
                            class="flex min-h-[34px] items-center font-semibold hover:underline">Connect with us</a>
                        <a href="https://www.instagram.com/samosamanvt/" target="_blank" rel="noopener noreferrer"
                            class="flex min-h-[34px] items-center gap-2 hover:underline" aria-label="Instagram">
                            <iconify-icon icon="mdi:instagram" class="text-base" aria-hidden="true"></iconify-icon>
                            Instagram
                        </a>
                    </div>

                    <div class="col-span-2 flex flex-col items-center text-xs md:col-span-1">
                        <h3 class="flex min-h-[34px] items-center justify-center gap-2 font-semibold">
                            <img src="assets/rewards.svg" alt="" class="w-7 h-auto" aria-hidden="true">
                            Join Rewards
                        </h3>
                        <p class="mt-1 text-[#6e6e73]">Earn points towards free food</p>
                        <a href="rewards-signup.html"
                            class="mt-3 inline-flex min-h-[34px] items-center justify-center rounded-full bg-[#451400] px-5 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-[#6d2000]">
                            Join Now
                        </a>
                    </div>
                </div>

                <div class="flex flex-col items-center justify-center gap-1 border-t border-[#d2d2d7] py-4 text-center text-[11px] text-[#6e6e73] md:flex-row md:gap-6">
                    <p>© 2026 Samosaman. All rights reserved.</p>
                    <nav aria-label="Legal" class="flex flex-wrap items-center justify-center gap-x-3">
                        <a href="privacy-policy.html" class="flex min-h-[34px] items-center hover:underline">Privacy Policy</a>
                        <span aria-hidden="true" class="h-3 border-l border-[#d2d2d7]"></span>
                        <a href="privacy-policy.html" class="flex min-h-[34px] items-center hover:underline">Terms of Use</a>
                        <span aria-hidden="true" class="h-3 border-l border-[#d2d2d7]"></span>
                        <a href="privacy-policy.html" class="flex min-h-[34px] items-center hover:underline">Accessibility</a>
                    </nav>
                </div>
            </div>
        </footer>
    `;

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
    }
})();
