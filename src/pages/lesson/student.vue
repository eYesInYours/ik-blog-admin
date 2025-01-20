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
    const { data } = await studentApi.getList(queryParams.value)
    tableData.value = data.students
    total.value = data.pagination.total
  } catch (error) {
    ElMessage.error("获取学员列表失败")
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 课程列表
const lessonList = ref([])
const getLessons = async () => {
  try {
    const { data } = await lessonApi.lesson.getList({ status: "active" })
    lessonList.value = data.lessons
  } catch (error) {
    console.error(error)
  }
}

// 表单数据
const formData = ref({
  id: "",
  name: "",
  phone: "",
  email: "",
  lessonId: "",
  totalSessions: 0,
  remainingSessions: 0,
  remark: ""
})

// 对话框控制
const dialogVisible = ref(false)
const dialogTitle = ref("")
const dialogType = ref<"create" | "update">("create")

// 打开创建对话框
const handleCreate = () => {
  dialogType.value = "create"
  dialogTitle.value = "创建学员"
  formData.value = {
    id: "",
    name: "",
    phone: "",
    email: "",
    lessonId: "",
    totalSessions: 0,
    remainingSessions: 0,
    remark: ""
  }
  selectedLesson.value = null
  dialogVisible.value = true
}

// 打开更新对话框
const handleUpdate = (row: any) => {
  dialogType.value = "update"
  dialogTitle.value = "更新学员"
  formData.value = {
    id: row._id,
    name: row.name,
    phone: row.phone,
    email: row.email || "",
    lessonId: row.lessonId._id,
    totalSessions: row.totalSessions,
    remainingSessions: row.remainingSessions,
    remark: row.remark || ""
  }
  // 设置选中的课程信息
  selectedLesson.value = row.lessonId
  dialogVisible.value = true
}

// 提交表单
const handleSubmit = async () => {
  try {
    if (dialogType.value === "create") {
      await studentApi.create({
        name: formData.value.name,
        phone: formData.value.phone,
        email: formData.value.email,
        lessonId: formData.value.lessonId,
        remark: formData.value.remark
      })
      ElMessage.success("创建成功")
    } else {
      await studentApi.update(formData.value.id, {
        name: formData.value.name,
        phone: formData.value.phone,
        email: formData.value.email,
        remark: formData.value.remark,
        lessonId: formData.value.lessonId
      })
      ElMessage.success("更新成功")
    }
    dialogVisible.value = false
    getStudents()
  } catch (error) {
    ElMessage.error(dialogType.value === "create" ? "创建失败" : "更新失败")
    console.error(error)
  }
}

// 签到相关
const attendanceDialogVisible = ref(false)
const currentStudent = ref<any>(null)
const attendanceForm = ref({
  studentId: "",
  attendanceTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
  sessions: 1,
  remark: ""
})

// 打开签到对话框
const handleAttendance = (student: any) => {
  currentStudent.value = student  // 设置当前学员信息
  attendanceForm.value = {
    studentId: student._id,
    attendanceTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
    sessions: 1,
    remark: ""
  }
  attendanceDialogVisible.value = true
}

// 提交签到
const handleAttendanceSubmit = async () => {
  try {
    await studentApi.attendance({
      ...attendanceForm.value,
      remark: attendanceForm.value.remark.trim() || undefined
    })
    ElMessage.success("签到成功")
    attendanceDialogVisible.value = false
    getStudents()
  } catch (error) {
    ElMessage.error("签到失败")
    console.error(error)
  }
}

// 充值对话框
const rechargeDialogVisible = ref(false)
const rechargeForm = ref({
  studentId: "",
  sessions: 1,
  remark: ""
})

// 打开充值对话框
const handleRecharge = (student: any) => {
  rechargeForm.value = {
    studentId: student._id,
    sessions: 1,
    remark: ""
  }
  rechargeDialogVisible.value = true
}

// 提交充值
const handleRechargeSubmit = async () => {
  try {
    await studentApi.recharge({
      ...rechargeForm.value,
      remark: rechargeForm.value.remark.trim() || undefined
    })
    ElMessage.success("充值成功")
    rechargeDialogVisible.value = false
    getStudents()
  } catch (error) {
    ElMessage.error("充值失败")
    console.error(error)
  }
}

// 选择课程后展示课程信息
const selectedLesson = ref(null)
const handleLessonChange = (value: string) => {
  const lesson = lessonList.value.find(l => l._id === value)
  if (lesson) {
    selectedLesson.value = lesson
  }
}

// 添加上课记录对话框
const recordsDialogVisible = ref(false)
const recordsLoading = ref(false)
const recordsList = ref([])
const recordsQuery = ref({
  page: 1,
  limit: 10
})
const recordsTotal = ref(0)

// 获取上课记录
const getRecords = async (studentId: string) => {
  try {
    recordsLoading.value = true
    const { data } = await studentApi.getAttendanceRecords(studentId, {
      page: recordsQuery.value.page,
      limit: recordsQuery.value.limit
    })
    recordsList.value = data.records
    recordsTotal.value = data.pagination.total
  } catch (error) {
    console.error("获取记录失败", error)
    ElMessage.error("获取记录失败")
  } finally {
    recordsLoading.value = false
  }
}

// 打开记录对话框
const handleViewRecords = (student: any) => {
  recordsQuery.value = {
    page: 1,
    limit: 10
  }
  recordsDialogVisible.value = true
  getRecords(student._id)
}

// 编辑对话框
const editDialogVisible = ref(false)
const editForm = ref({
  name: "",
  phone: "",
  email: "",
  lessonName: "",
  remainingSessions: 0,
  totalSessions: 0,
  remark: ""
})

// 打开编辑对话框
const handleEdit = (student: any) => {
  editForm.value = {
    name: student.name,
    phone: student.phone,
    email: student.email,
    lessonName: student.lessonId.name,
    remainingSessions: student.remainingSessions,
    totalSessions: student.totalSessions,
    remark: student.remark
  }
  editDialogVisible.value = true
}

// 提交编辑
const handleEditSubmit = async () => {
  try {
    await studentApi.update(student._id, {
      name: editForm.value.name,
      phone: editForm.value.phone,
      email: editForm.value.email,
      remark: editForm.value.remark
    })
    ElMessage.success("编辑成功")
    editDialogVisible.value = false
    getStudents()
  } catch (error) {
    ElMessage.error("编辑失败")
    console.error(error)
  }
}

// 删除学员
const handleDelete = (row: any) => {
  if (row.remainingSessions > 0) {
    ElMessage.warning('该学员还有未完成的课程，无法删除')
    return
  }

  ElMessageBox.confirm(
    '确定要删除该学员吗？删除后将无法恢复，且相关的上课记录也会被删除。',
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(async () => {
      try {
        await studentApi.delete(row._id)
        ElMessage.success('删除成功')
        getStudents()
      } catch (error) {
        ElMessage.error('删除失败')
        console.error(error)
      }
    })
    .catch(() => {
      // 取消删除
    })
}

// 格式化时间的函数
const formatDateTime = (time: string) => {
  if (!time) return '';
  const date = new Date(time);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
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
          <el-input v-model="queryParams.keyword" placeholder="姓名/手机/邮箱" clearable />
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
        <el-table-column label="课程信息" min-width="200">
          <template #default="{ row }">
            <div class="info-line">
              <span class="info-label">课程：</span>
              <el-text type="info">{{ row.lessonId.name }}</el-text>
            </div>
            <div class="info-line">
              <span class="info-label">类型：</span>
              <el-text type="info">{{ row.lessonId.type === 'private' ? '一对一' : '班课' }}</el-text>
            </div>
            <div class="info-line">
              <span class="info-label">课时：</span>
              <el-text type="info">
                余{{ row.remainingSessions }} / 共{{ row.totalSessions }}节
              </el-text>
            </div>
            <div class="info-line">
              <span class="info-label">时长：</span>
              <el-text type="info">每节{{ row.lessonId.minutesPerSession }}分钟</el-text>
            </div>
            <div class="info-line">
              <span class="info-label">价格：</span>
              <el-text type="danger">¥{{ row.lessonId.price }}</el-text>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '在读' : '结业' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="380" fixed="right">
          <template #default="{ row }">
            <el-button type="warning" size="small" @click="handleUpdate(row)">
              更新
            </el-button>
            <el-tooltip content="剩余课时不足，请先充值" :disabled="row.remainingSessions > 0" placement="top">
              <el-button type="primary" size="small" @click="handleAttendance(row)"
                :disabled="row.remainingSessions <= 0">
                签到
              </el-button>
            </el-tooltip>
            <el-button type="success" size="small" @click="handleRecharge(row)">
              充值
            </el-button>
            <el-button type="info" size="small" @click="handleViewRecords(row)">
              记录
            </el-button>
            <el-tooltip
              :content="row.remainingSessions > 0 ? '该学员还有未完成的课程，请先使用完课时' : '确定要删除该学员吗？删除后将无法恢复，且相关的上课记录也会被删除。'"
              :disabled="row.remainingSessions <= 0" placement="top">
              <el-button type="danger" size="small" @click="handleDelete(row)" :disabled="row.remainingSessions > 0">
                删除
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination v-model:current-page="queryParams.page" v-model:page-size="queryParams.limit" :total="total"
          :page-sizes="[10, 20, 50, 100]" small background layout="total, sizes, prev, pager, next, jumper"
          @size-change="getStudents" @current-change="getStudents" />
      </div>
    </el-card>

    <!-- 创建学员对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
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
        <el-form-item label="课程" required>
          <template v-if="dialogType === 'create'">
            <el-select v-model="formData.lessonId" placeholder="请选择课程" @change="handleLessonChange">
              <el-option v-for="lesson in lessonList" :key="lesson._id" :label="lesson.name" :value="lesson._id" />
            </el-select>
          </template>
          <template v-else>
            <div>{{ selectedLesson.name }}</div>
          </template>
        </el-form-item>
        <!-- 选择课程后展示课程信息 -->
        <template v-if="selectedLesson">
          <el-form-item label="课程类型">
            <el-tag>{{ selectedLesson.type === 'private' ? '一对一' : '班课' }}</el-tag>
          </el-form-item>
          <el-form-item label="课程描述">
            <div class="lesson-desc">{{ selectedLesson.description || '暂无描述' }}</div>
          </el-form-item>
          <el-form-item label="课程价格">
            <div class="lesson-price">¥{{ selectedLesson.price }}</div>
          </el-form-item>
          <el-form-item label="课时数">
            {{ selectedLesson.totalSessions }}节课/每节{{ selectedLesson.minutesPerSession }}分钟
          </el-form-item>
          <!-- 更新时显示剩余课时 -->
          <template v-if="dialogType === 'update'">
            <el-form-item label="剩余课时">
              <el-tag :type="formData.remainingSessions > 0 ? 'success' : 'danger'">
                {{ formData.remainingSessions }}/{{ formData.totalSessions }}
              </el-tag>
            </el-form-item>
          </template>
        </template>
        <el-form-item label="备注">
          <el-input v-model="formData.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 签到对话框 -->
    <el-dialog v-model="attendanceDialogVisible" title="学员签到" width="500px">
      <!-- 学员和课程信息展示 -->
      <div class="attendance-info">
        <div class="info-line">
          <span class="info-label">学员：</span>
          <el-text>{{ currentStudent?.name }}</el-text>
        </div>
        <div class="info-line">
          <span class="info-label">课程：</span>
          <el-text>{{ currentStudent?.lessonId.name }}</el-text>
          <el-tag size="small" class="ml-2">
            {{ currentStudent?.lessonId.type === 'private' ? '一对一' : '班课' }}
          </el-tag>
        </div>
        <div class="info-line">
          <span class="info-label">课时：</span>
          <el-text type="warning">剩余 {{ currentStudent?.remainingSessions }} 节</el-text>
          <el-text type="info" class="ml-2">
            (本次签到后剩余 {{ currentStudent?.remainingSessions - attendanceForm.sessions }} 节)
          </el-text>
        </div>
      </div>
      <el-divider />
      <el-form :model="attendanceForm" label-width="100px">
        <el-form-item label="签到时间" required>
          <el-date-picker
            v-model="attendanceForm.attendanceTime"
            type="datetime"
            placeholder="选择日期时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            :default-time="new Date(2000, 1, 1, new Date().getHours(), new Date().getMinutes(), 0)"
          />
        </el-form-item>
        <el-form-item label="课时数" required>
          <el-input-number
            v-model="attendanceForm.sessions"
            :min="1"
            :max="currentStudent?.remainingSessions"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="attendanceForm.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="attendanceDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAttendanceSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 充值对话框 -->
    <el-dialog v-model="rechargeDialogVisible" title="课时充值" width="400px">
      <el-form :model="rechargeForm" label-width="100px">
        <el-form-item label="课时数" required>
          <el-input-number v-model="rechargeForm.sessions" :min="1" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="rechargeForm.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rechargeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleRechargeSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 上课记录对话框 -->
    <el-dialog v-model="recordsDialogVisible" title="课时记录" width="800px">
      <div v-loading="recordsLoading">
        <el-table :data="recordsList" style="width: 100%">
          <el-table-column prop="recordTime" label="时间" width="180">
            <template #default="{ row }">
              <el-text>
                {{ formatDateTime(row.recordTime) }}
              </el-text>
            </template>
          </el-table-column>
          <el-table-column prop="type" label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="row.type === 'attendance' ? 'danger' : 'success'">
                {{ row.type === 'attendance' ? '签到' : '充值' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="sessions" label="课时变动" width="120">
            <template #default="{ row }">
              <span :class="row.type === 'attendance' ? 'text-danger' : 'text-success'">
                {{ row.type === 'attendance' ? '-' : '+' }}{{ Math.abs(row.sessions) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="备注" show-overflow-tooltip>
            <template #default="{ row }">
              <template v-if="row.type === 'attendance'">
                <div v-if="row.teacherName">授课老师：{{ row.teacherName }}</div>
                <div v-if="row.content">课程内容：{{ row.content }}</div>
              </template>
              <div v-if="row.remark">{{ row.remark }}</div>
            </template>
          </el-table-column>
        </el-table>
        <!-- 记录分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="recordsQuery.page"
            v-model:page-size="recordsQuery.limit"
            :total="recordsTotal"
            :page-sizes="[10, 20, 50]"
            small
            background
            layout="total, sizes, prev, pager, next"
            @size-change="getRecords"
            @current-change="getRecords"
          />
        </div>
      </div>
    </el-dialog>

    <!-- 编辑对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑学员" width="500px">
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="姓名" required>
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="手机号" required>
          <el-input v-model="editForm.phone" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="editForm.email" />
        </el-form-item>
        <!-- 只读展示课程信息 -->
        <el-form-item label="课程">
          <div>{{ editForm.lessonName }}</div>
        </el-form-item>
        <el-form-item label="课时">
          <div>{{ editForm.remainingSessions }}/{{ editForm.totalSessions }}</div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleEditSubmit">确定</el-button>
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

.lesson-desc {
  white-space: pre-wrap;
}

.lesson-price {
  font-weight: bold;
}

.text-gray {
  color: #909399;
  font-size: 13px;
}

.text-price {
  color: #f56c6c;
  font-weight: bold;
}

.mt-1 {
  margin-top: 4px;
}

.info-line {
  line-height: 24px;

  .info-label {
    color: #606266;
    display: inline-block;
    width: 50px;
  }
}

.attendance-info {
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 16px;
}

.ml-2 {
  margin-left: 8px;
}

.text-danger {
  color: #f56c6c;
  font-weight: 500;
}

.text-success {
  color: #67c23a;
  font-weight: 500;
}
</style>
