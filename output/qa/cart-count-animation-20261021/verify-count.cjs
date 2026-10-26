// Run the actual navbar count rendering and cart update code with local DOM/storage stubs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const navbarSource = fs.readFileSync('Website/public/js/navbar.js', 'utf8');
const cartSource = fs.readFileSync('Website/public/js/cart.js', 'utf8');
function page(initialCount, withBadge = true) {
    let count = initialCount;
    const writes = [];
    const storage = {getItem: () => JSON.stringify(count ? [{id:'qa-item', quantity:count, price:4.75}] : [])};
    const headerContext = vm.createContext({localStorage:storage,document:{body:{classList:{contains:()=>false}}},window:{},console});
    const end = navbarSource.indexOf('// 3. DEFINE CART DRAWER HTML');
    assert.ok(end > 0, 'Locate the real header render before drawer initialization');
    vm.runInContext(navbarSource.slice(0,end) + 'window.renderedNavbar = navbarHTML;})();',headerContext);
    const badgeMarkup = headerContext.window.renderedNavbar.match(/<span[^>]*id="cart-badge"[^>]*>[^<]*<\/span>/)[0];
    const classes = new Set(badgeMarkup.match(/class="([^"]*)"/)[1].split(/\s+/));
    let text = badgeMarkup.match(/>([^<]*)</)[1];
    let animationStarts = 0;
    let animationRemovals = 0;
    const badge = {
        hidden: initialCount === 0, offsetWidth:18,
        get textContent(){return text;},set textContent(value){text=String(value);writes.push(text);},
        get innerText(){return text;},set innerText(value){text=String(value);writes.push(text);},
        classList:{
            remove(name){if(name==='animate-pop')animationRemovals++;classes.delete(name);},
            add(name){if(name==='animate-pop')animationStarts++;classes.add(name);}
        }
    };
    const context=vm.createContext({window:{},document:{getElementById:()=>withBadge?badge:null,addEventListener(){}},localStorage:storage,console});
    vm.runInContext(cartSource,context);
    return {badge,classes,writes,badgeMarkup,update:()=>context.window.updateCartBadge(),setCount:value=>{count=value;},get starts(){return animationStarts;},get removals(){return animationRemovals;}};
}
const checks = {
    'saved count is visible without animation on page load'(){
        const p=page(2);assert.equal(p.classes.has('animate-pop'),false);p.update();assert.equal(p.starts,0);assert.equal(p.badge.hidden,false);
    },
    'page navigation and unchanged refresh do not animate'(){
        for(let navigation=0;navigation<3;navigation++){const p=page(2);p.update();p.update();assert.equal(p.starts,0);assert.equal(p.badge.textContent,'2');}
    },
    'increases animate once; duplicate refresh keeps the animation'(){
        const p=page(2);p.setCount(3);p.update();assert.equal(p.starts,1);const removals=p.removals;p.update();assert.equal(p.starts,1);assert.equal(p.removals,removals);assert.equal(p.classes.has('animate-pop'),true);assert.equal(p.writes.length,2);
    },
    'nonzero decreases animate'(){const p=page(3);p.setCount(2);p.update();assert.equal(p.starts,1);assert.equal(p.badge.textContent,'2');},
    'empty hides and clears animation; adding again animates'(){
        const p=page(1);p.setCount(2);p.update();p.setCount(0);p.update();assert.equal(p.badge.hidden,true);assert.equal(p.classes.has('animate-pop'),false);p.setCount(1);p.update();assert.equal(p.starts,2);assert.equal(p.badge.hidden,false);
    },
    'pages without a badge remain supported'(){page(2,false).update();}
};
let failures=0;
for(const [name,check] of Object.entries(checks)){try{check();console.log('PASS: '+name);}catch(error){failures++;console.log('FAIL: '+name+' — '+error.message);}}
if(failures)process.exitCode=1;
