export interface Category {
  _id: string
  name: string
  description: string
  icon?: string
  coverImage?: string
  parentId?: string
  sort: number
  articleCount: number
  createdAt: string
  updatedAt: string
}

export interface CategoryQueryParams {
  page: number
  limit: number
  keyword?: string
}

export interface CategoryResponse {
  categories: Category[]
  pagination: {
    total: number
    totalPages: number
    currentPage: number
    limit: number
  }
}
