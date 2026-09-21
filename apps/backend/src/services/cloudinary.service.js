import cloudinary from '../config/cloudinary.js'
import AppError from '../errors/AppError.js'

/**
 * Uploads a file buffer to Cloudinary
 * @param {Buffer} fileBuffer - The req.file.buffer from Multer
 * @param {string} folder - Destination folder in Cloudinary
 * @returns {Promise<object>} - The Cloudinary upload response
 */

export const uploadImage = (filebuffer, folder = 'products') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto', // autamatically detects jpg or png
      },
      (err, result) => {
        if (err) return reject(new AppError('Cloudinary upload failed', 500))
        resolve(result)
      },
    )

    uploadStream.end(filebuffer)
  })
}

/**
 * Deletes an image from Cloudinary using its public_id
 * @param {string} publicId - The ID stored in our DB (e.g., 'products/abc123xyz')
 */

export const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId)
    return result
  } catch (error) {
    throw new AppError('Failed to delete image from cloudinary', 500)
  }
}
