<script setup lang="ts">
import type { Article } from "@/types/article"
import { articleApi } from "@/api/article"
import { ElMessage, ElMessageBox } from "element-plus"
import { onMounted, reactive, ref } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
const loading = ref(false)
const articles = ref<Article[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 搜索表单
const searchForm = reactive({
  keyword: '',
  status: '',
  startDate: '',
  endDate: '',
  tags: []
})

// 状态标签配置
const statusConfig = {
  draft: {
    type: 'info',
    label: '草稿'
  },
  published: {
    type: 'success', 
    label: '已发布'
  },
  offline: {
    type: 'danger',
    label: '已下线'
  },
  online: {
    type: 'warning',
    label: '待审核'
  }
}

// 状态过滤选项
const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'offline', label: '已下线' },
  { value: 'online', label: '待审核' }
]

// 评论管理相关
const showCommentModal = ref(false)
const currentArticle = ref<Article | null>(null)
const comments = ref<any[]>([])
const loadingComments = ref(false)

// 控制回复列表的显示
const showReplies = ref<{ [key: string]: boolean }>({})

// 切换回复列表显示
function toggleReplies(commentId: string) {
  showReplies.value[commentId] = !showReplies.value[commentId]
}

// 获取文章列表
const fetchArticles = async () => {
  loading.value = true
  try {
    const response = await articleApi.getList({
      page: currentPage.value,
      limit: pageSize.value,
      ...searchForm
    })
    articles.value = response.data.articles
    total.value = response.data.pagination.total
  } catch (error) {
    ElMessage.error("获取文章列表失败")
  } finally {
    loading.value = false
  }
}

// 更新文章状态
const updateStatus = async (id: string, status: 'draft' | 'published' | 'offline' | 'online') => {
  try {
    await articleApi.updateStatus(id, { status })
    ElMessage.success('更新状态成功')
    fetchArticles()
  } catch (error) {
    ElMessage.error('更新状态失败')
  }
}

// 删除文章
const handleDelete = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这篇文章吗？', '提示', {
      type: 'warning'
    })
    await articleApi.delete(id)
    ElMessage.success("删除成功")
    fetchArticles()
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("删除失败")
    }
  }
}

// 根据字数获取标签颜色
function getTagsType(tag: string): "success" | "warning" | "info" | "primary" | "danger" {
  if (tag.length > 5) {
    return "danger"
  } else if (tag.length > 3) {
    return "warning"
  } else {
    return "success"
  }
}

function getStatusText(status: string) {
  const statusMap: Record<string, string> = {
    published: "已发布",
    draft: "草稿",
    scheduled: "定时发布"
  }
  return statusMap[status] || status
}

// 搜索和分页处理
const handleSearch = () => {
  currentPage.value = 1
  fetchArticles()
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.status = ''
  searchForm.startDate = ''
  searchForm.endDate = ''
  searchForm.tags = []
  handleSearch()
}

const handleSizeChange = (val: number) => {
  pageSize.value = val
  fetchArticles()
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
  fetchArticles()
}

// 编辑正式文章
function editArticle(article: Article) {
  router.push(`/content/articles/edit?id=${article._id}&type=article`)
}

// 编辑草稿
function editDraft(article: Article) {
  router.push(`/content/articles/edit?id=${article._id}&type=draft`)
}

// 创建新草稿 - 直接跳转到编辑页面
function createDraft(article: Article) {
  // 跳转到编辑页面，传入原文ID和草稿标识
  router.push(`/content/articles/edit?id=${article._id}&type=draft&isNew=true`)
}

// 发布草稿
async function publishDraft(article: Article) {
  try {
    await ElMessageBox.confirm('确定要发布草稿版本吗？这将覆盖当前发布的版本。', '提示', {
      type: 'warning'
    })
    // TODO: 调用发布草稿的 API
    ElMessage.success('发布成功')
    fetchArticles()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('发布失败')
    }
  }
}

