<script setup lang="ts">
import { ref, onMounted, computed } from "vue"
import { ElMessage, ElMessageBox } from "element-plus"
import { Search, Plus, Operation, Delete } from "@element-plus/icons-vue"
import { lessonApi } from "@/api/lesson"
import { studentApi } from "@/api/student"
import type { ElTable } from 'element-plus'
import type { Student } from '@/api/student'
import dayjs from 'dayjs'

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
  stage: string
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
  type: "",
  stage: "",
  status: ""
})

// 重置查询参数
const resetQueryParams = () => {
  queryParams.value = {
    page: 1,
    limit: 10,
    keyword: "",
    type: "",
    stage: "",
    status: ""
  }
  getLessons()
}

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

// 课程阶段选项
const stageOptions = [
  { label: '入门', value: 'basic' },
  { label: '提高', value: 'intermediate' },
  { label: '普及', value: 'advanced' }
]

// 获取类型显示文本
const getTypeText = (type: string) => {
  return type === 'private' ? '一对一' : '班课'
}

// 获取阶段显示文本
const getStageText = (stage: string) => {
  const map: Record<string, string> = {
    basic: '入门',
    intermediate: '提高',
    advanced: '普及'
  }
  return map[stage] || stage
}

// 获取阶段标签类型
const getStageType = (stage: string) => {
  const map: Record<string, string> = {
    basic: 'info',
    intermediate: 'warning',
    advanced: 'success'
  }
  return map[stage] || 'info'
}

// 表单数据
const formData = ref<Partial<Lesson>>({
  name: "",
  type: "private",
  stage: "basic",
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
    stage: "basic",
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
    await lessonApi.lesson.updateStatus(row._id, row.status)
    ElMessage.success("状态更新成功")
  } catch (error) {
    // 如果更新失败，恢复原来的状态
    row.status = row.status === 'active' ? 'inactive' : 'active'
    ElMessage.error("状态更新失败")
    console.error(error)
  }
}

// 格式化时间
const formatDateTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 拖拽相关
const tableRef = ref<InstanceType<typeof ElTable>>()
const dragRow = ref<any>(null)
const dragging = ref(false)

const handleDragStart = (row: any) => {
  dragRow.value = row
  dragging.value = true
  const tr = document.querySelector(`tr[data-row-key="${row._id}"]`)
  tr?.classList.add('dragging')
}

const handleDrop = async (row: any) => {
  if (!dragRow.value || dragRow.value._id === row._id) {
    return
  }

  try {
    const currentIndex = tableData.value.findIndex(item => item._id === dragRow.value._id)
    const targetIndex = tableData.value.findIndex(item => item._id === row._id)

    await lessonApi.lesson.updateSort({
      id: dragRow.value._id,
      targetId: row._id,
      type: targetIndex > currentIndex ? 'after' : 'before'
    })

    await getLessons()
    ElMessage.success('排序更新成功')
  } catch (error) {
    console.error('排序更新失败:', error)
    ElMessage.error('排序更新失败')
  } finally {
    const tr = document.querySelector(`tr[data-row-key="${dragRow.value._id}"]`)
    tr?.classList.remove('dragging')
    dragRow.value = null
    dragging.value = false
  }
}

// 签到相关
const attendanceDialogVisible = ref(false)
const currentLesson = ref<Lesson | null>(null)
const selectedAttendanceStudents = ref<Student[]>([])
const attendanceStudents = ref<Student[]>([])
const searchKeyword = ref("")

// 学员选择对话框
const studentSelectVisible = ref(false)
const selectedLessonId = ref('')
const studentList = ref<Student[]>([])
const selectedEnrollStudents = ref<Student[]>([])
const studentLoading = ref(false)
const studentTotal = ref(0)
const hasMore = ref(true)

// 学员查询参数
const studentQueryParams = ref({
  page: 1,
  limit: 10,
  keyword: '',
  lessonId: '', // 用于过滤未关联的学员
  status: 'active',
  deleted: false
})

// 获取课程关联的学员列表
const getAttendanceStudents = async () => {
  try {
    const { data } = await studentApi.getList({
      lessonId: currentLesson.value._id,
      keyword: searchKeyword.value
    })
    attendanceStudents.value = data.students.map(student => ({
      ...student,
      remainingSessions: student.lessonStats?.[currentLesson.value._id]?.remainingSessions || 0,
      totalSessions: student.lessonStats?.[currentLesson.value._id]?.totalSessions || 0
    }))
  } catch (error) {
    ElMessage.error('获取学员列表失败')
    console.error(error)
  }
}

