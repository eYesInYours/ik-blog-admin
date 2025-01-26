// 统一处理 Cookie

import { CacheKey } from "@@/constants/cache-key"
import Cookies from "js-cookie"

export function getToken(type: 'access'|'refresh') {
  return Cookies.get(type=='access' ? CacheKey.ACCESSTOKEN : CacheKey.REFRESHTOKEN)
}

export function setToken(access_token: string, refresh_token: string) {
  Cookies.set(CacheKey.ACCESSTOKEN, access_token)
  Cookies.set(CacheKey.REFRESHTOKEN, refresh_token)
}

export function removeToken() {
  Cookies.remove(CacheKey.ACCESSTOKEN)
  Cookies.remove(CacheKey.REFRESHTOKEN)
}
