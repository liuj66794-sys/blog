/**
 * @vuepress/plugin-comment@2.0.0-rc.131 的 client 引用了包自身的
 * "@vuepress/plugin-comment/service" 子路径，但该版本 exports 里没有声明、
 * dist 里也没有这个文件——打包时被解析成空模块，评论区静默不渲染。
 * 这里用 vite alias 把该子路径指到本 shim：按注入的评论选项分发组件。
 * 上游修复后（exports 含 ./service）可直接删除本文件与 config.ts 里的 alias。
 */
import { computed, defineComponent, h } from 'vue'
// 应用源文件经 exports 子路径解析会失败（./components/* 未对 app 上下文开放），
// 直接相对路径引 dist 文件；GiscusComment 内部会自行读取注入的评论选项
import { useGiscusOptions } from '../../../node_modules/@vuepress/plugin-comment/dist/client/index.js'
import GiscusComment from '../../../node_modules/@vuepress/plugin-comment/dist/client/components/GiscusComment.js'

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
