<template>
  <div class="pa-3">
    <div class="d-flex align-center mb-5"><div><h1 class="text-h5 font-weight-bold">Kết nối đa kênh</h1><div class="text-body-2 text-medium-emphasis">Zalo cá nhân, Zalo OA, Facebook, WhatsApp Business và TikTok</div></div><v-spacer/><v-btn color="primary" :loading="loading" prepend-icon="mdi-refresh" @click="load">Cập nhật</v-btn></div>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
    <v-alert type="info" variant="tonal" class="mb-4">Zalo OA, Facebook, WhatsApp và TikTok cần xác thực ứng dụng chính thức và phê duyệt quyền tương ứng. Chưa kết nối hoặc gửi dữ liệu ra các nền tảng này.</v-alert>
    <v-row>
      <v-col v-for="channel in channels" :key="channel.id" cols="12" sm="6" lg="4">
        <v-card rounded="lg" height="100%">
          <v-card-title class="d-flex align-center ga-2">{{ channel.name }}<v-spacer/><v-chip size="small" :color="channel.status==='configured'?'success':'warning'" variant="tonal">{{ channel.status==='configured'?'Có tài khoản':'Chờ kết nối' }}</v-chip></v-card-title>
          <v-card-text><div class="text-caption text-medium-emphasis mb-2">Khả năng dự kiến</div><v-chip v-for="cap in channel.capabilities" :key="cap" class="mr-1 mb-1" size="small" variant="outlined">{{ cap }}</v-chip>
            <p v-if="channel.accounts?.length" class="text-body-2 mt-2">{{ channel.accounts.length }} tài khoản Zalo đã đăng ký trong CRM</p>
          </v-card-text>
          <v-card-actions><v-btn v-if="channel.id==='zalo-personal'" to="/zalo-accounts" variant="tonal">Quản lý Zalo</v-btn><v-btn v-else variant="text" disabled>Chưa cấp quyền API</v-btn></v-card-actions>
        </v-card>
      </v-col>
    </v-row>
    <v-card rounded="lg" class="mt-5"><v-card-title class="d-flex align-center">Nhóm Zalo đã đồng bộ <v-spacer/><v-btn variant="tonal" size="small" @click="loadGroups">Quét danh sách đã có</v-btn></v-card-title>
      <v-card-text><p class="text-caption mb-3">Chỉ liệt kê các hội thoại nhóm đã được đồng bộ và tài khoản có quyền truy cập. Không thu thập thành viên ngoài quyền đã cấp.</p>
        <v-table density="compact"><thead><tr><th>Nhóm</th><th>Tài khoản</th><th>Tin chưa đọc</th><th>Hoạt động gần nhất</th><th></th></tr></thead>
        <tbody><tr v-for="g in groups" :key="g.id"><td>{{ g.contact?.fullName || g.externalThreadId || g.id }}</td><td>{{ g.zaloAccount.displayName }}</td><td>{{ g.unreadCount }}</td><td>{{ g.lastMessageAt?new Date(g.lastMessageAt).toLocaleString('vi-VN'):'—' }}</td><td><v-btn variant="text" size="small" to="/chat">Mở Chat</v-btn></td></tr></tbody></v-table>
        <p v-if="!groups.length" class="text-caption pa-4 text-medium-emphasis">Chưa có hội thoại nhóm nào được đồng bộ.</p>
      </v-card-text>
    </v-card>
  </div>
</template>
<script setup lang="ts">
import {ref,onMounted} from 'vue';
import {api} from '@/api';
type Channel={id:string;name:string;status:string;capabilities:string[];accounts?:{id:string}[]};
type Group={id:string;externalThreadId:string|null;lastMessageAt:string|null;unreadCount:number;contact:{fullName:string|null}|null;zaloAccount:{displayName:string|null;status:string}};
const channels=ref<Channel[]>([]),groups=ref<Group[]>([]),loading=ref(false),error=ref('');
async function load(){loading.value=true;error.value='';try{const {data}=await api.get('/channels/status');channels.value=data.channels;await loadGroups();}catch{error.value='Không thể tải trạng thái kênh.';}finally{loading.value=false;}}
async function loadGroups(){try{const {data}=await api.get('/channels/zalo-groups');groups.value=data.groups;}catch{error.value='Không thể đọc danh sách nhóm đã đồng bộ.';}}
onMounted(load);
</script>