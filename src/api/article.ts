import type { Article, ArticleQueryParams, ArticleResponse } from "@/types/article"
import type { ApiResponse } from "@/types/response"
import { request } from "@/http/axios"

export const articleApi = {
  // 获取所有文章（管理）
  getList(params: ArticleQueryParams) {
    return request<ApiResponse<ArticleResponse>>({
      url: "/articles/admin/all",
      method: "GET",
      params
    })
  },

  // 获取文章详情
  getDetail(id: string) {
    return request<ApiResponse<Article>>({
      url: `/articles/${id}`,
      method: "GET"
    })
  },

  // 创建文章
  create(data: Partial<Article>) {
    return request<ApiResponse<Article>>({
      url: "/articles",
      method: "POST",
      data
    })
  },

  // 更新文章
  update(id: string, data: Partial<Article>) {
    return request<ApiResponse<Article>>({
      url: `/articles/${id}`,
      method: "PUT",
      data
    })
  },

  // 删除
  delete(id: string) {
    return request<ApiResponse<Article>>({
      url: `/articles/${id}`,
      method: "DELETE"
    })
  }
}
