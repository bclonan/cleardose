<script setup>
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowRight, Check, LockKeyhole, ShieldCheck, Sparkles } from "@lucide/vue";
import { usePharmacyStore } from "../composables/usePharmacyStore";

const props = defineProps({ mode: { type: String, default: "login" } });
const route = useRoute();
const router = useRouter();
const store = usePharmacyStore();
const error = ref("");
const showPassword = ref(false);
const isCreate = computed(() => props.mode === "create");
const form = reactive({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
  dateOfBirth: "",
});

function destination() {
  return typeof route.query.next === "string" ? route.query.next : "/account";
}

function submit() {
  error.value = "";
  if (isCreate.value) {
    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.phone || !form.dateOfBirth) {
      error.value = "Complete each field to create the mock account.";
      return;
    }
    if (form.password.length < 8) {
      error.value = "Use at least 8 characters for the demo password.";
      return;
    }
    const result = store.createCustomer(form);
    if (!result.ok) error.value = result.message;
    else router.push(destination());
    return;
  }

  if (!form.email || !form.password) {
    error.value = "Enter an email and password.";
    return;
  }
  const result = store.authenticate(form.email, form.password);
  if (!result.ok) error.value = result.message;
  else router.push(destination());
}

function useDemoAccount() {
  form.email = "demo@patient.test";
  form.password = "demo1234";
  const result = store.authenticate(form.email, form.password);
  if (result.ok) router.push(destination());
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-visual-panel">
      <div class="auth-visual-copy">
        <span class="eyebrow"><Sparkles :size="17" /> Full customer sandbox</span>
        <h1 v-if="isCreate">One account.<br />Every prescription step.</h1>
        <h1 v-else>Welcome back<br />to the demo.</h1>
        <p>Explore realistic prescriptions, order history, profile data, and delivery status without entering real health information.</p>
        <ul>
          <li><Check :size="17" /> See prescription readiness</li>
          <li><Check :size="17" /> Complete a mock checkout</li>
          <li><Check :size="17" /> Track a placed order</li>
        </ul>
      </div>
      <div class="auth-privacy-note"><ShieldCheck :size="20" /><span><strong>Prototype-safe.</strong> Data stays in this browser and can be reset from the footer.</span></div>
    </div>

    <div class="auth-form-panel">
      <div class="auth-form-wrap">
        <span class="eyebrow">{{ isCreate ? 'Create a patient profile' : 'Patient sign in' }}</span>
        <h2>{{ isCreate ? 'Start your mock account' : 'Access your mock account' }}</h2>
        <p>{{ isCreate ? 'Please use fictional information in this prototype.' : 'Use the seeded patient below or an account you created.' }}</p>

        <button v-if="!isCreate" class="demo-account-button" type="button" @click="useDemoAccount">
          <span><Sparkles :size="18" /><strong>Enter as Jamie Rivera</strong><small>Preloaded prescriptions and one delivered order</small></span>
          <ArrowRight :size="19" />
        </button>

        <div v-if="!isCreate" class="form-divider"><span>or sign in manually</span></div>

        <form class="stacked-form" autocomplete="on" :aria-describedby="error ? 'auth-error' : undefined" @submit.prevent="submit">
          <div v-if="isCreate" class="form-row">
            <label for="auth-first-name">First name<input id="auth-first-name" v-model="form.firstName" name="given-name" autocomplete="given-name" required placeholder="Jamie" /></label>
            <label for="auth-last-name">Last name<input id="auth-last-name" v-model="form.lastName" name="family-name" autocomplete="family-name" required placeholder="Rivera" /></label>
          </div>
          <label for="auth-email">Email address<input id="auth-email" v-model="form.email" name="email" type="email" :autocomplete="isCreate ? 'email' : 'username'" required inputmode="email" placeholder="you@example.com" /></label>
          <label for="auth-password" class="password-field">
            Password
            <span><input id="auth-password" v-model="form.password" name="password" :type="showPassword ? 'text' : 'password'" :autocomplete="isCreate ? 'new-password' : 'current-password'" required minlength="8" placeholder="8+ characters" /><button type="button" :aria-pressed="showPassword" aria-controls="auth-password" @click="showPassword = !showPassword">{{ showPassword ? 'Hide' : 'Show' }}</button></span>
          </label>
          <div v-if="isCreate" class="form-row">
            <label for="auth-birthday">Date of birth<input id="auth-birthday" v-model="form.dateOfBirth" name="bday" type="date" autocomplete="bday" required /></label>
            <label for="auth-phone">Mobile phone<input id="auth-phone" v-model="form.phone" name="tel" type="tel" autocomplete="tel" required inputmode="tel" placeholder="410-555-0100" /></label>
          </div>
          <div v-if="error" id="auth-error" class="form-error" role="alert" aria-live="assertive">{{ error }}</div>
          <button class="button button-orange button-wide" type="submit">
            {{ isCreate ? 'Create mock account' : 'Sign in' }} <ArrowRight :size="18" />
          </button>
        </form>

        <p class="auth-switch">
          {{ isCreate ? 'Already have an account?' : 'New to the demo?' }}
          <RouterLink :to="isCreate ? '/login' : '/create-account'">{{ isCreate ? 'Sign in' : 'Create an account' }}</RouterLink>
        </p>
        <span class="secure-caption"><LockKeyhole :size="15" /> This is not a real authentication system.</span>
      </div>
    </div>
  </div>
</template>
