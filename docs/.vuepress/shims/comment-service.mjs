/**
 * @vuepress/plugin-comment@2.0.0-rc.131 的 client 引用了包自身的
 * "@vuepress/plugin-comment/service" 子路径，但该版本 exports 里没有声明、
 * dist 里也没有这个文件——打包时被解析成空模块，评论区静默不渲染。
 * 这里用 vite alias 把该子路径指到本 shim：按注入的评论选项分发组件。
 * 上游修复后（exports 含 ./service）可直接删除本文件与 config.ts 里的 alias。
 */
import { computed, defineComponent, h } from 'vue'
// 走包 exports 表里的公开子路径（rc.131 已声明 ./client 与 ./components/*），
// 不依赖 pnpm hoisting 布局；GiscusComment 内部会自行读取注入的评论选项
import { useGiscusOptions } from '@vuepress/plugin-comment/client'
import GiscusComment from '@vuepress/plugin-comment/components/GiscusComment'

export default defineComponent({
  name: 'CommentServiceShim',
  props: {
    identifier: { type: String, required: false, default: undefined },
    darkmode: { type: Boolean, default: false },
  },
  setup(props) {
    const giscus = useGiscusOptions()
    const ready = computed(() => Boolean(giscus.value?.repo && giscus.value?.repoId))
    return () =>
      ready.value ? h(GiscusComment, { identifier: props.identifier, darkmode: props.darkmode }) : null
  },
})
