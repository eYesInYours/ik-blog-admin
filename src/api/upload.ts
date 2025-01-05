import type { ApiResponse } from "@/types/response"
import { request } from "@/http/axios"

interface UploadResponse {
  file: {
    url: string
  }
}

// 上传图片
export function uploadImage(data: FormData) {
  return request<ApiResponse<UploadResponse>>({
    url: "/files/upload",
    method: "POST",
    headers: {
      "Content-Type": "multipart/form-data"
    },
    data
  })
}
