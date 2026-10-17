<template>
  <div class="pa-3">
    <div class="d-flex align-center mb-4"><div><h1 class="text-h5">Workflow Automation</h1><p class="text-body-2 text-medium-emphasis">Quy tắc nhắc chăm sóc lại khách hàng — không tự gửi tin nhắn</p></div><v-spacer/><v-btn color="primary" :loading="saving" @click="save">Lưu cấu hình</v-btn></div>
    <v-alert v-if="message" :type="error?'error':'success'" class="mb-4" variant="tonal">{{ message }}</v-alert>
    <v-card class="mb-4" rounded="lg"><v-card-title>Quy tắc tự động</v-card-title><v-card-text>
      <v-row v-for="(rule,i) in rules" :key="rule.id" align="center">
        <v-col cols="12" md="3"><v-text-field v-model="rule.name" label="Tên quy tắc" density="compact" variant="outlined" hide-details /></v-col>
        <v-col cols="12" md="3"><v-select v-model="rule.stage" :items="stages" label="Trạng thái KH" density="compact" variant="outlined" hide-details /></v-col>
        <v-col cols="6" md="2"><v-text-field v-model.number="rule.inactiveDays" type="number" min="1" max="365" label="Số ngày" density="compact" variant="outlined" hide-details /></v-col>
        <v-col cols="4" md="2"><v-switch v-model="rule.enabled" label="Bật" hide-details color="primary" /></v-col>
        <v-col cols="2" md="2"><v-btn icon="mdi-delete-outline" variant="text" color="error" @click="rules.splice(i,1)" /></v-col>
      </v-row>
      <v-btn prepend-icon="mdi-plus" variant="outlined" :disabled="rules.length>=30" @click="addRule">Thêm quy tắc</v-btn>
    </v-card-text></v-card>
    <v-card rounded="lg"><v-card-title class="d-flex align-center">Mô phỏng kết quả <v-spacer/><v-btn variant="tonal" :loading="loading" @click="preview">Chạy thử</v-btn></v-card-title>
    <v-card-text><p class="text-caption mb-3">Chạy thử trên các quy tắc đã lưu và đang bật. Không thay đổi khách hàng, không gửi tin Zalo.</p>
      <v-table><thead><tr><th>Quy tắc</th><th>Giai đoạn</th><th>Không cập nhật</th><th>Số khách phù hợp</th></tr></thead>
        <tbody><tr v-for="item in results" :key="item.id"><td>{{ item.name }}</td><td>{{ item.stage }}</td><td>{{ item.inactiveDays }} ngày</td><td>{{ item.matchedContacts }}</td></tr></tbody></v-table>
    </v-card-text></v-card>
  </div>
</template>
<script setup lang="ts">
import { onMounted,ref } from 'vue';
import { api } from '@/api';
type Rule={id:string;name:string;enabled:boolean;stage:string;inactiveDays:number;action:'flag'};
type Result=Rule&{matchedContacts:number};
const rules=ref<Rule[]>([]),results=ref<Result[]>([]);
const loading=ref(false),saving=ref(false),message=ref(''),error=ref(false);
const stages=[{title:'Tất cả đang chăm sóc',value:'any'},{title:'Mới',value:'new'},{title:'Đã liên hệ',value:'contacted'},{title:'Quan tâm',value:'interested'}];
function addRule(){rules.value.push({id:crypto.randomUUID(),name:'Nhắc chăm sóc',enabled:false,stage:'any',inactiveDays:14,action:'flag'});}
async function load(){try{const r=await api.get('/automation/rules');rules.value=r.data.rules;}catch{message.value='Không tải được quy tắc';error.value=true;}}
async function save(){saving.value=true;message.value='';try{await api.put('/automation/rules',{rules:rules.value});message.value='Đã lưu quy tắc';error.value=false;}catch{message.value='Lưu thất bại: kiểm tra quyền quản trị và dữ liệu';error.value=true;}finally{saving.value=false;}}
async function preview(){loading.value=true;try{const r=await api.get('/automation/preview');results.value=r.data.results;error.value=false;}catch{message.value='Không mô phỏng được';error.value=true;}finally{loading.value=false;}}
onMounted(load);
</script>