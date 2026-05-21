(function () {
  const CART_KEY = 'samosaman_cart';
  const ACTIVE_REWARD_KEY = 'samosaman_active_reward';
  const BONUS_VERSION = 'rewards-v2-1250';

  const REWARD_ITEMS = {
    'apple-samosa': {
      id: 'apple-samosa',
      name: 'Apple Pie Samosa',
      image: 'assets/samosas/apple_samosa3.webp',
      originalPrice: 3.75,
      kind: 'samosa'
    },
    'punjabi-samosa': {
      id: 'punjabi-samosa',
      name: 'Traditional Punjabi Samosa',
      image: 'assets/samosas/traditional_punjabi_samosa.webp',
      originalPrice: 3.75,
      kind: 'samosa'
    },
    'steak-cheese': {
      id: 'steak-cheese',
      name: 'Steak & Cheese Samosa',
      image: 'assets/samosas/steakandcheese.webp',
      originalPrice: 3.75,
      kind: 'samosa'
    },
    'spicy-chicken': {
      id: 'spicy-chicken',
      name: 'Spicy Chicken Samosa',
      image: 'assets/samosas/spicy_chicken2.webp',
      originalPrice: 3.75,
      kind: 'samosa'
    },
    'chicken-cheese': {
      id: 'chicken-cheese',
      name: 'Chicken & Cheese Samosa',
      image: 'assets/samosas/chicken_cheese3.webp',
      originalPrice: 3.75,
      kind: 'samosa'
    },
    'steak-potato': {
      id: 'steak-potato',
      name: 'Steak & Potato Samosa',
      image: 'assets/samosas/steak_and_potato.webp',
      originalPrice: 3.75,
      kind: 'samosa'
    },
    'spicy-potato': {
      id: 'spicy-potato',
      name: 'Spicy Potato Samosa',
      image: 'assets/samosas/spicy_potato_samosa.webp',
      originalPrice: 3.75,
      kind: 'samosa'
    },
    'veggie-samosa': {
      id: 'veggie-samosa',
      name: 'Vegetarian Samosa',
      image: 'assets/samosas/veggie_samosa3.webp',
      originalPrice: 3.75,
      kind: 'samosa'
    },
    'reward-small-chicken-curry': {
      id: 'reward-small-chicken-curry',
      name: 'Small Chicken Curry Reward Meal',
      image: 'assets/chicken_curry.webp',
      originalPrice: 0,
      kind: 'meal',
      description: 'Rice and topping only'
    },
    'reward-small-chickpea-masala': {
      id: 'reward-small-chickpea-masala',
      name: 'Small Chickpea Masala Reward Meal',
      image: 'assets/chickpea_masala.webp',
      originalPrice: 0,
      kind: 'meal',
      description: 'Rice and topping only'
    }
  };

  const ALL_SAMOSA_IDS = [
    'apple-samosa',
    'punjabi-samosa',
    'steak-cheese',
    'spicy-chicken',
    'chicken-cheese',
    'steak-potato',
    'spicy-potato',
    'veggie-samosa'
  ];

  const REWARD_TIERS = [
    {
      id: 'apple-pie-samosa',
      title: 'Free Apple Pie Samosa',
      points: 1250,
      selectionLimit: 1,
      itemType: 'samosa',
      allowedItemIds: ['apple-samosa'],
      description: 'Redeem for one Apple Pie Samosa.'
    },
    {
      id: 'three-samosas',
      title: 'Free 3 Samosas',
      points: 3000,
      selectionLimit: 3,
      itemType: 'samosa',
      allowedItemIds: ALL_SAMOSA_IDS,
      description: 'Choose any three samosas.'
    },
    {
      id: 'small-curry-meal',
      title: 'Free Small Curry or Masala Meal',
      points: 6000,
      selectionLimit: 1,
      itemType: 'meal',
      allowedItemIds: ['reward-small-chicken-curry', 'reward-small-chickpea-masala'],
      description: 'Choose a small chicken curry or chickpea masala meal. Includes rice and topping only.'
    }
  ];

  function parseStoredJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn(`Unable to parse ${key}:`, error);
      return fallback;
    }
  }

  function getCart() {
    const cart = parseStoredJson(CART_KEY, []);
    return Array.isArray(cart) ? cart : [];
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    syncActiveRewardFromCart(cart);
    if (typeof window.updateCartBadge === 'function') window.updateCartBadge();
    if (typeof window.renderCartDrawer === 'function') window.renderCartDrawer();
  }

  function getTier(rewardId) {
    return REWARD_TIERS.find((tier) => tier.id === rewardId) || null;
  }

  function getItem(itemId) {
    return REWARD_ITEMS[itemId] || null;
  }

  function isRewardItem(item) {
    return Boolean(item && item.isReward === true && item.reward && item.reward.id);
  }

  function getPaidItems(cart = getCart()) {
    return cart.filter((item) => !isRewardItem(item));
  }

  function getRewardItems(cart = getCart()) {
    return cart.filter(isRewardItem);
  }

  function getPaidSubtotal(cart = getCart()) {
    return getPaidItems(cart).reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 0;
      return sum + (price * quantity);
    }, 0);
  }

  function removeRewardItems(cart = getCart()) {
    return cart.filter((item) => !isRewardItem(item));
  }

  function getActiveReward() {
    return parseStoredJson(ACTIVE_REWARD_KEY, null);
  }

  function setActiveReward(reward) {
    localStorage.setItem(ACTIVE_REWARD_KEY, JSON.stringify(reward));
  }

  function clearActiveReward() {
    localStorage.removeItem(ACTIVE_REWARD_KEY);
  }

  function syncActiveRewardFromCart(cart = getCart()) {
    const payload = buildRewardPayload(cart);
    if (payload) {
      setActiveReward(payload);
    } else {
      clearActiveReward();
    }
  }

  function countSelections(itemIds) {
    return itemIds.reduce((counts, itemId) => {
      counts[itemId] = (counts[itemId] || 0) + 1;
      return counts;
    }, {});
  }

  function buildRewardPayload(cart = getCart()) {
    const rewardItems = getRewardItems(cart);
    if (!rewardItems.length) return null;

    const rewardId = rewardItems[0].reward.id;
    const tier = getTier(rewardId);
    if (!tier) return null;

    const items = rewardItems.map((item) => ({
      itemId: item.reward.itemId,
      name: item.name,
      quantity: Number(item.quantity) || 0
    }));

    return {
      rewardId,
      title: tier.title,
      pointCost: tier.points,
      items
    };
  }

  function addRewardToCart(rewardId, selectedItemIds) {
    const tier = getTier(rewardId);
    if (!tier) return { ok: false, error: 'Unknown reward.' };

    const validSelected = selectedItemIds.filter((itemId) => tier.allowedItemIds.includes(itemId));
    if (validSelected.length !== tier.selectionLimit) {
      return { ok: false, error: 'Please complete your reward selections.' };
    }

    const counts = countSelections(validSelected);
    const rewardLines = Object.entries(counts).map(([itemId, quantity]) => {
      const item = getItem(itemId);
      return {
        id: `reward-${rewardId}-${itemId}`,
        name: item.name,
        price: 0,
        originalPrice: item.originalPrice,
        quantity,
        image: item.image,
        isReward: true,
        reward: {
          id: tier.id,
          title: tier.title,
          itemId: item.id,
          pointCost: tier.points,
          itemType: tier.itemType
        }
      };
    });

    const cart = removeRewardItems(getCart()).concat(rewardLines);
    saveCart(cart);
    setActiveReward(buildRewardPayload(cart));
    return { ok: true, reward: buildRewardPayload(cart) };
  }

  function clearRewardFromCart() {
    saveCart(removeRewardItems(getCart()));
    clearActiveReward();
  }

  async function applyWelcomeBonusUpgrade(user, userData) {
    if (!user || !window.db || !window.firebase || !userData) return userData;
    if (userData.rewardsBonusVersion === BONUS_VERSION) return userData;

    const currentPoints = Number(userData.rewardPoints) || 0;
    if (currentPoints !== 100) return userData;

    const userRef = window.db.collection('users').doc(user.uid);
    let upgraded = false;

    await window.db.runTransaction(async (transaction) => {
      const freshDoc = await transaction.get(userRef);
      const freshData = freshDoc.exists ? freshDoc.data() : {};
      const freshPoints = Number(freshData.rewardPoints) || 0;

      if (freshData.rewardsBonusVersion === BONUS_VERSION || freshPoints !== 100) {
        return;
      }

      transaction.set(userRef, {
        rewardPoints: window.firebase.firestore.FieldValue.increment(1150),
        rewardsBonusVersion: BONUS_VERSION
      }, { merge: true });

      const historyRef = userRef.collection('points_history').doc();
      transaction.set(historyRef, {
        type: 'earn',
        points: 1150,
        description: 'Welcome Bonus Upgrade - Free Apple Pie Samosa tier',
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
      });

      upgraded = true;
    });

    if (!upgraded) {
      const freshDoc = await userRef.get();
      return freshDoc.exists ? freshDoc.data() : userData;
    }

    return {
      ...userData,
      rewardPoints: currentPoints + 1150,
      rewardsBonusVersion: BONUS_VERSION
    };
  }

  window.SamosamanRewards = {
    CART_KEY,
    ACTIVE_REWARD_KEY,
    BONUS_VERSION,
    REWARD_ITEMS,
    REWARD_TIERS,
    ALL_SAMOSA_IDS,
    getCart,
    saveCart,
    getTier,
    getItem,
    isRewardItem,
    getPaidItems,
    getRewardItems,
    getPaidSubtotal,
    removeRewardItems,
    getActiveReward,
    clearActiveReward,
    syncActiveRewardFromCart,
    buildRewardPayload,
    addRewardToCart,
    clearRewardFromCart,
    applyWelcomeBonusUpgrade
  };
})();
