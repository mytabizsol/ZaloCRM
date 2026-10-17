<template>
  <div class="pa-3">
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <div><h1 class="text-h5 font-weight-bold">Website Chat Widget</h1>
        <p class="text-body-2 text-medium-emphasis">Tạo form chat nhúng website và phản hồi khách trực tiếp trong CRM</p></div>
      <v-spacer/><v-btn variant="tonal" prepend-icon="mdi-refresh" @click="load">Làm mới</v-btn>
      <v-btn v-if="authStore.isAdmin" color="primary" prepend-icon="mdi-plus" @click="createDialog=true">Tạo widget</v-btn>
    </div>
    <v-alert v-if="error" variant="tonal" type="error" class="mb-3">{{ error }}</v-alert>
    <v-alert v-if="message" variant="tonal" type="success" class="mb-3">{{ message }}</v-alert>
    <v-alert variant="tonal" type="info" class="mb-4">Website phải nhúng mã script và MYTA CRM cần tên miền HTTPS công khai. Trình duyệt khách sẽ gửi thông tin vào CRM qua iframe, không cần cấp quyền truy cập backend WordPress.</v-alert>
    <v-alert v-if="!publicReady" type="warning" variant="tonal" class="mb-4">Địa chỉ CRM hiện tại chưa phải HTTPS công khai. Mã nhúng tạo từ địa chỉ này chỉ dùng để thử nghiệm nội bộ; khách truy cập website từ Internet chưa thể sử dụng cho đến khi CRM được cấu hình tên miền HTTPS.</v-alert>
    <v-row>
      <v-col cols="12" md="6"><v-card rounded="lg">
        <v-card-title>Cấu hình form chat</v-card-title>
        <v-card-text v-if="!widgets.length" class="text-medium-emphasis">Chưa có widget. Tạo widget đầu tiên để nhận mã nhúng.</v-card-text>
        <v-expansion-panels variant="accordion" class="pa-2">
          <v-expansion-panel v-for="w in widgets" :key="w.id">
            <v-expansion-panel-title><v-icon icon="mdi-chat-processing-outline" class="mr-2"/>{{ w.title }}
              <v-spacer/><v-chip :color="w.enabled?'success':'warning'" size="x-small">{{ w.enabled?'Bật':'Tắt' }}</v-chip>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <p class="text-body-2 mb-2"><strong>Website:</strong> {{ w.domain }}</p>
              <div class="text-caption mb-1">Dán đoạn mã trước thẻ đóng body của website (hoặc Custom HTML của WordPress):</div>
              <v-textarea :model-value="snippet(w)" readonly variant="outlined" rows="3" auto-grow/>
              <div class="d-flex ga-2 mb-3">
                <v-btn color="primary" variant="tonal" prepend-icon="mdi-content-copy" @click="copy(snippet(w))">Sao chép mã nhúng</v-btn>
                <v-btn :href="previewUrl(w)" target="_blank" variant="outlined">Xem form</v-btn>
              </div>
              <v-switch v-if="authStore.isAdmin" :model-value="w.enabled" color="primary" label="Bật widget"
                @update:model-value="toggle(w,Boolean($event))" hide-details/>
              <div class="text-caption text-medium-emphasis">Widget tự hiển thị nút chat nổi. Có trường tên, email, điện thoại, nội dung và xác nhận đồng ý liên hệ.</div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels></v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card rounded="lg"><v-card-title>Hộp thư Website Chat ({{ threads.length }})</v-card-title>
          <v-list v-if="threads.length" class="overflow-y-auto" style="max-height:490px">
            <v-list-item v-for="t in threads" :key="t.id" :title="t.visitorName"
              :subtitle="t.widget.title+' · '+(t.messages?.[0]?.content||'')"
              :active="selectedId===t.id" @click="openThread(t.id)">
              <template #append><v-icon icon="mdi-chevron-right"/></template>
            </v-list-item>
          </v-list>
          <v-card-text v-else class="text-medium-emphasis">Chưa có hội thoại website nào.</v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-card v-if="selectedId" rounded="lg" class="mt-4">
      <v-card-title class="d-flex align-center">Hội thoại với {{ selectedThread?.visitorName }}
        <v-spacer/><v-btn variant="text" prepend-icon="mdi-refresh" @click="openThread(selectedId)">Làm mới</v-btn>
      </v-card-title>
      <v-card-text>
        <div class="mb-3 text-body-2">Liên hệ: {{ selectedThread?.visitorPhone||'—' }} · {{ selectedThread?.visitorEmail||'—' }}</div>
        <div class="messages">
          <div v-for="m in entries" :key="m.id" :class="['chat-bubble',m.sender]">
            <div class="text-caption font-weight-bold">{{ m.sender==='agent'?'Nhân viên':'Khách hàng' }}</div>
            <div class="chat-text">{{ m.content }}</div>
            <div class="text-caption">{{ new Date(m.createdAt).toLocaleString('vi-VN') }}</div>
          </div>
        </div>
        <div class="d-flex ga-2 align-center mt-3">
          <v-text-field v-model="reply" label="Trả lời khách qua widget" variant="outlined" density="compact"
            hide-details :counter="1500" @keydown.enter.prevent="sendReply"/>
          <v-btn color="primary" :disabled="!reply.trim()" :loading="sending" @click="sendReply">Gửi</v-btn>
        </div>
      </v-card-text>
    </v-card>
    <v-dialog v-model="createDialog" max-width="530">
      <v-card><v-card-title>Thiết kế form chat</v-card-title><v-card-text>
        <v-text-field v-model="newTitle" label="Tên widget (ví dụ MYTA Support)" variant="outlined"/>
        <v-text-field v-model="newDomain" label="Origin website (https://example.com)" variant="outlined"
          hint="Không thêm đường dẫn trang. Chỉ trang web này được phép nhúng iframe." persistent-hint/>
        <v-text-field v-model="newWelcome" label="Lời chào" variant="outlined"/>
        <v-text-field v-model="newAccent" label="Màu nút chat (HEX)" variant="outlined"/>
      </v-card-text><v-card-actions><v-spacer/><v-btn @click="createDialog=false">Hủy</v-btn>
        <v-btn color="primary" :loading="creating" @click="createWidget">Tạo và lấy mã</v-btn>
      </v-card-actions></v-card>
    </v-dialog>
  </div>
