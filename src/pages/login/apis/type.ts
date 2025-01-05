export interface LoginRequestData {
  /** admin 或 editor */
  email: string
  /** 密码 */
  password: string
  /** 验证码 */
  code: string
}

export interface LoginCodeResponse {
  imageUrl: string
  code: string
}

export interface LoginResponse {
  token: string
}
