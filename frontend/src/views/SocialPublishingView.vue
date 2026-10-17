<template>
  <div class="pa-3">
    <div class="d-flex align-center flex-wrap ga-3 mb-5">
      <div><h1 class="text-h5 font-weight-bold">Lịch đăng bài đa kênh</h1>
        <p class="text-body-2 text-medium-emphasis">Zalo OA · Facebook Page · TikTok · Website WordPress</p></div>
      <v-spacer/><v-btn variant="tonal" prepend-icon="mdi-refresh" :loading="loading" @click="reload">Làm mới</v-btn>
      <v-btn color="primary" prepend-icon="mdi-link" @click="connectionDialog=true">Quản lý kết nối</v-btn>
    </div>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-3">{{ error }}</v-alert>
    <v-alert v-if="message" type="success" variant="tonal" class="mb-3">{{ message }}</v-alert>
    <v-row class="mb-3">
      <v-col v-for="p in providers" :key="p.value" cols="12" sm="6" lg="3">
        <v-card rounded="lg" class="pa-3"><div class="d-flex align-center ga-2">
          <v-icon :icon="p.icon" size="26" color="primary" />
          <span class="font-weight-bold">{{ p.title }}</span><v-spacer/>
          <v-chip size="small" :color="connected(p.value)?'success':'warning'" variant="tonal">{{ connected(p.value)?'Đã cấu hình':'Chưa kết nối' }}</v-chip>
        </div></v-card>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" lg="7">
        <v-card rounded="lg">
          <v-card-title>Soạn bài và lên lịch</v-card-title>
          <v-card-text>
            <v-select v-model="provider" :items="providers" item-title="title" item-value="value"
              label="Kênh xuất bản" variant="outlined" />
            <v-alert v-if="!connected(provider)" type="warning" variant="tonal" density="compact" class="mb-3">Kênh chưa có thông tin API. Anh có thể lưu nháp; để đăng thực tế cần kết nối trước.</v-alert>
            <v-text-field v-model="title" label="Tiêu đề" variant="outlined" :counter="150"/>
            <v-textarea v-model="body" label="Nội dung bài viết" variant="outlined" rows="7" auto-grow :counter="12000"/>
            <v-textarea v-model="imagesText" label="URL ảnh HTTPS (mỗi dòng một ảnh)" variant="outlined" rows="2"
              hint="Zalo OA cần 1 ảnh bìa; TikTok cần ảnh từ domain đã xác minh. WordPress/Facebook hiện ưu tiên đăng nội dung chữ." persistent-hint/>
            <v-radio-group v-model="mode" inline label="Hình thức">
              <v-radio label="Lưu nháp trong CRM" value="draft"/>
              <v-radio label="Lên lịch" value="schedule"/>
              <v-radio label="Đăng ngay" value="now"/>
            </v-radio-group>
            <v-text-field v-if="mode==='schedule'" v-model="scheduledLocal" type="datetime-local"
              label="Thời gian đăng (giờ địa phương)" variant="outlined"/>
            <v-alert v-if="provider==='tiktok'" variant="tonal" type="info" density="compact" class="mb-3">
              TikTok hỗ trợ ảnh qua Content Posting API. Cần ứng dụng được phê duyệt quyền, URL ảnh đã xác minh và quyền riêng tư phù hợp. Phản hồi API ban đầu chưa xác nhận bài đã hiển thị.
            </v-alert>
            <v-checkbox v-if="provider==='tiktok'&&mode!=='draft'" v-model="confirmTikTok"
              label="Tôi có quyền đăng nội dung này và đồng ý gửi đến TikTok theo mức riêng tư đã cấu hình" density="compact"/>
            <div class="d-flex ga-2 flex-wrap">
              <v-btn color="primary" prepend-icon="mdi-calendar-check" :loading="saving" :disabled="!canSave" @click="mode==='now'?confirmPublish=true:save()"> {{ mode==='draft'?'Lưu nháp':mode==='schedule'?'Lên lịch':'Kiểm tra trước khi đăng' }} </v-btn>
              <v-btn variant="text" @click="reset">Soạn bài mới</v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" lg="5">
        <v-card rounded="lg" class="pa-4"><div class="text-subtitle-1 font-weight-bold mb-3">Xem trước</div>
          <v-img v-if="images[0]" :src="images[0]" aspect-ratio="16/9" cover class="rounded-lg mb-3"/>
          <div class="text-h6">{{ title || 'Tiêu đề bài viết' }}</div>
          <p class="preview-content mt-2">{{ body || 'Nội dung bài viết...' }}</p>
          <v-chip variant="tonal" size="small">{{ providers.find(p=>p.value===provider)?.title }}</v-chip>
        </v-card>
        <v-card class="mt-4" rounded="lg"><v-card-title>Trạng thái công việc</v-card-title><v-card-text>
          <p class="text-body-2">Lịch chạy được kiểm tra mỗi phút. Bản ghi <strong>Đã tiếp nhận</strong> chưa chắc đã hiển thị trên Zalo OA/TikTok; cần xác minh trạng thái nền tảng.</p>
          <p class="text-caption text-medium-emphasis">Không tự động thử lại khi kết quả mạng không rõ để tránh đăng trùng.</p>
        </v-card-text></v-card>
      </v-col>
    </v-row>
    <v-card rounded="lg" class="mt-5"><v-card-title>Danh sách bài đăng và lịch sử</v-card-title>
      <v-data-table :items="posts" :headers="headers" :items-per-page="10" :loading="loading">
        <template #item.provider="{item}">{{ providers.find(p=>p.value===item.provider)?.title||item.provider }}</template>
        <template #item.status="{item}"><v-chip size="small" :color="statusColor(item.status)" variant="tonal">{{ statusText(item.status) }}</v-chip></template>
        <template #item.scheduledAt="{item}">{{ item.scheduledAt?new Date(item.scheduledAt).toLocaleString('vi-VN'):'—' }}</template>
        <template #item.actions="{item}">
          <v-btn v-if="['scheduled','draft'].includes(item.status)" size="small" variant="text" color="error" @click="askCancel(item)">Hủy</v-btn>
          <v-btn size="small" variant="text" @click="detail=item">Chi tiết</v-btn>
        </template>
      </v-data-table>
    </v-card>
    <v-dialog v-model="confirmPublish" max-width="460">
      <v-card><v-card-title>Đăng bài ngay?</v-card-title>
        <v-card-text>Hành động sẽ gọi API xuất bản thực tế của {{ providers.find(p=>p.value===provider)?.title }}. Anh xác nhận nội dung và quyền đăng trước khi gửi.</v-card-text>
        <v-card-actions><v-spacer/><v-btn @click="confirmPublish=false">Hủy</v-btn><v-btn color="primary" :loading="saving" @click="save">Xác nhận đăng</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="connectionDialog" max-width="660" scrollable>
      <v-card><v-card-title>Thiết lập kết nối xuất bản</v-card-title><v-card-text>
        <v-select v-model="connectionProvider" :items="providers" item-title="title" item-value="value" variant="outlined" label="Kênh"/>
        <v-text-field v-if="connectionProvider==='wordpress'" v-model="configSite" label="Website HTTPS (ví dụ https://myta.vn)" variant="outlined"/>
        <v-text-field v-if="connectionProvider==='wordpress'" v-model="configUser" label="WordPress username" variant="outlined"/>
        <v-text-field v-if="connectionProvider==='facebook'" v-model="configPage" label="Facebook Page ID" variant="outlined"/>
        <v-select v-if="connectionProvider==='tiktok'" v-model="configPrivacy" :items="privacyOptions"
          label="Mức riêng tư dự kiến (phải được TikTok cho phép)" variant="outlined"/>
        <v-text-field v-model="connectionSecret" type="password" autocomplete="off" variant="outlined"
          :label="connectionProvider==='wordpress'?'Application Password':'Access token'" hint="Để trống nếu không muốn đổi secret đã lưu; giá trị cũ không được hiển thị." persistent-hint/>
        <v-alert variant="tonal" type="warning" density="compact">Cấu hình chỉ được lưu mã hóa. Trạng thái “Đã cấu hình” không đồng nghĩa token còn hiệu lực. Token OAuth của TikTok/Zalo OA có thể hết hạn và phải cập nhật.</v-alert>
      </v-card-text>
      <v-card-actions><v-spacer/><v-btn @click="connectionDialog=false">Đóng</v-btn>
        <v-btn color="primary" :loading="saving" @click="saveConnection">Lưu kết nối</v-btn></v-card-actions></v-card>
    </v-dialog>
    <v-dialog :model-value="!!detail" max-width="620" @update:model-value="detail=null">
      <v-card v-if="detail"><v-card-title>Chi tiết xuất bản</v-card-title>
        <v-card-text><strong>{{ detail.title }}</strong><p class="mt-2">{{ detail.body }}</p>
          <p class="mt-2">Trạng thái: {{ statusText(detail.status) }}</p>
          <p v-if="detail.lastError" class="text-error">{{ detail.lastError }}</p>
          <p v-if="detail.responseJson?.detail">{{ detail.responseJson.detail }}</p>
          <p v-if="detail.responseJson?.remoteId">Mã nền tảng: {{ detail.responseJson.remoteId }}</p>
        </v-card-text><v-card-actions><v-spacer/><v-btn @click="detail=null">Đóng</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog :model-value="!!toCancel" max-width="420" @update:model-value="toCancel=null">
      <v-card v-if="toCancel"><v-card-title>Hủy bài trong CRM?</v-card-title>
        <v-card-text>Hủy bản nháp hoặc lịch chưa chạy; không gỡ bài đã đăng trên mạng xã hội.</v-card-text>
        <v-card-actions><v-spacer/><v-btn @click="toCancel=null">Bỏ qua</v-btn>
          <v-btn color="error" @click="cancelPost">Xác nhận hủy</v-btn></v-card-actions></v-card>
    </v-dialog>
  </div>
