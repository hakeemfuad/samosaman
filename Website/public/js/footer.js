// Footer Component - Dynamically injected into all pages
(function () {
    const footerHTML = `
        <footer class="bg-[#f5f5f7] px-5 font-sans text-[#424245]">
            <div class="mx-auto max-w-[980px] border-t border-[#d2d2d7]">
                <div class="grid grid-cols-2 gap-x-6 gap-y-7 py-8 text-center md:gap-10">
                    <nav aria-label="Social media" class="flex flex-col items-center text-xs text-[#424245]">
                        <h3 class="flex min-h-[34px] items-center font-semibold">Connect with us</h3>
                        <div class="flex flex-col items-start">
                            <a href="https://www.instagram.com/samosamanvt/" target="_blank" rel="noopener noreferrer"
                                class="inline-flex min-h-[34px] items-center gap-2 hover:underline" aria-label="Instagram">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" class="shrink-0" aria-hidden="true" focusable="false">
                                    <path fill="currentColor" d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4zm9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8A1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5a5 5 0 0 1-5 5a5 5 0 0 1-5-5a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3"/>
                                </svg>
                                Instagram
                            </a>
                            <a href="https://www.tiktok.com/@samosamanvt" target="_blank" rel="noopener noreferrer"
                                class="inline-flex min-h-[34px] items-center gap-2 hover:underline" aria-label="TikTok">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" class="shrink-0" aria-hidden="true" focusable="false">
                                    <path fill="currentColor" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02c.08 1.53.63 3.09 1.75 4.17c1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97c-.57-.26-1.1-.59-1.62-.93c-.01 2.92.01 5.84-.02 8.75c-.08 1.4-.54 2.79-1.35 3.94c-1.31 1.92-3.58 3.17-5.91 3.21c-1.43.08-2.86-.31-4.08-1.03c-2.02-1.19-3.44-3.37-3.65-5.71c-.02-.5-.03-1-.01-1.49c.18-1.9 1.12-3.72 2.58-4.96c1.66-1.44 3.98-2.13 6.15-1.72c.02 1.48-.04 2.96-.04 4.44c-.99-.32-2.15-.23-3.02.37c-.63.41-1.11 1.04-1.36 1.75c-.21.51-.15 1.07-.14 1.61c.24 1.64 1.82 3.02 3.5 2.87c1.12-.01 2.19-.66 2.77-1.61c.19-.33.4-.67.41-1.06c.1-1.79.06-3.57.07-5.36c.01-4.03-.01-8.05.02-12.07"/>
                                </svg>
                                TikTok
                            </a>
                        </div>
                    </nav>

                    <div class="flex flex-col items-center text-xs">
                        <h3 class="flex min-h-[34px] items-center justify-center gap-2 font-semibold">
                            <img src="assets/shared/rewards-96-937c3ca42340.webp" width="96" height="54"
                                alt="" class="w-7 h-auto" aria-hidden="true" loading="lazy" decoding="async">
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
                    <p>© 2026 SamosaMan. All rights reserved.</p>
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
