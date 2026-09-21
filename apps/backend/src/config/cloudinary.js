import { v2 as cloudinary } from 'cloudinary'
import AppError from '../errors/AppError.js'
import 'dotenv/config'

const requiredConfig = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']

// Throw a clear error if the developer forgot to set up the .env
requiredConfig.forEach((key) => {
  if (!process.env[key]) {
    throw new AppError(`Missing Cloudinary Config: ${key}`)
  }
})

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export default cloudinary
