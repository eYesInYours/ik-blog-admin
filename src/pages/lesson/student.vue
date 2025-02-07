<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue"
import { ElMessage, ElMessageBox } from "element-plus"
import { Search, Plus, Minus, ArrowRight } from "@element-plus/icons-vue"
import { studentApi } from "@/api/student"
import { lessonApi } from "@/api/lesson"
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import type { Lesson } from '@/api/lesson'

// 表格数据
const tableData = ref([])
const loading = ref(false)
const total = ref(0)
const lessonList = ref<Lesson[]>([])

// 查询参数
const queryParams = ref({
  page: 1,
  limit: 10,
  keyword: "",
  status: "active",
  deleted: false as boolean | '', // 添加删除状态查询
  lessonId: "" // 添加课程筛选
})

// 获取课程列表
const getLessons = async () => {
  try {
    const { data } = await lessonApi.lesson.getList({ 
      status: 'active',
      limit: 999 // 获取所有有效课程
    })
    lessonList.value = data.lessons
  } catch (error) {
    console.error('获取课程列表失败:', error)
  }
}

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

// 对话框控制
const dialogVisible = ref(false)
const dialogType = ref<"create" | "edit">("create")
const formRef = ref()

// 表单数据
const formData = ref({
  _id: "",
  name: "",
  phone: "",
  email: "",
  remark: "",
  lessonId: ""
})

// 表单验证规则
const formRules = {
  name: [{ required: true, message: "请输入姓名", trigger: "blur" }],
  // 手机号正则
  phone: [{ required: true, message: "请输入手机号", trigger: "blur" }, { pattern: /^1[3-9]\d{9}$/, message: "请输入正确的手机号", trigger: "blur" }],
  // 邮箱正则
  email: [{ required: false, message: "请输入邮箱", trigger: "blur" }, { pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, message: "请输入正确的邮箱", trigger: "blur" }]
}

// 打开创建对话框
const handleCreate = () => {
  dialogType.value = "create"
  formData.value = {
    _id: "",
    name: "",
    phone: "",
    email: "",
    remark: "",
    lessonId: ""
  }
  dialogVisible.value = true
}

// 打开编辑对话框
const handleEdit = (row: any) => {
  dialogType.value = "edit"
  formData.value = {
    _id: row._id,
    name: row.name,
    phone: row.phone,
    email: row.email || "",
    remark: row.remark || "",
    lessonId: row.lessons?.[0]?.lessonId || ""
  }
  dialogVisible.value = true
}

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    if (dialogType.value === "create") {
      await studentApi.create(formData.value)
      ElMessage.success("创建成功")
    } else {
      await studentApi.update(formData.value._id, {
        name: formData.value.name,
        phone: formData.value.phone,
        email: formData.value.email,
        remark: formData.value.remark,
        lessonId: formData.value.lessonId
      })
      ElMessage.success("更新成功")
    }
    dialogVisible.value = false
    getStudents() // 刷新列表
  } catch (error) {
    ElMessage.error(dialogType.value === "create" ? "创建失败" : "更新失败")
  }
}

// 签到相关
const attendanceDialogVisible = ref(false)
const currentStudent = ref<any>(null)
const attendanceForm = ref({
  studentId: "",
  lessonId: "",
  attendanceTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
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
    lessonId: student.lessons?.[0]?.lessonId || "",
    attendanceTime: dayjs().format('YYYY-MM-DD HH:mm'),
    sessions: 1,
    amount: 0,
    remark: ""
  }
  // 若有student.lessons，则初始化selectedLesson
  if (student.lessons?.length) {
    selectedLesson.value = lessonList.value.find(item => item._id === student.lessons[0].lessonId)
    if (selectedLesson.value) {
      calculateAmount()
    }
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
  currentStudent.value = student
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
  limit: 10,
  type: ''
})
const recordsTotal = ref(0)

