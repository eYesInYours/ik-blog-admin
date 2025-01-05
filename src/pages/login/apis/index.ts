import type { ApiResponse } from "@/types/response"
import type { LoginCodeResponse, LoginRequestData, LoginResponse } from "./type"
import { request } from "@/http/axios"

/** 获取登录验证码 */
export function getLoginCodeApi() {
  return request<ApiResponse<LoginCodeResponse>>({
    url: "/auth/captcha",
    method: "GET"
  })
}

/** 校验登录验证码 */
export function verifyLoginCodeApi(code: string) {
  return request<ApiResponse<LoginCodeResponse>>({
    url: "/auth/verify",
    method: "POST",
    data: { code }
  })
}

/** 登录并返回 Token */
export function loginApi(data: LoginRequestData) {
  return request<ApiResponse<LoginResponse>>({
    url: "/auth/login",
    method: "POST",
    data
  })
}
