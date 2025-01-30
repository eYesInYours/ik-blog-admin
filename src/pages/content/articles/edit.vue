<script setup lang="ts">
import type { Article } from "@/types/article"
import { articleApi } from "@/api/article"
import { categoryApi } from "@/api/category"
import { uploadImage } from "@/api/upload"
import { compressImage } from "@/common/utils/image"
import { Editor, Toolbar } from "@wangeditor/editor-for-vue"
import { ElMessage, ElMessageBox } from "element-plus"
import { onBeforeUnmount, onMounted, ref, shallowRef } from "vue"
import { useRoute, useRouter } from "vue-router"
import "@wangeditor/editor/dist/css/style.css"
import type { IEditorConfig, IToolbarConfig } from '@wangeditor/editor'
import type { SlateElement } from '@wangeditor/editor'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const categories = ref<{ _id: string, name: string }[]>([])

// 编辑器实例
const editorRef = shallowRef()
// 编辑器内容
const valueHtml = ref("")

// 工具栏配置
const toolbarConfig: Partial<IToolbarConfig> = {
  excludeKeys: [
    "group-justify",
  ]
}

// 存储待上传的图片文件
const pendingImages = ref<Map<string, File>>(new Map())

// 编辑器配置
const editorConfig: Partial<IEditorConfig> = {
  placeholder: "请输入内容...",
  autoFocus: false,
  MENU_CONF: {
    // 图片上传配置
    uploadImage: {
      // 自定义上传函数
      async customUpload(file: File, insertFn: Function) {
        try {
          // 检查文件大小，如果大于2M则压缩
          let processedFile = file
          if (file.size > 2 * 1024 * 1024) {
            processedFile = await compressImage(file)
          }

          // 生成临时预览图片地址
          const blobUrl = URL.createObjectURL(processedFile)

          // 保存文件引用，等发布时再上传
          pendingImages.value.set(blobUrl, processedFile)

          // 插入临时图片
          insertFn(blobUrl)
        } catch (error) {
          ElMessage.error('图片处理失败')
        }
      }
    }
  }
}

// 文章表单
const article = ref<Partial<Article>>({
  title: "",
  content: "",
  tags: [],
  category: "", // id
  categoryName: "", // name
  status: "draft",
  allowComment: true,
  cover: "",
  summary: ""
})

// 封面图文件
const coverImageFile = ref<File | null>(null)

// 控制确认对话框显示
const showPublishConfirm = ref(false)

// 获取分类列表
async function fetchCategories() {
  try {
    const { data } = await categoryApi.getList()
    categories.value = data.categories
  } catch (error) {
    ElMessage.error("获取分类列表失败")
  }
}

// 获取文章数据
async function fetchArticle(id: string) {
  loading.value = true
  try {
    const type = route.query.type as string
    const isNew = route.query.isNew === 'true'
    let response

    if (type === 'draft' && !isNew) {
      // 加载已有的草稿版本
      response = await articleApi.getDraft(id)
    } else {
      // 加载正式文章
      response = await articleApi.getDetail(id)
    }

    article.value = response.data
    valueHtml.value = response.data.content
  } catch (error) {
    ElMessage.error('加载文章失败')
  } finally {
    loading.value = false
  }
}

// 递归查找分类路径
function findCategoryPath(categories: any[], targetId: string): string | null {
  for (const category of categories) {
    // 检查当前分类
    if (category._id === targetId) {
      return category.name
    }

    // 检查子分类
    if (category.children?.length) {
      const childPath = findCategoryPath(category.children, targetId)
      if (childPath) {
        return `${category.name} / ${childPath}`
      }
    }
  }
  return null
}

// 发布文章
async function handleSave(status: "draft" | "published") {
  if (!article.value.title?.trim()) {
    ElMessage.warning("请输入文章标题")
    return
  }
  if (!article.value.category) {
    return ElMessage.warning("请选择分类")
  }

  loading.value = true
  try {
    // 查找完整分类路径
    if (article.value.category) {
      const categoryPath = findCategoryPath(categories.value, article.value.category)
      if (categoryPath) {
        article.value.categoryName = categoryPath
      }
    }

    // 如果有待上传的封面图文件，先上传图片
    if (coverImageFile.value) {
      const formData = new FormData()
      formData.append("file", coverImageFile.value)
      const { data } = await uploadImage(formData)
      article.value.cover = data.file.url
      // 清理临时文件
      URL.revokeObjectURL(article.value.cover)
      coverImageFile.value = null
    }

    // 上传编辑器中的图片并替换URL
    let content = valueHtml.value
    for (const [blobUrl, file] of pendingImages.value.entries()) {
      const formData = new FormData()
      formData.append("file", file)
      const { data } = await uploadImage(formData)
      content = content.replace(blobUrl, data.file.url)
      // 清理临时文件
      URL.revokeObjectURL(blobUrl)
    }
    pendingImages.value.clear()

    article.value.status = status
    article.value.content = content

    if (article.value._id) {
      await articleApi.update(article.value._id, article.value)
    } else {
      await articleApi.create(article.value)
    }

    ElMessage.success(status === "published" ? "发布成功" : "保存成功")
    router.push("/content/articles")
  } catch (error) {
    ElMessage.error(status === "published" ? "发布失败" : "保存失败")
  } finally {
    loading.value = false
  }
}

