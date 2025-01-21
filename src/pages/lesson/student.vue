<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { ElMessage, ElMessageBox } from "element-plus"
import { Search, Plus, Minus, Timer } from "@element-plus/icons-vue"
import { studentApi } from "@/api/student"
import { lessonApi } from "@/api/lesson"
import * as echarts from 'echarts'

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
  lessonId: "",
  attendanceTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
  sessions: 1,
  amount: 0,
  remark: ""
})

// 当前选中的课程
const selectedLesson = ref<any>(null)

// 选择课程时的处理
const handleLessonSelect = (lessonId: string) => {
  selectedLesson.value = lessonList.value.find(l => l._id === lessonId)
  calculateAmount()
}

// 计算扣除金额
const calculateAmount = () => {
  if (selectedLesson.value) {
    attendanceForm.value.amount = attendanceForm.value.sessions * selectedLesson.value.price
  }
}

// 打开签到对话框
const handleAttendance = (student: any) => {
  currentStudent.value = student
  attendanceForm.value = {
    studentId: student._id,
    lessonId: "",
    attendanceTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
    sessions: 1,
    amount: 0,
    remark: ""
  }
  attendanceDialogVisible.value = true
}

// 提交签到
const handleAttendanceSubmit = async () => {
  try {
    if (!attendanceForm.value.lessonId) {
      return ElMessage.warning("请选择课程")
    }

    await studentApi.attendance({
      studentId: attendanceForm.value.studentId,
      lessonId: attendanceForm.value.lessonId,
      sessions: attendanceForm.value.sessions,
      attendanceTime: attendanceForm.value.attendanceTime,
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
  amount: 0,
  remark: ""
})

// 打开充值对话框
const handleRecharge = (student: any) => {
  rechargeForm.value = {
    studentId: student._id,
    amount: 0,
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

// 添加分析对话框
const analysisDialogVisible = ref(false)
const analysisLoading = ref(false)
const analysisData = ref({
  totalRecharge: 0,
  totalConsumption: 0,
  totalSessions: 0
})
const amountChartRef = ref(null)
const sessionsChartRef = ref(null)
const analysisTimeRange = ref("week")

// 图表实例
let amountChart: echarts.ECharts | null = null
let sessionsChart: echarts.ECharts | null = null

// 处理分析按钮点击
const handleAnalysis = async (student: any) => {
  try {
    currentStudent.value = student
    analysisDialogVisible.value = true
    await getAnalysisData(student._id)
    initCharts()
  } catch (error) {
    console.error('分析失败:', error)
    ElMessage.error('获取分析数据失败')
  }
}

// 获取分析数据
const getAnalysisData = async (studentId: string) => {
  try {
    analysisLoading.value = true
    const { data } = await studentApi.getAnalysisData(studentId, {
      timeRange: analysisTimeRange.value
    })
    analysisData.value = data
  } catch (error) {
    console.error('获取分析数据失败:', error)
    throw error
  } finally {
    analysisLoading.value = false
  }
}

// 初始化图表
const initCharts = () => {
  if (amountChartRef.value && sessionsChartRef.value) {
    // 销毁旧的图表实例
    amountChart?.dispose()
    sessionsChart?.dispose()

    // 初始化金额趋势图
    amountChart = echarts.init(amountChartRef.value)
    amountChart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['充值', '消费']
      },
      xAxis: {
        type: 'category',
        data: analysisData.value.amountTrend.dates
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '充值',
          type: 'bar',
          stack: 'amount',
          data: analysisData.value.amountTrend.recharge,
          itemStyle: {
            color: '#67c23a'
          }
        },
        {
          name: '消费',
          type: 'bar',
          stack: 'amount',
          data: analysisData.value.amountTrend.consumption,
          itemStyle: {
            color: '#f56c6c'
          }
        }
      ]
    })

    // 初始化课时趋势图
    sessionsChart = echarts.init(sessionsChartRef.value)
    sessionsChart.setOption({
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: analysisData.value.sessionsTrend.dates
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '课时',
          type: 'line',
          data: analysisData.value.sessionsTrend.sessions,
          areaStyle: {},
          itemStyle: {
            color: '#409eff'
          }
        }
      ]
    })
  }
}

