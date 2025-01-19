<script setup lang="ts">
import { ref, onMounted } from "vue"
import { Search } from "@element-plus/icons-vue"
import { useUserStore } from "@/stores/modules/user"
import { ElMessage } from "element-plus"

const userStore = useUserStore()

interface LessonUser {
  _id: string
  username: string
  email: string
  stats: {
    totalMinutes: number
    remainingMinutes: number
    completedLessons: number
    totalSpent: number
  }
}

// 表格数据
const tableData = ref<LessonUser[]>([])
const loading = ref(false)
const total = ref(0)

// 查询参数
const queryParams = ref({
  page: 1,
  limit: 10,
  keyword: ""
})

// 获取用户列表
const getUsers = async () => {
  try {
    loading.value = true
    const { data } = await userStore.$request.get("/lessons/users", { params: queryParams.value })
    tableData.value = data.data.users
    total.value = data.data.pagination.total
  } catch (error) {
    console.error("获取用户列表失败:", error)
  } finally {
    loading.value = false
  }
}

// 扣减课时对话框
const deductDialogVisible = ref(false)
const deductForm = ref({
  userId: "",
  minutes: 0,
  teacherName: ""
})

// 扣减课时
const handleDeduct = async () => {
  try {
    await userStore.$request.post(`/lessons/users/${deductForm.value.userId}/deduct`, {
      minutes: deductForm.value.minutes,
      teacherName: deductForm.value.teacherName
    })
    ElMessage.success("扣减成功")
    deductDialogVisible.value = false
    getUsers()
  } catch (error) {
    console.error("扣减课时失败:", error)
  }
}

onMounted(() => {
  getUsers()
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
            placeholder="用户名/邮箱"
            clearable
            @keyup.enter="getUsers"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="getUsers">
            搜索
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card v-loading="loading">
      <el-table :data="tableData" style="width: 100%">
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="stats.totalMinutes" label="总课时(分钟)" />
        <el-table-column prop="stats.remainingMinutes" label="剩余课时(分钟)" />
        <el-table-column prop="stats.completedLessons" label="已完成课程" />
        <el-table-column prop="stats.totalSpent" label="总消费" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="() => {
                deductForm.userId = row._id
                deductDialogVisible = true
              }"
            >
              扣减课时
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
          @size-change="getUsers"
          @current-change="getUsers"
        />
      </div>
    </el-card>

    <!-- 扣减课时对话框 -->
    <el-dialog
      v-model="deductDialogVisible"
      title="扣减课时"
      width="500px"
    >
      <el-form :model="deductForm" label-width="100px">
        <el-form-item label="扣减时长" required>
          <el-input-number v-model="deductForm.minutes" :min="0" />
        </el-form-item>
        <el-form-item label="授课教师" required>
          <el-input v-model="deductForm.teacherName" placeholder="请输入授课教师姓名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="deductDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleDeduct">确定</el-button>
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
</style> 