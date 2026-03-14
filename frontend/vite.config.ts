import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const manualChunks = (id: string) => {
  if (!id.includes('node_modules')) {
    return
  }

  if (
    id.includes('/react/') ||
    id.includes('/react-dom/') ||
    id.includes('/scheduler/') ||
    id.includes('/react-router/') ||
    id.includes('/react-router-dom/') ||
    id.includes('/@tanstack/react-query/') ||
    id.includes('/@tanstack/query-core/') ||
    id.includes('/sonner/') ||
    id.includes('/use-sync-external-store/')
  ) {
    return 'app-framework'
  }

  if (
    id.includes('/pocketbase/') ||
    id.includes('/date-fns/')
  ) {
    return 'data-client'
  }

  if (
    id.includes('/@heroui/') ||
    id.includes('/@nextui-org/') ||
    id.includes('/framer-motion/') ||
    id.includes('/@react-aria/') ||
    id.includes('/@react-stately/') ||
    id.includes('/@react-types/') ||
    id.includes('/@internationalized/') ||
    id.includes('/@floating-ui/') ||
    id.includes('/@zag-js/') ||
    id.includes('/react-remove-scroll/') ||
    id.includes('/aria-hidden/') ||
    id.includes('/@swc/helpers/') ||
    id.includes('/motion-dom/') ||
    id.includes('/motion-utils/') ||
    id.includes('/@tanstack/react-virtual/') ||
    id.includes('/input-otp/') ||
    id.includes('/react-transition-group/') ||
    id.includes('/react-textarea-autosize/') ||
    id.includes('/tailwind-merge/') ||
    id.includes('/tailwind-variants/') ||
    id.includes('/class-variance-authority/') ||
    id.includes('/linkifyjs/') ||
    id.includes('/decimal.js-light/')
  ) {
    return 'ui-kit'
  }

  if (
    id.includes('/@tiptap/') ||
    id.includes('/prosemirror/') ||
    id.includes('/prosemirror-') ||
    id.includes('/marked/') ||
    id.includes('/dompurify/') ||
    id.includes('/react-markdown/') ||
    id.includes('/remark-gfm/') ||
    id.includes('/react-syntax-highlighter/') ||
    id.includes('/unified/') ||
    id.includes('/remark-/') ||
    id.includes('/rehype-/') ||
    id.includes('/micromark/') ||
    id.includes('/mdast-') ||
    id.includes('/hast-') ||
    id.includes('/unist-') ||
    id.includes('/vfile/') ||
    id.includes('/property-information/') ||
    id.includes('/space-separated-tokens/') ||
    id.includes('/comma-separated-tokens/') ||
    id.includes('/decode-named-character-reference/') ||
    id.includes('/character-entities/') ||
    id.includes('/html-url-attributes/') ||
    id.includes('/prismjs/') ||
    id.includes('/highlight.js/')
  ) {
    return 'editor-markdown'
  }

  if (
    id.includes('/recharts/') ||
    id.includes('/recharts-scale/') ||
    id.includes('/react-smooth/') ||
    id.includes('/d3-') ||
    id.includes('/internmap/') ||
    id.includes('/@tremor/')
  ) {
    return 'charts'
  }

  if (
    id.includes('/@hello-pangea/dnd/') ||
    id.includes('/redux/') ||
    id.includes('/react-redux/') ||
    id.includes('/raf-schd/') ||
    id.includes('/css-box-model/')
  ) {
    return 'dnd'
  }

  if (
    id.includes('/lucide-react/') ||
    id.includes('/@heroicons/react/')
  ) {
    return 'icons'
  }

  return 'vendor'
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
})
