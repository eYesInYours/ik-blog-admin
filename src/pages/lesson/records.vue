<script setup lang="ts">
import { ref, onMounted } from "vue"
import { Search } from "@element-plus/icons-vue"
import { useUserStore } from "@/stores/modules/user"

const userStore = useUserStore()

interface LessonRecord {
  _id: string
  lessonId: {
    _id: string
    title: string
  }
  userId: {
    _id: string
    username: string
    email: string
  }
  duration: number
  teacherName: string
  status: "completed" | "cancelled"
  createdAt: string
}

// 表格数据
const tableData = ref<LessonRecord[]>([])
const loading = ref(false)
const total = ref(0)

// 查询参数
const queryParams = ref({
  page: 1,
  limit: 10,
  keyword: "",
  status: ""
})

// 获取使用记录
const getRecords = async () => {
  try {
    loading.value = true
    const { data } = await userStore.$request.get("/lessons/records", { params: queryParams.value })
    tableData.value = data.data.records
    total.value = data.data.pagination.total
  } catch (error) {
    console.error("获取使用记录失败:", error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  getRecords()
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
            placeholder="用户名/邮箱/课程名"
            clearable
            @keyup.enter="getRecords"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="请选择状态" clearable>
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="getRecords">
            搜索
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card v-loading="loading">
      <el-table :data="tableData" style="width: 100%">
        <el-table-column prop="userId.username" label="用户名" />
        <el-table-column prop="userId.email" label="邮箱" />
        <el-table-column prop="lessonId.title" label="课程名称" />
        <el-table-column prop="duration" label="使用时长(分钟)" />
        <el-table-column prop="teacherName" label="授课教师" />
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="row.status === 'completed' ? 'success' : 'danger'">
              {{ row.status === 'completed' ? '已完成' : '已取消' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="使用时间" />
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
          @size-change="getRecords"
          @current-change="getRecords"
        />
      </div>
    </el-card>
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