<template>
  <v-app :class="{ 'liquid-bg': isDark }">
    <v-app-bar density="comfortable" flat>
      <v-app-bar-nav-icon aria-label="Mở điều hướng" @click="drawer = !drawer" />

      <RouterLink to="/" class="brand-link d-flex align-center" aria-label="MYTA CRM - Tổng quan">
        <img src="/brand/myta-logo.png" class="brand-logo" alt="MYTA CRM" />
      </RouterLink>

      <GlobalSearch class="mx-4 d-none d-md-flex" />

      <v-spacer />

      <span v-if="authStore.user" class="text-body-2 mr-2 mr-sm-3 text-truncate user-name">
        {{ authStore.user.fullName }}
      </span>
      <NotificationBell />
      <v-btn icon variant="text" :aria-label="isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'" @click="toggleTheme">
        <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
      </v-btn>
      <v-btn icon variant="text" aria-label="Đăng xuất" @click="logout">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      :rail="rail && !mobile"
      :permanent="!mobile"
      :temporary="mobile"
      :width="300"
    >
      <div class="drawer-brand d-flex align-center px-4 py-4" :class="{ 'justify-center': rail && !mobile }">
        <img src="/brand/myta-logo.png" class="drawer-logo" alt="MYTA CRM" />
      </div>

      <v-divider />

      <v-list v-model:opened="openedGroups" density="comfortable" nav class="py-3" aria-label="Điều hướng chính">
        <v-list-group v-for="group in menuGroups" :key="group.key" :value="group.key">
          <template #activator="{ props }">
            <v-list-item
              v-bind="props"
              :prepend-icon="group.icon"
              :title="group.title"
              :active="activeGroupKey === group.key"
              rounded="lg"
              class="mx-2 mb-1"
            />
          </template>

          <v-list-item
            v-for="item in group.items"
            :key="item.title"
            :to="item.path"
            :disabled="item.future"
            :prepend-icon="item.icon"
            :title="item.title"
            :subtitle="item.future ? 'Sắp ra mắt' : undefined"
            rounded="lg"
            class="ml-4 mr-2 mb-1 nav-child"
            @click="closeMobileDrawer"
          />
        </v-list-group>
      </v-list>

      <template #append>
        <v-divider />
        <v-list density="comfortable" nav class="py-2">
          <v-list-item
            :prepend-icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
            :title="rail ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'"
            rounded="lg"
            class="mx-2"
            @click="rail = !rail"
          />
        </v-list>
      </template>
    </v-navigation-drawer>

    <v-main>
      <v-container fluid class="pa-4 pa-md-6">
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useTheme, useDisplay } from 'vuetify';
import { useAuthStore } from '@/stores/auth';
import { useRoute, useRouter } from 'vue-router';
import NotificationBell from '@/components/NotificationBell.vue';
import GlobalSearch from '@/components/GlobalSearch.vue';

type NavigationItem = { title: string; icon: string; path?: string; future?: boolean; adminOnly?: boolean };
type NavigationGroup = { key: string; title: string; icon: string; items: NavigationItem[] };

const theme = useTheme();
const { mobile } = useDisplay();
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const drawer = ref(true);
const rail = ref(false);
const openedGroups = ref<string[]>([]);
const isDark = ref(localStorage.getItem('theme') !== 'light');

