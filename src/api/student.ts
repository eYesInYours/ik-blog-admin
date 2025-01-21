import type { ApiResponse } from "@/types/response"
import { request } from "@/http/axios"

// 学员相关接口类型定义
interface Student {
  _id: string
  name: string
  phone: string
  email: string
  lessonId: {
    _id: string
    name: string
    type: "private" | "group"
  }
  totalSessions: number
  remainingSessions: number
  startDate: string
  endDate: string
  remark: string
  status: "active" | "inactive"
  createdAt: string
}

interface StudentLesson {
  _id: string
  studentId: {
    _id: string
    name: string
    phone: string
    email: string
    status: string
  }
  lessonId: {
    _id: string
    name: string
  }
  totalSessions: number
  remainingSessions: number
  status: "active" | "completed" | "expired"
  startDate: string
  endDate: string
  createdAt: string
}

interface Record {
  _id: string
  studentId: string
  lessonId: string
  type: 'attendance' | 'recharge'
  sessions: number
  recordTime: string
  remark?: string
}

// 分析数据接口类型定义
interface AnalysisData {
  totalRecharge: number
  totalConsumption: number
  totalSessions: number
  amountTrend: {
    dates: string[]
    recharge: number[]
    consumption: number[]
  }
  sessionsTrend: {
    dates: string[]
    sessions: number[]
  }
}

// API 接口
export const studentApi = {
  // 获取学员列表
  getList(params: any) {
    return request<ApiResponse<{ students: Student[]; pagination: any }>>({
      url: "/students",
      method: "GET",
      params
    })
  },

  // 创建学员
  create(data: {
    name: string
    phone: string
    email?: string
    remark?: string
  }) {
    return request<ApiResponse<Student>>({
      url: "/students",
      method: "POST",
      data
    })
  },

  // 更新学员信息
  update(id: string, data: {
    name: string
    phone: string
    email?: string
    remark?: string
  }) {
    return request<ApiResponse<Student>>({
      url: `/students/${id}`,
      method: "PUT",
      data
    })
  },

  // 签到
  attendance(data: {
    studentId: string
    lessonId: string
    sessions: number
    attendanceTime: string
    remark?: string
  }) {
    return request<ApiResponse<{
      record: Record
      balance: number
    }>>({
      url: "/students/attendance",
      method: "POST",
      data
    })
  },

  // 充值
  recharge(data: {
    studentId: string
    sessions: number
    remark?: string
  }) {
    return request<ApiResponse<Student>>({
      url: "/students/recharge",
      method: "POST",
      data
    })
  },

  // 获取上课记录
  getAttendanceRecords(studentId: string, params: {
    page: number
    limit: number
  }) {
    return request<ApiResponse<{
      records: Record[]
      pagination: {
        total: number
        page: number
        limit: number
      }
    }>>({
      url: `/students/${studentId}/attendance`,
      method: 'GET',
      params
    })
  },

  // 删除学员
  delete(id: string) {
    return request<ApiResponse<void>>({
      url: `/students/${id}`,
      method: "DELETE"
    })
  },

  // 获取学员分析数据
  getAnalysisData(studentId: string, params: { timeRange: 'week' | 'month' | 'year' }) {
    return request<ApiResponse<AnalysisData>>({
      url: `/students/${studentId}/analysis`,
      method: 'GET',
      params
    })
  }
}
