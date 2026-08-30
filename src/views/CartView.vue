<script setup>
import { ArrowLeft, ArrowRight, Package, ShieldCheck, ShoppingBag, Trash2 } from "@lucide/vue";
import { formatMoney, usePharmacyStore } from "../composables/usePharmacyStore";

const store = usePharmacyStore();
</script>

<template>
  <div class="page-width cart-page">
    <div class="page-heading-row">
      <div>
        <span class="eyebrow">Mock order</span>
        <h1>Your cart</h1>
      </div>
      <RouterLink class="text-link" to="/medications"><ArrowLeft :size="17" /> Continue browsing</RouterLink>
    </div>

    <div v-if="store.state.cart.length" class="cart-layout">
      <section class="cart-items" aria-label="Cart items">
        <article v-for="item in store.state.cart" :key="item.variantId" class="cart-item">
          <div class="cart-item-icon"><Package :size="27" /></div>
          <div class="cart-item-copy">
            <span class="generic-badge">Prescription required</span>
            <h2>{{ item.name }}</h2>
            <p>Generic for {{ item.genericFor }}</p>
            <span>{{ item.form }} · {{ item.strength }} · {{ item.quantity }} count</span>
          </div>
          <label class="quantity-control">
            <span>Qty</span>
            <select :value="item.units" :aria-label="`Quantity for ${item.name}`" @change="store.setCartUnits(item.variantId, $event.target.value)">
              <option :value="1">1</option>
              <option :value="2">2</option>
              <option :value="3">3</option>
            </select>
          </label>
          <div class="cart-item-price">
            <strong>{{ formatMoney(item.price * item.units) }}</strong>
            <span>Retail {{ formatMoney(item.retail * item.units) }}</span>
          </div>
          <button class="remove-button" type="button" :aria-label="`Remove ${item.name}`" @click="store.removeFromCart(item.variantId)"><Trash2 :size="19" /></button>
        </article>
        <div class="cart-prescription-note">
          <ShieldCheck :size="22" />
          <div><strong>No prescription to upload right now.</strong><p>During checkout, choose whether your prescription is already on file, will be sent by your provider, or should be transferred.</p></div>
        </div>
      </section>

      <aside class="order-summary" data-agent-section="cart-summary">
        <h2>Order summary</h2>
        <div><span>Medications ({{ store.cartCount }})</span><strong>{{ formatMoney(store.cartSubtotal) }}</strong></div>
        <div><span>Standard shipping</span><strong>{{ formatMoney(store.shipping) }}</strong></div>
        <div><span>Estimated tax</span><strong>$0.00</strong></div>
        <div class="summary-total"><span>Mock total</span><strong>{{ formatMoney(store.cartTotal) }}</strong></div>
        <p>Final fulfillment requires a valid prescription. This prototype never submits payment.</p>
        <RouterLink class="button button-orange button-wide" to="/checkout">Continue to checkout <ArrowRight :size="18" /></RouterLink>
        <span class="secure-caption"><ShieldCheck :size="15" /> Demo checkout · no real charge</span>
      </aside>
    </div>

    <div v-else class="empty-cart">
      <span class="empty-icon"><ShoppingBag :size="34" /></span>
      <h2>Your cart is waiting.</h2>
      <p>Search the mock catalog and choose a strength and quantity to continue.</p>
      <RouterLink class="button button-dark" to="/medications">Browse medications <ArrowRight :size="18" /></RouterLink>
    </div>
  </div>
</template>