</template>
<script setup lang="ts">
import {ref,computed,onMounted,watch} from 'vue';
import {api} from '@/api';
type Provider='zalo-oa'|'facebook'|'tiktok'|'wordpress';
type Channel={provider:Provider;configured:boolean;config:{siteUrl?:string;username?:string;pageId?:string;privacyLevel?:string}};
type Post={id:string;provider:Provider;title:string;body:string;status:string;scheduledAt:string|null;lastError:string|null;responseJson?:{detail?:string;remoteId?:string}};
const headers=[{title:'Tiêu đề',key:'title'},{title:'Kênh',key:'provider'},{title:'Trạng thái',key:'status'},
  {title:'Thời gian đăng',key:'scheduledAt'},{title:'Thao tác',key:'actions',sortable:false}];
const providers=[{value:'zalo-oa',title:'Zalo OA',icon:'mdi-message-badge'},
  {value:'facebook',title:'Facebook Page',icon:'mdi-facebook'},
  {value:'tiktok',title:'TikTok (ảnh)',icon:'mdi-video'},
  {value:'wordpress',title:'Website WordPress',icon:'mdi-web'}];
const channels=ref<Channel[]>([]),posts=ref<Post[]>([]),provider=ref<Provider>('wordpress');
const title=ref(''),body=ref(''),imagesText=ref(''),mode=ref('draft'),scheduledLocal=ref('');
const loading=ref(false),saving=ref(false),error=ref(''),message=ref(''),confirmPublish=ref(false),confirmTikTok=ref(false);
const connectionDialog=ref(false),connectionProvider=ref<Provider>('wordpress'),connectionSecret=ref('');
const configSite=ref(''),configUser=ref(''),configPage=ref(''),configPrivacy=ref('SELF_ONLY');
const privacyOptions=[{title:'Chỉ mình tôi',value:'SELF_ONLY'},{title:'Công khai',value:'PUBLIC_TO_EVERYONE'},
  {title:'Bạn bè',value:'MUTUAL_FOLLOW_FRIENDS'},{title:'Người theo dõi',value:'FOLLOWER_OF_CREATOR'}];
