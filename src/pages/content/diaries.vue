<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { diaryApi } from '@/api/diary'
import type { UploadFile } from 'element-plus'
import { uploadImage } from "@/api/upload"
import { compressImage } from "@/common/utils/image"

interface Author {
  _id: string
  username: string
  avatar: string
}

interface Diary {
  _id: string
  author: Author
  content: string
  images: string[]
  likes: string[]
  comments: any[]
  status: string
  createdAt: string
}

// 状态
const diaries = ref<Diary[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const queryParams = ref({
  page: 1,
  limit: 10,
  keyword: '',
  dateRange: [] as [Date, Date] | []
})

// 发帖相关状态
const dialogVisible = ref(false)
const newDiaryContent = ref('')
const imageFiles = ref<UploadFile[]>([])
const submitting = ref(false)

// 处理图片选择
const handleImageSelect = (uploadFile: UploadFile) => {
  // 创建本地预览URL
  const reader = new FileReader()
  reader.onload = (e) => {
    if (e.target?.result) {
      imageFiles.value.push({
        ...uploadFile,
        url: e.target.result as string
      })
    }
  }
  if (uploadFile.raw) {
    reader.readAsDataURL(uploadFile.raw)
  }
  // 阻止自动上传
  return false
}

// 移除图片
const handleRemoveImage = (file: UploadFile) => {
  const index = imageFiles.value.indexOf(file)
  if (index > -1) {
    imageFiles.value.splice(index, 1)
  }
}

// 发布朋友圈
const handlePublish = async () => {
  if (!newDiaryContent.value.trim()) {
    ElMessage.warning('请输入内容')
    return
  }

  submitting.value = true
  try {
    // 先上传所有图片
    const uploadedImages = []
    for (const file of imageFiles.value) {
      if (file.raw) {
        // 超过2M的图片进行压缩
        let compressedImage = null
        if (file.raw.size > 2 * 1024 * 1024) {
          compressedImage = await compressImage(file.raw)
        } else {
          compressedImage = file.raw
        }
        const formData = new FormData()
        formData.append("file", compressedImage)
        const { data } = await uploadImage(formData)
        console.log(data)
        uploadedImages.push(data.file.url)
      }
    }

    // 发布朋友圈
    await diaryApi.create({
      content: newDiaryContent.value,
      images: uploadedImages,
      status: 'public'
    })
    ElMessage.success('发布成功')
    dialogVisible.value = false
    newDiaryContent.value = ''
    imageFiles.value = []
    fetchDiaries()
  } catch (error) {
    ElMessage.error('发布失败')
  } finally {
    submitting.value = false
  }
}

// 获取朋友圈列表
const fetchDiaries = async () => {
  loading.value = true
  try {
    const { data } = await diaryApi.getList({
      page: currentPage.value,
      limit: pageSize.value,
      keyword: queryParams.value.keyword,
      dateRange: queryParams.value.dateRange as [Date, Date]
    })
    diaries.value = data.diaries
    total.value = data.pagination.total
  } catch (error) {
    ElMessage.error('获取朋友圈列表失败')
  } finally {
    loading.value = false
  }
}

// 删除朋友圈
const handleDelete = async (diary: Diary) => {
  try {
    await diaryApi.delete(diary._id)
    ElMessage.success('删除成功')
    fetchDiaries()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 处理搜索
const handleSearch = () => {
  currentPage.value = 1
  fetchDiaries()
}

// 处理分页
const handleSizeChange = (val: number) => {
  pageSize.value = val
  fetchDiaries()
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
  fetchDiaries()
}

// 格式化日期
const formatDate = (date: string) => {
  return new Date(date).toLocaleString()
}

onMounted(() => {
  fetchDiaries()
})
</script>

<template>
  <div class="diaries-container">
    <!-- 发布按钮 -->
    <div class="header-actions mb-4">
      <el-button type="primary" @click="dialogVisible = true">
        发布朋友圈
      </el-button>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="关键词">
          <el-input
            v-model="queryParams.keyword"
            placeholder="搜索内容"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="发布时间">
          <el-date-picker
            v-model="queryParams.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            搜索
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 朋友圈列表 -->
    <el-table
      v-loading="loading"
      :data="diaries"
      style="width: 100%"
    >
      <el-table-column label="发布者" width="200">
        <template #default="{ row }">
          <div class="author-info">
            <el-avatar :size="32" :src="row.author.avatar" />
            <span class="author-name">{{ row.author.username }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="content" label="内容" min-width="300" />

      <el-table-column label="图片" width="200">
        <template #default="{ row }">
          <el-image
            v-for="(image, index) in row.images"
            :key="index"
            :src="image"
            :preview-src-list="row.images"
            class="diary-image"
          />
        </template>
      </el-table-column>

      <el-table-column label="统计" width="150">
        <template #default="{ row }">
          <div class="statistics">
            <span><el-icon><ThumbsUp /></el-icon> {{ row.likes.length }}</span>
            <span><el-icon><ChatLineRound /></el-icon> {{ row.comments.length }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="createdAt" label="发布时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-popconfirm title="确定要删除这条朋友圈吗？" @confirm="handleDelete(row)">
            <template #reference>
              <el-button size="small" type="danger">
                删除
              </el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 发布朋友圈弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      title="发布朋友圈"
      width="600px"
    >
      <el-form>
        <el-form-item>
          <el-input
            v-model="newDiaryContent"
            type="textarea"
            :rows="4"
            placeholder="写点什么..."
          />
        </el-form-item>

        <el-form-item>
          <el-upload
            :auto-upload="false"
            list-type="picture-card"
            :on-change="handleImageSelect"
            :on-remove="handleRemoveImage"
            :file-list="imageFiles"
            multiple
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="submitting"
            @click="handlePublish"
          >
            发布
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.diaries-container {
  padding: 20px;
}

.search-bar {
  margin-bottom: 20px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.author-name {
  font-weight: bold;
}

.diary-image {
  width: 50px;
  height: 50px;
  margin-right: 5px;
  object-fit: cover;
  cursor: pointer;
}

.statistics {
  display: flex;
  gap: 15px;
}

.statistics span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.header-actions {
  display: flex;
  justify-content: flex-end;
}

:deep(.el-upload--picture-card) {
  width: 100px;
  height: 100px;
  line-height: 100px;
}

:deep(.el-upload-list--picture-card .el-upload-list__item) {
  width: 100px;
  height: 100px;
}
</style>