// 打开签到对话框
const handleAttendance = (lesson: any) => {
  currentLesson.value = lesson
  attendanceDialogVisible.value = true
  getAttendanceStudents() // 获取已关联的学员
}

// 处理签到学员选择变化
const handleAttendanceSelectionChange = (selection: any[]) => {
  selectedAttendanceStudents.value = selection
}

// 签到相关
const attendanceForm = ref({
  studentIds: [] as string[],
  attendanceTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  sessions: 1,
  remark: ''
})

// 计算每个学员的扣费金额
const calculateStudentAmount = computed(() => {
  if (!currentLesson.value || !attendanceForm.value.sessions) return 0
  return currentLesson.value.price * attendanceForm.value.sessions
})

// 计算总扣费金额
const calculateAmount = computed(() => {
  if (!currentLesson.value || !attendanceForm.value.sessions) return 0
  return currentLesson.value.price * attendanceForm.value.sessions
})

// 处理签到提交
const handleSubmitAttendance = async () => {
  try {
    if (!selectedAttendanceStudents.value.length) {
      return ElMessage.warning('请选择要签到的学员')
    }

    // 打开签到确认对话框
    attendanceForm.value.studentIds = selectedAttendanceStudents.value.map(s => s._id)
    attendanceConfirmVisible.value = true
  } catch (error) {
    ElMessage.error('签到失败')
    console.error(error)
  }
}

