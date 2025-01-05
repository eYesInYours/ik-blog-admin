export interface Comment {
  _id: string
  content: string
  author: {
    _id: string
    username: string
    email: string
    avatar: string
  }
  article: {
    _id: string
    title: string
    url: string
  }
  status: "pending" | "approved" | "rejected" | "reported"
  likes: number
  replies: number
  createdAt: string
}

export interface CommentQueryParams {
  page: number
  limit: number
  keyword?: string
  status?: string
  dateRange?: [Date, Date]
}

export interface CommentResponse {
  comments: Comment[]
  pagination: {
    total: number
    totalPages: number
    currentPage: number
    limit: number
  }
}
