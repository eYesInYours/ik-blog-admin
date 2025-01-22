<script lang="ts" setup>
import { useUserStore } from "@/pinia/stores/user"
import Admin from "./components/Admin.vue"
import Editor from "./components/Editor.vue"
import { ref, onMounted, onUnmounted } from 'vue'
import { studentApi } from '@/api/student'
import * as echarts from 'echarts'
import { Plus, Minus, Money } from '@element-plus/icons-vue'

const userStore = useUserStore()
const isAdmin = userStore.roles.includes("admin")

const timeRange = ref<'week' | 'month' | 'year'>('month')
const selectedDate = ref<Date>(new Date())
const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

const summary = ref({
  totalRecharge: 0,
  totalConsumption: 0,
  profit: 0
})

// 处理时间范围变化
const handleTimeRangeChange = () => {
  selectedDate.value = new Date() // 重置为当前日期
  getAnalysisData()
}

// 获取分析数据
const getAnalysisData = async () => {
  try {
    const { data } = await studentApi.getIncomeAnalysis({
      timeRange: timeRange.value,
      date: selectedDate.value?.toISOString()
    })
    summary.value = data.summary
    updateChart(data.trend)
  } catch (error) {
    console.error('获取分析数据失败:', error)
  }
}

// 更新图表
const updateChart = (data: any) => {
  if (!chart) return

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['充值押金', '签到扣费']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.dates
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '充值押金',
        type: 'bar',
        stack: 'total',
        data: data.recharge,
        itemStyle: {
          color: '#67c23a'
        }
      },
      {
        name: '签到扣费',
        type: 'bar',
        stack: 'total',
        data: data.consumption,
        itemStyle: {
          color: '#f56c6c'
        }
      }
    ]
  })
}

// 初始化图表
const initChart = () => {
  if (chartRef.value) {
    chart = echarts.init(chartRef.value)
    getAnalysisData()
  }
}

// 处理窗口大小变化
const handleResize = () => {
  chart?.resize()
}

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  chart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-icon info">
          <el-icon><Plus /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-label">总充值押金</div>
          <div class="stat-value text-info">¥{{ summary.totalRecharge.toFixed(2) }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon success">
          <el-icon><Money /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-label">课时收入</div>
          <div class="stat-value text-success">¥{{ summary.profit.toFixed(2) }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <el-icon><Minus /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-label">签到扣费</div>
          <div class="stat-value">¥{{ summary.totalConsumption.toFixed(2) }}</div>
        </div>
      </div>
    </div>

    <!-- 时间范围选择 -->
    <div class="analysis-header">
      <div class="date-picker-group">
        <el-radio-group v-model="timeRange" @change="handleTimeRangeChange">
          <el-radio-button label="week">周</el-radio-button>
          <el-radio-button label="month">月</el-radio-button>
          <el-radio-button label="year">年</el-radio-button>
        </el-radio-group>

        <!-- 根据时间范围显示不同的日期选择器 -->
        <template v-if="timeRange === 'week'">
          <el-date-picker
            v-model="selectedDate"
            type="week"
            format="YYYY 第 ww 周"
            placeholder="选择周"
            @change="getAnalysisData"
          />
        </template>

        <template v-else-if="timeRange === 'month'">
          <el-date-picker
            v-model="selectedDate"
            type="month"
            placeholder="选择月份"
            @change="getAnalysisData"
          />
        </template>

        <template v-else>
          <el-date-picker
            v-model="selectedDate"
            type="year"
            placeholder="选择年份"
            @change="getAnalysisData"
          />
        </template>
      </div>
    </div>

    <!-- 收入趋势图表 -->
    <div class="chart-container" ref="chartRef"></div>
  </div>
</template>

<style lang="scss" scoped>
.dashboard {
  padding: 24px;
}

.stat-cards {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.stat-card {
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
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

    &.text-success {
      color: var(--el-color-success);
    }

    &.text-danger {
      color: var(--el-color-danger);
    }
  }
}

.analysis-header {
  margin-bottom: 24px;

  .date-picker-group {
    display: flex;
    gap: 16px;
    align-items: center;
  }
}

.chart-container {
  height: 400px;
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}
</style>
