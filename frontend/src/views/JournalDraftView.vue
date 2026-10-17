<template>
  <div class="pa-3">
    <div class="d-flex align-center flex-wrap ga-3 mb-4">
      <div><h1 class="text-h5 font-weight-bold">Soạn bài nhật ký Zalo</h1>
        <p class="text-body-2 text-medium-emphasis">Lưu bài nháp cá nhân, xem trước nội dung và chuẩn bị ảnh đăng</p></div>
      <v-spacer/><v-btn variant="tonal" @click="load" :loading="loading" prepend-icon="mdi-refresh">Làm mới</v-btn>
    </div>
    <v-alert type="warning" variant="tonal" class="mb-4">Hiện SDK Zalo cá nhân không có API đăng nhật ký đã xác minh. Chức năng này <strong>chỉ tạo và lưu bản nháp, không tự đăng lên Zalo</strong>. Sau khi sao chép nội dung, anh đăng trong ứng dụng Zalo bằng tài khoản của mình.</v-alert>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
    <v-alert v-if="message" type="success" variant="tonal" class="mb-4">{{ message }}</v-alert>
    <v-row>
      <v-col cols="12" md="7">
        <v-card rounded="lg">
          <v-card-title>Biên tập nhật ký</v-card-title>
          <v-card-text>
            <v-textarea v-model="textContent" label="Nội dung bài viết" variant="outlined" rows="8" auto-grow
              :counter="5000" placeholder="Chia sẻ nội dung, thông điệp và hashtag..."/>
            <v-textarea v-model="imageLines" label="Đường dẫn ảnh HTTPS — mỗi dòng một ảnh (tối đa 9)" variant="outlined"
              rows="3" hint="Dùng ảnh có quyền sử dụng. Khi đăng trong Zalo, chọn ảnh tương ứng." persistent-hint/>
            <div class="d-flex ga-2 mt-4 flex-wrap">
              <v-btn color="primary" prepend-icon="mdi-content-save-outline" :loading="saving" @click="saveDraft">Lưu bản nháp</v-btn>
              <v-btn variant="tonal" prepend-icon="mdi-content-copy" @click="copyText">Sao chép nội dung</v-btn>
              <v-btn variant="text" @click="clearEditor">Soạn bài mới</v-btn>
            </div>
          </v-card-text>
        </v-card>
        <v-card rounded="lg" class="mt-4">
          <v-card-title>Bản nháp của tôi ({{ drafts.length }}/30)</v-card-title>
          <v-list v-if="drafts.length">
            <v-list-item v-for="draft in drafts" :key="draft.id" :title="draft.text.slice(0,80)||'[Bài ảnh]'"
              :subtitle="new Date(draft.updatedAt).toLocaleString('vi-VN')">
              <template #append>
                <v-btn icon="mdi-pencil" variant="text" title="Sửa" @click="editDraft(draft)"/>
                <v-btn icon="mdi-delete-outline" color="error" variant="text" title="Xóa" @click="askRemove(draft.id)"/>
              </template>
            </v-list-item>
          </v-list>
          <v-card-text v-else class="text-medium-emphasis">Chưa có bản nháp nào.</v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="5">
        <v-card rounded="lg" class="pa-4">
          <div class="text-subtitle-1 font-weight-bold mb-3">Xem trước bài viết</div>
          <div class="d-flex align-center ga-3 mb-4"><v-avatar color="primary" size="44"><v-icon>mdi-account-circle</v-icon></v-avatar>
            <div><div class="font-weight-medium">Tài khoản Zalo của anh</div><div class="text-caption text-medium-emphasis">Bản nháp, chưa xuất bản</div></div>
          </div>
          <p class="journal-preview">{{ textContent || 'Nội dung anh đang biên tập sẽ xuất hiện tại đây.' }}</p>
          <v-row v-if="previewImages.length">
            <v-col v-for="(url,i) in previewImages" :key="url+i" cols="6">
              <v-img :src="url" height="155" cover class="rounded-lg" />
            </v-col>
          </v-row>
        </v-card>
      </v-col>
    </v-row>
    <v-dialog v-model="confirmRemove" max-width="390">
      <v-card><v-card-title>Xóa bản nháp?</v-card-title>
        <v-card-text>Chỉ xóa bản nháp lưu trong ZaloCRM. Không ảnh hưởng bài viết đã đăng thủ công trên Zalo.</v-card-text>
        <v-card-actions><v-spacer/><v-btn @click="confirmRemove=false">Hủy</v-btn>
          <v-btn color="error" @click="removeDraft">Xóa</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script setup lang="ts">
