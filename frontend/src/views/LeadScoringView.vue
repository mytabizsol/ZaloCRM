<template>
  <div class="pa-2">
    <div class="d-flex flex-wrap align-center mb-5 ga-3">
      <div><h1 class="text-h5 font-weight-bold">Lead Scoring</h1><p class="text-body-2 text-medium-emphasis">Xếp hạng khách hàng theo mức độ ưu tiên chăm sóc</p></div>
      <v-spacer />
      <v-btn prepend-icon="mdi-refresh" color="primary" :loading="loading" @click="load">Làm mới</v-btn>
    </div>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
    <v-row class="mb-3">
      <v-col cols="12" sm="4"><v-card rounded="lg" class="pa-4"><div class="text-medium-emphasis">Khách hàng được phân tích</div><div class="text-h4 font-weight-bold mt-2">{{ total }}</div></v-card></v-col>
      <v-col cols="12" sm="4"><v-card rounded="lg" class="pa-4"><div class="text-medium-emphasis">Cần chăm sóc lại</div><div class="text-h4 font-weight-bold mt-2">{{ stalled }}</div></v-card></v-col>
      <v-col cols="12" sm="4"><v-card rounded="lg" class="pa-4"><div class="text-medium-emphasis">Lead nóng trong danh sách</div><div class="text-h4 font-weight-bold mt-2">{{ hotCount }}</div></v-card></v-col>
    </v-row>
    <v-card rounded="lg">
      <v-card-title class="d-flex flex-wrap ga-3 align-center">
        <v-text-field v-model="keyword" label="Tìm tên hoặc số điện thoại" variant="outlined" density="compact" hide-details prepend-inner-icon="mdi-magnify" style="max-width:300px" />
        <v-select v-model="category" :items="categories" label="Phân loại" variant="outlined" density="compact" hide-details style="max-width:185px" />
        <v-switch v-model="onlyStalled" label="Chỉ khách đình trệ" color="primary" hide-details density="compact" />
      </v-card-title>
      <v-data-table :items="filtered" :headers="headers" :loading="loading" :items-per-page="10" item-value="id">
        <template #item.score="{ item }"><div class="d-flex align-center ga-2" style="min-width:125px"><v-progress-linear :model-value="item.score" :color="scoreColor(item.score)" height="8" rounded style="width:75px"/><strong>{{ item.score }}</strong></div></template>
        <template #item.category="{ item }"><v-chip size="small" :color="scoreColor(item.score)" variant="tonal">{{ categoryLabel(item.category) }}</v-chip></template>
        <template #item.stalled="{ item }"><v-chip v-if="item.stalled" color="warning" size="small" variant="tonal">{{ item.daysSinceUpdate }} ngày</v-chip><span v-else class="text-medium-emphasis">{{ item.daysSinceUpdate }} ngày</span></template>
        <template #item.actions="{ item }"><v-btn size="small" variant="text" prepend-icon="mdi-chart-bar" @click="selected=item">Giải thích</v-btn></template>
      </v-data-table>
      <v-card-text class="text-caption text-medium-emphasis">Điểm dựa trên trạng thái, số cuộc hội thoại, lịch hẹn và mức độ cập nhật; không phải xác suất chốt đơn. Dữ liệu được giới hạn 2.000 khách cập nhật gần nhất.</v-card-text>
    </v-card>
    <v-dialog :model-value="!!selected" max-width="520" @update:model-value="selected=null">
      <v-card v-if="selected" rounded="lg">
        <v-card-title>Chi tiết điểm — {{ selected.fullName || 'Chưa đặt tên' }}</v-card-title>
        <v-card-text>
          <div class="text-h4 mb-3">{{ selected.score }}/100</div>
          <v-list density="compact">
            <v-list-item title="Điểm giai đoạn" :subtitle="`+${selected.breakdown.stageScore} điểm`"/>
            <v-list-item title="Mức tương tác" :subtitle="`+${selected.breakdown.engagementScore} điểm`"/>
            <v-list-item title="Lịch hẹn đã tạo" :subtitle="`+${selected.breakdown.appointmentScore} điểm`"/>
            <v-list-item title="Lịch hẹn sắp tới" :subtitle="`+${selected.breakdown.appointmentBonus} điểm`"/>
            <v-list-item title="Trừ điểm không hoạt động" :subtitle="`-${selected.breakdown.inactivityPenalty} điểm`"/>
          </v-list>
        </v-card-text>
        <v-card-actions><v-spacer/><v-btn @click="selected=null">Đóng</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '@/api';
type Lead = { id:string; fullName:string|null; phone:string|null; status:string|null; score:number; category:string; stalled:boolean; daysSinceUpdate:number; breakdown:{stageScore:number;engagementScore:number;appointmentScore:number;appointmentBonus:number;inactivityPenalty:number} };
const leads=ref<Lead[]>([]);
const total=ref(0), stalled=ref(0), loading=ref(false);
const error=ref(''), keyword=ref(''), category=ref('all'), onlyStalled=ref(false);
const selected=ref<Lead|null>(null);
const categories=[{title:'Tất cả',value:'all'},{title:'Nóng',value:'hot'},{title:'Ấm',value:'warm'},{title:'Lạnh',value:'cold'}];
const headers=[{title:'Khách hàng',key:'fullName'},{title:'Điện thoại',key:'phone'},{title:'Giai đoạn',key:'status'},{title:'Điểm',key:'score'},{title:'Phân nhóm',key:'category'},{title:'Lần cập nhật',key:'stalled'},{title:'',key:'actions',sortable:false}];
const filtered=computed(()=>leads.value.filter(x=>(category.value==='all'||x.category===category.value)&&(!onlyStalled.value||x.stalled)&&((x.fullName||'').toLowerCase().includes(keyword.value.toLowerCase())||(x.phone||'').includes(keyword.value))));
const hotCount=computed(()=>leads.value.filter(x=>x.category==='hot').length);
const scoreColor=(n:number)=>n>=70?'success':n>=35?'warning':'info';
const categoryLabel=(x:string)=>({hot:'Nóng',warm:'Ấm',cold:'Lạnh'}[x]||x);
async function load(){loading.value=true;error.value='';try{const {data}=await api.get('/leads/insights',{params:{limit:200}});leads.value=data.contacts;total.value=data.total;stalled.value=data.stalled;}catch(e){error.value='Không thể tải dữ liệu phân tích khách hàng.';}finally{loading.value=false;}}
onMounted(load);
</script>
