import type { ApiResponse } from "@/types/response"
import { request } from "@/http/axios"

// 课程相关接口类型定义
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
}

interface LessonOrder {
  _id: string
  userId: {
    _id: string
    username: string
    email: string
  }
  lessonId: {
    _id: string
    name: string
  }
  sessions: number
  remainingSessions: number
  amount: number
  status: 'pending' | 'paid' | 'completed' | 'cancelled'
  createdAt: string
  paidAt?: string
}

interface LessonRecord {
  _id: string
  orderId: string
  userId: {
    _id: string
    username: string
    email: string
  }
  lessonId: {
    _id: string
    name: string
  }
  sessions: number
  teacherName: string
  content: string
  remark: string
  createdAt: string
}

interface LessonUser {
  _id: string
  username: string
  email: string
  stats: {
    totalMinutes: number
    remainingMinutes: number
    completedLessons: number
    totalSpent: number
  }
}

// API 接口
export const lessonApi = {
  // 课程管理
  lesson: {
    // 获取课程列表
    getList(params: any) {
      return request<ApiResponse<{ lessons: Lesson[], pagination: any }>>({
        url: "/lessons",
        method: "GET",
        params
      })
    },

    // 创建课程
    create(data: Partial<Lesson>) {
      return request<ApiResponse<Lesson>>({
        url: "/lessons",
        method: "POST",
        data
      })
    },

    // 更新课程
    update(id: string, data: Partial<Lesson>) {
      return request<ApiResponse<Lesson>>({
        url: `/lessons/${id}`,
        method: "PUT",
        data
      })
    },

    // 删除课程
    delete(id: string) {
      return request<ApiResponse<null>>({
        url: `/lessons/${id}`,
        method: "DELETE"
      })
    },

    // 更新课程状态
    updateStatus(id: string, status: string) {
      return request<ApiResponse<Lesson>>({
        url: `/lessons/${id}/status`,
        method: "PATCH",
        data: { status }
      })
    }
  },

  // 订单管理
  order: {
    // 获取订单列表
    getList(params: any) {
      return request<ApiResponse<{ orders: LessonOrder[], pagination: any }>>({
        url: "/lessons/orders",
        method: "GET",
        params
      })
    },

    // 创建订单
    create(data: { lessonId: string, sessions: number }) {
      return request<ApiResponse<LessonOrder>>({
        url: "/lessons/orders",
        method: "POST",
        data
      })
    },

    // 获取订单详情
    getDetail(id: string) {
      return request<ApiResponse<LessonOrder>>({
        url: `/lessons/orders/${id}`,
        method: "GET"
      })
    },

    // 支付订单
    pay(id: string) {
      return request<ApiResponse<null>>({
        url: `/lessons/orders/${id}/pay`,
        method: "POST"
      })
    },

    // 取消订单
    cancel(id: string) {
      return request<ApiResponse<null>>({
        url: `/lessons/orders/${id}/cancel`,
        method: "POST"
      })
    }
  },

  // 上课记录管理
  record: {
    // 获取记录列表
    getList(params: any) {
      return request<ApiResponse<{ records: LessonRecord[], pagination: any }>>({
        url: "/lessons/records",
        method: "GET",
        params
      })
    },

    // 创建上课记录
    create(data: Partial<LessonRecord>) {
      return request<ApiResponse<LessonRecord>>({
        url: "/lessons/records",
        method: "POST",
        data
      })
    },

    // 获取记录详情
    getDetail(id: string) {
      return request<ApiResponse<LessonRecord>>({
        url: `/lessons/records/${id}`,
        method: "GET"
      })
    }
  },

  // 获取用户课时统计
  getUserStats(userId: string) {
    return request<ApiResponse<LessonUser>>({
      url: `/lessons/users/${userId}/stats`,
      method: "GET"
    })
  },

  // 获取用户订单列表
  getUserOrders(userId: string, params: any) {
    return request<ApiResponse<{ orders: LessonOrder[], pagination: any }>>({
      url: `/lessons/users/${userId}/orders`,
      method: "GET",
      params
    })
  },

  // 获取用户上课记录
  getUserRecords(userId: string, params: any) {
    return request<ApiResponse<{ records: LessonRecord[], pagination: any }>>({
      url: `/lessons/users/${userId}/records`,
      method: "GET",
      params
    })
  }
}