// 删除草稿
async function deleteDraft(article: Article) {
  try {
    await ElMessageBox.confirm('确定要删除草稿吗？', '提示', {
      type: 'warning'
    })
    // TODO: 调用删除草稿的 API
    ElMessage.success('删除成功')
    fetchArticles()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 格式化时间
function formatDate(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/\//g, '-');
}

// 打开评论管理
async function openCommentModal(article: Article) {
  currentArticle.value = article
  showCommentModal.value = true
  await fetchComments(article._id)
}

// 获取评论列表
async function fetchComments(articleId: string) {
  loadingComments.value = true
  try {
    const response = await articleApi.getComments(articleId)
    comments.value = response.data
  } catch (error) {
    ElMessage.error('获取评论列表失败')
  } finally {
    loadingComments.value = false
  }
}

// 删除评论
async function deleteComment(commentId: string) {
  try {
    await ElMessageBox.confirm('确定要删除这条评论吗？', '提示', {
      type: 'warning'
    })
    await articleApi.deleteComment(commentId)
    ElMessage.success('删除成功')
    if (currentArticle.value) {
      await fetchComments(currentArticle.value._id)
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 处理展开行
function handleExpand(row: any, expandedRows: any[]) {
  // 可以在这里添加展开行时的逻辑，比如重新获取回复数据等
  console.log('展开行:', row)
}

onMounted(() => {
  fetchArticles()
})
</script>

<template>
  <div class="articles-container">
    <!-- 搜索表单 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="标题/内容" clearable />
        </el-form-item>
        
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 150px">
            <el-option v-for="item in statusOptions" 
              :key="item.value" 
              :label="item.label" 
              :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item label="日期范围">
          <el-date-picker
            v-model="searchForm.startDate"
            type="date"
            placeholder="开始日期"
            style="width: 150px"
          />
          <span class="mx-2">-</span>
          <el-date-picker
            v-model="searchForm.endDate"
            type="date"
            placeholder="结束日期"
            style="width: 150px"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作栏 -->
    <div class="operation-bar">
      <el-button type="primary" @click="router.push('/content/articles/edit')">
        <el-icon><Plus /></el-icon>新建文章
      </el-button>
    </div>

    <!-- 文章列表 -->
    <el-table v-loading="loading" :data="articles">
      <el-table-column prop="title" label="标题" min-width="200">
        <template #default="{ row }">
          <div class="article-title">
            <el-image v-if="row.cover" :src="row.cover" class="cover-image" />
            {{ row.title }}
            <!-- 如果有草稿则显示标识 -->
            <el-tag v-if="row.draftId" type="warning" size="small" @click="editDraft(row)">
              有草稿
            </el-tag>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusConfig[row.status].type">
            {{ statusConfig[row.status].label }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="categoryName" label="分类" width="120" />
      
      <el-table-column prop="createdAt" label="创建时间" width="160">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>

      <el-table-column prop="updatedAt" label="更新时间" width="160">
        <template #default="{ row }">
          {{ formatDate(row.updatedAt) }}
        </template>
      </el-table-column>

      <!-- 添加互动数据列 -->
      <el-table-column label="互动数据" width="200">
        <template #default="{ row }">
          <div class="interaction-data">
            <el-tag size="small" type="info">
              点赞 {{ row.likes }}
            </el-tag>
            <el-tag size="small" type="info">
              收藏 {{ row.collections }}
            </el-tag>
            <el-tag size="small" type="info">
              评论 {{ row.comments }}
            </el-tag>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="300" fixed="right">
        <template #default="{ row }">
          <el-button-group>
            <!-- 编辑正式文章按钮 -->
            <el-button size="small" @click="editArticle(row)">
              编辑文章
            </el-button>

            <!-- 评论管理按钮 -->
            <el-button 
              size="small" 
              type="info" 
              @click="openCommentModal(row)"
            >
              评论管理
            </el-button>

            <!-- 如果有草稿，显示编辑草稿按钮；否则显示创建草稿按钮 -->
            <el-button 
              size="small" 
              type="warning" 
              @click="row.draftId ? editDraft(row) : createDraft(row)"
            >
              {{ row.draftId ? '编辑草稿' : '创建草稿' }}
            </el-button>

            <el-dropdown>
              <el-button size="small">
                更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <!-- 如果有草稿，添加相关操作 -->
                  <template v-if="row.draftId">
                    <el-dropdown-item @click="publishDraft(row)">
                      发布草稿
                    </el-dropdown-item>
                    <el-dropdown-item @click="deleteDraft(row)">
                      删除草稿
                    </el-dropdown-item>
                    <el-dropdown-item divided />
                  </template>

                  <!-- 其他状态操作 -->
                  <el-dropdown-item v-if="row.status === 'published'"
                    @click="updateStatus(row._id, 'offline')">
                    下线
                  </el-dropdown-item>
                  <el-dropdown-item v-if="row.status === 'offline'"
                    @click="updateStatus(row._id, 'published')">
                    重新发布
                  </el-dropdown-item>
                  <el-dropdown-item divided @click="handleDelete(row._id)">
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-button-group>
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

    <!-- 评论管理对话框 -->
    <el-dialog
      v-model="showCommentModal"
      :title="`评论管理 - ${currentArticle?.title}`"
      width="800px"
    >
      <el-table 
        v-loading="loadingComments" 
        :data="comments"
        row-key="_id"
        @expand-change="handleExpand"
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <div v-if="row.replies?.length" class="replies-list">
              <el-table :data="row.replies" border>
                <el-table-column prop="author.username" label="回复者" width="120" />
                <el-table-column label="回复内容" min-width="200">
                  <template #default="{ row: reply }">
                    <div class="reply-content">
                      <span>回复 @{{ reply.replyTo?.author?.username }}：</span>
                      <span>{{ reply.content }}</span>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="createdAt" label="回复时间" width="160">
                  <template #default="{ row }">
                    {{ formatDate(row.createdAt) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="120">
                  <template #default="{ row: reply }">
                    <el-button type="danger" size="small" @click="deleteComment(reply._id)">
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
            <el-empty v-else description="暂无回复" />
          </template>
        </el-table-column>

        <el-table-column prop="author.username" label="评论者" width="120" />
        <el-table-column prop="content" label="评论内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="评论时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="回复数" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.replies?.length" type="info">
              {{ row.replies.length }}条回复
            </el-tag>
            <span v-else>暂无回复</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" size="small" @click="deleteComment(row._id)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.articles-container {
  padding: 20px;
  
  .search-card {
    margin-bottom: 20px;
  }

  .operation-bar {
    margin-bottom: 20px;
  }

  .article-title {
    display: flex;
    align-items: center;
    gap: 10px;

    .cover-image {
      width: 40px;
      height: 40px;
      object-fit: cover;
      border-radius: 4px;
    }

    .el-tag {
      cursor: pointer;
    }
  }

  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }

  .interaction-data {
    display: flex;
    align-items: center;
    gap: 10px;

    .data-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  .replies-list {
    padding: 10px 20px;
    background-color: #f5f7fa;

    .reply-content {
      span:first-child {
        color: #666;
        margin-right: 4px;
      }
    }
  }
}
</style>
