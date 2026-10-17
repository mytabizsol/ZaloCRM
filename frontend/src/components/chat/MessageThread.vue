<template>
  <div class="message-thread d-flex flex-column flex-grow-1" style="height: 100%;">
    <!-- Empty state -->
    <div v-if="!conversation" class="d-flex align-center justify-center flex-grow-1">
      <div class="text-center text-grey">
        <v-icon icon="mdi-chat-outline" size="96" color="grey-lighten-2" />
        <p class="text-h6 mt-4">Chọn cuộc trò chuyện</p>
      </div>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="pa-3 d-flex align-center" style="border-bottom: 1px solid var(--border-glow, rgba(0,242,255,0.1));">
        <v-avatar size="36" color="grey-lighten-2" class="mr-3">
          <v-icon v-if="conversation.threadType === 'group'" icon="mdi-account-group" />
          <v-img v-else-if="conversation.contact?.avatarUrl" :src="conversation.contact.avatarUrl" />
          <v-icon v-else icon="mdi-account" />
        </v-avatar>
        <div class="flex-grow-1">
          <div class="font-weight-medium">{{ conversation.contact?.fullName || 'Unknown' }}</div>
          <div class="text-caption text-grey">{{ conversation.zaloAccount?.displayName || 'Zalo' }}</div>
        </div>
        <v-btn
          :icon="showContactPanel ? 'mdi-account-details' : 'mdi-account-details-outline'"
          size="small" variant="text"
          :color="showContactPanel ? 'primary' : undefined"
          @click="$emit('toggle-contact-panel')"
        />
      </div>

      <!-- Messages -->
      <div ref="messagesContainer" class="flex-grow-1 overflow-y-auto pa-3 chat-messages-area">
        <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-2" />
        <div v-for="msg in messages" :key="msg.id" class="mb-2 d-flex" :class="msg.senderType === 'self' ? 'justify-end' : 'justify-start'">
          <div style="max-width: 70%;">
            <div v-if="conversation.threadType === 'group' && msg.senderType !== 'self'" class="text-caption mb-1" style="color: #00F2FF; font-weight: 500;">
              {{ msg.senderName || 'Unknown' }}
            </div>
            <div class="message-bubble pa-2 px-3 rounded-lg" :class="msg.senderType === 'self' ? 'bg-primary text-white' : 'bg-white'" style="word-wrap: break-word;">
              <!-- Deleted -->
              <div v-if="msg.isDeleted" class="text-decoration-line-through font-italic" style="opacity: 0.6;">
                {{ msg.content || '(tin nhắn)' }}<span class="text-caption"> (đã thu hồi)</span>
              </div>
              <!-- Image -->
              <div v-else-if="getImageUrl(msg)">
                <img :src="getImageUrl(msg)!" alt="Hình ảnh" class="chat-image" @click="previewImageUrl = getImageUrl(msg)!" />
              </div>
              <!-- File/PDF -->
              <div v-else-if="getFileInfo(msg)" class="file-card">
                <v-icon size="20" class="mr-2" color="info">mdi-file-document-outline</v-icon>
                <div class="flex-grow-1">
                  <div class="text-body-2 font-weight-medium">{{ getFileInfo(msg)!.name }}</div>
                  <div class="text-caption" style="opacity: 0.6;">{{ getFileInfo(msg)!.size }}</div>
                </div>
                <v-btn v-if="getFileInfo(msg)!.href" icon size="x-small" variant="text" @click="openFile(getFileInfo(msg)!.href)">
                  <v-icon size="16">mdi-download</v-icon>
                </v-btn>
              </div>
              <!-- Sticker/Video/Voice/GIF -->
              <div v-else-if="msg.contentType === 'sticker'">🏷️ Sticker</div>
              <div v-else-if="msg.contentType === 'video'">
                <video v-if="getMediaUrl(msg)" :src="getMediaUrl(msg)!" controls preload="metadata" playsinline style="max-width: 100%; max-height: 300px; border-radius: 8px" />
                <span v-else>Video (chưa có đường dẫn phát)</span>
              </div>
              <div v-else-if="msg.contentType === 'voice'">
                <audio v-if="getMediaUrl(msg)" :src="getMediaUrl(msg)!" controls preload="none" style="max-width: 100%" />
                <span v-else>Tin nhắn thoại (chưa có đường dẫn phát)</span>
              </div>
              <div v-else-if="msg.contentType === 'gif'">GIF</div>
              <!-- Reminder/Calendar -->
              <div v-else-if="isReminderMessage(msg)" class="reminder-card">
                <div class="d-flex align-center mb-1">
                  <v-icon size="16" color="warning" class="mr-1">mdi-calendar-clock</v-icon>
                  <span class="text-caption font-weight-bold" style="color: #FFB74D;">Nhắc hẹn</span>
                </div>
                <div class="text-body-2">{{ getReminderTitle(msg) }}</div>
                <div v-if="getReminderTime(msg)" class="text-caption mt-1" style="opacity: 0.7;">
                  <v-icon size="12" class="mr-1">mdi-clock-outline</v-icon>{{ getReminderTime(msg) }}
                </div>
                <v-btn size="x-small" variant="tonal" color="warning" class="mt-2" prepend-icon="mdi-calendar-sync" @click="syncAppointment(msg)">
                  Đồng bộ lịch
                </v-btn>
              </div>
              <!-- Default text -->
              <div v-else>{{ parseDisplayContent(msg.content) }}</div>
              <!-- Timestamp -->
              <div class="text-caption mt-1 msg-time" :class="msg.senderType === 'self' ? 'msg-time-self' : 'msg-time-contact'" style="font-size: 0.7rem;">
                {{ formatMessageTime(msg.sentAt) }}
              </div>
            </div>
          </div>
        </div>
        <div v-if="!loading && messages.length === 0" class="text-center pa-8 text-grey">Chưa có tin nhắn</div>
      </div>

      <!-- Quick replies: insert draft only, never send automatically -->
      <div class="px-3 pt-2 d-flex ga-2 flex-wrap">
        <v-chip v-for="template in quickReplies" :key="template.id" size="small" variant="outlined" color="primary" @click="insertQuickReply(template.text)">{{ template.title }}</v-chip>
        <v-btn v-if="authStore.isAdmin" size="x-small" variant="text" prepend-icon="mdi-pencil-outline" @click="showSnippetEditor=true">Quản lý mẫu</v-btn>
      </div>
      <!-- Input -->
      <div class="pa-2 d-flex align-end chat-input-area">
        <v-textarea v-model="inputText" placeholder="Nhập tin nhắn..." variant="solo-filled" density="compact" hide-details auto-grow rows="1" max-rows="3" @keydown.enter.exact.prevent="handleSend" class="flex-grow-1 mr-2" />
        <v-btn icon color="primary" :loading="sending" :disabled="!inputText.trim()" @click="handleSend"><v-icon>mdi-send</v-icon></v-btn>
      </div>
    </template>

    <!-- Organization-level quick reply templates -->
    <v-dialog v-model="showSnippetEditor" max-width="650" scrollable>
      <v-card rounded="lg">
        <v-card-title>Thư viện mẫu tin nhắn</v-card-title>
        <v-card-text>
          <p class="text-caption mb-3">Dùng <code v-pre>{{name}}</code> để chèn tên khách và <code v-pre>{{agent}}</code> để chèn tên nhân viên. Mẫu chỉ được đưa vào ô soạn thảo, không gửi tự động.</p>
          <v-alert v-if="snippetError" type="error" variant="tonal" class="mb-3">{{ snippetError }}</v-alert>
          <v-row v-for="(snippet,i) in quickReplies" :key="snippet.id" dense align="center">
            <v-col cols="11"><v-text-field v-model="snippet.title" label="Tên mẫu" variant="outlined" density="compact" :counter="70" class="mb-1" />
              <v-textarea v-model="snippet.text" label="Nội dung" variant="outlined" density="compact" rows="2" auto-grow :counter="1500" /></v-col>
            <v-col cols="1"><v-btn icon="mdi-delete-outline" color="error" variant="text" @click="quickReplies.splice(i,1)" /></v-col>
          </v-row>
          <v-btn prepend-icon="mdi-plus" variant="tonal" :disabled="quickReplies.length>=30" @click="addQuickReply">Thêm mẫu</v-btn>
        </v-card-text>
        <v-card-actions><v-spacer/><v-btn @click="cancelSnippetEdit">Hủy</v-btn><v-btn color="primary" :loading="savingSnippets" @click="saveQuickReplies">Lưu</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
    <!-- Image preview dialog -->
    <v-dialog v-model="showImagePreview" max-width="900" content-class="elevation-0">
      <div class="text-center" @click="showImagePreview = false" style="cursor: pointer;">
        <img :src="previewImageUrl" alt="Preview" style="max-width: 100%; max-height: 85vh; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);" />
        <div class="text-caption mt-2" style="color: #aaa;">Nhấn để đóng</div>
      </div>
    </v-dialog>

    <!-- Sync snackbar -->
    <v-snackbar v-model="syncSnack.show" :color="syncSnack.color" timeout="3000">{{ syncSnack.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import type { Conversation, Message } from '@/composables/use-chat';
import { api } from '@/api/index';

const props = defineProps<{
  conversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  sending: boolean;
  showContactPanel?: boolean;
}>();

const emit = defineEmits<{ send: [content: string]; 'toggle-contact-panel': [] }>();

const inputText = ref('');
type Snippet = {id:string;title:string;text:string};
const authStore=useAuthStore();
const quickReplies=ref<Snippet[]>([]);
const showSnippetEditor=ref(false),savingSnippets=ref(false),snippetError=ref('');
async function loadQuickReplies(){
  try{const {data}=await api.get('/chat/quick-replies');quickReplies.value=data.templates;}
  catch{snippetError.value='Không thể tải thư viện mẫu tin nhắn';}
}
function addQuickReply(){quickReplies.value.push({id:crypto.randomUUID(),title:'Mẫu mới',text:'Nhập nội dung mẫu'});}
function cancelSnippetEdit(){showSnippetEditor.value=false;snippetError.value='';loadQuickReplies();}
async function saveQuickReplies(){
  savingSnippets.value=true;snippetError.value='';
  try{await api.put('/chat/quick-replies',{templates:quickReplies.value});showSnippetEditor.value=false;await loadQuickReplies();}
  catch{snippetError.value='Không thể lưu mẫu: kiểm tra nội dung và quyền quản trị';}
  finally{savingSnippets.value=false;}
}
function insertQuickReply(text:string){
  const contactName=props.conversation?.contact?.fullName?.trim()||'anh/chị';
  const agentName=authStore.user?.fullName?.trim()||'nhân viên tư vấn';
  const output=text.replace(/\{\{name\}\}/g,contactName).replace(/\{\{agent\}\}/g,agentName);
  inputText.value=inputText.value.trim()?inputText.value+'\n'+output:output;
}
onMounted(loadQuickReplies);
const messagesContainer = ref<HTMLElement | null>(null);
const previewImageUrl = ref('');
const showImagePreview = computed({ get: () => !!previewImageUrl.value, set: (v) => { if (!v) previewImageUrl.value = ''; } });
const syncSnack = ref({ show: false, text: '', color: 'success' });

function handleSend() { if (!inputText.value.trim()) return; emit('send', inputText.value); inputText.value = ''; }
function formatMessageTime(d: string) { return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); }
function openFile(url: string) { window.open(url, '_blank'); }

/** Extract image URL from JSON content */
function getImageUrl(msg: Message): string | null {
  if (msg.contentType === 'image' && msg.content) {
    if (msg.content.startsWith('http')) return msg.content;
    try { const p = JSON.parse(msg.content); return p.href || p.thumb || p.hdUrl || null; } catch {}
  }
  if (msg.content?.startsWith('{')) {
    try {
      const p = JSON.parse(msg.content);
      const href = p.href || p.thumb || '';
      if (href && /\.(jpg|jpeg|png|webp|gif)/i.test(href)) return href;
      if (href && href.includes('zdn.vn') && !p.params?.includes('fileExt')) return href;
    } catch {}
  }
  return null;
}

/** Render available remote media without uploading or changing message history. */
function getMediaUrl(msg: Message): string | null {
  const value=msg.content?.trim();
  if (!value) return null;
  let candidate=value;
  if (value.startsWith('{')) {
    try {
      const item=JSON.parse(value);
      const p=typeof item.params==='string'?JSON.parse(item.params):item.params;
      candidate=item.hdUrl || item.href || item.url || p?.hdUrl || p?.href || p?.url || '';
    } catch { return null; }
  }
  try {
    const url=new URL(candidate);
    return ['https:','http:'].includes(url.protocol)?url.href:null;
  } catch { return null; }
}

/** Extract file info from JSON content (PDF, docs, etc.) */
function getFileInfo(msg: Message): { name: string; size: string; href: string } | null {
  if (!msg.content?.startsWith('{')) return null;
  try {
    const p = JSON.parse(msg.content);
    const params = typeof p.params === 'string' ? JSON.parse(p.params) : p.params;
    if (params?.fileExt || params?.fType === 1) {
      const bytes = parseInt(params.fileSize || '0');
      const size = bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
      return { name: p.title || `file.${params.fileExt || 'unknown'}`, size, href: p.href || '' };
    }
  } catch {}
  return null;
}

function parseDisplayContent(content: string | null): string {
  if (!content) return '';
  if (!content.startsWith('{')) return content;
  try {
    const p = JSON.parse(content);
    if (p.title && p.href) return `🔗 ${p.title}`;
    if (p.title) return p.title;
    if (p.href) return `🔗 ${p.description || p.href}`;
    return content;
  } catch { return content; }
}

function isReminderMessage(msg: Message): boolean {
  if (!msg.content) return false;
  try { const p = JSON.parse(msg.content); return p.action === 'msginfo.actionlist'; } catch { return false; }
}

function getReminderTitle(msg: Message): string {
  try { return JSON.parse(msg.content!).title || ''; } catch { return msg.content || ''; }
}

function getReminderTime(msg: Message): string | null {
  try {
    const p = JSON.parse(msg.content!);
    const params = typeof p.params === 'string' ? JSON.parse(p.params) : p.params;
    for (const h of (params?.highLightsV2 || [])) {
      if (h.ts > 1e12) return new Date(h.ts).toLocaleString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  } catch {}
  return null;
}

/** Sync Zalo reminder to CRM appointments via API */
async function syncAppointment(msg: Message) {
  if (!props.conversation?.contact?.id) { syncSnack.value = { show: true, text: 'Không có thông tin khách hàng', color: 'error' }; return; }
  try {
    const p = JSON.parse(msg.content!);
    const params = typeof p.params === 'string' ? JSON.parse(p.params) : p.params;
    let appointmentDate: string | null = null;
    for (const h of (params?.highLightsV2 || [])) {
      if (h.ts > 1e12) { appointmentDate = new Date(h.ts).toISOString(); break; }
    }
    if (!appointmentDate) { syncSnack.value = { show: true, text: 'Không tìm thấy thời gian hẹn', color: 'warning' }; return; }
    await api.post('/appointments', {
      contactId: props.conversation.contact.id,
      appointmentDate,
      appointmentTime: new Date(appointmentDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      type: 'tai_kham',
      notes: `[Zalo] ${p.title || ''}`,
    });
    syncSnack.value = { show: true, text: 'Đã đồng bộ lịch hẹn thành công!', color: 'success' };
  } catch (err: any) {
    syncSnack.value = { show: true, text: err.response?.data?.error || 'Đồng bộ thất bại', color: 'error' };
  }
}

watch(() => props.messages.length, async () => { await nextTick(); if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight; });
</script>

<style scoped>
.message-bubble { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); }
.reminder-card { padding: 8px 12px; border-left: 3px solid #FFB74D; border-radius: 8px; background: rgba(255, 183, 77, 0.08); }
.file-card { display: flex; align-items: center; padding: 8px 12px; border-radius: 8px; background: rgba(0, 242, 255, 0.05); border: 1px solid rgba(0, 242, 255, 0.1); }
.chat-image { max-width: 100%; max-height: 300px; border-radius: 12px; cursor: pointer; transition: transform 0.2s; }
.chat-image:hover { transform: scale(1.02); }
</style>
