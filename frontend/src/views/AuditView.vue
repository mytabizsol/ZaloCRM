<template>
  <div class="pa-3">
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <div><h1 class="text-h5 font-weight-bold">Nhật ký hệ thống</h1><p class="text-body-2 text-medium-emphasis">Xem hoạt động CRM và workflow theo tổ chức.</p></div>
      <v-spacer/><v-btn variant="tonal" :loading="loading" prepend-icon="mdi-refresh" @click="load">Làm mới</v-btn>
    </div>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-3">{{ error }}</v-alert>
    <v-card rounded="lg">
      <v-card-title class="d-flex ga-3 align-center flex-wrap">
        <v-text-field v-model="action" density="compact" variant="outlined" label="Lọc theo loại hành động" prepend-inner-icon="mdi-magnify" hide-details style="max-width:360px" @keydown.enter="load"/>
        <v-btn variant="outlined" @click="load">Lọc</v-btn><v-spacer/>
        <span class="text-caption">Tổng {{ total }} bản ghi</span>
      </v-card-title>
      <v-data-table :headers="headers" :items="entries" :loading="loading" :items-per-page="20">
        <template #item.createdAt="{item}">{{ new Date(item.createdAt).toLocaleString('vi-VN') }}</template>
        <template #item.actor="{item}">{{ item.user?.fullName || 'Hệ thống' }}</template>
        <template #item.details="{item}"><v-btn variant="text" size="small" @click="selected=item">Xem chi tiết</v-btn></template>
      </v-data-table>
      <v-card-text class="text-caption text-medium-emphasis">Hiển thị tối đa 100 hoạt động mới nhất theo bộ lọc. Chỉ Owner và Admin có quyền truy cập.</v-card-text>
    </v-card>
    <v-dialog :model-value="!!selected" max-width="660" @update:model-value="selected=null">
      <v-card v-if="selected" rounded="lg"><v-card-title>Chi tiết: {{ selected.action }}</v-card-title>
        <v-card-text><pre class="audit-json">{{ JSON.stringify(selected.details,null,2) }}</pre></v-card-text>
        <v-card-actions><v-spacer/><v-btn @click="selected=null">Đóng</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script setup lang="ts">
import { onMounted,ref } from 'vue';
import { api } from '@/api';
type Audit={id:string;action:string;entityType:string|null;entityId:string|null;createdAt:string;details:unknown;user:{fullName:string;email:string}|null};
const entries=ref<Audit[]>([]),loading=ref(false),error=ref(''),action=ref(''),total=ref(0),selected=ref<Audit|null>(null);
const headers=[{title:'Thời gian',key:'createdAt'},{title:'Hành động',key:'action'},{title:'Loại',key:'entityType'},{title:'ID đối tượng',key:'entityId'},{title:'Người thực hiện',key:'actor'},{title:'',key:'details',sortable:false}];
async function load(){loading.value=true;error.value='';try{const {data}=await api.get('/audit/logs',{params:{action:action.value,limit:100}});entries.value=data.entries;total.value=data.total;}catch{error.value='Không thể tải nhật ký. Chức năng chỉ dành cho Owner/Admin.';}finally{loading.value=false;}}
onMounted(load);
</script>
<style scoped>.audit-json{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;padding:12px;background:rgba(120,120,120,.08);border-radius:8px}</style>
