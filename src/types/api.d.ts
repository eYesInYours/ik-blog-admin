export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface StatisticsData {
  dates: string[]
  visits: number[]
  comments: number[]
  users: number[]
  articles: number[]
  totals: {
    visits: number
    comments: number
    users: number
    articles: number
  }
} 