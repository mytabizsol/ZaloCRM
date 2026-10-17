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
    <v-card rounded="lg" class="mt-4">
      <v-card-title class="d-flex align-center flex-wrap ga-2">Nhật ký chạy thực tế
        <v-spacer />
        <v-btn variant="tonal" prepend-icon="mdi-refresh" @click="loadHistory">Làm mới</v-btn>
        <v-btn color="primary" prepend-icon="mdi-play" :loading="running" @click="confirmRun=true">Chạy quy tắc</v-btn>
      </v-card-title>
      <v-card-text>
        <v-alert variant="tonal" type="info" class="mb-3">Các quy tắc đang bật tự chạy lúc 08:15 hằng ngày. Mỗi khách/quy tắc chỉ tạo một cờ chăm sóc lại trong 7 ngày. Không tự gửi tin nhắn Zalo.</v-alert>
        <v-table density="compact"><thead><tr><th>Thời gian</th><th>Khách hàng</th><th>Quy tắc</th></tr></thead>
          <tbody><tr v-for="log in history" :key="log.id"><td>{{ new Date(log.createdAt).toLocaleString('vi-VN') }}</td><td>{{ log.details.contactName || log.entityId }}</td><td>{{ log.details.ruleName }}</td></tr></tbody>
        </v-table>
        <p v-if="!history.length" class="text-caption pa-4 text-medium-emphasis">Chưa có hành động Automation nào được ghi nhận.</p>
      </v-card-text>
    </v-card>
    <v-dialog v-model="confirmRun" max-width="430"><v-card><v-card-title>Chạy Automation ngay?</v-card-title>
      <v-card-text>Hệ thống tạo cờ chăm sóc lại cho khách phù hợp quy tắc đã lưu và đang bật. Không gửi tin nhắn. Anh có thể xem kết quả ở Nhật ký.</v-card-text>
      <v-card-actions><v-spacer /><v-btn @click="confirmRun=false">Hủy</v-btn><v-btn color="primary" :loading="running" @click="runRules">Xác nhận chạy</v-btn></v-card-actions>
    </v-card></v-dialog>
  </div>
</template>
<script setup lang="ts">
import { onMounted,ref } from 'vue';
import { api } from '@/api';
type Rule={id:string;name:string;enabled:boolean;stage:string;inactiveDays:number;action:'flag'};
type Result=Rule&{matchedContacts:number};
const rules=ref<Rule[]>([]),results=ref<Result[]>([]);
const loading=ref(false),saving=ref(false),message=ref(''),error=ref(false);
const running=ref(false),confirmRun=ref(false);
type HistoryItem={id:string;entityId:string|null;createdAt:string;details:{contactName?:string;ruleName?:string}};
const history=ref<HistoryItem[]>([]);
const stages=[{title:'Tất cả đang chăm sóc',value:'any'},{title:'Mới',value:'new'},{title:'Đã liên hệ',value:'contacted'},{title:'Quan tâm',value:'interested'}];
function addRule(){rules.value.push({id:crypto.randomUUID(),name:'Nhắc chăm sóc',enabled:false,stage:'any',inactiveDays:14,action:'flag'});}
async function load(){try{const r=await api.get('/automation/rules');rules.value=r.data.rules;}catch{message.value='Không tải được quy tắc';error.value=true;}}
async function save(){saving.value=true;message.value='';try{await api.put('/automation/rules',{rules:rules.value});message.value='Đã lưu quy tắc';error.value=false;}catch{message.value='Lưu thất bại: kiểm tra quyền quản trị và dữ liệu';error.value=true;}finally{saving.value=false;}}
async function preview(){loading.value=true;try{const r=await api.get('/automation/preview');results.value=r.data.results;error.value=false;}catch{message.value='Không mô phỏng được';error.value=true;}finally{loading.value=false;}}
async function loadHistory(){try{const {data}=await api.get('/automation/history');history.value=data.activities;}catch{message.value='Không tải được lịch sử';error.value=true;}}
async function runRules(){running.value=true;message.value='';try{const {data}=await api.post('/automation/run');error.value=false;message.value=`Đã tạo ${data.created} cờ chăm sóc, bỏ qua ${data.skipped} lần trùng.`;await loadHistory();}catch{error.value=true;message.value='Không thể chạy Automation';}finally{running.value=false;confirmRun.value=false;}}
onMounted(()=>{load();loadHistory();});
</script>