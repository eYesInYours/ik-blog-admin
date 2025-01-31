import { request } from "@/http/axios"
import type { ApiResponse, StatisticsData } from "@/types/api"

export const statisticsApi = {
  // 获取统计数据
  getStatistics(params: { 
    startDate: string
    endDate: string
    type: 'day' | 'month' | 'year'
  }) {
    return request<ApiResponse<StatisticsData>>({
      url: '/statistics',
      method: 'GET',
      params
    })
  }
} 