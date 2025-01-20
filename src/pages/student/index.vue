<script setup lang="ts">
import { ref, onMounted } from "vue"
import { ElMessage, ElMessageBox } from "element-plus"
import { Search, Plus } from "@element-plus/icons-vue"
import { studentApi } from "@/api/student"
import { lessonApi } from "@/api/lesson"

// 表格数据
const tableData = ref([])
const loading = ref(false)
const total = ref(0)

// 查询参数
const queryParams = ref({
  page: 1,
  limit: 10,
  keyword: "",
  status: ""
})

// 获取学员列表
const getStudents = async () => {
  try {
    loading.value = true
    const { data } = await studentApi.student.getList(queryParams.value)
    tableData.value = data.students
    total.value = data.pagination.total
  } catch (error) {
    ElMessage.error("获取学员列表失败")
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 表单数据
const formData = ref({
  name: "",
  phone: "",
  email: "",
  remark: "",
  status: "active"
})

// 对话框控制
const dialogVisible = ref(false)
const dialogTitle = ref("")
const dialogType = ref<"create" | "edit">("create")

// 打开创建对话框
const handleCreate = () => {
  dialogType.value = "create"
  dialogTitle.value = "创建学员"
  formData.value = {
    name: "",
    phone: "",
    email: "",
    remark: "",
    status: "active"
  }
  dialogVisible.value = true
}

// 提交表单
const handleSubmit = async () => {
  try {
    await studentApi.student.create(formData.value)
    ElMessage.success("创建成功")
    dialogVisible.value = false
    getStudents()
  } catch (error) {
    ElMessage.error("创建失败")
    console.error(error)
  }
}

// 课程关联对话框
const enrollDialogVisible = ref(false)
const enrollForm = ref({
  studentId: "",
  lessonId: "",
  totalSessions: 1,
  startDate: "",
  endDate: ""
})

// 课程列表
const lessonList = ref([])
const getLessons = async () => {
  try {
    const { data } = await lessonApi.lesson.getList({ status: 'active' })
    lessonList.value = data.lessons
  } catch (error) {
    console.error(error)
  }
}

// 关联课程
const handleEnroll = (student: any) => {
  enrollForm.value = {
    studentId: student._id,
    lessonId: "",
    totalSessions: 1,
    startDate: "",
    endDate: ""
  }
  enrollDialogVisible.value = true
}

// 提交关联
const handleEnrollSubmit = async () => {
  try {
    await studentApi.enroll(enrollForm.value)
    ElMessage.success("课程关联成功")
    enrollDialogVisible.value = false
    getStudents()
  } catch (error) {
    ElMessage.error("课程关联失败")
    console.error(error)
  }
}

onMounted(() => {
  getStudents()
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
            placeholder="姓名/手机/邮箱"
            clearable
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="请选择" clearable>
            <el-option label="在读" value="active" />
            <el-option label="结业" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="getStudents">
            搜索
          </el-button>
          <el-button type="success" :icon="Plus" @click="handleCreate">
            新建学员
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card v-loading="loading">
      <el-table :data="tableData" style="width: 100%">
        <el-table-column prop="name" label="姓名" />
        <el-table-column prop="phone" label="手机号" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '在读' : '结业' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="handleEnroll(row)"
            >
              关联课程
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
          @size-change="getStudents"
          @current-change="getStudents"
        />
      </div>
    </el-card>

    <!-- 创建学员对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="姓名" required>
          <el-input v-model="formData.name" />
        </el-form-item>
        <el-form-item label="手机号" required>
          <el-input v-model="formData.phone" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="formData.email" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="formData.remark"
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

    <!-- 关联课程对话框 -->
    <el-dialog
      v-model="enrollDialogVisible"
      title="关联课程"
      width="500px"
    >
      <el-form :model="enrollForm" label-width="100px">
        <el-form-item label="课程" required>
          <el-select v-model="enrollForm.lessonId" placeholder="请选择课程">
            <el-option
              v-for="lesson in lessonList"
              :key="lesson._id"
              :label="lesson.name"
              :value="lesson._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="课时数" required>
          <el-input-number v-model="enrollForm.totalSessions" :min="1" />
        </el-form-item>
        <el-form-item label="开始日期" required>
          <el-date-picker
            v-model="enrollForm.startDate"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="结束日期" required>
          <el-date-picker
            v-model="enrollForm.endDate"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="enrollDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleEnrollSubmit">确定</el-button>
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
