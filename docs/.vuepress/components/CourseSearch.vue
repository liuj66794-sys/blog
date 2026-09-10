<script setup>
import { computed, ref } from 'vue'
const props = defineProps({
  id: { type: String, required: true },
  modelValue: { type: String, default: '' },
  label: { type: String, default: '查找课程、课次或知识点' },
  placeholder: { type: String, default: '输入知识点或课次' },
  disabled: Boolean,
})
const emit = defineEmits(['update:modelValue'])
const input = ref(null)
const model = computed({ get: () => props.modelValue, set: value => emit('update:modelValue', value) })
function clear() { emit('update:modelValue', ''); input.value?.focus() }
defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div class="course-search">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>
    <label class="sr-only" :for="id">{{ label }}</label>
    <input ref="input" :id="id" name="q" type="search" v-model="model" :disabled="disabled"
      :placeholder="disabled ? '正在加载筛选…' : placeholder" enterkeyhint="search" autocomplete="off"
      @keydown.esc.prevent="clear" />
    <button v-if="modelValue" type="button" class="course-search__clear" :disabled="disabled" aria-label="清除搜索" @click="clear"><span aria-hidden="true">×</span></button>
  </div>
</template>
