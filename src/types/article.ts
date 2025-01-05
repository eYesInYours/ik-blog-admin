export interface Article {
  _id: string
  title: string
  content: string
  status: "draft" | "published" | "disabled" | "active"
  tags: string[]
  category?: string
  cover?: string
  summary?: string
  allowComment?: boolean
  author: {
    _id: string
    username: string
    avatar: string
  }
  views?: number
  likes?: number
  comments?: number
  createdAt: string
  updatedAt: string
}

export interface ArticleQueryParams {
  page: number
  limit: number
  keyword?: string
  status?: string
  startDate?: string
  endDate?: string
  tags?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface ArticleResponse {
  articles: Article[]
  pagination: {
    total: number
    totalPages: number
    currentPage: number
    limit: number
  }
}