</template>
<script setup lang="ts">
import {ref,computed,onMounted} from 'vue';
import {api} from '@/api';
import {useAuthStore} from '@/stores/auth';
type Widget={id:string;publicKey:string;title:string;domain:string;enabled:boolean;accent:string;welcome:string};
type Thread={id:string;visitorName:string;visitorPhone:string|null;visitorEmail:string|null;widget:{title:string};
  messages:{content:string}[]};
type Entry={id:string;sender:string;content:string;createdAt:string};
const authStore=useAuthStore(),widgets=ref<Widget[]>([]),threads=ref<Thread[]>([]),entries=ref<Entry[]>([]);
const publicReady=location.protocol==='https:'&&!['localhost','127.0.0.1'].includes(location.hostname);
const error=ref(''),message=ref(''),selectedId=ref(''),reply=ref(''),sending=ref(false),creating=ref(false),createDialog=ref(false);
const newTitle=ref('Hỗ trợ trực tuyến'),newDomain=ref('https://'),newWelcome=ref('Xin chào! Chúng tôi có thể hỗ trợ gì cho bạn?'),newAccent=ref('#2563EB');
const selectedThread=computed(()=>threads.value.find(x=>x.id===selectedId.value));
const previewUrl=(w:Widget)=>location.origin+'/widgets/'+w.publicKey+'/frame';
const snippet=(w:Widget)=>'<script async src="'+location.origin+'/widgets/'+w.publicKey+'/embed.js"><\/script>';
async function load(){error.value='';try{const [a,b]=await Promise.all([api.get('/website-chat/widgets'),api.get('/website-chat/threads')]);
  widgets.value=a.data.widgets;threads.value=b.data.threads;}catch{error.value='Không tải được widget hoặc hội thoại';}}
async function createWidget(){creating.value=true;error.value='';try{const {data}=await api.post('/website-chat/widgets',{
  title:newTitle.value,domain:newDomain.value,welcome:newWelcome.value,accent:newAccent.value});
  createDialog.value=false;message.value='Đã tạo widget '+data.widget.title;await load();
}catch(e:any){error.value=e?.response?.data?.error||'Không tạo được widget';}finally{creating.value=false;}}
async function toggle(w:Widget,enabled:boolean){try{await api.put('/website-chat/widgets/'+w.id,{enabled});await load();}
catch{error.value='Không cập nhật được widget';}}
async function copy(text:string){try{await navigator.clipboard.writeText(text);message.value='Đã sao chép mã nhúng';}
catch{error.value='Không tự sao chép được, hãy chọn đoạn mã rồi sao chép';}}
async function openThread(id:string){selectedId.value=id;try{const {data}=await api.get('/website-chat/threads/'+id+'/messages');entries.value=data.messages;}
catch{error.value='Không đọc được hội thoại';}}
async function sendReply(){if(!selectedId.value||!reply.value.trim())return;sending.value=true;try{
  await api.post('/website-chat/threads/'+selectedId.value+'/reply',{content:reply.value});reply.value='';await openThread(selectedId.value);
}catch{error.value='Không gửi được phản hồi';}finally{sending.value=false;}}
onMounted(load);
</script>
<style scoped>.messages{display:flex;flex-direction:column;gap:10px;max-height:420px;overflow:auto;border-radius:10px;background:rgba(120,120,120,.06);padding:16px}
.chat-bubble{padding:10px 12px;border-radius:12px;max-width:85%;white-space:pre-wrap;overflow-wrap:anywhere}
.chat-bubble.visitor{align-self:flex-start;background:rgba(148,163,184,.2)}
.chat-bubble.agent{align-self:flex-end;background:rgba(59,130,246,.16)}.chat-text{line-height:1.6}</style>
