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
  },

  // 更新文章状态
  updateStatus(id: string, data: { status: string }) {
    return request<ApiResponse<Article>>({
      url: `/articles/${id}/status`,
      method: "PUT",
      data
    })
  },

  // 创建/更新草稿
  createDraft(data: Partial<Article>) {
    return request<ApiResponse<Article>>({
      url: '/articles/draft',
      method: 'POST',
      data
    })
  },

  // 获取草稿详情
  getDraft(id: string) {
    return request<ApiResponse<Article>>({
      url: `/articles/${id}/draft`,
      method: "GET"
    })
  },

  // 获取文章评论
  getComments(articleId: string) {
    return request<ApiResponse<any>>({
      url: `/comments/article/${articleId}`,
      method: "GET"
    })
  },

  // 删除评论
  deleteComment(commentId: string) {
    return request<ApiResponse<any>>({
      url: `/comments/${commentId}`,
      method: "DELETE"
    })
  }
}
