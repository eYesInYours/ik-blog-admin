<script lang="ts" setup>
import { useUserStore } from "@/pinia/stores/user"
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { studentApi } from '@/api/student'
import * as echarts from 'echarts'
import { Plus, Minus, Money, QuestionFilled } from '@element-plus/icons-vue'

const userStore = useUserStore()
const isAdmin = userStore.roles.includes("admin")

const timeRange = ref<'week' | 'month' | 'year'>('month')
const selectedDate = ref<Date>(new Date())
const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

const incomeData = ref({
  summary: {
    totalRecharge: 0,
    totalConsumption: 0,
    profit: 0,
    pendingIncome: 0,
    totalSessions: 0
  },
  trend: {
    dates: [],
    recharge: [],
    consumption: [],
    sessions: []
  }
})

const chartMetrics = ref(['recharge', 'consumption', 'sessions'])

// 根据时间范围设置日期选择器类型
const datePickerType = computed(() => {
  switch (timeRange.value) {
    case 'week':
    case 'month':
      return 'month'
    case 'year':
      return 'year'
    default:
      return 'month'
  }
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
    incomeData.value = data
    updateChart(data.trend)
  } catch (error) {
    console.error('获取分析数据失败:', error)
  }
}

// 更新图表
const updateChart = (data: any) => {
  if (!chart) return

  const series = []

  if (chartMetrics.value.includes('recharge')) {
    series.push({
      name: '充值金额',
      type: 'bar',
      data: data.recharge,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#67C23A' },
          { offset: 1, color: '#95D475' }
        ])
      }
    })
  }

  if (chartMetrics.value.includes('consumption')) {
    series.push({
      name: '课时费',
      type: 'bar',
      data: data.consumption,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#409EFF' },
          { offset: 1, color: '#79BBFF' }
        ])
      }
    })
  }

  if (chartMetrics.value.includes('sessions')) {
    series.push({
      name: '课时数',
      type: 'line',
      yAxisIndex: 1,
      data: data.sessions,
      symbolSize: 8,
      lineStyle: {
        width: 3,
        color: '#E6A23C'
      },
      itemStyle: {
        color: '#E6A23C'
      }
    })
  }

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: chartMetrics.value.map(metric => ({
        recharge: '充值金额',
        consumption: '课时费',
        sessions: '课时数'
      }[metric]))
    },
    grid: {
      right: '5%'
    },
    xAxis: {
      type: 'category',
      data: data.dates
    },
    yAxis: [
      {
        type: 'value',
        name: '金额',
        position: 'left'
      },
      {
        type: 'value',
        name: '课时',
        position: 'right',
        splitLine: { show: false }
      }
    ],
    series
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

// 格式化金额
const formatAmount = (amount: number) => {
  return amount.toFixed(2)
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
  <div class="dashboard-container">
    <!-- 收入统计卡片 -->
    <div class="stats-cards">
      <el-card class="stats-card recharge">
        <template #header>
          <div class="card-header">
            <span>总充值金额（押金）</span>
          </div>
        </template>
        <div class="amount">
          <span class="currency">¥</span>
          {{ formatAmount(incomeData.summary.totalRecharge) }}
        </div>
      </el-card>

      <el-card class="stats-card consumption">
        <template #header>
          <div class="card-header">
            <span>课耗费总额（签到扣费）</span>
          </div>
        </template>
        <div class="amount">
          <span class="currency">¥</span>
          {{ formatAmount(incomeData.summary.totalConsumption) }}
        </div>
      </el-card>

      <el-card class="stats-card profit">
        <template #header>
          <div class="card-header">
            <span>实际到手收入</span>
          </div>
        </template>
        <div class="amount">
          <span class="currency">¥</span>
          {{ formatAmount(incomeData.summary.profit) }}
        </div>
      </el-card>

      <el-card class="stats-card pending">
        <template #header>
          <div class="card-header">
            <span>待收金额</span>
            <el-tooltip content="学员需要补交的金额" placement="top">
              <el-icon>
                <QuestionFilled />
              </el-icon>
            </el-tooltip>
          </div>
        </template>
        <div class="amount" :class="{ 'highlight': incomeData.summary.pendingIncome > 0 }">
          <span class="currency">¥</span>
          {{ formatAmount(incomeData.summary.pendingIncome) }}
        </div>
      </el-card>

      <el-card class="stats-card sessions">
        <template #header>
          <div class="card-header">
            <span>总课时数</span>
          </div>
        </template>
        <div class="amount">
          {{ incomeData.summary.totalSessions }}
          <span class="unit">课时</span>
        </div>
      </el-card>
    </div>

    <!-- 收入趋势图 -->
    <el-card class="chart-card">
      <template #header>
        <div class="card-header">
          <span>收入与课时趋势</span>
          <div class="chart-controls">
            <el-checkbox-group v-model="chartMetrics">
              <el-checkbox label="recharge">充值金额</el-checkbox>
              <el-checkbox label="consumption">课耗费</el-checkbox>
              <el-checkbox label="sessions">课时数</el-checkbox>
            </el-checkbox-group>
            <div class="date-range">
              <el-radio-group v-model="timeRange" @change="getAnalysisData">
                <el-radio-button label="week">周</el-radio-button>
                <el-radio-button label="month">月</el-radio-button>
                <el-radio-button label="year">年</el-radio-button>
              </el-radio-group>
              <el-date-picker v-model="selectedDate" :type="datePickerType" @change="getAnalysisData" />
            </div>
          </div>
        </div>
      </template>
      <div ref="chartRef" style="height: 400px"></div>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-container {
  padding: 20px;

  .stats-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 20px;

    .stats-card {
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .card-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
      }

      .amount {
        font-size: 24px;
        font-weight: bold;
        margin-top: 8px;

        .currency {
          font-size: 16px;
          margin-right: 4px;
        }

        &.highlight {
          animation: pulse 2s infinite;
        }
      }

      // 充值金额卡片
      &.recharge {
        background: linear-gradient(135deg, #67C23A08 0%, #67C23A18 100%);

        .card-header {
          color: #67C23A;
        }

        .amount {
          color: #67C23A;
        }
      }

      // 课时费卡片
      &.consumption {
        background: linear-gradient(135deg, #409EFF08 0%, #409EFF18 100%);

        .card-header {
          color: #409EFF;
        }

        .amount {
          color: #409EFF;
        }
      }

      // 实际收入卡片
      &.profit {
        background: linear-gradient(135deg, #E6A23C08 0%, #E6A23C18 100%);

        .card-header {
          color: #E6A23C;
        }

        .amount {
          color: #E6A23C;
        }
      }

      // 待收金额卡片
      &.pending {
        background: linear-gradient(135deg, #F56C6C08 0%, #F56C6C18 100%);

        .card-header {
          color: #F56C6C;
        }

        .amount {
          color: #F56C6C;

          &.highlight {
            color: #F56C6C;
          }
        }
      }

      // 课时统计卡片
      &.sessions {
        background: linear-gradient(135deg, #E6A23C08 0%, #E6A23C18 100%);

        .card-header {
          color: #E6A23C;
        }

        .amount {
          color: #E6A23C;

          .unit {
            font-size: 14px;
            margin-left: 4px;
          }
        }
      }
    }
  }

  // 待收金额闪烁动画
  @keyframes pulse {
    0% {
      opacity: 1;
    }

    50% {
      opacity: 0.6;
    }

    100% {
      opacity: 1;
    }
  }

  .chart-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .date-range {
        display: flex;
        gap: 16px;
      }
    }

    .chart-controls {
      display: flex;
      align-items: center;
      gap: 24px;
    }
  }
}
</style>
