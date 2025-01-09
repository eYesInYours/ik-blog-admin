<script setup lang="ts">
import type { Article } from "@/types/article"
import { articleApi } from "@/api/article"
import { ElMessage, ElMessageBox } from "element-plus"
import { onMounted, ref } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
const searchQuery = ref("")
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const articles = ref<Article[]>([])

// 获取文章列表
async function fetchArticles() {
  try {
    const response = await articleApi.getList({
      page: currentPage.value,
      limit: pageSize.value,
      keyword: searchQuery.value
    })
    articles.value = response.data.articles
    total.value = response.data.pagination.total
  } catch (error) {
    ElMessage.error("获取文章列表失败")
  }
}

// 状态处理
function getStatusType(status: string): "success" | "warning" | "info" | "primary" | "danger" {
  const statusMap: Record<string, "success" | "warning" | "info" | "primary" | "danger"> = {
    published: "success",
    draft: "info",
    scheduled: "warning",
    disabled: "danger"
  }
  return statusMap[status] || "info"
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

// 操作处理
function createArticle() {
  router.push("/content/articles/edit")
}

function editArticle(article: Article) {
  router.push(`/content/articles/edit?id=${article._id}`)
}

function previewArticle(article: Article) {
  router.push(`/content/articles/preview/${article._id}`)
}

async function deleteArticle(article: Article) {
  try {
    await articleApi.delete(article._id)
    ElMessage.success("删除成功")
    fetchArticles()
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("删除失败")
    }
  }
}

// 搜索和分页处理
function handleSearch() {
  currentPage.value = 1
  fetchArticles()
}

function handleSizeChange(val: number) {
  pageSize.value = val
  fetchArticles()
}

function handleCurrentChange(val: number) {
  currentPage.value = val
  fetchArticles()
}

onMounted(() => {
  fetchArticles()
})
</script>

<template>
  <div class="articles-container">
    <!-- 顶部操作栏 -->
    <div class="operation-bar">
      <el-button type="primary" @click="createArticle">
        <el-icon>
          <Plus />
        </el-icon>新建文章
      </el-button>
      <el-input v-model="searchQuery" placeholder="搜索文章" class="search-input" @input="handleSearch">
        <template #prefix>
          <el-icon>
            <Search />
          </el-icon>
        </template>
      </el-input>
    </div>

    <!-- 文章列表 -->
    <el-table :data="articles" style="width: 100%">
      <el-table-column prop="title" label="标题" min-width="100">
        <template #default="{ row }">
          <div class="article-title">
            <el-image v-if="row.cover" :src="row.cover" class="cover-image" />
            {{ row.title }}
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="tags" label="标签" width="100">
        <template #default="{ row }">
          <el-tag v-for="tag in row.tags" :key="tag" :type="getTagsType(tag)" size="small">
            {{ tag }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="categoryName" label="分类" width="100" />
      <el-table-column prop="createdAt" label="发布时间" width="180" />
      <el-table-column label="数据统计" width="200">
        <template #default="{ row }">
          <div class="statistics">
            <span><el-icon>
              <View />
            </el-icon> {{ row.views }}</span>
            <span><el-icon>
              <Star />
            </el-icon> {{ row.likes }}</span>
            <span><el-icon>
              <ChatLineRound />
            </el-icon> {{ row.comments }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button-group>
            <el-button size="small" @click="editArticle(row)">
              编辑
            </el-button>
            <!-- <el-button size="small" @click="previewArticle(row)">
              预览
            </el-button> -->
            <el-popconfirm title="确定要删除这篇文章吗？" @confirm="deleteArticle(row)">
              <template #reference>
                <el-button size="small" type="danger">
                  删除
                </el-button>
              </template>
            </el-popconfirm>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage" v-model:page-size="pageSize" :total="total"
        :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<style scoped>
.articles-container {
  padding: 20px;
}

.operation-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.search-input {
  width: 300px;
}

.article-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cover-image {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
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
