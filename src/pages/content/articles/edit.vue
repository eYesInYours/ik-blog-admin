<script setup lang="ts">
import type { Article } from "@/types/article"
import { articleApi } from "@/api/article"
import { categoryApi } from "@/api/category"
import { uploadImage } from "@/api/upload"
import { compressImage } from "@/common/utils/image"
import { Editor, Toolbar } from "@wangeditor/editor-for-vue"
import { ElMessage } from "element-plus"
import { onBeforeUnmount, onMounted, ref, shallowRef } from "vue"
import { useRoute, useRouter } from "vue-router"
import "@wangeditor/editor/dist/css/style.css"

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const categories = ref<{ _id: string, name: string }[]>([])

// 编辑器实例
const editorRef = shallowRef()
// 编辑器内容
const valueHtml = ref("")

// 工具栏配置
const toolbarConfig = {
  excludeKeys: [
    "group-video",
    "group-image",
    "insertTable",
    "group-justify",
    "emotion",
    "bgColor",
    "fontSize"
  ]
}

// 编辑器配置
const editorConfig = {
  placeholder: "请输入内容...",
  autoFocus: false,
  MENU_CONF: {}
}

// 文章表单
const article = ref<Partial<Article>>({
  title: "",
  content: "",
  tags: [],
  category: "",
  status: "draft",
  allowComment: true,
  cover: "",
  summary: ""
})

// 封面图文件
const coverImageFile = ref<File | null>(null)

// 获取分类列表
async function fetchCategories() {
  try {
    const { data } = await categoryApi.getList()
    categories.value = data.categories
  } catch (error) {
    ElMessage.error("获取分类列表失败")
  }
}

// 获取文章详情
async function fetchArticle(id: string) {
  loading.value = true
  try {
    const { data } = await articleApi.getDetail(id)
    article.value = data
    valueHtml.value = data.content
  } catch (error) {
    ElMessage.error("获取文章详情失败")
  } finally {
    loading.value = false
  }
}

// 发布文章
async function handleSave(status: "draft" | "published") {
  if (!article.value.title?.trim()) {
    ElMessage.warning("请输入文章标题")
    return
  }

  loading.value = true
  try {
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

    article.value.status = status
    article.value.content = valueHtml.value
    
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

onMounted(() => {
  fetchCategories()
  const id = route.query.id as string
  if (id) {
    fetchArticle(id)
  }
})

// 组件销毁时，也及时销毁编辑器
onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor == null) return
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
        <!-- <el-button @click="handleSave('draft')">
          保存草稿
        </el-button> -->
        <el-button
          type="primary"
          :loading="loading"
          @click="handleSave('published')"
        >
          {{ article._id ? "更新文章" : "发布文章" }}
        </el-button>
      </div>
    </div>

    <div class="main">
      <!-- 左侧编辑区 -->
      <div class="editor-container">
        <el-input
          v-model="article.title"
          placeholder="请输入文章标题"
          class="title-input"
          size="large"
          clearable
        />
        <div class="editor-wrapper">
          <!-- 工具栏 -->
          <Toolbar
            :editor="editorRef"
            :default-config="toolbarConfig"
            class="toolbar"
          />
          <!-- 编辑区 -->
          <div class="edit-area">
            <Editor
              v-model="valueHtml"
              :default-config="editorConfig"
              @on-created="editorRef = $event"
              class="editor"
            />
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
              <el-tree-select
                v-model="article.category"
                :data="categories"
                node-key="_id"
                :props="{ label: 'name' }"
                clearable
                placeholder="请选择分类"
              />
            </el-form-item>

            <el-form-item label="标签">
              <el-select
                v-model="article.tags"
                multiple
                filterable
                allow-create
                placeholder="请选择或输入标签"
              />
            </el-form-item>

            <el-form-item label="封面图">
              <el-upload
                class="cover-uploader"
                :show-file-list="false"
                accept="image/*"
                :before-upload="handleUploadCover"
              >
                <el-image
                  v-if="article.cover"
                  :src="article.cover"
                  class="cover-image"
                />
                <el-icon v-else class="upload-icon">
                  <Plus />
                </el-icon>
              </el-upload>
            </el-form-item>

            <el-form-item label="文章摘要">
              <el-input
                v-model="article.summary"
                type="textarea"
                :rows="4"
                placeholder="请输入文章摘要"
              />
            </el-form-item>

            <el-form-item>
              <el-switch
                v-model="article.allowComment"
                active-text="允许评论"
                inactive-text="禁止评论"
              />
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

  .header {
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
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
        margin-bottom: 20px;
      }

      .editor-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        border: 1px solid var(--el-border-color);
        border-radius: 4px;
        overflow: hidden;

        .toolbar {
          border-bottom: 1px solid var(--el-border-color);
        }

        .edit-area {
          flex: 1;
          overflow: auto;
        }

        .editor {
          height: 100%;
        }
      }
    }

    .settings {
      width: 300px;
      overflow-y: auto;

      .setting-card {
        position: sticky;
        top: 0;
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
</style>
