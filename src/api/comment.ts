import type { Comment, CommentQueryParams, CommentResponse } from "@/types/comment"
import type { ApiResponse } from "@/types/response"
import { request } from "@/http/axios"

export const commentApi = {
  // 获取所有评论（管理）
  getList(params: CommentQueryParams) {
    return request<ApiResponse<CommentResponse>>({
      url: "/comments",
      method: "GET",
      params
    })
  },

  // 更新评论状态
  updateStatus(id: string, status: string) {
    return request<Comment>({
      url: `/comments/admin/${id}/status`,
      method: "PUT",
      data: { status }
    })
  },

  // 删除评论
  delete(id: string) {
    return request({
      url: `/comments/admin/${id}`,
      method: "DELETE"
    })
  },

  // 批量审核评论
  batchAudit(ids: string[], status: string) {
    return request({
      url: "/comments/admin/batch-audit",
      method: "POST",
      data: { ids, status }
    })
  }
}