const detail=ref<Post|null>(null),toCancel=ref<Post|null>(null);
const images=computed(()=>imagesText.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,35));
const canSave=computed(()=>!!(title.value.trim()||body.value.trim())&&body.value.length<=12000&&title.value.length<=150&&
  (provider.value!=='tiktok'||mode.value==='draft'||!!images.value.length&&confirmTikTok.value)&&
  (provider.value!=='zalo-oa'||mode.value==='draft'||!!images.value.length));
const connected=(p:string)=>!!channels.value.find(c=>c.provider===p)?.configured;
const statusText=(s:string)=>({draft:'Bản nháp',scheduled:'Đã lên lịch',processing:'Đang xử lý',published:'Đã đăng',
  submitted:'Đã tiếp nhận',needs_action:'Cần hoàn tất trên TikTok',failed:'Thất bại',cancelled:'Đã hủy'} as Record<string,string>)[s]||s;
const statusColor=(s:string)=>({published:'success',scheduled:'primary',submitted:'info',needs_action:'warning',failed:'error',cancelled:'grey'} as Record<string,string>)[s]||'secondary';
async function reload(){loading.value=true;error.value='';try{
  const [a,b]=await Promise.all([api.get('/social/channels'),api.get('/social/posts')]);
  channels.value=a.data.channels;posts.value=b.data.posts;
}catch{error.value='Không tải được dữ liệu lịch đăng bài';}finally{loading.value=false;}}
function reset(){title.value='';body.value='';imagesText.value='';mode.value='draft';scheduledLocal.value='';confirmTikTok.value=false;}
async function save(){saving.value=true;error.value='';message.value='';
  try{const date=mode.value==='schedule'&&scheduledLocal.value?new Date(scheduledLocal.value).toISOString():undefined;
    const {data}=await api.post('/social/posts',{
      provider:provider.value,title:title.value,body:body.value,mediaUrls:images.value,
      mode:mode.value,scheduledAt:date,confirmPublish:mode.value==='now',
      confirmTikTokRules:confirmTikTok.value,
    },{timeout:45000});
    message.value='Đã lưu bài. Trạng thái: '+statusText(data.post.status);
    confirmPublish.value=false;reset();await reload();
  }catch(e:any){error.value=e?.response?.data?.error||'Không thể lưu bài đăng';}finally{saving.value=false;}}
