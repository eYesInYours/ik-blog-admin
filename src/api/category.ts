import type { Category, CategoryQueryParams, CategoryResponse } from "@/types/category"
import type { ApiResponse } from "@/types/response"
import { request } from "@/http/axios"

export const categoryApi = {
  // 获取分类列表
  getList() {
    return request<ApiResponse<CategoryResponse>>({
      url: "/categories",
      method: "GET"
    })
  },

  // 创建分类
  create(data: Partial<Category>) {
    return request<ApiResponse<Category>>({
      url: "/categories",
      method: "POST",
      data
    })
  },

  // 更新分类
  update(id: string, data: Partial<Category>) {
    return request<ApiResponse<Category>>({
      url: `/categories/admin/${id}`,
      method: "PUT",
      data
    })
  },

  // 删除分类
  delete(id: string) {
    return request<ApiResponse<null>>({
      url: `/categories/${id}`,
      method: "DELETE"
    })
  },

  // 上传图片
  uploadImage(data: FormData) {
    return request<ApiResponse<{ url: string }>>({
      url: "/upload/image",
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data"
      },
      data
    })
  }
}