import {ref,computed,onMounted} from 'vue';
import {api} from '@/api';
type Draft={id:string;text:string;images:string[];createdAt:string;updatedAt:string};
const drafts=ref<Draft[]>([]),editingId=ref(''),textContent=ref(''),imageLines=ref('');
const loading=ref(false),saving=ref(false),error=ref(''),message=ref('');
const confirmRemove=ref(false),removingId=ref('');
const previewImages=computed(()=>imageLines.value.split(/\r?\n/).map(x=>x.trim()).filter(x=>/^https:\/\//.test(x)).slice(0,9));
async function load(){loading.value=true;error.value='';try{const {data}=await api.get('/journal/drafts');drafts.value=data.drafts;}catch{error.value='Không tải được bản nháp';}finally{loading.value=false;}}
function clearEditor(){editingId.value='';textContent.value='';imageLines.value='';message.value='';}
function editDraft(d:Draft){editingId.value=d.id;textContent.value=d.text;imageLines.value=d.images.join('\n');window.scrollTo({top:0,behavior:'smooth'});}
async function copyText(){
  if(!textContent.value.trim()){error.value='Chưa có nội dung để sao chép';return;}
  try{await navigator.clipboard.writeText(textContent.value);message.value='Đã sao chép. Mở Zalo để dán và đăng bài.';}
  catch{error.value='Không thể sao chép tự động. Hãy chọn và sao chép nội dung thủ công.';}
}
async function saveDraft(){
  error.value='';message.value='';const images=imageLines.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(!textContent.value.trim()&&!images.length){error.value='Bài viết cần có nội dung hoặc ảnh';return;}
  if(textContent.value.length>5000||images.length>9||images.some(x=>!/^https:\/\//.test(x))){error.value='Tối đa 5000 ký tự, 9 ảnh HTTPS hợp lệ';return;}
  if(!editingId.value&&drafts.value.length>=30){error.value='Tối đa 30 bản nháp';return;}
  saving.value=true;
  try{
    const now=new Date().toISOString();
    const current=drafts.value.find(d=>d.id===editingId.value);
    const item:Draft={id:current?.id||crypto.randomUUID(),text:textContent.value,images,
      createdAt:current?.createdAt||now,updatedAt:now};
    const updated=current?drafts.value.map(d=>d.id===item.id?item:d):[item,...drafts.value];
    const {data}=await api.put('/journal/drafts',{drafts:updated});
    drafts.value=data.drafts;editingId.value=item.id;message.value='Đã lưu bản nháp trong CRM, chưa đăng lên Zalo.';
  }catch{error.value='Không thể lưu bản nháp';}finally{saving.value=false;}
}
function askRemove(id:string){removingId.value=id;confirmRemove.value=true;}
async function removeDraft(){
  confirmRemove.value=false;
  try{const {data}=await api.put('/journal/drafts',{drafts:drafts.value.filter(x=>x.id!==removingId.value)});
    drafts.value=data.drafts;if(editingId.value===removingId.value)clearEditor();message.value='Đã xóa bản nháp.';}
  catch{error.value='Không thể xóa bản nháp';}
}
onMounted(load);
</script>
<style scoped>.journal-preview{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65;margin-bottom:18px}</style>