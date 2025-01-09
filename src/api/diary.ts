import { request } from "@/http/axios"

export const diaryApi = {
  // 获取朋友圈列表
  getList: (params: {
    page: number
    limit: number
    keyword?: string
    status?: string
    dateRange?: [Date, Date]
  }) => {
    return request({
      url: '/diaries',
      method: 'get',
      params
    })
  },

  // 删除朋友圈
  delete: (id: string) => {
    return request({
      url: `/diaries/${id}`,
      method: 'delete'
    })
  },

  // 创建朋友圈
  create: (data: {
    content: string
    images: string[]
    status: string
  }) => {
    return request({
      url: "/diaries",
      method: "post",
      data
    })
  }
}
