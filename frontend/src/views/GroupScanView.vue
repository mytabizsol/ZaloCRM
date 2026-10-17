<template>
  <div class="pa-3">
    <div class="d-flex align-center flex-wrap ga-3 mb-4">
      <div><h1 class="text-h5 font-weight-bold">Quét nhóm Zalo</h1>
      <p class="text-body-2 text-medium-emphasis">Đồng bộ danh sách nhóm từ tài khoản Zalo đang đăng nhập</p></div>
      <v-spacer/><v-btn variant="tonal" prepend-icon="mdi-refresh" :loading="loading" @click="load">Làm mới</v-btn>
    </div>
    <v-alert variant="tonal" type="warning" class="mb-4">
      Zalo cá nhân sử dụng SDK không chính thức. Chỉ quét các nhóm mà tài khoản đang tham gia; không tự động nhắn tin, kết bạn hay thu thập số điện thoại thành viên. Mỗi tài khoản chỉ được quét lại sau 5 phút.
    </v-alert>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
    <v-alert v-if="message" type="success" variant="tonal" class="mb-4">{{ message }}</v-alert>
    <v-card rounded="lg" class="mb-4"><v-card-text class="d-flex ga-3 align-center flex-wrap">
      <v-select v-model="accountId" :items="accounts" item-title="displayName" item-value="id"
        label="Tài khoản Zalo" variant="outlined" density="compact" hide-details
        style="min-width:260px;max-width:420px" @update:model-value="loadSnapshot"/>
      <v-chip :color="connected?'success':'warning'" variant="tonal" size="small">{{ connected?'Đã kết nối':'Chưa kết nối' }}</v-chip>
      <v-spacer/>
      <v-btn color="primary" prepend-icon="mdi-radar" :disabled="!connected||!accountId" :loading="scanning"
        @click="confirmScan=true">Quét nhóm thật</v-btn>
    </v-card-text></v-card>
    <v-row class="mb-2">
      <v-col cols="12" sm="4"><v-card rounded="lg" class="pa-4"><div class="text-medium-emphasis">Tổng nhóm phát hiện</div><div class="text-h4">{{ snapshot?.totalGroups ?? 0 }}</div></v-card></v-col>
      <v-col cols="12" sm="4"><v-card rounded="lg" class="pa-4"><div class="text-medium-emphasis">Nhóm đã lấy thông tin</div><div class="text-h4">{{ snapshot?.groups.length ?? 0 }}</div></v-card></v-col>
      <v-col cols="12" sm="4"><v-card rounded="lg" class="pa-4"><div class="text-medium-emphasis">Nhóm chưa đọc được</div><div class="text-h4">{{ snapshot?.failed ?? 0 }}</div></v-card></v-col>
    </v-row>
    <v-alert v-if="snapshot?.limited" type="warning" variant="tonal" class="mb-3">Lượt quét giới hạn 100 nhóm đầu tiên nhằm giảm rủi ro tài khoản bị hạn chế.</v-alert>
    <p v-if="snapshot?.scannedAt" class="text-caption mb-3">Lần quét gần nhất: {{ new Date(snapshot.scannedAt).toLocaleString('vi-VN') }}</p>
    <v-card rounded="lg"><v-card-title>Nhóm của tôi</v-card-title>
      <v-card-text><v-text-field v-model="search" label="Tìm tên nhóm" variant="outlined" density="compact"
        prepend-inner-icon="mdi-magnify" hide-details class="mb-3"/>
        <v-data-table :items="filtered" :headers="headers" :items-per-page="15" :loading="scanning||loading">
          <template #item.memberCount="{item}"><v-chip variant="tonal" color="primary" size="small">{{ item.memberCount }} thành viên</v-chip></template>
          <template #item.actions="{item}"><v-btn size="small" variant="tonal" :disabled="!connected" @click="openMembers(item)">Xem thành viên</v-btn></template>
        </v-data-table>
      </v-card-text>
    </v-card>
    <v-dialog v-model="confirmScan" max-width="480">
      <v-card><v-card-title>Quét nhóm từ Zalo?</v-card-title>
        <v-card-text>Hệ thống sẽ gọi Zalo để lấy danh sách tối đa 100 nhóm anh đang tham gia, tên nhóm và số thành viên. Không gửi tin nhắn hoặc tự nhập thành viên thành khách hàng.</v-card-text>
        <v-card-actions><v-spacer/><v-btn @click="confirmScan=false">Hủy</v-btn><v-btn color="primary" :loading="scanning" @click="startScan">Xác nhận quét</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="showMembers" max-width="640">
      <v-card><v-card-title class="d-flex align-center">{{ members?.name || 'Thành viên nhóm' }}<v-spacer/><v-btn icon="mdi-close" variant="text" @click="showMembers=false"/></v-card-title>
        <v-card-text>
          <v-progress-linear v-if="membersLoading" indeterminate/>
          <p v-if="members" class="text-caption mb-3">{{ members.totalMember }} thành viên; tối đa 100 hồ sơ có thể xem từ dữ liệu nhóm.</p>
          <v-table density="compact"><thead><tr><th>Tên hiển thị</th><th>Mã Zalo</th></tr></thead>
          <tbody><tr v-for="member in members?.members || []" :key="member.id"><td>{{ member.name }}</td><td>{{ member.id }}</td></tr></tbody></v-table>
          <v-alert v-if="members?.truncated" variant="tonal" type="info" class="mt-3">Danh sách thành viên chưa đầy đủ theo giới hạn của nhóm/Zalo.</v-alert>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>
