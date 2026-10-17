<template>
  <section class="settings-placeholder" aria-labelledby="placeholder-title">
    <v-breadcrumbs :items="breadcrumbs" class="px-0 mb-1" />
    <v-card max-width="760" class="pa-2">
      <v-card-item>
        <template #prepend><v-icon :icon="icon" color="primary" size="32" /></template>
        <v-card-title id="placeholder-title" class="text-h5">{{ title }}</v-card-title>
        <v-card-subtitle>Chưa được triển khai</v-card-subtitle>
      </v-card-item>
      <v-card-text>
        <p class="text-body-1">{{ description }}</p>
        <v-alert type="info" variant="tonal" class="mt-5">
          Mục này được hiển thị để định hướng thông tin, không lưu hoặc thay đổi dữ liệu nào ở thời điểm hiện tại.
        </v-alert>
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-btn to="/settings" color="primary">Quay lại Cài đặt</v-btn>
      </v-card-actions>
    </v-card>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title: string; description: string; icon: string }>(), {
  icon: 'mdi-cog-outline',
});

const breadcrumbs = [{ title: 'Tổng quan', to: '/' }, { title: 'Cài đặt', to: '/settings' }, { title: 'Sắp ra mắt', disabled: true }];
</script>

<style scoped>
.settings-placeholder { max-width: 960px; }
</style>
