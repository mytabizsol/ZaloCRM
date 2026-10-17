<template>
  <div class="pa-3">
    <div class="d-flex flex-wrap align-center mb-4 ga-2">
      <div><h1 class="text-h5 font-weight-bold">Rà soát khách hàng trùng</h1><p class="text-body-2 text-medium-emphasis">Phát hiện hồ sơ có cùng Zalo UID, số điện thoại hoặc email.</p></div>
      <v-spacer/><v-btn prepend-icon="mdi-refresh" :loading="loading" color="primary" @click="load">Quét lại</v-btn>
    </div>
    <v-alert variant="tonal" type="info" class="mb-4">Chỉ phát hiện và đối chiếu hồ sơ. Chức năng này không tự gộp, ghi đè hoặc xóa dữ liệu khách hàng.</v-alert>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
    <v-row class="mb-3">
      <v-col cols="12" sm="6"><v-card rounded="lg" class="pa-4"><div class="text-body-2 text-medium-emphasis">Hồ sơ đã quét</div><div class="text-h4 font-weight-bold">{{ scanned }}</div></v-card></v-col>
      <v-col cols="12" sm="6"><v-card rounded="lg" class="pa-4"><div class="text-body-2 text-medium-emphasis">Nhóm nghi trùng</div><div class="text-h4 font-weight-bold">{{ total }}</div></v-card></v-col>
    </v-row>
    <v-alert v-if="truncated" type="warning" variant="tonal" class="mb-3">Dữ liệu vượt quá giới hạn 5.000 hồ sơ mới nhất. Kết quả có thể chưa đầy đủ.</v-alert>
    <v-text-field v-model="search" label="Lọc theo tên, số điện thoại hoặc email" variant="outlined" density="compact" prepend-inner-icon="mdi-magnify" hide-details class="mb-3" />
    <v-expansion-panels v-if="filtered.length" multiple>
      <v-expansion-panel v-for="(group,i) in filtered" :key="group[0].id">
        <v-expansion-panel-title>
          <div class="d-flex align-center ga-3"><v-chip size="small" color="warning">{{ group.length }} hồ sơ</v-chip><strong>Nhóm {{ i+1 }}</strong><span class="text-medium-emphasis">{{ group[0].fullName || group[0].phone || group[0].email || 'Chưa đặt tên' }}</span></div>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-table density="compact"><thead><tr><th>Tên khách</th><th>Điện thoại</th><th>Email</th><th>Zalo UID</th><th>Pipeline</th><th>Cập nhật</th></tr></thead>
            <tbody><tr v-for="contact in group" :key="contact.id"><td>{{ contact.fullName || '—' }}</td><td>{{ contact.phone || '—' }}</td><td>{{ contact.email || '—' }}</td><td>{{ contact.zaloUid || '—' }}</td><td>{{ contact.status || '—' }}</td><td>{{ new Date(contact.updatedAt).toLocaleDateString('vi-VN') }}</td></tr></tbody>
          </v-table>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
    <v-card v-else-if="!loading" rounded="lg" class="pa-8 text-center text-medium-emphasis">Không tìm thấy nhóm hồ sơ trùng trong phạm vi dữ liệu đã quét.</v-card>
  </div>
</template>
<script setup lang="ts">
import { ref,computed,onMounted } from 'vue';
import { api } from '@/api';
type Contact={id:string;fullName:string|null;phone:string|null;email:string|null;zaloUid:string|null;status:string|null;updatedAt:string};
const groups=ref<Contact[][]>([]);
const total=ref(0),scanned=ref(0),truncated=ref(false),loading=ref(false),error=ref(''),search=ref('');
const filtered=computed(()=>groups.value.filter(g=>g.some(c=>(c.fullName||'').toLowerCase().includes(search.value.toLowerCase())||(c.phone||'').includes(search.value)||(c.email||'').toLowerCase().includes(search.value.toLowerCase()))));
async function load(){loading.value=true;error.value='';try{const {data}=await api.get('/contacts/duplicates');groups.value=data.groups;total.value=data.totalDuplicateGroups;scanned.value=data.scanned;truncated.value=data.truncated;}catch{error.value='Không thể quét dữ liệu khách hàng';}finally{loading.value=false;}}
onMounted(load);
</script>
