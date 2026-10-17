<template>
  <div class="pa-3">
    <h1 class="text-h5 font-weight-bold mb-2">Xuất bản bài viết Zalo Official Account</h1>
    <p class="text-body-2 text-medium-emphasis mb-4">API chính thức dành cho Zalo OA — không phải nhật ký tài khoản Zalo cá nhân.</p>
    <v-alert type="info" variant="tonal" class="mb-4">Yêu cầu OA access token hợp lệ có quyền quản lý nội dung và ảnh bìa HTTPS đã được OA chấp nhận. Token chỉ sử dụng một lần trong yêu cầu này, không lưu trên máy chủ.</v-alert>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
    <v-alert v-if="result" type="success" variant="tonal" class="mb-4">Zalo OA đã tiếp nhận yêu cầu tạo bài. Trạng thái hiển thị: {{ result.visibility==='show'?'Công khai':'Bản ẩn' }}. Vui lòng kiểm tra kết quả xử lý trong trang quản lý OA.</v-alert>
    <v-row>
      <v-col cols="12" md="7">
        <v-card rounded="lg">
          <v-card-text>
            <v-text-field v-model="accessToken" label="OA access token" type="password" autocomplete="off" variant="outlined"
              hint="Không lưu token trong cơ sở dữ liệu" persistent-hint class="mb-2"/>
            <v-text-field v-model="title" label="Tiêu đề (tối đa 150 ký tự)" :counter="150" variant="outlined"/>
            <v-text-field v-model="author" label="Tác giả (tối đa 50 ký tự)" :counter="50" variant="outlined"/>
            <v-textarea v-model="description" label="Mô tả (tối đa 300 ký tự)" :counter="300" variant="outlined" rows="2"/>
            <v-text-field v-model="coverUrl" label="Ảnh bìa HTTPS" variant="outlined" hint="Ảnh phải đáp ứng giới hạn của Zalo OA (tối đa 1 MB)" persistent-hint/>
            <v-textarea v-model="content" label="Nội dung bài viết" variant="outlined" rows="8" auto-grow :counter="12000"/>
            <v-radio-group v-model="visibility" label="Sau khi tạo" inline>
              <v-radio label="Lưu bài ẩn" value="hide"/>
              <v-radio label="Hiển thị công khai" value="show"/>
            </v-radio-group>
            <v-btn color="primary" prepend-icon="mdi-send-check" :disabled="!isValid" :loading="publishing" @click="confirm=true">Gửi đến Zalo OA</v-btn>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="5">
        <v-card rounded="lg" class="pa-4">
          <div class="text-subtitle-1 font-weight-bold mb-3">Xem trước</div>
          <v-img v-if="coverUrl.startsWith('https://')" :src="coverUrl" aspect-ratio="16/9" cover class="rounded-lg mb-3"/>
          <div class="text-h6">{{ title||'Tiêu đề bài viết OA' }}</div>
          <div class="text-caption text-medium-emphasis mb-2">{{ author||'Tác giả' }}</div>
          <p>{{ description }}</p>
          <p class="mt-3 journal-preview">{{ content }}</p>
          <v-chip size="small" :color="visibility==='show'?'warning':'default'" variant="tonal">{{ visibility==='show'?'Sẽ hiển thị':'Sẽ lưu ẩn' }}</v-chip>
        </v-card>
      </v-col>
    </v-row>
    <v-dialog v-model="confirm" max-width="480">
      <v-card><v-card-title>Xác nhận xuất bản lên Zalo OA?</v-card-title>
        <v-card-text>{{ visibility==='show'?'Anh đang chọn hiển thị bài công khai.':'Anh đang chọn tạo bài ẩn để kiểm tra lại.' }}
          Yêu cầu sẽ được gửi đến Zalo OA thực tế nếu token hợp lệ. Đây không phải chức năng đăng nhật ký Zalo cá nhân.</v-card-text>
        <v-card-actions><v-spacer/><v-btn @click="confirm=false">Hủy</v-btn><v-btn color="primary" :loading="publishing" @click="publish">Xác nhận gửi</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script setup lang="ts">
import {ref,computed} from 'vue';
import {api} from '@/api';
const accessToken=ref(''),title=ref(''),author=ref(''),description=ref(''),coverUrl=ref(''),content=ref('');
const visibility=ref<'hide'|'show'>('hide'),error=ref(''),result=ref<{visibility:string}|null>(null),confirm=ref(false),publishing=ref(false);
const isValid=computed(()=>!!accessToken.value.trim()&&title.value.trim().length>0&&title.value.length<=150&&
  !!author.value.trim()&&author.value.length<=50&&!!description.value.trim()&&description.value.length<=300&&
  !!content.value.trim()&&content.value.length<=12000&&/^https:\/\//.test(coverUrl.value));
async function publish(){
  if(!isValid.value)return;publishing.value=true;error.value='';result.value=null;
  try{const {data}=await api.post('/zalo-oa/articles',{
    accessToken:accessToken.value,title:title.value,author:author.value,description:description.value,
    coverUrl:coverUrl.value,content:content.value,visibility:visibility.value,
  },{timeout:30000});result.value=data;accessToken.value='';}
  catch(e:any){error.value=e?.response?.data?.message||e?.response?.data?.error||'Không thể tạo bài viết Zalo OA';}
  finally{confirm.value=false;publishing.value=false;}
}
</script>
<style scoped>.journal-preview{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6}</style>