function askCancel(p:Post){toCancel.value=p;}
async function cancelPost(){if(!toCancel.value)return;try{await api.post('/social/posts/'+toCancel.value.id+'/cancel');toCancel.value=null;await reload();}
  catch(e:any){error.value=e?.response?.data?.error||'Không thể hủy';}}
watch(connectionProvider,p=>{connectionSecret.value='';const c=channels.value.find(x=>x.provider===p)?.config||{};
  configSite.value=c.siteUrl||'';configUser.value=c.username||'';configPage.value=c.pageId||'';
  configPrivacy.value=c.privacyLevel||'SELF_ONLY';},{immediate:true});
watch(connectionDialog,open=>{if(open){const c=channels.value.find(x=>x.provider===connectionProvider.value)?.config||{};
  configSite.value=c.siteUrl||'';configUser.value=c.username||'';configPage.value=c.pageId||'';configPrivacy.value=c.privacyLevel||'SELF_ONLY';}});
async function saveConnection(){saving.value=true;error.value='';try{await api.put('/social/channels/'+connectionProvider.value,{
  secret:connectionSecret.value,label:providers.find(p=>p.value===connectionProvider.value)?.title,
  config:{siteUrl:configSite.value,username:configUser.value,pageId:configPage.value,privacyLevel:configPrivacy.value},
});connectionSecret.value='';connectionDialog.value=false;message.value='Đã lưu mã hóa cấu hình kênh; chưa xác minh quyền API';await reload();}
catch(e:any){error.value=e?.response?.data?.error||'Không lưu được kết nối';}
finally{saving.value=false;}}
onMounted(reload);
</script>
<style scoped>.preview-content{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65}</style>
