<script setup lang="ts">
import { ref, onMounted } from "vue"
import { ElMessage, ElMessageBox } from "element-plus"
import { Search, Plus } from "@element-plus/icons-vue"
import { lessonApi } from "@/api/lesson"

interface Lesson {
  _id: string
  name: string
  type: 'private' | 'group'
  totalMinutes: number
  totalSessions: number
  minutesPerSession: number
  price: number
  description: string
  cover: string
  status: 'active' | 'inactive'
  createdAt: string
}

// 表格数据
const tableData = ref<Lesson[]>([])
const loading = ref(false)
const total = ref(0)

// 查询参数
const queryParams = ref({
  page: 1,
  limit: 10,
  keyword: "",
  status: ""
})

// 获取课程列表
const getLessons = async () => {
  try {
    loading.value = true
    const { data } = await lessonApi.lesson.getList(queryParams.value)
    tableData.value = data.lessons
    total.value = data.pagination.total
  } catch (error) {
    ElMessage.error("获取课程列表失败")
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 课程类型选项
const typeOptions = [
  { label: '一对一', value: 'private' },
  { label: '班课', value: 'group' }
]

// 获取类型显示文本
const getTypeText = (type: string) => {
  return type === 'private' ? '一对一' : '班课'
}

// 表单数据
const formData = ref<Partial<Lesson>>({
  name: "",
  type: "private",
  totalMinutes: 0,
  totalSessions: 0,
  minutesPerSession: 0,
  price: 0,
  description: "",
  cover: "",
  status: "active"
})

// 对话框控制
const dialogVisible = ref(false)
const dialogTitle = ref("")
const dialogType = ref<"create" | "edit">("create")

// 打开创建对话框
const handleCreate = () => {
  dialogType.value = "create"
  dialogTitle.value = "创建课程"
  formData.value = {
    name: "",
    type: "private",
    totalMinutes: 0,
    totalSessions: 0,
    minutesPerSession: 0,
    price: 0,
    description: "",
    cover: "",
    status: "active"
  }
  dialogVisible.value = true
}

// 打开编辑对话框
const handleEdit = (row: Lesson) => {
  dialogType.value = "edit"
  dialogTitle.value = "编辑课程"
  formData.value = { ...row }
  dialogVisible.value = true
}

// 提交表单
const handleSubmit = async () => {
  try {
    if (dialogType.value === "create") {
      await lessonApi.lesson.create(formData.value)
      ElMessage.success("创建成功")
    } else {
      await lessonApi.lesson.update(formData.value._id!, formData.value)
      ElMessage.success("更新成功")
    }
    dialogVisible.value = false
    getLessons()
  } catch (error) {
    ElMessage.error(dialogType.value === "create" ? "创建失败" : "更新失败")
    console.error(error)
  }
}

// 删除课程
const handleDelete = async (id: string) => {
  try {
    await ElMessageBox.confirm("确认删除该课程?", "提示", {
      type: "warning"
    })
    await lessonApi.lesson.delete(id)
    ElMessage.success("删除成功")
    getLessons()
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("删除失败")
      console.error(error)
    }
  }
}

// 更新课程状态
const handleStatusChange = async (row: Lesson) => {
  try {
    const newStatus = row.status === "active" ? "inactive" : "active"
    await lessonApi.lesson.updateStatus(row._id, newStatus)
    ElMessage.success("状态更新成功")
    getLessons()
  } catch (error) {
    ElMessage.error("状态更新失败")
    console.error(error)
  }
}

onMounted(() => {
  getLessons()
})
</script>

<template>
  <div class="app-container">
    <!-- 搜索工具栏 -->
    <el-card class="search-wrapper">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="关键词">
          <el-input
            v-model="queryParams.keyword"
            placeholder="课程名称/描述"
            clearable
            @keyup.enter="getLessons"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="请选择状态" clearable>
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="getLessons">
            搜索
          </el-button>
          <el-button type="success" :icon="Plus" @click="handleCreate">
            新建
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card v-loading="loading">
      <el-table :data="tableData" style="width: 100%">
        <el-table-column prop="name" label="课程名称" />
        <el-table-column prop="type" label="课程类型">
          <template #default="{ row }">
            <el-tag type="success" v-if="row.type === 'private'">一对一</el-tag>
            <el-tag type="info" v-else>班课</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalSessions" label="总课时" />
        <el-table-column prop="minutesPerSession" label="每节时长(分钟)" />
        <el-table-column prop="price" label="价格" />
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              :active-value="'active'"
              :inactive-value="'inactive'"
              @change="() => handleStatusChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="handleDelete(row._id)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.limit"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          small
          background
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="getLessons"
          @current-change="getLessons"
        />
      </div>
    </el-card>

    <!-- 表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="课程名称" required>
          <el-input v-model="formData.name" />
        </el-form-item>
        <el-form-item label="课程类型" required>
          <el-select v-model="formData.type">
            <el-option
              v-for="option in typeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="总课时" required>
          <el-input-number v-model="formData.totalSessions" :min="0" />
        </el-form-item>
        <el-form-item label="每节时长" required>
          <el-input-number v-model="formData.minutesPerSession" :min="0" />
        </el-form-item>
        <el-form-item label="课程价格" required>
          <el-input-number v-model="formData.price" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="课程封面">
          <el-upload
            class="avatar-uploader"
            action="/api/upload"
            :show-file-list="false"
            :on-success="(res) => formData.cover = res.data.url"
          >
            <img v-if="formData.cover" :src="formData.cover" class="avatar">
            <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="课程描述">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.search-wrapper {
  margin-bottom: 20px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.avatar-uploader {
  :deep(.el-upload) {
    border: 1px dashed var(--el-border-color);
    border-radius: 6px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: var(--el-transition-duration-fast);

    &:hover {
      border-color: var(--el-color-primary);
    }
  }
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 178px;
  height: 178px;
  text-align: center;
  line-height: 178px;
}

.avatar {
  width: 178px;
  height: 178px;
  display: block;
}
</style>
