<script setup lang="ts">
import type { Category } from "@/types/category"
import { categoryApi } from "@/api/category"
import { ElMessage, ElMessageBox } from "element-plus"
import { onMounted, ref } from "vue"

interface CategoryForm {
  _id?: string
  name: string
  description: string
  icon?: string
  coverImage?: string
  parentId?: string
  sort: number
}

const categories = ref<Category[]>([])
const dialogVisible = ref(false)
const dialogTitle = ref("新建分类")
const formLoading = ref(false)
const form = ref<CategoryForm>({
  name: "",
  description: "",
  sort: 0
})

// 表单规则
const rules = {
  name: [{ required: true, message: "请输入分类名称", trigger: "blur" }],
  sort: [{ required: true, type: "number" as const, message: "请输入有效的排序号", trigger: "blur" }]
}

const treeData = ref<Category[]>([])

// 获取分类列表
async function fetchCategories() {
  try {
    const { data } = await categoryApi.getList()
    categories.value = data.categories
    treeData.value = data.categories
  } catch (error) {
    ElMessage.error("获取分类列表失败")
  }
}

// 打开新建/编辑对话框
function openDialog(category?: Category) {
  if (category) {
    dialogTitle.value = "编辑分类"
    form.value = {
      _id: category._id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      coverImage: category.coverImage,
      parentId: category.parentId,
      sort: category.sort
    }
  } else {
    dialogTitle.value = "新建分类"
    form.value = {
      name: "",
      description: "",
      sort: 0
    }
  }
  dialogVisible.value = true
}

// 提交表单
async function submitForm() {
  formLoading.value = true
  try {
    if (form.value._id) {
      await categoryApi.update(form.value._id, form.value)
    } else {
      await categoryApi.create(form.value)
    }
    ElMessage.success(form.value._id ? "更新成功" : "创建成功")
    dialogVisible.value = false
    fetchCategories()
  } catch (error) {
    ElMessage.error(form.value._id ? "更新失败" : "创建失败")
  } finally {
    formLoading.value = false
  }
}

// 删除分类
async function handleDelete(category: Category) {
  try {
    await ElMessageBox.confirm(
      "删除分类将同时移除该分类下的所有文章关联，是否继续？",
      "警告",
      {
        type: "warning"
      }
    )
    await categoryApi.delete(category._id)
    ElMessage.success("删除成功")
    fetchCategories()
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("删除失败")
    }
  }
}

// 上传图标
async function handleUploadIcon(file: File) {
  try {
    const formData = new FormData()
    formData.append("image", file)
    const { data } = await categoryApi.uploadImage(formData)
    form.value.icon = data.url
    return false
  } catch (error) {
    ElMessage.error("图标上传失败")
    return false
  }
}

// 上传封面图
async function handleUploadCover(file: File) {
  try {
    const formData = new FormData()
    formData.append("image", file)
    const { data } = await categoryApi.uploadImage(formData)
    form.value.coverImage = data.url
    return false
  } catch (error) {
    ElMessage.error("封面图上传失败")
    return false
  }
}

// 获取层级前缀
function getLevelPrefix(level: number) {
  if (level === 1) return "一级分类"
  if (level === 2) return "二级分类"
  return `${level}级分类`
}

onMounted(() => {
  fetchCategories()
})
</script>

<template>
  <div class="categories-container">
    <!-- 顶部操作栏 -->
    <div class="operation-bar">
      <el-button type="primary" @click="openDialog()">
        <el-icon><Plus /></el-icon>新建分类
      </el-button>
    </div>

    <!-- 分类树形结构 -->
    <el-card>
      <el-tree
        :data="treeData"
        node-key="_id"
        :props="{
          label: 'name',
          children: 'children',
        }"
        :expand-on-click-node="false"
        default-expand-all
      >
        <template #default="{ node, data }">
          <div class="custom-tree-node">
            <div class="node-content">
              <!-- 显示层级前缀 -->
              <span class="level-prefix">{{ getLevelPrefix(node.level) }}</span>
              <!-- 分类图标 -->
              <el-image
                v-if="data.icon"
                :src="data.icon"
                class="icon"
                :preview-src-list="[data.icon]"
              />
              <!-- 分类名称 -->
              <span class="label">{{ node.label }}</span>
              <!-- 文章数量 -->
              <el-tag size="small" type="info" class="count">
                {{ data.articleCount }} 篇文章
              </el-tag>
            </div>
            <div class="node-actions">
              <el-button link type="primary" @click.stop="openDialog(data)">
                编辑
              </el-button>
              <el-button link type="danger" @click.stop="handleDelete(data)">
                删除
              </el-button>
            </div>
          </div>
        </template>
      </el-tree>
    </el-card>

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="上级分类" prop="parentId">
          <el-tree-select
            v-model="form.parentId"
            :data="categories"
            node-key="_id"
            :props="{ label: 'name' }"
            clearable
            placeholder="请选择上级分类"
          />
        </el-form-item>
        <el-form-item label="图标" prop="icon">
          <el-upload
            class="icon-uploader"
            :show-file-list="false"
            accept="image/*"
            :before-upload="handleUploadIcon"
          >
            <el-image
              v-if="form.icon"
              :src="form.icon"
              class="icon"
            />
            <el-icon v-else class="upload-icon">
              <Plus />
            </el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="封面图" prop="coverImage">
          <el-upload
            class="cover-uploader"
            :show-file-list="false"
            accept="image/*"
            :before-upload="handleUploadCover"
          >
            <el-image
              v-if="form.coverImage"
              :src="form.coverImage"
              class="cover-image"
            />
            <el-icon v-else class="upload-icon">
              <Plus />
            </el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="formLoading"
            @click="submitForm"
          >
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.categories-container {
  padding: 20px;

  .operation-bar {
    margin-bottom: 20px;
  }

  .custom-tree-node {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-right: 8px;

    .node-content {
      display: flex;
      align-items: center;
      gap: 8px;

      .level-prefix {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        background-color: var(--el-fill-color-light);
        padding: 2px 6px;
        border-radius: 4px;
      }

      .icon {
        width: 24px;
        height: 24px;
        object-fit: contain;
      }

      .label {
        font-size: 14px;
      }

      .count {
        margin-left: 8px;
      }
    }

    .node-actions {
      display: flex;
      gap: 8px;
    }
  }

  .icon-uploader,
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
      width: 100px;
      height: 100px;
      text-align: center;
      line-height: 100px;
    }

    .icon {
      width: 100px;
      height: 100px;
      display: block;
      object-fit: contain;
    }

    .cover-image {
      width: 178px;
      height: 100px;
      display: block;
      object-fit: cover;
    }
  }
}

:deep(.el-tree-node__content) {
  height: 40px;
}

:deep(.el-tree-node__children) {
  padding-left: 24px; // 增加子节点的缩进
}
</style>