<script setup lang="ts">
import {ref,computed,onMounted} from 'vue';
import {api} from '@/api';
type Account={id:string;displayName:string|null};
type Group={id:string;name:string;description:string;memberCount:number;type:number|null};
type Snapshot={scannedAt:string;totalGroups:number;failed:number;limited:boolean;groups:Group[]};
type Roster={name:string;totalMember:number;truncated:boolean;members:{id:string;name:string}[]};
const accounts=ref<Account[]>([]),accountId=ref(''),connected=ref(false),snapshot=ref<Snapshot|null>(null);
const loading=ref(false),scanning=ref(false),error=ref(''),message=ref(''),search=ref('');
const confirmScan=ref(false),showMembers=ref(false),membersLoading=ref(false),members=ref<Roster|null>(null);
const headers=[{title:'Tên nhóm',key:'name'},{title:'Mô tả',key:'description'},{title:'Số lượng',key:'memberCount'},{title:'',key:'actions',sortable:false}];
const filtered=computed(()=>snapshot.value?.groups.filter(g=>g.name.toLowerCase().includes(search.value.toLowerCase()))||[]);
async function load(){
  loading.value=true;error.value='';
  try{
    const {data}=await api.get('/zalo-accounts');
    accounts.value=data.map((a:any)=>({id:a.id,displayName:a.displayName||a.phone||a.id}));
    if(!accounts.value.some(a=>a.id===accountId.value))accountId.value=accounts.value[0]?.id||'';
    if(accountId.value)await loadSnapshot();
  }catch{error.value='Không tải được tài khoản Zalo';}finally{loading.value=false;}
}
async function loadSnapshot(){
  snapshot.value=null;connected.value=false;if(!accountId.value)return;
  try{const {data}=await api.get(`/zalo-accounts/${accountId.value}/group-scan`);
    snapshot.value=data.snapshot;connected.value=data.connected;
  }catch{error.value='Không tải được kết quả quét nhóm';}
}
async function startScan(){
  scanning.value=true;confirmScan.value=false;error.value='';message.value='';
  try{const {data}=await api.post(`/zalo-accounts/${accountId.value}/group-scan`,{},{timeout:90000});
    snapshot.value=data.snapshot;message.value='Đã quét và lưu danh sách nhóm.';
  }catch(e:any){error.value=e?.response?.data?.error||'Không quét được, vui lòng thử lại khi tài khoản kết nối';}
  finally{scanning.value=false;}
}
async function openMembers(g:Group){
  showMembers.value=true;membersLoading.value=true;members.value=null;error.value='';
  try{const {data}=await api.get(`/zalo-accounts/${accountId.value}/group-scan/${encodeURIComponent(g.id)}/members`);
    members.value=data;
  }catch(e:any){error.value=e?.response?.data?.error||'Không đọc được thành viên nhóm';showMembers.value=false;}
  finally{membersLoading.value=false;}
}
onMounted(load);
</script>