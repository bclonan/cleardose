<script setup>
import { ClipboardList, Package, Settings, UserRound } from "@lucide/vue";
</script>

<template>
  <aside class="account-sidebar" aria-label="Account navigation">
    <RouterLink to="/account"><UserRound :size="18" /> Overview</RouterLink>
    <RouterLink to="/account/prescriptions"><ClipboardList :size="18" /> Prescriptions</RouterLink>
    <RouterLink to="/account/orders"><Package :size="18" /> Orders</RouterLink>
    <a href="#profile"><Settings :size="18" /> Profile & delivery</a>
  </aside>
</template>
