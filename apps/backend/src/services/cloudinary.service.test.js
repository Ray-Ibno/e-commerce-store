import cloudinary from '../config/cloudinary.js'
import AppError from '../errors/AppError'
import { uploadImage, deleteImage } from './cloudinary.service.js'

jest.mock('../config/cloudinary', () => ({
  uploader: {
    upload_stream: jest.fn(),
    destroy: jest.fn(),
  },
}))

describe('uploadImage Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockBuffer = Buffer.from('fake-image-bytes')
  const mockSuccessResponse = {
    secure_url: 'https://cloudinary.com',
    public_id: 'mouse_123',
  }

  test('should successfully upload an image stream and resolve the promise result', async () => {
    const mockEnd = jest.fn()

    cloudinary.uploader.upload_stream.mockImplementation((options, callback) => {
      // Simulate the stream returning an object that has an .end() function
      return {
        end: mockEnd.mockImplementation(() => {
          // Inside .end(), trigger the callback with no error (null) and success data
          callback(null, mockSuccessResponse)
        }),
      }
    })

    const result = await uploadImage(mockBuffer, 'custom-folder')

    expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
      {
        folder: 'custom-folder',
        resource_type: 'auto',
      },
      expect.any(Function), // The callback function
    )

    expect(mockEnd).toHaveBeenCalledWith(mockBuffer)
    expect(result).toEqual(mockSuccessResponse)
  })
})

describe('deleteImage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockDestroyResponse = {
    result: 'ok',
  }

  test('should delete the image from the cloudinary database', async () => {
    cloudinary.uploader.destroy.mockResolvedValue(mockDestroyResponse)

    const result = await deleteImage('public-id-123')

    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('public-id-123')
    expect(result).toEqual(mockDestroyResponse)
  })

  test('should throw a 500 error if uploader failed', async () => {
    cloudinary.uploader.destroy.mockRejectedValue(
      new AppError('Failed to delete image from cloudinary', 500),
    )

    await expect(deleteImage('public-id-123')).rejects.toThrow(
      new AppError('Failed to delete image from cloudinary', 500),
    )

    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('public-id-123')
  })
})