// 获取图片
async function handleUploadCover(file: File) {
  try {
    // 检查文件大小，如果大于2M则压缩
    let processedFile = file
    if (file.size > 2 * 1024 * 1024) {
      processedFile = await compressImage(file)
    }

    // 生成临时预览图片地址
    const blobUrl = URL.createObjectURL(processedFile)
    article.value.cover = blobUrl
    coverImageFile.value = processedFile
    return false
  } catch (error) {
    ElMessage.error("封面图处理失败")
    return false
  }
}

// 保存为草稿版本
async function saveAsDraft() {
  if (!article.value.title?.trim()) {
    ElMessage.warning("请输入文章标题")
    return
  }

  loading.value = true
  try {
    // 处理图片等资源...
    await handleResources()

    // 创建/更新草稿
    const response = await articleApi.createDraft({
      ...article.value,
      originalArticleId: route.query.id // 如果是编辑已有文章，传入原文ID
    })

    ElMessage.success('草稿保存成功')
    router.push('/content/articles')
  } catch (error) {
    ElMessage.error('保存草稿失败')
  } finally {
    loading.value = false
  }
}

// 处理资源（图片等）上传
async function handleResources() {
  // 如果有待上传的封面图文件，先上传图片
  if (coverImageFile.value) {
    const formData = new FormData()
    formData.append("file", coverImageFile.value)
    const { data } = await uploadImage(formData)
    article.value.cover = data.file.url
    URL.revokeObjectURL(article.value.cover)
    coverImageFile.value = null
  }

  // 上传编辑器中的图片并替换URL
  let content = valueHtml.value
  for (const [blobUrl, file] of pendingImages.value.entries()) {
    const formData = new FormData()
    formData.append("file", file)
    const { data } = await uploadImage(formData)
    content = content.replace(blobUrl, data.file.url)
    URL.revokeObjectURL(blobUrl)
  }
  pendingImages.value.clear()
  article.value.content = content
}

// 确认发布
async function confirmPublish() {
  showPublishConfirm.value = false
  await handleSave('published')
}

// 处理发布按钮点击
function handlePublishClick() {
  if (!article.value.title?.trim()) {
    return ElMessage.warning("请输入文章标题")
  }
  if (!article.value.category) {
    return ElMessage.warning("请选择分类")
  }
  showPublishConfirm.value = true
}

onMounted(() => {
  fetchCategories()
  const id = route.query.id as string
  if (id) {
    fetchArticle(id)
  }
})

// 组件销毁时清理临时文件
onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor == null) return
  // 清理所有临时图片URL
  pendingImages.value.forEach((_, url) => {
    URL.revokeObjectURL(url)
  })
  editor.destroy()
})
</script>