// 更新图表数据
const updateCharts = () => {
  if (amountChart && sessionsChart) {
    amountChart.setOption({
      xAxis: {
        data: analysisData.value.amountTrend.dates
      },
      series: [
        {
          data: analysisData.value.amountTrend.recharge
        },
        {
          data: analysisData.value.amountTrend.consumption
        }
      ]
    })

    sessionsChart.setOption({
      xAxis: {
        data: analysisData.value.sessionsTrend.dates
      },
      series: [
        {
          data: analysisData.value.sessionsTrend.sessions
        }
      ]
    })
  }
}

// 处理时间范围变化
const handleAnalysisRangeChange = async (e: any) => {
  console.log(e)
  if (currentStudent.value) {
    try {
      await getAnalysisData(currentStudent.value._id)
      updateCharts()
    } catch (error) {
      console.error('更新分析数据失败:', error)
    }
  }
}

// 组件卸载时清理图表实例
onUnmounted(() => {
  amountChart?.dispose()
  sessionsChart?.dispose()
  window.removeEventListener('resize', handleResize)
})

// 处理窗口大小变化
const handleResize = () => {
  amountChart?.resize()
  sessionsChart?.resize()
}

// 监听窗口大小变化
window.addEventListener('resize', handleResize)

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
        <el-table-column prop="balance" label="账户余额">
          <template #default="{ row }">
            <el-text :type="row.balance >= 0 ? 'success' : 'danger'">
              ¥{{ row.balance.toFixed(2) }}
            </el-text>
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
        <el-table-column label="操作" width="460" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleAttendance(row)">
              签到
            </el-button>
            <el-button type="success" size="small" @click="handleRecharge(row)">
              充值
            </el-button>
            <el-button type="info" size="small" @click="handleViewRecords(row)">
              记录
            </el-button>
            <el-button type="warning" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="primary" size="small" @click="handleAnalysis(row)">
              分析
            </el-button>
            <el-popconfirm title="确定要删除吗？" @confirm="handleDelete(row._id)">
              <template #reference>
                <el-button type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
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
          <span class="info-label">余额：</span>
          <el-text :type="currentStudent?.balance >= 0 ? 'success' : 'danger'">
            ¥{{ currentStudent?.balance.toFixed(2) }}
          </el-text>
        </div>
      </div>
      <el-divider />
      <el-form :model="attendanceForm" label-width="100px">
        <el-form-item label="选择课程" required>
          <el-select v-model="attendanceForm.lessonId" placeholder="请选择课程" @change="handleLessonSelect">
            <el-option v-for="lesson in lessonList" :key="lesson._id" :label="lesson.name" :value="lesson._id">
              <span>{{ lesson.name }}</span>
              <span class="text-gray ml-2">(¥{{ lesson.price }}/课时)</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="签到时间" required>
          <el-date-picker v-model="attendanceForm.attendanceTime" type="datetime" placeholder="选择日期时间"
            format="YYYY-MM-DD HH:mm" value-format="YYYY-MM-DD HH:mm:ss"
            :default-time="new Date(2000, 1, 1, new Date().getHours(), new Date().getMinutes(), 0)" />
        </el-form-item>
        <el-form-item label="课时数" required>
          <el-input-number v-model="attendanceForm.sessions" :min="1" @change="calculateAmount" />
        </el-form-item>
        <el-form-item label="扣除金额">
          <el-text type="danger">¥{{ attendanceForm.amount.toFixed(2) }}</el-text>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="attendanceForm.remark" type="textarea" :rows="2" placeholder="请输入备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="attendanceDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAttendanceSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 充值对话框 -->
    <el-dialog v-model="rechargeDialogVisible" title="账户充值" width="500px">
      <!-- 学员信息展示 -->
      <div class="attendance-info">
        <div class="info-line">
          <span class="info-label">学员：</span>
          <el-text>{{ currentStudent?.name }}</el-text>
        </div>
        <div class="info-line">
          <span class="info-label">余额：</span>
          <el-text :type="currentStudent?.balance >= 0 ? 'success' : 'danger'">
            ¥{{ currentStudent?.balance.toFixed(2) }}
          </el-text>
        </div>
      </div>
      <el-divider />
      <el-form :model="rechargeForm" label-width="100px">
        <el-form-item label="充值金额" required>
          <el-input-number v-model="rechargeForm.amount" :min="0" :precision="2" :step="100" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="rechargeForm.remark" type="textarea" :rows="2" placeholder="请输入备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rechargeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleRechargeSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 上课记录对话框 -->
    <el-dialog v-model="recordsDialogVisible" title="账户记录" width="800px">
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
          <el-table-column prop="amount" label="金额变动" width="120">
            <template #default="{ row }">
              <span :class="(row.amount || 0) < 0 ? 'text-danger' : 'text-success'">
                {{ row.amount > 0 ? '+' : '' }}{{ (row.amount || 0).toFixed(2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="课程信息" width="200">
            <template #default="{ row }">
              <template v-if="row.type === 'attendance' && row.lessonId">
                <div>{{ row.lessonId.name }}</div>
                <div class="text-gray">{{ row.sessions }}课时</div>
              </template>
            </template>
          </el-table-column>
          <el-table-column label="备注" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="row.remark">{{ row.remark }}</span>
            </template>
          </el-table-column>
        </el-table>
        <!-- 记录分页 -->
        <div class="pagination-wrapper">
          <el-pagination v-model:current-page="recordsQuery.page" v-model:page-size="recordsQuery.limit"
            :total="recordsTotal" :page-sizes="[10, 20, 50]" small background layout="total, sizes, prev, pager, next"
            @size-change="getRecords" @current-change="getRecords" />
        </div>
      </div>
    </el-dialog>

    <!-- 编辑对话框 -->
    <el-dialog v-model="editDialogVisible" :title="dialogTitle" width="500px">
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
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleEditSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 分析对话框 -->
    <el-dialog v-model="analysisDialogVisible" title="学员分析" width="900px">
      <!-- 头部信息不需要loading -->
      <div class="analysis-header">
        <div class="student-info">
          <h3>{{ currentStudent?.name }}</h3>
          <div class="balance-info">
            当前余额：
            <span :class="(currentStudent?.balance || 0) >= 0 ? 'text-success' : 'text-danger'">
              ¥{{ (currentStudent?.balance || 0).toFixed(2) }}
            </span>
          </div>
        </div>
        <div class="date-filter">
          <el-radio-group v-model="analysisTimeRange" @change="handleAnalysisRangeChange">
            <el-radio-button label="week">本周</el-radio-button>
            <el-radio-button label="month">本月</el-radio-button>
            <el-radio-button label="year">本年</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <!-- 内容区域使用loading -->
      <el-loading :visible="analysisLoading" />

      <!-- 统计数据卡片 -->
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-icon success">
            <el-icon><Plus /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">充值总额</div>
            <div class="stat-value text-success">¥{{ (analysisData.totalRecharge || 0).toFixed(2) }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon danger">
            <el-icon><Minus /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">消费总额</div>
            <div class="stat-value text-danger">¥{{ (analysisData.totalConsumption || 0).toFixed(2) }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon info">
            <el-icon><Timer /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">总课时</div>
            <div class="stat-value">{{ analysisData.totalSessions || 0 }}节</div>
          </div>
        </div>
      </div>

      <!-- 图表展示 -->
      <div class="charts-container">
        <el-card class="chart-card">
          <template #header>金额趋势</template>
          <div ref="amountChartRef" style="height: 300px"></div>
        </el-card>
        <el-card class="chart-card">
          <template #header>课时消耗</template>
          <div ref="sessionsChartRef" style="height: 300px"></div>
        </el-card>
      </div>
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

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  .student-info {
    h3 {
      margin: 0;
      margin-bottom: 8px;
      font-size: 20px;
    }
  }
}

.stat-cards {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;

  .stat-card {
    flex: 1;
    background: white;
    border-radius: 8px;
    padding: 20px;
    display: flex;
    align-items: center;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.15);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
      font-size: 24px;
      color: white;

      &.success {
        background: linear-gradient(135deg, #67c23a 0%, #95d475 100%);
      }

      &.danger {
        background: linear-gradient(135deg, #f56c6c 0%, #f89898 100%);
      }

      &.info {
        background: linear-gradient(135deg, #409eff 0%, #79bbff 100%);
      }
    }

    .stat-info {
      flex: 1;

      .stat-label {
        font-size: 14px;
        color: var(--el-text-color-secondary);
        margin-bottom: 8px;
      }

      .stat-value {
        font-size: 24px;
        font-weight: bold;
        line-height: 1;

        &.text-success {
          color: var(--el-color-success);
        }

        &.text-danger {
          color: var(--el-color-danger);
        }
      }
    }
  }
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;

  .chart-card {
    .chart-header {
      font-size: 16px;
      font-weight: bold;
      color: var(--el-text-color-primary);
    }
  }
}
</style>
