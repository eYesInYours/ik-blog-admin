<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'
import { statisticsApi } from '@/api/statistics'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isoWeek from 'dayjs/plugin/isoWeek'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

// 注册插件
dayjs.extend(weekOfYear)
dayjs.extend(isoWeek)

const chartRef = ref()
let chart: echarts.ECharts | null = null

// 时间范围选择
const timeRange = ref('week')
const currentDate = ref(dayjs())

// 时间范围选项
const timeRangeOptions = [
  { label: '按周', value: 'week' },
  { label: '按月', value: 'month' },
  { label: '按年', value: 'year' }
]

// 计算当前显示的文本
const currentPeriodText = computed(() => {
  switch (timeRange.value) {
    case 'week':
      return `第${currentDate.value.week()}周`
    case 'month':
      return currentDate.value.format('YYYY年MM月')
    case 'year':
      return currentDate.value.format('YYYY年')
  }
})

// 生成年份选项（前5年到当前年份）
const yearOptions = computed(() => {
  const currentYear = dayjs().year()
  return Array.from({ length: 5 }, (_, i) => currentYear - i).reverse()
})

// 生成月份选项
const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

// 生成周选项
const weekOptions = computed(() => {
  // 计算指定年份的总周数
  const lastDayOfYear = dayjs().year(currentDate.value.year()).endOf('year')
  const totalWeeks = lastDayOfYear.isoWeek()
  return Array.from({ length: totalWeeks }, (_, i) => i + 1)
})

// 根据时间范围计算日期选择器的类型
const datePickerType = computed(() => {
  switch (timeRange.value) {
    case 'month':
      return 'month'
    case 'year':
      return 'year'
    default:
      return 'date'
  }
})

// 日期格式化
const dateFormat = computed(() => {
  switch (timeRange.value) {
    case 'month':
      return 'YYYY年MM月'
    case 'year':
      return 'YYYY年'
    default:
      return 'YYYY-MM-DD'
  }
})

// 值格式化
const valueFormat = computed(() => {
  switch (timeRange.value) {
    case 'month':
      return 'YYYY-MM'
    case 'year':
      return 'YYYY'
    default:
      return 'YYYY-MM-DD'
  }
})

// 获取统计数据
const fetchData = async () => {
  try {
    let startDate, endDate, type

    switch (timeRange.value) {
      case 'week':
        startDate = currentDate.value.startOf('week')
        endDate = currentDate.value.endOf('week')
        type = 'day'
        break
      case 'month':
        startDate = currentDate.value.startOf('month')
        endDate = currentDate.value.endOf('month')
        type = 'day'
        break
      case 'year':
        startDate = currentDate.value.startOf('year')
        endDate = currentDate.value.endOf('year')
        type = 'month'
        break
    }

    const { data } = await statisticsApi.getStatistics({
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD'),
      type
    })
    renderChart(data)
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

// 切换上一个周期
const handlePrevPeriod = () => {
  switch (timeRange.value) {
    case 'week':
      currentDate.value = currentDate.value.subtract(1, 'week')
      break
    case 'month':
      currentDate.value = currentDate.value.subtract(1, 'month')
      break
    case 'year':
      currentDate.value = currentDate.value.subtract(1, 'year')
      break
  }
  fetchData()
}

// 切换下一个周期
const handleNextPeriod = () => {
  const nextDate = timeRange.value === 'week' 
    ? currentDate.value.add(1, 'week')
    : timeRange.value === 'month'
      ? currentDate.value.add(1, 'month')
      : currentDate.value.add(1, 'year')

  // 不允许选择未来的日期
  if (nextDate.isAfter(dayjs())) return

  currentDate.value = nextDate
  fetchData()
}

// 处理时间范围变化
const handleTimeRangeChange = () => {
  currentDate.value = dayjs() // 切换类型时重置为当前日期
  fetchData()
}

// 处理日期变化
const handleDateChange = (value) => {
  if (!value) return
  currentDate.value = dayjs(value)
  fetchData()
}

// 渲染图表
const renderChart = (data: any) => {
  if (!chart) return

  const option = {
    title: {
      text: '用户行为分析',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      }
    },
    legend: {
      data: ['访问量', '评论数', '新增用户', '新增文章'],
      top: 30
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.dates
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '访问量',
        type: 'line',
        areaStyle: {
          opacity: 0.1
        },
        emphasis: {
          focus: 'series'
        },
        data: data.visits
      },
      {
        name: '评论数',
        type: 'line',
        areaStyle: {
          opacity: 0.1
        },
        emphasis: {
          focus: 'series'
        },
        data: data.comments
      },
      {
        name: '新增用户',
        type: 'line',
        areaStyle: {
          opacity: 0.1
        },
        emphasis: {
          focus: 'series'
        },
        data: data.users
      },
      {
        name: '新增文章',
        type: 'line',
        areaStyle: {
          opacity: 0.1
        },
        emphasis: {
          focus: 'series'
        },
        data: data.articles
      }
    ]
  }

  chart.setOption(option)
}

// 初始化图表
const initChart = () => {
  if (chartRef.value) {
    chart = echarts.init(chartRef.value)
    fetchData()
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
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

<template>
  <div class="user-behavior">
    <div class="chart-header">
      <h3>用户行为分析</h3>
      <div class="time-range-selector">
        <el-radio-group v-model="timeRange" @change="handleTimeRangeChange">
          <el-radio-button 
            v-for="option in timeRangeOptions" 
            :key="option.value" 
            :label="option.value"
          >
            {{ option.label }}
          </el-radio-button>
        </el-radio-group>

        <div class="period-selector">
          <el-button :icon="ArrowLeft" @click="handlePrevPeriod" />
          <template v-if="timeRange === 'week'">
            <span class="period-text">{{ currentPeriodText }}</span>
          </template>
          <template v-else>
            <el-date-picker
              v-model="currentDate"
              :type="datePickerType"
              :format="dateFormat"
              :value-format="valueFormat"
              @change="handleDateChange"
              :placeholder="currentPeriodText"
            />
          </template>
          <el-button 
            :icon="ArrowRight" 
            @click="handleNextPeriod"
            :disabled="currentDate.isAfter(dayjs().subtract(1, timeRange))"
          />
        </div>
      </div>
    </div>
    <div ref="chartRef" class="chart"></div>
  </div>
</template>

<style lang="scss" scoped>
.user-behavior {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
    }

    .time-range-selector {
      display: flex;
      gap: 16px;
      align-items: center;

      .period-selector {
        display: flex;
        align-items: center;
        gap: 8px;

        .period-text {
          min-width: 100px;
          text-align: center;
          font-size: 14px;
        }
      }
    }
  }

  .chart {
    width: 100%;
    height: 400px;
  }
}

.period-selector {
  display: flex;
  align-items: center;
  gap: 8px;

  .period-text {
    min-width: 100px;
    text-align: center;
    font-size: 14px;
  }

  :deep(.el-date-picker) {
    width: 140px;
  }

  :deep(.el-input__wrapper) {
    padding: 0 8px;
  }

  :deep(.el-input__inner) {
    text-align: center;
    font-size: 14px;
  }
}
</style> 