// 图片处理相关的工具函数
export function compressImage(file: File, maxSize: number = 1024 * 1024): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target?.result as string
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Failed to get canvas context"))
          return
        }

        let { width, height } = img
        const ratio = width / height

        // 调整尺寸以减小文件大小
        if (width > 1920) {
          width = 1920
          height = width / ratio
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to compress image"))
              return
            }
            resolve(new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now()
            }))
          },
          "image/jpeg",
          0.8
        )
      }
      img.onerror = () => reject(new Error("Failed to load image"))
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
  })
}

export function validateImage(file: File): boolean {
  // 验证文件类型
  const validTypes = ["image/jpeg", "image/png", "image/gif"]
  if (!validTypes.includes(file.type)) {
    return false
  }

  // 验证文件大小（默认最大 5MB）
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    return false
  }

  return true
}
