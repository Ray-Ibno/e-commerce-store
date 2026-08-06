import multer from 'multer'
import AppError from '../errors/AppError.js'

const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true)
  } else {
    cb(new AppError('Please upload only images.', 400), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
})

export default upload