const navigationGroups: NavigationGroup[] = [
  {
    key: 'overview', title: 'Tổng quan', icon: 'mdi-view-dashboard-outline',
    items: [{ title: 'Bảng điều khiển', icon: 'mdi-view-dashboard-outline', path: '/' }],
  },
  {
    key: 'customers', title: 'Khách hàng & Bán hàng', icon: 'mdi-account-group-outline',
    items: [
      { title: 'Khách hàng', icon: 'mdi-account-group-outline', path: '/contacts' },
      { title: 'Lead Scoring', icon: 'mdi-chart-bell-curve-cumulative', path: '/lead-scoring' },
      { title: 'Khách trùng', icon: 'mdi-account-multiple-check-outline', path: '/duplicate-review' },
      { title: 'Lịch hẹn', icon: 'mdi-calendar-clock-outline', path: '/appointments' },
      { title: 'Đơn hàng', icon: 'mdi-cart-outline', path: '/orders' },
    ],
  },
  {
    key: 'conversations', title: 'Hội thoại & Kênh', icon: 'mdi-message-text-outline',
    items: [
      { title: 'Hộp thư chung', icon: 'mdi-message-text-outline', path: '/chat' },
      { title: 'Kết nối đa kênh', icon: 'mdi-connection', path: '/channels' },
      { title: 'Tài khoản Zalo', icon: 'mdi-cellphone-link', path: '/zalo-accounts' },
      { title: 'Quét nhóm Zalo', icon: 'mdi-account-group', path: '/group-scan' },
      { title: 'Website Chat', icon: 'mdi-message-text-fast-outline', path: '/website-chat' },
    ],
  },
  {
    key: 'marketing', title: 'Marketing & Tự động hóa', icon: 'mdi-bullhorn-outline',
    items: [
      { title: 'Lịch đăng bài', icon: 'mdi-calendar-clock', path: '/social-publishing' },
      { title: 'Tự động hóa', icon: 'mdi-robot-outline', path: '/automation' },
      { title: 'Chatbot & Flow', icon: 'mdi-robot-happy-outline', future: true },
      { title: 'Chiến dịch', icon: 'mdi-send-outline', future: true },
    ],
  },
  {
    key: 'projects', title: 'Dự án', icon: 'mdi-briefcase-outline',
    items: [
      { title: 'Danh sách dự án', icon: 'mdi-format-list-bulleted', future: true },
      { title: 'Bảng công việc', icon: 'mdi-view-kanban-outline', future: true },
      { title: 'Mốc & nhiệm vụ', icon: 'mdi-flag-checkered', future: true },
    ],
  },
  {
    key: 'analytics', title: 'Phân tích & Báo cáo', icon: 'mdi-chart-box-outline',
    items: [{ title: 'Báo cáo', icon: 'mdi-chart-arc', path: '/reports' }],
  },
  {
    key: 'settings', title: 'Cài đặt', icon: 'mdi-cog-outline',
    items: [
      { title: 'Trung tâm cài đặt', icon: 'mdi-cog-outline', path: '/settings' },
      { title: 'Tổ chức', icon: 'mdi-domain', path: '/settings/organization' },
      { title: 'Nhân sự & quyền', icon: 'mdi-account-cog-outline', path: '/settings/users' },
      { title: 'API & webhook', icon: 'mdi-api', path: '/api-settings' },
      { title: 'Bảo mật & nhật ký', icon: 'mdi-shield-lock-outline', path: '/audit', adminOnly: true },
    ],
  },
];

const menuGroups = computed(() => navigationGroups.map(group => ({
  ...group,
  items: group.items.filter(item => !item.adminOnly || authStore.isAdmin),
})));

const activeGroupKey = computed(() => menuGroups.value.find(group => group.items.some(item => item.path && route.path === item.path))?.key);

function syncNavigation() {
  if (activeGroupKey.value && !openedGroups.value.includes(activeGroupKey.value)) {
    openedGroups.value = [activeGroupKey.value];
  }
}

function closeMobileDrawer() {
  if (mobile.value) drawer.value = false;
}

function toggleTheme() {
  isDark.value = !isDark.value;
  theme.global.name.value = isDark.value ? 'dark' : 'light';
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
}

function logout() {
  authStore.logout();
  router.push('/login');
}

onMounted(() => {
  theme.global.name.value = isDark.value ? 'dark' : 'light';
  drawer.value = !mobile.value;
  syncNavigation();
});

watch(() => route.path, syncNavigation);
watch(mobile, (isMobile) => { drawer.value = !isMobile; if (isMobile) rail.value = false; });
</script>

<style scoped>
.brand-link { min-width: 132px; text-decoration: none; }
.brand-logo { display: block; width: 124px; max-height: 36px; object-fit: contain; object-position: left center; }
.drawer-brand { min-height: 72px; }
.drawer-logo { display: block; width: 172px; max-height: 40px; object-fit: contain; object-position: left center; }
.user-name { max-width: 180px; }
.nav-child { min-height: 40px; }

@media (max-width: 599px) {
  .brand-logo { width: 106px; }
  .user-name { max-width: 108px; }
}
</style>