// 获取上课记录
const getRecords = async (studentId: string) => {
  if (!studentId) return // 添加空值检查

  try {
    recordsLoading.value = true
    const { data } = await studentApi.getAttendanceRecords(studentId, {
      page: recordsQuery.value.page,
      limit: recordsQuery.value.limit,
      type: recordsQuery.value.type
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
  currentStudent.value = student // 设置当前学员
  recordsDialogVisible.value = true
  recordsQuery.value = {
    page: 1,
    limit: 10,
    type: ''
  }
  getRecords(student._id)
}

// 删除学员
const handleDelete = async (id: string) => {
  try {
    await studentApi.delete(id)
    ElMessage.success('删除成功')
    getStudents()
  } catch (error) {
    ElMessage.error('删除失败')
    console.error(error)
  }
}

// 格式化时间的函数
const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm')
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

// 关闭对话框时重置表单
watch(dialogVisible, (val) => {
  if (!val) {
    formRef.value.resetFields()
  }
})

// 添加筛选按钮
const handleFilterRecords = (type: string) => {
  if (!currentStudent.value?._id) return // 添加空值检查

  recordsQuery.value.type = type
  recordsQuery.value.page = 1
  getRecords(currentStudent.value._id)
}

// 恢复学员
const handleRestore = async (id: string) => {
  try {
    await studentApi.restore(id)
    ElMessage.success('恢复成功')
    getStudents()
  } catch (error) {
    console.error('恢复失败:', error)
    ElMessage.error('恢复失败')
  }
}

// 彻底删除学员
const handlePermanentDelete = async (id: string) => {
  try {
    await studentApi.permanentDelete(id)
    ElMessage.success('删除成功')
    getStudents()
  } catch (error) {
    console.error('删除失败:', error)
    ElMessage.error('删除失败')
  }
}

// 修改记录相关
const editRecordDialogVisible = ref(false)
const editRecordForm = ref({
  id: '',
  type: '',
  lessonName: '',
  lessonPrice: 0,
  sessions: 0,
  amount: 0,
  originalAmount: 0,
  calculatedAmount: 0,
  recordTime: '',
  modifyHistory: []
})

// 处理充值金额变化
const handleRechargeAmountChange = (value: number | null) => {
  if (value === null) {
    value = 0
  }
  editRecordForm.value.calculatedAmount = value
}

// 打开修改记录对话框
const handleEditRecord = (record: any) => {
  editRecordForm.value = {
    id: record._id,
    type: record.type,
    lessonName: record?.lessonId?.name,
    lessonPrice: record?.lessonId?.price,
    sessions: Math.abs(record.sessions),
    amount: Math.abs(record.amount),
    originalAmount: record.amount,
    calculatedAmount: record.amount,
    recordTime: record.recordTime ? dayjs(record.recordTime).format('YYYY-MM-DD HH:mm:ss') : dayjs().format('YYYY-MM-DD HH:mm:ss'),
    modifyHistory: record.modifyHistory || [],
    remark: record.remark || ''
  }
  editRecordDialogVisible.value = true
}

// 修改记录时重新计算金额
const calculateModifiedAmount = (value: number | null) => {
  if (value === null) {
    value = 0
  }
  const amount = -(value * editRecordForm.value.lessonPrice)
  editRecordForm.value.calculatedAmount = Number(amount.toFixed(2))
}

// 提交修改记录
const handleEditRecordSubmit = async () => {
  try {
    const data: any = { remark: editRecordForm.value.remark }

    if (editRecordForm.value.type === 'attendance') {
      data.sessions = editRecordForm.value.sessions
      data.recordTime = editRecordForm.value.recordTime
      data.amount = -(editRecordForm.value.sessions * editRecordForm.value.lessonPrice)
    } else {
      data.amount = editRecordForm.value.amount
    }

    await studentApi.updateRecord(editRecordForm.value.id, data)
    ElMessage.success('修改成功')
    editRecordDialogVisible.value = false

    // 刷新记录列表
    if (currentStudent.value?._id) {
      await getRecords(currentStudent.value._id)
    }
    // 刷新学员列表
    getStudents()
  } catch (error) {
    console.error('修改记录失败:', error)
    ElMessage.error('修改失败')
  }
}

// 格式化修改历史时间
const formatHistoryTime = (dateStr: string) => {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm:ss')
}

// 处理状态变更
const handleStatusChange = async (student: any) => {
  try {
    await studentApi.updateStatus(student._id, student.status)
    getStudents()
    ElMessage.success('状态更新成功')
  } catch (error) {
    // 如果更新失败，恢复原来的状态
    student.status = student.status === 'active' ? 'inactive' : 'active'
    ElMessage.error('状态更新失败')
  }
}

// 重置查询参数
const resetQueryParams = () => {
  queryParams.value = {
    page: 1,
    limit: 10,
    keyword: "",
    status: "active",
    deleted: false,
    lessonId: ""
  }
  getStudents()
}
</script>

<template>
  <div class="app-container">
    <!-- 搜索工具栏 -->
    <el-card class="search-wrapper">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="关键词">
          <el-input 
            v-model="queryParams.keyword" 
            placeholder="姓名/手机号" 
            :prefix-icon="Search" 
            clearable
            @input="getStudents"
            @clear="getStudents"
            @keyup.enter="getStudents"
          />
        </el-form-item>
        <el-form-item label="关联课程">

          <el-select 
            v-model="queryParams.lessonId" 
            placeholder="选择课程" 
            clearable 
            style="width: 200px" 
            @change="getStudents"
          >
            <el-option v-for="lesson in lessonList" :key="lesson._id" :label="lesson.name" :value="lesson._id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" width="160">
          <el-select 
            v-model="queryParams.status" 
            placeholder="状态" 
            clearable 
            style="width: 160px;" 
            @change="getStudents"
          >
            <el-option label="在读" value="active" />
            <el-option label="结业" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item label="删除状态">
          <el-select 
            v-model="queryParams.deleted" 
            placeholder="删除状态" 
            clearable 
            style="width: 160px;"
            @change="getStudents"
          >
            <el-option label="正常" :value="false" />
            <el-option label="已删除" :value="true" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button @click="resetQueryParams">重置</el-button>
          <el-button type="success" :icon="Plus" @click="handleCreate">新增学员</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card v-loading="loading">
      <el-table :data="tableData" style="width: 100%;">
        <el-table-column prop="name" label="姓名" />
        <el-table-column prop="phone" label="手机号" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="remark" label="备注" />
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
        <el-table-column label="状态" width="160">
          <template #default="{ row }">
            <div class="status-cell">
              <el-switch v-model="row.status" :active-value="'active'" :inactive-value="'inactive'" active-text="在读"
                inactive-text="结业" @change="() => handleStatusChange(row)" />
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="200">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="380" fixed="right" align="center">
          <template #default="{ row }">
            <template v-if="!row.deleted">
              <el-button type="primary" size="small" @click="handleAttendance(row)">
                签到
              </el-button>
              <el-button type="success" size="small" @click="handleRecharge(row)">
                充值
              </el-button>
              <el-button type="warning" size="small" @click="handleViewRecords(row)">
                记录
              </el-button>
              <el-button type="info" size="small" @click="handleAnalysis(row)">
                分析
              </el-button>
              <el-button type="primary" size="small" @click="handleEdit(row)">
                编辑
              </el-button>
              <el-popconfirm title="确定要删除吗？" @confirm="handleDelete(row._id)">
                <template #reference>
                  <el-button type="danger" size="small">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
            <template v-else>
              <el-button type="success" size="small" @click="handleRestore(row._id)">
                恢复
              </el-button>
              <el-popconfirm title="彻底删除后将无法恢复，是否继续？" @confirm="handlePermanentDelete(row._id)">
                <template #reference>
                  <el-button type="danger" size="small">彻底删除</el-button>
                </template>
              </el-popconfirm>
            </template>
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

    <!-- 创建/编辑学员对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogType === 'create' ? '创建学员' : '编辑学员'" width="500px">
      <el-form :model="formData" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="姓名" prop="name" required>
          <el-input v-model="formData.name" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone" required>
          <el-input v-model="formData.phone" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="formData.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="关联课程">
          <el-select 
            v-model="formData.lessonId" 
            placeholder="选择关联课程" 
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="lesson in lessonList"
              :key="lesson._id"
              :label="lesson.name"
              :value="lesson._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注信息"
          />
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
          <div class="form-tip">若学员和多个课程关联，本次签到将默认选择第一个</div>
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
    <el-dialog v-model="recordsDialogVisible" title="账户记录" width="1000px">
      <!-- 添加筛选按钮 -->
      <div class="filter-buttons">
        <el-button-group>
          <el-button :type="recordsQuery.type === '' ? 'primary' : 'default'" @click="handleFilterRecords('')">
            全部记录
          </el-button>
          <el-button :type="recordsQuery.type === 'attendance' ? 'primary' : 'default'"
            @click="handleFilterRecords('attendance')">
            签到记录
          </el-button>
          <el-button :type="recordsQuery.type === 'recharge' ? 'primary' : 'default'"
            @click="handleFilterRecords('recharge')">
            充值记录
          </el-button>
        </el-button-group>
      </div>

      <div v-loading="recordsLoading">
        <el-table :data="recordsList" style="width: 100%">
          <el-table-column prop="createdAt" label="创建时间" width="160">
            <template #default="{ row }">
              <el-text>
                {{ formatDateTime(row.createdAt) }}
              </el-text>
            </template>
          </el-table-column>
          <el-table-column label="签到时间" width="160">
            <template #default="{ row }">
              <el-text v-if="row.type === 'attendance'">
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
          <el-table-column label="课程信息" width="180">
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
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="handleEditRecord(row)">
                修改
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <!-- 记录分页 -->
        <div class="pagination-wrapper">
          <el-pagination v-model:current-page="recordsQuery.page" v-model:page-size="recordsQuery.limit"
            :total="recordsTotal" :page-sizes="[10, 20, 50]" small background layout="total, sizes, prev, pager, next"
            @size-change="() => currentStudent.value && getRecords(currentStudent.value._id)"
            @current-change="() => currentStudent.value && getRecords(currentStudent.value._id)" />
        </div>
      </div>
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
              ¥ {{ (currentStudent?.balance || 0).toFixed(2) }}
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
            <el-icon>
              <Plus />
            </el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">充值总额</div>
            <div class="stat-value text-success">¥{{ (analysisData.totalRecharge || 0).toFixed(2) }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon danger">
            <el-icon>
              <Minus />
            </el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">消费总额</div>
            <div class="stat-value text-danger">¥{{ (analysisData.totalConsumption || 0).toFixed(2) }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon info">
            <el-icon>
              <Minus />
            </el-icon>
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

    <!-- 修改记录对话框 -->
    <el-dialog v-model="editRecordDialogVisible" :title="editRecordForm.type === 'attendance' ? '修改签到记录' : '修改充值记录'"
      width="500px">
      <el-form label-width="100px">
        <template v-if="editRecordForm.type === 'attendance'">
          <!-- 签到记录修改界面 -->
          <div class="course-info">
            <div class="info-item">
              <span class="label">课程:</span>
              <span class="value">{{ editRecordForm.lessonName }}</span>
            </div>
            <div class="info-item">
              <span class="label">单课时价格:</span>
              <span class="value price">¥{{ editRecordForm.lessonPrice }}</span>
            </div>
          </div>

          <el-form-item label="课时">
            <el-input-number v-model="editRecordForm.sessions" :min="1" @input="calculateModifiedAmount" />
          </el-form-item>

          <el-form-item label="备注">
            <el-input v-model="editRecordForm.remark" type="textarea" :rows="2" placeholder="请输入备注信息" />
          </el-form-item>

          <!-- 显示计算后的金额 -->
          <div class="amount-preview" v-if="editRecordForm.calculatedAmount !== editRecordForm.originalAmount">
            <div class="amount-change">
              <span class="old-amount">原扣费金额: ¥{{ Math.abs(editRecordForm.originalAmount) }}</span>
              <el-icon class="arrow">
                <ArrowRight />
              </el-icon>
              <span class="new-amount">新扣费金额: ¥{{ Math.abs(editRecordForm.calculatedAmount) }}</span>
            </div>
            <div class="diff-amount" :class="{
              'positive': Math.abs(editRecordForm.calculatedAmount) < Math.abs(editRecordForm.originalAmount),
              'negative': Math.abs(editRecordForm.calculatedAmount) > Math.abs(editRecordForm.originalAmount)
            }">
              {{ Math.abs(editRecordForm.calculatedAmount) > Math.abs(editRecordForm.originalAmount) ? '多扣' : '少扣' }}
              ¥{{ Math.abs(Math.abs(editRecordForm.calculatedAmount) -
                Math.abs(editRecordForm.originalAmount)).toFixed(2) }}
            </div>
          </div>

          <el-form-item label="签到时间">
            <el-date-picker v-model="editRecordForm.recordTime" type="datetime" placeholder="选择日期时间"
              format="YYYY-MM-DD HH:mm" value-format="YYYY-MM-DD HH:mm:ss" :default-time="dayjs().format('HH:mm:ss')"
              :disabledDate="(time) => time.getTime() > Date.now()" />
          </el-form-item>
        </template>

        <template v-else>
          <!-- 充值记录修改界面 -->
          <el-form-item label="金额">
            <el-input-number v-model="editRecordForm.amount" :precision="2" :step="100"
              @input="handleRechargeAmountChange" />
          </el-form-item>

          <el-form-item label="备注">
            <el-input v-model="editRecordForm.remark" type="textarea" :rows="2" placeholder="请输入备注信息" />
          </el-form-item>

          <!-- 显示金额变化 -->
          <div class="amount-preview" v-if="editRecordForm.calculatedAmount !== editRecordForm.originalAmount">
            <div class="amount-change">
              <span class="old-amount">原充值金额: ¥{{ Math.abs(editRecordForm.originalAmount) }}</span>
              <el-icon class="arrow">
                <ArrowRight />
              </el-icon>
              <span class="new-amount">新充值金额: ¥{{ Math.abs(editRecordForm.calculatedAmount) }}</span>
            </div>
            <div class="diff-amount" :class="{
              'positive': Math.abs(editRecordForm.calculatedAmount) > Math.abs(editRecordForm.originalAmount),
              'negative': Math.abs(editRecordForm.calculatedAmount) < Math.abs(editRecordForm.originalAmount)
            }">
              {{ Math.abs(editRecordForm.calculatedAmount) > Math.abs(editRecordForm.originalAmount) ? '增加' : '减少' }}
              ¥{{ Math.abs(Math.abs(editRecordForm.calculatedAmount) -
                Math.abs(editRecordForm.originalAmount)).toFixed(2) }}
            </div>
          </div>
        </template>

        <!-- 显示修改历史 -->
        <div v-if="editRecordForm.modifyHistory?.length" class="modify-history">
          <div class="history-title">修改历史</div>
          <el-timeline>
            <el-timeline-item v-for="(history, index) in editRecordForm.modifyHistory" :key="index"
              :timestamp="formatHistoryTime(history.modifiedAt)" size="small">
              <div class="history-item">
                <template v-if="editRecordForm.type === 'attendance'">
                  <div class="history-changes">
                    <div>课时: {{ Math.abs(history.before.sessions) }} -> {{ Math.abs(history.after.sessions) }}</div>
                    <div>金额: ¥{{ Math.abs(history.before.amount) }} -> ¥{{ Math.abs(history.after.amount) }}</div>
                  </div>
                </template>
                <template v-else>
                  <div class="history-changes">
                    <div>金额: ¥{{ history.before.amount }} -> ¥{{ history.after.amount }}</div>
                  </div>
                </template>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="editRecordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleEditRecordSubmit">确定</el-button>
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

.balance-text {
  font-weight: bold;
  font-size: 14px;

  &.balance-positive {
    color: var(--el-color-success);
  }

  &.balance-negative {
    color: var(--el-color-danger);
    font-size: 16px; // 负数时字体稍大
    animation: flash 2s infinite; // 添加闪烁动画
  }
}

@keyframes flash {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.6;
  }
}

.filter-buttons {
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
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

.amount-preview {
  margin: 16px 0;
  padding: 12px 16px;
  background-color: var(--el-fill-color-lighter);
  border-radius: 4px;

  .amount-change {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;

    .arrow {
      color: var(--el-text-color-secondary);
    }

    .old-amount {
      color: var(--el-text-color-secondary);
      text-decoration: line-through;
    }

    .new-amount {
      color: var(--el-text-color-primary);
      font-weight: 500;
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
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);

  .history-title {
    font-size: 14px;
    color: var(--el-text-color-primary);
    font-weight: 500;
    margin-bottom: 16px;
  }

  .history-item {
    .history-changes {
      font-size: 13px;
      color: var(--el-text-color-regular);

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

.status-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

:deep(.el-switch) {
  --el-switch-on-color: var(--el-color-success);
  --el-switch-off-color: var(--el-color-danger);
}

:deep(.el-switch__label) {
  color: var(--el-text-color-regular);
}

:deep(.el-switch__label.is-active) {
  color: var(--el-color-primary);
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  line-height: 1.4;
}
</style>
