import { defineStore } from "pinia"
import { ref } from "vue"
import type { ApiResponse } from "@/types/response"
import { request } from "@/http/axios"

export const useUserStore = defineStore("user", () => {
  const userInfo = ref()

  // 获取用户信息
  const getUserInfo = async () => {
    try {
      const { data } = await request<ApiResponse>({
        url: "/auth/profile",
        method: "GET"
      })
      userInfo.value = data.data
      return data.data
    } catch (error) {
      console.error("获取用户信息失败:", error)
      return null
    }
  }

  return {
    userInfo,
    getUserInfo,
  }
}) 