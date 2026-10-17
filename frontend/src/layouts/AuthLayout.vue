<template>
  <v-app class="liquid-bg">
    <v-main class="auth-main d-flex align-center justify-center">
      <v-container fluid class="auth-container mx-auto">
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.auth-main { min-height: 100dvh; min-width: 0; }
.auth-container { width: 100%; max-width: 450px; min-width: 0; padding: clamp(12px, 3vw, 24px); }
</style>
