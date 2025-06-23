'use client'

import axios from 'axios'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Upload, Check, File } from 'lucide-react'
import { Progress } from '@nextui-org/react'




export default function FileUploaderHomework({ data, onUploadComplete }) {
  const [file, setFile] = useState(data?.file)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (data?.file && data.file !== file) {
      setFile(data.file)
    }
  }, [data?.file, file])

  async function uploadFile(selectedFile) {
    setFile(undefined)
    setLoading(true)
    setProgress(0)

    if (!selectedFile) {
      toast.error('File Empty')
      setLoading(false)
      return
    }

    if (selectedFile.size > 6548576) {
      toast.error('File size exceeds the limit of 6.5MB')
      setLoading(false)
      return
    }

    const imageData = new FormData()
    imageData.append('file', selectedFile)

    try {
      const response = await axios.post(
        'https://supabase.pockethost.io/api/collections/homework_files/records',
        imageData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setProgress(percentCompleted)
          }
        }
      )

      const r = response.data
      const fileUrl = `https://supabase.pockethost.io/api/files/${r.collectionId}/${r.id}/${r.file}`
      onUploadComplete?.(fileUrl)
      setFile(fileUrl)
    } catch (error) {
      toast.error('Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className={`relative p-4 border-2 border-dashed rounded-lg ${file ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => uploadFile(e.target.files?.[0])}
          disabled={loading}
        />
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          {!file && !loading && (
            <>
              <Upload className="w-8 h-8 text-gray-400" />
              <p className="text-sm text-gray-500">Click or drag file to upload</p>
            </>
          )}
          {file && !loading && (
            <>
              <Check className="w-8 h-8 text-green-500" />
              <p className="text-sm text-green-600">File uploaded successfully</p>
              <div className="flex items-center space-x-2">
                <File className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">{file.split('/').pop() || 'file.png'}</span>
              </div>
            </>
          )}
          {loading && (
            <>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-blue-600">Uploading... {progress}%</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}