// 确认签到
const handleConfirmAttendance = async () => {
  try {
    loading.value = true
  
    // 使用批量签到接口
    await lessonApi.lesson.batchAttendance(currentLesson.value._id, {
      studentIds: selectedAttendanceStudents.value.map(s => s._id),
      sessions: attendanceForm.value.sessions,
      attendanceTime: attendanceForm.value.attendanceTime,
      remark: attendanceForm.value.remark.trim() || undefined
    })
  
    ElMessage.success('签到成功')
    attendanceConfirmVisible.value = false
    attendanceDialogVisible.value = false
    selectedAttendanceStudents.value = []
    await getAttendanceStudents()
  } catch (error) {
    ElMessage.error('签到失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 获取未关联学员列表
const getStudents = async () => {
  try {
    studentLoading.value = true
    const params = {
      ...studentQueryParams.value,
      excludeLessonId: selectedLessonId.value
    }
    const { data } = await studentApi.getList(params)
    if (studentQueryParams.value.page === 1) {
      studentList.value = data.students.map(item => ({
        ...item,
        isChecked: false
      }))
    } else {
      studentList.value.push(...data.students.map(item => ({
        ...item,
        isChecked: false
      })))
    }
    studentTotal.value = data.pagination.total
    hasMore.value = studentList.value.length < data.pagination.total
  } catch (error) {
    ElMessage.error('获取学员列表失败')
    console.error(error)
  } finally {
    studentLoading.value = false
  }
}

// 打开学员选择对话框
const handleAddStudent = (lesson: Lesson) => {
  selectedLessonId.value = lesson._id
  studentSelectVisible.value = true
  studentQueryParams.value.page = 1
  studentQueryParams.value.keyword = ''
  getStudents()
}

// 处理学员选择变化
const handleEnrollSelectionChange = (selection: any[]) => {
  selectedEnrollStudents.value = selection
}

// 提交选中的学员
const handleSubmitStudents = async () => {
  if (!selectedEnrollStudents.value.length) {
    ElMessage.warning('请选择要添加的学员')
    return
  }
  
  try {
    studentLoading.value = true
    await lessonApi.lesson.addStudents({
      lessonId: selectedLessonId.value,
      studentIds: selectedEnrollStudents.value.map(student => student._id)
    })
    ElMessage.success('添加学员成功')
    studentSelectVisible.value = false
    selectedEnrollStudents.value = []
    await getAttendanceStudents()
  } catch (error) {
    ElMessage.error('添加学员失败')
    console.error(error)
  } finally {
    studentLoading.value = false
  }
}

// 处理表格滚动到底部
const handleScrollEnd = () => {
  if (!studentLoading.value && hasMore.value) {
    studentQueryParams.value.page++
    getStudents()
  }
}

// 处理学员搜索
const handleStudentSearch = () => {
  studentQueryParams.value.page = 1
  studentList.value = []
  hasMore.value = true
  getStudents()
}

// 处理学员分页变化
const handleStudentPageChange = (page: number) => {
  studentQueryParams.value.page = page
  getStudents()
}

// 处理搜索
const handleSearch = () => {
  getAttendanceStudents()
}

// 处理退出课程
const handleQuitLesson = async (student: Student) => {
  try {
    await lessonApi.lesson.removeStudent(currentLesson.value._id, student._id)
    ElMessage.success('退出课程成功')
    getAttendanceStudents()
  } catch (error) {
    ElMessage.error('退出课程失败')
    console.error(error)
  }
}

const attendanceConfirmVisible = ref(false)

// 签到记录相关
const attendanceRecordsVisible = ref(false)
const attendanceRecords = ref<any[]>([])
const attendanceRecordsTotal = ref(0)
const attendanceRecordsQuery = ref({
  page: 1,
  limit: 10
})
const attendanceRecordsLoading = ref(false)

// 获取签到记录
const getAttendanceRecords = async () => {
  try {
    attendanceRecordsLoading.value = true
    const { data } = await lessonApi.lesson.getAttendanceRecords(
      currentLesson.value._id,
      attendanceRecordsQuery.value
    )
    attendanceRecords.value = data.records
    attendanceRecordsTotal.value = data.pagination.total
  } catch (error) {
    console.error('获取签到记录失败:', error)
    ElMessage.error('获取签到记录失败')
  } finally {
    attendanceRecordsLoading.value = false
  }
}

// 查看签到记录
const handleViewRecords = (lesson: Lesson) => {
  currentLesson.value = lesson
  attendanceRecordsVisible.value = true
  getAttendanceRecords()
}

// 修改记录相关
const editRecordDialogVisible = ref(false)
const editRecordForm = ref({
  batchId: '',
  sessions: 0,
  remark: '',
  originalSessions: 0,
  calculatedAmount: 0,
  originalAmount: 0,
  lessonName: '',
  lessonPrice: 0,
  modifyHistory: []
})
const editRecordLoading = ref(false)

// 打开修改记录对话框
const handleEditRecord = (record: any) => {
  const originalSessions = Math.abs(record.students[0].sessions)
  const originalAmount = originalSessions * currentLesson.value.price
  const newAmount = originalSessions * currentLesson.value.price

  editRecordForm.value = {
    batchId: record.batchId,
    sessions: originalSessions,
    remark: record.remark,
    originalSessions,
    calculatedAmount: record.totalAmount,
    originalAmount,
    lessonName: currentLesson.value.name,
    lessonPrice: currentLesson.value.price,
    modifyHistory: record.modifyHistory || []
  }
  editRecordDialogVisible.value = true
}

// 计算修改后的金额
const calculateModifiedAmount = computed(() => {
  if (!editRecordForm.value.sessions || !editRecordForm.value.lessonPrice) return 0
  return editRecordForm.value.lessonPrice * editRecordForm.value.sessions
})

// 提交修改
const handleEditRecordSubmit = async () => {
  try {
    editRecordLoading.value = true
    await lessonApi.lesson.updateAttendanceRecord(editRecordForm.value.batchId, {
      sessions: editRecordForm.value.sessions,
      remark: editRecordForm.value.remark?.trim()
    })
    ElMessage.success('修改成功')
    editRecordDialogVisible.value = false
    getAttendanceRecords() // 刷新记录列表
  } catch (error) {
    console.error('修改记录失败:', error)
    ElMessage.error('修改记录失败')
  } finally {
    editRecordLoading.value = false
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
        <el-form-item label="课程名称">
          <el-input
            v-model="queryParams.keyword"
            placeholder="搜索课程名称"
            clearable
            @input="getLessons"
            @clear="getLessons"
            @keyup.enter="getLessons"
          >
            <template #prefix>

              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="课程类型">
          <el-select v-model="queryParams.type" placeholder="课程类型" clearable @change="getLessons" style="width: 160px">
            <el-option
              v-for="option in typeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="课程阶段">
          <el-select v-model="queryParams.stage" placeholder="课程阶段" clearable @change="getLessons" style="width: 160px">
            <el-option
              v-for="option in stageOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button @click="resetQueryParams">重置</el-button>
          <el-button type="success" :icon="Plus" @click="handleCreate">新增课程</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card v-loading="loading">
      <el-table
        ref="tableRef"
        :data="tableData"
        style="width: 100%"
        row-key="_id"
      >
        <el-table-column width="60" class-name="drag-column">
          <template #default="{ row }">
            <div
              class="drag-cell"
              draggable="true"
              @dragstart="handleDragStart(row)"
              @dragover.prevent
              @dragenter.prevent
              @drop="handleDrop(row)"
            >
              <el-icon class="drag-handle">
                <Operation />
              </el-icon>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="课程名称" />
        <el-table-column prop="type" label="课程类型">
          <template #default="{ row }">
            <el-tag>{{ getTypeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="stage" label="课程阶段">
          <template #default="{ row }">
            <el-tag :type="getStageType(row.stage)">
              {{ getStageText(row.stage) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="课时信息">
          <template #default="{ row }">
            <div>总课时：{{ row.totalSessions }}节</div>
            <div>每节时长：{{ row.minutesPerSession }}分钟</div>
            <div class="text-price">课时单价：¥{{ row.price.toFixed(2) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="180">
          <template #default="{ row }">
            <div class="status-cell">
              <el-switch
                v-model="row.status"
                :active-value="'active'"
                :inactive-value="'inactive'"
                :active-text="'启用'"
                :inactive-text="'禁用'"
                @change="() => handleStatusChange(row)"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <div class="operation-buttons">
              <el-button
                type="primary"
                size="small"
                @click="handleAttendance(row)"
              >
                签到
              </el-button>
              <el-button
                type="warning"
                size="small"
                @click="handleViewRecords(row)"
              >
                记录
              </el-button>
              <el-button 
                type="primary" 
                size="small"
                @click="handleEdit(row)"
              >
                编辑
              </el-button>
              <el-popconfirm 
                title="确定要删除吗？" 
                @confirm="handleDelete(row._id)"
              >
                <template #reference>
                  <el-button 
                    type="danger" 
                    size="small"
                  >
                    删除
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
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
        <el-form-item label="课程阶段" required>
          <el-select v-model="formData.stage">
            <el-option
              v-for="option in stageOptions"
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
        <el-form-item label="课时单价" required>
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

    <!-- 签到对话框 -->
    <el-dialog
      v-model="attendanceDialogVisible"
      title="课程签到"
      width="800px"
    >
      <div class="attendance-dialog">
        <!-- 顶部操作区 -->
        <div class="operation-bar">
          <div class="left">
            <el-button type="primary" @click="handleAddStudent(currentLesson)">
              <el-icon><Plus /></el-icon>添加学员
            </el-button>
          </div>
          <div class="right">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索学员"
              clearable
              @clear="handleSearch"
              @input="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
        </div>

        <!-- 学员列表 -->
        <el-table
          v-loading="loading"
          :data="attendanceStudents"
          height="400"
          @selection-change="handleAttendanceSelectionChange"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="name" label="姓名" />
          <el-table-column prop="phone" label="手机号" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'info'">
                {{ row.status === 'active' ? '在读' : '结业' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="账户余额">
            <template #default="{ row }">
              <span :class="{
                'text-red-500': row.balance < 0,
                'text-green-500': row.balance > 0
              }">
                ¥ {{ row.balance }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-popconfirm
                title="确认将该学员从课程中移除?"
                confirm-button-text="确定"
                cancel-button-text="取消"
                @confirm="handleQuitLesson(row)"
              >
                <template #reference>
                  <el-button
                    type="danger"
                    link
                  >
                    退出课程
                  </el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <template #footer>
        <el-button @click="attendanceDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="loading"
          @click="handleSubmitAttendance"
        >
          确认签到
        </el-button>
      </template>
    </el-dialog>

    <!-- 学员选择对话框 -->
    <el-dialog
      v-model="studentSelectVisible"
      title="选择学员"
      width="800px"
    >
      <div class="student-select-dialog">
        <!-- 搜索栏 -->
        <div class="search-bar">
          <el-form :inline="true" :model="studentQueryParams">
            <el-form-item>
              <el-input
                v-model="studentQueryParams.keyword"
                placeholder="搜索学员姓名/手机号"
                clearable
                @clear="handleStudentSearch"
                @keyup.enter="handleStudentSearch"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="handleStudentSearch">
                搜索
              </el-button>
            </el-form-item>
          </el-form>
        </div>
        
        <!-- 学员列表 -->
        <el-table
          v-loading="studentLoading"
          :data="studentList"
          height="400"
          :infinite-scroll-disabled="!hasMore"
          :infinite-scroll-distance="10"
          @scroll="handleScrollEnd"
          @selection-change="handleEnrollSelectionChange"
        >
          <el-table-column type="selection" width="55">
          </el-table-column>
          <el-table-column prop="name" label="姓名" />
          <el-table-column prop="phone" label="手机号" />
          <el-table-column prop="balance" label="账户余额">
            <template #default="{ row }">
              <span :class="{
                'text-red-500': row.balance < 0,
                'text-green-500': row.balance > 0
              }">
                ¥ {{ row.balance }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'info'">
                {{ row.status === 'active' ? '在读' : '结业' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="注册时间">
            <template #default="{ row }">
              {{ formatDateTime(row.createdAt) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <template #footer>
        <el-button @click="studentSelectVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="studentLoading"
          :disabled="!selectedEnrollStudents.length"
          @click="handleSubmitStudents"
        >
          确定 ({{ selectedEnrollStudents.length }})
        </el-button>
      </template>
    </el-dialog>

    <!-- 签到确认对话框 -->
    <el-dialog
      v-model="attendanceConfirmVisible"
      title="确认签到"
      width="500px"
    >
      <!-- 课程信息展示 -->
      <div class="attendance-info">
        <div class="info-line">
          <span class="info-label">课程：</span>
          <el-text>{{ currentLesson?.name }}</el-text>
        </div>
        <div class="info-line">
          <span class="info-label">单课时价格：</span>
          <el-text type="danger">¥{{ currentLesson?.price }}</el-text>
        </div>
        <div class="info-line">
          <span class="info-label">课时：</span>
          <el-text>{{ attendanceForm.sessions }}节</el-text>
        </div>
        <div class="info-line">
          <span class="info-label">选中学员：</span>
          <el-text>{{ selectedAttendanceStudents.length }}人</el-text>
          <div class="selected-students">
            <div v-for="student in selectedAttendanceStudents" :key="student._id" class="student-item">
              <span>{{ student.name }}</span>
              <span class="deduction-info">
                扣费: <span class="text-danger">¥{{ calculateStudentAmount }}</span>
                ({{ attendanceForm.sessions }}课时 × ¥{{ currentLesson?.price }})
              </span>
              <span :class="{ 'text-danger': student.balance < calculateStudentAmount }">
                余额: ¥{{ student.balance }}
              </span>
            </div>
          </div>
        </div>
        <div class="info-line">
          <span class="info-label">每人扣费金额：</span>
          <el-text type="danger">¥{{ calculateAmount }}</el-text>
          <span class="amount-detail">
            ({{ attendanceForm.sessions }}课时 × ¥{{ currentLesson?.price }})
          </span>
        </div>
      </div>
      <el-divider />
      
      <el-form :model="attendanceForm" label-width="100px">
        <el-form-item label="签到时间" required>
          <el-date-picker
            v-model="attendanceForm.attendanceTime"
            type="datetime"
            placeholder="选择签到时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="课时" required>
          <el-input-number
            v-model="attendanceForm.sessions"
            :min="1"
            :precision="0"
            @change="calculateAmount"
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
        <el-button @click="attendanceConfirmVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="loading"
          @click="handleConfirmAttendance"
        >
          确认签到
        </el-button>
      </template>
    </el-dialog>

    <!-- 签到记录对话框 -->
    <el-dialog
      v-model="attendanceRecordsVisible"
      :title="`${currentLesson?.name} - 签到记录`"
      width="800px"
    >
      <el-table
        v-loading="attendanceRecordsLoading"
        :data="attendanceRecords"
        style="width: 100%"
      >
        <el-table-column prop="recordTime" label="签到时间" width="180">
          <template #default="{ row }">
            {{ dayjs(row.recordTime).format('YYYY-MM-DD HH:mm:ss') }}
          </template>
        </el-table-column>
        <el-table-column label="签到学员" min-width="300">
          <template #default="{ row }">
            <div class="students-info">
              <div class="info-header">
                <span class="student-count">
                  <span class="count">{{ row.students.length }}</span>人
                  <span class="text-muted">签到</span>
                </span>
              </div>
              <el-button
                type="primary"
                link
                size="small"
                @click="() => row.showDetails = !row.showDetails"
              >
                <el-icon class="mr-1">
                  <component :is="row.showDetails ? 'ArrowUp' : 'ArrowDown'" />
                </el-icon>
                {{ row.showDetails ? '收起' : '展开' }}
              </el-button>
              <div v-if="row.showDetails" class="students-details">
                <el-tag
                  v-for="student in row.students"
                  :key="student._id"
                  size="small"
                  class="mb-1 mr-1"
                  effect="plain"
                >
                  {{ student.name }}
                </el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="每人耗费" width="180">
          <template #default="{ row }">
            <div>课时：{{ Math.abs(row.students?.[0]?.sessions) }}节</div>
            <div class="text-price">课单价：¥{{ Math.abs(row.students?.[0]?.amount / row.students?.[0]?.sessions) }}</div>
            <div class="text-price">金额：¥{{ Math.abs(row.students?.[0]?.amount) }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="recordTime" label="备注" min-width="200">
          <template #default="{ row }">
            {{ row.remark || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="handleEditRecord(row)"
            >
              修改
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="attendanceRecordsQuery.page"
          v-model:page-size="attendanceRecordsQuery.limit"
          :total="attendanceRecordsTotal"
          @current-change="getAttendanceRecords"
          @size-change="getAttendanceRecords"
        />
      </div>
    </el-dialog>

    <!-- 修改记录对话框 -->
    <el-dialog
      v-model="editRecordDialogVisible"
      title="修改签到记录"
      width="500px"
    >
      <!-- 课程信息 -->
      <div class="course-info">
        <div class="info-item">
          <span class="label">课程：</span>
          <span class="value">{{ editRecordForm.lessonName }}</span>
        </div>
        <div class="info-item">
          <span class="label">单课时价格：</span>
          <span class="value price">¥{{ editRecordForm.lessonPrice }}</span>
        </div>
      </div>

      <el-form :model="editRecordForm" label-width="100px">
        <el-form-item label="签到课时">
          <el-input-number
            v-model="editRecordForm.sessions"
            :min="1"
            :precision="0"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="editRecordForm.remark"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
        
        <!-- 显示金额变化 -->
        <div v-if="editRecordForm.sessions !== editRecordForm.originalSessions" class="amount-preview">
          <div class="amount-change">
            <div>（每人）原扣费金额: ¥{{ editRecordForm.originalAmount }}</div>
            <el-icon><ArrowRight /></el-icon>
            <div>（每人）新扣费金额: ¥{{ calculateModifiedAmount }}</div>
          </div>
          <div class="diff-amount" :class="calculateModifiedAmount > editRecordForm.originalAmount ? 'positive' : 'negative'">
            {{ calculateModifiedAmount > editRecordForm.originalAmount ? '多扣' : '少扣' }}
            ¥{{ Math.abs(calculateModifiedAmount - editRecordForm.originalAmount) }}
          </div>
        </div>
        
        <!-- 显示修改历史 -->
        <div v-if="editRecordForm.modifyHistory?.length" class="modify-history">
          <div class="history-title">修改历史</div>
          <el-timeline>
            <el-timeline-item
              v-for="(history, index) in editRecordForm.modifyHistory"
              :key="index"
              :timestamp="dayjs(history.modifiedAt).format('YYYY-MM-DD HH:mm:ss')"
            >
              <div class="history-item">
                <div class="history-changes">
                  <div>
                    课时: {{ Math.abs(history.before.sessions) }} -> {{ Math.abs(history.after.sessions) }}节
                  </div>
                  <div>
                    金额: ¥{{ Math.abs(history.before.amount) }} -> ¥{{ Math.abs(history.after.amount) }}
                  </div>
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="editRecordDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="editRecordLoading"
          @click="handleEditRecordSubmit"
        >
          确定
        </el-button>
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

.text-price {
  color: #f56c6c;
  font-weight: bold;
  margin-top: 4px;
}

.drag-handle {
  color: var(--el-text-color-secondary);
  font-size: 20px;
}

.el-table {
  :deep(tr.dragging) {
    background-color: var(--el-fill-color-lighter);
    opacity: 0.5;
  }
}

.drag-column {
  :deep(.cell) {
    padding: 0;
  }
}

.drag-cell {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: move;
  padding: 8px 0;
  transition: all 0.3s;

  &:hover {
    background-color: var(--el-fill-color-light);

    .drag-handle {
      color: var(--el-text-color-primary);
    }
  }
}

.status-cell {
  display: flex;
  align-items: center;
  gap: 12px;

  .status-text {
    min-width: 32px;
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }

  :deep(.el-switch) {
    --el-switch-on-color: var(--el-color-success);
    --el-switch-off-color: var(--el-color-danger);
  }

  :deep(.el-switch__label) {
    color: var(--el-text-color-regular);

    &.is-active {
      color: var(--el-color-primary);
    }
  }
}

.attendance-dialog {
  .operation-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .left {
      display: flex;
      gap: 12px;
    }

    .right {
      width: 200px;
    }
  }

  .el-table {
    margin-bottom: 16px;
  }
}

.student-select-dialog {
  .search-bar {
    margin-bottom: 16px;
    
    .el-input {
      width: 300px;
    }
  }
  
  .el-table {
    margin-bottom: 16px;
  }
}

.attendance-info {
  .info-line {
    display: flex;
    align-items: flex-start;
    margin-bottom: 12px;
    
    .info-label {
      width: 100px;
      color: var(--el-text-color-secondary);
    }

    .amount-detail {
      margin-left: 8px;
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }

    .selected-students {
      margin-left: 8px;
      
      .student-item {
        font-size: 13px;
        line-height: 1.8;
        display: flex;
        gap: 12px;
        align-items: center;
        
        .deduction-info {
          color: var(--el-text-color-regular);
        }
        
        .text-danger {
          color: var(--el-color-danger);
        }
      }
    }
  }
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.students-info {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .info-header {
    display: flex;
    align-items: center;
    white-space: nowrap;
    min-width: 80px;
  }
  
  .student-count {
    display: inline-flex;
    align-items: center;
    font-size: 14px;
    color: var(--el-text-color-regular);
    
    .count {
      font-size: 16px;
      font-weight: 500;
      color: var(--el-color-primary);
      margin-right: 2px;
    }
  }
  
  .text-muted {
    color: var(--el-text-color-secondary);
    font-size: 14px;
  }
}

.students-details {
  margin-left: 16px;
  margin-top: 8px;
}

.students-info {
  .students-details {
    margin-top: 8px;
    padding: 8px;
    background-color: #f5f7fa;
    border-radius: 4px;
  }
  
  .mb-1 {
    margin-bottom: 4px;
  }
  
  .mr-1 {
    margin-right: 4px;
  }
}

.operation-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: nowrap;
  
  .el-button {
    padding: 6px 12px;
    
    &:hover {
      color: white;
    }
    
    &.el-button--success {
      &:hover {
        background-color: var(--el-color-success);
        border-color: var(--el-color-success);
      }
    }
    
    &.el-button--info {
      &:hover {
        background-color: var(--el-color-info);
        border-color: var(--el-color-info);
      }
    }
    
    &.el-button--primary {
      &:hover {
        background-color: var(--el-color-primary);
        border-color: var(--el-color-primary);
      }
    }
    
    &.el-button--danger {
      &:hover {
        background-color: var(--el-color-danger);
        border-color: var(--el-color-danger);
      }
    }
  }
}

.amount-preview {
  margin-top: 16px;
  margin-bottom: 16px;
  padding: 8px;
  background-color: #f5f7fa;
  border-radius: 4px;

  .amount-change {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;

    .arrow {
      color: var(--el-text-color-secondary);
    }

    div {
      color: var(--el-text-color-regular);
    }
  }

  .diff-amount {
    font-size: 13px;
    
    &.positive {
      color: var(--el-color-success);
    }
    
    &.negative {
      color: var(--el-color-danger);
    }
  }
}

.modify-history {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);

  .history-title {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 8px;
    color: var(--el-text-color-regular);
  }

  .history-item {
    font-size: 13px;
    color: var(--el-text-color-regular);

    .history-changes {
      >div {
        line-height: 1.8;
      }
    }
  }

  :deep(.el-timeline-item__timestamp) {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  :deep(.el-timeline-item__node) {
    background-color: var(--el-color-primary-light-7);
  }

  :deep(.el-timeline-item__tail) {
    border-left-color: var(--el-border-color-lighter);
  }
}

.course-info {
  background-color: var(--el-fill-color-light);
  padding: 12px 16px;
  border-radius: 4px;
  margin-bottom: 20px;

  .info-item {
    display: flex;
    align-items: center;
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }

    .label {
      color: var(--el-text-color-secondary);
      width: 100px;
    }

    .value {
      color: var(--el-text-color-primary);
      font-weight: 500;

      &.price {
        color: var(--el-color-danger);
      }
    }
  }
}
</style>
