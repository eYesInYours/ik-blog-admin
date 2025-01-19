<script setup lang="ts">
import { ref, onMounted } from "vue"
import { ElMessage, ElMessageBox } from "element-plus"
import { Search, Plus } from "@element-plus/icons-vue"
import { useUserStore } from "@/stores/modules/user"

const userStore = useUserStore()

interface LessonOrder {
  _id: string
  userId: {
    _id: string
    username: string
    email: string
  }
  title: string
  minutes: number
  price: number
  status: "pending" | "paid" | "cancelled"
  createdAt: string
  paidAt?: string
}

// 表格数据
const tableData = ref<LessonOrder[]>([])
const loading = ref(false)
const total = ref(0)

// 查询参数
const queryParams = ref({
  page: 1,
  limit: 10,
  keyword: "",
  status: ""
})

// 获取订单列表
const getOrders = async () => {
  try {
    loading.value = true
    const { data } = await userStore.$request.get("/lessons/orders", { params: queryParams.value })
    tableData.value = data.data.orders
    total.value = data.data.pagination.total
  } catch (error) {
    console.error("获取订单列表失败:", error)
  } finally {
    loading.value = false
  }
}

// 创建订单对话框
const createDialogVisible = ref(false)
const createForm = ref({
  userId: "",
  title: "",
  minutes: 0,
  price: 0
})

// 创建订单
const handleCreate = async () => {
  try {
    await userStore.$request.post("/lessons/orders", createForm.value)
    ElMessage.success("创建成功")
    createDialogVisible.value = false
    getOrders()
  } catch (error) {
    console.error("创建订单失败:", error)
  }
}

// 支付订单
const handlePay = async (orderId: string) => {
  try {
    await ElMessageBox.confirm("确认支付该订单?", "提示", { type: "warning" })
    await userStore.$request.post(`/lessons/orders/${orderId}/pay`)
    ElMessage.success("支付成功")
    getOrders()
  } catch (error) {
    console.error("支付订单失败:", error)
  }
}

// 取消订单
const handleCancel = async (orderId: string) => {
  try {
    await ElMessageBox.confirm("确认取消该订单?", "提示", { type: "warning" })
    await userStore.$request.post(`/lessons/orders/${orderId}/cancel`)
    ElMessage.success("取消成功")
    getOrders()
  } catch (error) {
    console.error("取消订单失败:", error)
  }
}

onMounted(() => {
  getOrders()
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
            @keyup.enter="getOrders"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="请选择状态" clearable>
            <el-option label="待支付" value="pending" />
            <el-option label="已支付" value="paid" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="getOrders">
            搜索
          </el-button>
          <el-button type="success" :icon="Plus" @click="createDialogVisible = true">
            新建
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card v-loading="loading">
      <el-table :data="tableData" style="width: 100%">
        <el-table-column prop="userId.username" label="用户名" />
        <el-table-column prop="userId.email" label="邮箱" />
        <el-table-column prop="title" label="课程名称" />
        <el-table-column prop="minutes" label="课时(分钟)" />
        <el-table-column prop="price" label="价格" />
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="row.status === 'paid' ? 'success' : row.status === 'pending' ? 'warning' : 'info'">
              {{ row.status === 'paid' ? '已支付' : row.status === 'pending' ? '待支付' : '已取消' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending'"
              type="primary"
              size="small"
              @click="handlePay(row._id)"
            >
              支付
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="danger"
              size="small"
              @click="handleCancel(row._id)"
            >
              取消
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
          @size-change="getOrders"
          @current-change="getOrders"
        />
      </div>
    </el-card>

    <!-- 创建订单对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="创建订单"
      width="500px"
    >
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="用户ID" required>
          <el-input v-model="createForm.userId" placeholder="请输入用户ID" />
        </el-form-item>
        <el-form-item label="课程名称" required>
          <el-input v-model="createForm.title" placeholder="请输入课程名称" />
        </el-form-item>
        <el-form-item label="课时(分钟)" required>
          <el-input-number v-model="createForm.minutes" :min="0" />
        </el-form-item>
        <el-form-item label="价格" required>
          <el-input-number v-model="createForm.price" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">确定</el-button>
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