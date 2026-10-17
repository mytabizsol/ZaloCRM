<template>
  <section class="settings-hub">
    <v-breadcrumbs :items="breadcrumbs" class="px-0 mb-1" />
    <div class="d-flex flex-wrap align-start ga-4 mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Cài đặt</h1>
        <p class="text-body-1 text-medium-emphasis mt-2">
          Quản lý tổ chức, nhân sự, kết nối và chính sách vận hành của MYTA CRM.
        </p>
      </div>
    </div>

    <v-alert type="info" variant="tonal" class="mb-6" icon="mdi-shield-check-outline">
      Một số mục cần quyền Chủ sở hữu hoặc Quản trị viên. Trạng thái kết nối được xác nhận trong từng màn hình, không được suy diễn từ mục cài đặt này.
    </v-alert>

    <section aria-labelledby="settings-active-title">
      <h2 id="settings-active-title" class="text-h6 mb-3">Thiết lập đang sử dụng</h2>
      <v-row>
        <v-col v-for="item in displayedActiveItems" :key="item.to" cols="12" sm="6" lg="4">
          <v-card class="settings-card h-100 d-flex flex-column" rounded="xl">
            <v-card-item>
              <template #prepend><v-icon :icon="item.icon" color="primary" size="28" /></template>
              <v-card-title>{{ item.title }}</v-card-title>
              <v-card-subtitle>{{ item.subtitle }}</v-card-subtitle>
            </v-card-item>
            <v-card-text class="text-body-2 text-medium-emphasis flex-grow-1">{{ item.description }}</v-card-text>
            <v-card-actions class="px-4 pb-4">
              <v-btn :to="item.to" color="primary" variant="tonal" :aria-label="`Mở ${item.title}`">
                Mở cài đặt
                <v-icon end>mdi-arrow-right</v-icon>
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </section>

    <section class="mt-8" aria-labelledby="settings-future-title">
      <h2 id="settings-future-title" class="text-h6 mb-3">Đang chuẩn bị</h2>
      <v-row>
        <v-col v-for="item in futureItems" :key="item.to" cols="12" sm="6" lg="4">
          <v-card class="settings-card h-100 d-flex flex-column" rounded="xl">
            <v-card-item>
              <template #prepend><v-icon :icon="item.icon" color="secondary" size="28" /></template>
              <v-card-title class="d-flex align-center ga-2 flex-wrap">
                {{ item.title }}
                <v-chip size="x-small" color="secondary" variant="tonal">Sắp ra mắt</v-chip>
              </v-card-title>
            </v-card-item>
            <v-card-text class="text-body-2 text-medium-emphasis flex-grow-1">{{ item.description }}</v-card-text>
            <v-card-actions class="px-4 pb-4">
              <v-btn :to="item.to" variant="text" :aria-label="`Xem trạng thái ${item.title}`">Xem trạng thái</v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
const authStore = useAuthStore();
const breadcrumbs = [{ title: 'Tổng quan', to: '/' }, { title: 'Cài đặt', disabled: true }];

const activeItems = [
  { title: 'Tổ chức', subtitle: 'Công ty và thông tin chung', description: 'Cập nhật thông tin tổ chức đang sử dụng trong CRM.', icon: 'mdi-domain', to: '/settings/organization' },
  { title: 'Nhân sự & quyền', subtitle: 'Người dùng và đội nhóm', description: 'Mời, quản lý nhân sự, đội nhóm và các vai trò hiện có.', icon: 'mdi-account-group-outline', to: '/settings/users' },
  { title: 'Kết nối kênh', subtitle: 'Zalo, Meta, WhatsApp, TikTok', description: 'Kiểm tra trạng thái kết nối thực tế và quyền nhà cung cấp.', icon: 'mdi-connection', to: '/settings/connections' },
  { title: 'API & webhook', subtitle: 'Khóa API và điểm nhận sự kiện', description: 'Quản lý API key và cấu hình webhook của tổ chức.', icon: 'mdi-api', to: '/settings/api' },
  { title: 'Website Chat & biểu mẫu', subtitle: 'Widget và tên miền', description: 'Tạo widget, quản lý tên miền được phép và hội thoại website.', icon: 'mdi-message-text-fast-outline', to: '/settings/website' },
  { title: 'Tự động hóa', subtitle: 'Quy tắc chăm sóc', description: 'Cấu hình quy tắc nhắc chăm sóc; hệ thống không tự gửi tin nhắn.', icon: 'mdi-robot-outline', to: '/settings/automation' },
  { title: 'Bảo mật & nhật ký', subtitle: 'Kiểm tra hoạt động', description: 'Xem nhật ký hệ thống dành cho Chủ sở hữu và Quản trị viên.', icon: 'mdi-shield-lock-outline', to: '/settings/security', adminOnly: true },
];

const displayedActiveItems = computed(() => activeItems.filter(item => !('adminOnly' in item) || authStore.isAdmin));

const futureItems = [
  { title: 'Tài khoản cá nhân', description: 'Trang tự phục vụ cho hồ sơ, múi giờ và thông báo cá nhân chưa được triển khai.', icon: 'mdi-account-cog-outline', to: '/settings/personal' },
  { title: 'Giao diện & thương hiệu', description: 'Tùy biến giao diện theo tổ chức chưa sẵn sàng. MYTA CRM đang sử dụng nhận diện chính thức.', icon: 'mdi-palette-outline', to: '/settings/appearance' },
  { title: 'Gói, hạn mức & thanh toán', description: 'Chức năng thương mại chưa được triển khai; không có gói hoặc khoản phí nào được kích hoạt tại đây.', icon: 'mdi-credit-card-outline', to: '/settings/billing' },
];
</script>

<style scoped>
.settings-hub { max-width: 1440px; }
.settings-card { min-height: 230px; }
</style>
