<script setup lang="ts">
import type { Comment } from "@/types/comment"
import { commentApi } from "@/api/comment"
import { ElMessage, ElMessageBox } from "element-plus"
import { onMounted, ref } from "vue"

interface QueryParams {
  page: number
  pageSize: number
  status?: string
  articleId?: number
  keyword?: string
  dateRange?: [Date, Date]
}

const comments = ref<Comment[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const queryParams = ref<QueryParams>({
  page: 1,
  pageSize: 10
})

// 状态过滤选项
const statusOptions = [
  { label: "全部", value: "" },
  { label: "待审核", value: "pending" },
  { label: "已通过", value: "approved" },
  { label: "已拒绝", value: "rejected" },
  { label: "已举报", value: "reported" }
]

// 获取评论列表
async function fetchComments() {
  loading.value = true
  try {
    const { data } = await commentApi.getList({
      page: currentPage.value,
      limit: pageSize.value,
      keyword: queryParams.value.keyword,
      status: queryParams.value.status,
      dateRange: queryParams.value.dateRange
    })
    comments.value = data.comments
    total.value = data.pagination.total
  } catch (error) {
    ElMessage.error("获取评论列表失败")
  } finally {
    loading.value = false
  }
}

// 审核评论
async function handleAudit(comment: Comment, status: string) {
  try {
    await ElMessageBox.confirm(
      `确定要${status === "approved" ? "通过" : "拒绝"}这条评论吗？`,
      "提示",
      {
        type: status === "approved" ? "info" : "warning"
      }
    )
    await commentApi.updateStatus(comment._id, status)
    ElMessage.success("操作成功")
    fetchComments()
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("操作失败")
    }
  }
}

// 删除评论
async function handleDelete(comment: Comment) {
  try {
    await commentApi.delete(comment._id)
    ElMessage.success("删除成功")
    fetchComments()
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("删除失败")
    }
  }
}

// 处理搜索
function handleSearch() {
  currentPage.value = 1
  fetchComments()
}

// 处理分页
function handleSizeChange(val: number) {
  pageSize.value = val
  fetchComments()
}

function handleCurrentChange(val: number) {
  currentPage.value = val
  fetchComments()
}

// 添加状态处理函数
function getStatusType(status: string): "success" | "warning" | "info" | "primary" | "danger" {
  const statusMap: Record<string, "success" | "warning" | "info" | "primary" | "danger"> = {
    approved: "success",
    pending: "info",
    rejected: "danger",
    reported: "warning"
  }
  return statusMap[status] || "info"
}

function getStatusText(status: string) {
  const statusMap: Record<string, string> = {
    pending: "待审核",
    approved: "已通过",
    rejected: "已拒绝",
    reported: "已举报"
  }
  return statusMap[status] || status
}

onMounted(() => {
  fetchComments()
})

function toOuterLink(target: any) {
  if (target.title) {
    window.open(`${import.meta.env.VITE_CLIENT_BASE_URL}/articles/${target._id}`, '_blank')
  } else {
    window.open(`${import.meta.env.VITE_CLIENT_BASE_URL}/diary`, '_blank')
  }
}
</script>

<template>
  <div class="comments-container">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="选择状态">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="queryParams.keyword" placeholder="搜索评论内容" clearable />
        </el-form-item>
        <el-form-item label="评论时间">
          <el-date-picker v-model="queryParams.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期"
            end-placeholder="结束日期" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            搜索
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 评论列表 -->
    <el-table v-loading="loading" :data="comments" style="width: 100%">
      <el-table-column label="评论者" width="200">
        <template #default="{ row }">
          <div class="commenter-info">
            <el-avatar :size="32" :src="row.author.avatar" />
            <div class="commenter-detail">
              <div class="commenter-name">
                {{ row.author.username }}
              </div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="content" label="评论内容" min-width="300" />
      <el-table-column prop="articleTitle" label="LINK" min-width="200">
        <template #default="{ row }">
          <el-link type="primary" @click="toOuterLink(row.target)" target="_blank">
            {{ row.target?.title || row.target?.content.slice(0, 10) }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column label="统计" width="150">
        <template #default="{ row }">
          <div class="statistics">
            <span><el-icon>
                <ThumbsUp />
              </el-icon> {{ row.likes }}</span>
            <span><el-icon>
                <ChatLineRound />
              </el-icon> {{ row.replies }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="评论时间" width="180" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-popconfirm title="确定要删除这条评论吗？" @confirm="handleDelete(row)">
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
      <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :total="total"
        :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange"
        @current-change="handleCurrentChange" />
    </div>
  </div>
</template>

<style scoped>
.comments-container {
  padding: 20px;
}

.search-bar {
  margin-bottom: 20px;
}

.commenter-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.commenter-detail {
  display: flex;
  flex-direction: column;
}

.commenter-name {
  font-weight: bold;
}

.commenter-email {
  font-size: 12px;
  color: var(--el-text-color-secondary);
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
</style>