<template>
  <div class="article-edit">
    <!-- 顶部操作栏 -->
    <div class="header">
      <div class="left">
        <el-button @click="router.back()">
          返回
        </el-button>
        <el-button @click="saveAsDraft">存为草稿</el-button>
        
        <!-- 草稿发布按钮 -->
        <el-button 
          v-if="route.query.type === 'draft'"
          type="primary" 
          :loading="loading"
          @click="handlePublishClick"
        >
          发布草稿
        </el-button>

        <!-- 普通发布按钮 -->
        <el-button 
          v-else
          type="primary" 
          :loading="loading" 
          @click="handleSave('published')"
        >
          {{ article._id ? "更新文章" : "发布文章" }}
        </el-button>
      </div>
    </div>

    <!-- 发布确认对话框 -->
    <el-dialog
      v-model="showPublishConfirm"
      title="发布确认"
      width="400px"
      :close-on-click-modal="false"
    >
      <span>确定要发布草稿吗？发布后将覆盖当前的线上版本。</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showPublishConfirm = false">取消</el-button>
          <el-button type="primary" @click="confirmPublish">
            确认发布
          </el-button>
        </span>
      </template>
    </el-dialog>

    <div class="main">
      <!-- 左侧编辑区 -->
      <div class="editor-container">
        <el-input v-model="article.title" placeholder="请输入文章标题" class="title-input" size="large" clearable />
        <div class="editor-wrapper">
          <!-- 工具栏 -->
          <Toolbar :editor="editorRef" :default-config="toolbarConfig" class="toolbar" />
          <!-- 编辑区 -->
          <div class="edit-area">
            <Editor v-model="valueHtml" :default-config="editorConfig" @on-created="editorRef = $event"
              class="editor" />
          </div>
        </div>
      </div>

      <!-- 右侧设置区 -->
      <div class="settings">
        <el-card class="setting-card">
          <template #header>
            <div class="card-header">
              <span>文章设置</span>
            </div>
          </template>

          <el-form label-position="top">
            <el-form-item label="分类">
              <el-tree-select v-model="article.category" :data="categories" node-key="_id" :props="{ label: 'name' }"
                clearable placeholder="请选择分类" />
            </el-form-item>

            <el-form-item label="标签">
              <el-select v-model="article.tags" multiple filterable allow-create placeholder="请选择或输入标签" />
            </el-form-item>

            <el-form-item label="封面图">
              <el-upload class="cover-uploader" :show-file-list="false" accept="image/*"
                :before-upload="handleUploadCover">
                <el-image v-if="article.cover" :src="article.cover" fit="cover" class="cover-image" />
                <el-icon v-else class="upload-icon">
                  <Plus />
                </el-icon>
              </el-upload>
            </el-form-item>

            <el-form-item label="文章摘要">
              <el-input v-model="article.summary" type="textarea" :rows="4" placeholder="请输入文章摘要" />
            </el-form-item>

            <el-form-item>
              <el-switch v-model="article.allowComment" active-text="允许评论" inactive-text="禁止评论" />
            </el-form-item>
          </el-form>
        </el-card>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.article-edit {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;

  // 确保编辑器内容不会遮挡弹窗
  :deep(.el-overlay) {
    z-index: 2001; // 设置比编辑器更高的层级
  }

  // 确保弹窗显示在最上层
  :deep(.el-message-box__wrapper) {
    z-index: 2002;
  }

  .header {
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 1rem;
  }

  .main {
    flex: 1;
    display: flex;
    gap: 20px;
    height: calc(100vh - 180px);
    overflow: hidden;

    .editor-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      .title-input {
        margin-bottom: 1px;
        :deep(.el-input__wrapper) {
          box-shadow: none;
          border-radius: 0;
          padding: 0.75rem 1rem;
          background-color: white;
        }
        :deep(.el-input__inner) {
          font-size: 1.5rem;
          font-weight: 500;
          &::placeholder {
            color: #999;
          }
        }
      }

      .editor-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        border: none;
        overflow: hidden;
        background-color: white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

        .toolbar {
          border-bottom: 1px solid #e8e8e8;
          padding: 0.5rem;

          :deep(.w-e-bar) {
            padding: 0 0.5rem;
          }

          :deep(.w-e-bar-item) {
            margin: 0 2px;

            button {
              padding: 0.25rem;
              border-radius: 4px;
              &:hover {
                background-color: #f3f3f3;
              }
            }
          }
        }

        .edit-area {
          flex: 1;
          overflow: auto;
          padding: 0 1rem;

          :deep(.w-e-text-container) {
            height: 100% !important;
          }

          :deep([data-slate-editor="true"]) {
            padding: 1rem 0;
          }
        }

        .editor {
          height: 100%;

          :deep(.w-e-scroll) {
            padding: 0;
          }
        }
      }
    }

    .settings {
      width: 300px;
      overflow-y: auto;

      .setting-card {
        position: sticky;
        top: 0;
        border-radius: 4px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .cover-uploader {
        border: 1px dashed var(--el-border-color);
        border-radius: 6px;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        transition: var(--el-transition-duration);

        &:hover {
          border-color: var(--el-color-primary);
        }

        .upload-icon {
          font-size: 28px;
          color: #8c939d;
          width: 178px;
          height: 178px;
          text-align: center;
          line-height: 178px;
        }

        .cover-image {
          width: 178px;
          height: 178px;
          display: block;
          object-fit: cover;
        }
      }
    }
  }
}

/* 暗色模式适配 */
:root[class~="dark"] {
  .article-edit {
    background-color: #1a1a1a;
  }

  .editor-container {
    .title-input {
      :deep(.el-input__wrapper) {
        background-color: #262626;
      }
    }

    .editor-wrapper {
      background-color: #262626;

      .toolbar {
        border-color: #363636;

        :deep(.w-e-bar-item button:hover) {
          background-color: #363636;
        }
      }
    }
  }
}
</style>
