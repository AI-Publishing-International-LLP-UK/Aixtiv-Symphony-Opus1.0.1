'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import List from '@mui/material/List'
import Avatar from '@mui/material/Avatar'
import ListItem from '@mui/material/ListItem'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

// Third-party Imports
import { toast } from 'react-toastify'

// Icon Imports

import { useDropzone } from 'react-dropzone'

import Cookies from 'js-cookie'

type FileProp = {
  name: string
  type: string
  size: number
}

type Props = {
  setFile: (url: string) => void
  loading: boolean
  changeLoading: (loading: boolean) => void
  stringFile?: string
  isPdf?: boolean
}

const FileUploaderRestrictions = ({ setFile, changeLoading, stringFile, isPdf }: Props) => {
  // States
  const [files, setFiles] = useState<File[]>([])

  const token = Cookies.get('token')

  const uploadFile = async (file: File) => {
    changeLoading(true)
    const formData = new FormData()

    formData.append('file', file)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/backoffices/upload`,

        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          method: 'POST',
          body: formData
        }
      )

      if (response.ok) {
        const data = await response.json()

        changeLoading(false)

        setFile(data.url)
      } else {
        changeLoading(false)
        throw new Error('Failed to upload file')
      }
    } catch (error) {
      console.error(error)
      changeLoading(false)
      toast.error('Failed to upload file', {
        autoClose: 3000
      })
    }
  }

  // Hooks
  const { getRootProps, getInputProps } = useDropzone({
    maxFiles: 1,
    maxSize: isPdf ? 20000000 : 2000000,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      ...(isPdf && { 'application/pdf': ['.pdf'] })
    },
    onDrop: (acceptedFiles: File[]) => {
      setFiles(acceptedFiles.map((file: File) => Object.assign(file)))
      uploadFile(acceptedFiles[0])
    },
    onDropRejected: () => {
      toast.error(`You can only upload 1 files & maximum size of ${isPdf ? '20' : '2'} MB.`, {
        autoClose: 3000
      })
    }
  })

  const renderFilePreview = (file: FileProp) => {
    if (file.type.startsWith('image')) {
      return <img width={38} height={38} alt={file.name} src={URL.createObjectURL(file as any)} />
    } else {
      return <i className='tabler-file-description' />
    }
  }

  const handleRemoveFile = (file: FileProp) => {
    const uploadedFiles = files
    const filtered = uploadedFiles.filter((i: FileProp) => i.name !== file.name)

    setFiles([...filtered])
  }

  const fileList = files.map((file: FileProp) => (
    <ListItem key={file.name}>
      <div className='file-details'>
        <div className='file-preview'>{renderFilePreview(file)}</div>
        <div>
          <Typography className='file-name'>{file.name}</Typography>
          <Typography className='file-size' variant='body2'>
            {Math.round(file.size / 100) / 10 > 1000
              ? `${(Math.round(file.size / 100) / 10000).toFixed(1)} mb`
              : `${(Math.round(file.size / 100) / 10).toFixed(1)} kb`}
          </Typography>
        </div>
      </div>
      <IconButton onClick={() => handleRemoveFile(file)}>
        <i className='tabler-x text-xl' />
      </IconButton>
    </ListItem>
  ))

  return (
    <>
      {files.length == 0 && stringFile && (
        <ListItem>
          <div className='file-details'>
            <div className='file-preview'>
              <img width={100} height={100} alt='thumbnail' src={stringFile} />
            </div>
            <div>
              <Typography className='file-name'>Thumbnail</Typography>
            </div>
          </div>
        </ListItem>
      )}

      {files.length ? (
        <>
          <List>{fileList}</List>
        </>
      ) : (
        <div {...getRootProps({ className: 'dropzone border p-5 rounded' })}>
          <input {...getInputProps()} />
          <div className='flex items-center flex-col'>
            <Avatar variant='rounded' className='bs-12 is-12 mbe-9'>
              <i className='tabler-upload' />
            </Avatar>
            <Typography variant='h4' className='mbe-2.5'>
              Drop files here or click to upload.
            </Typography>
            <Typography>Allowed *.jpeg, *.jpg, *.png, *.gif {isPdf ? ', *.pdf' : ''}</Typography>
            <Typography>Max 1 files and max size of {isPdf ? '20' : '2'} MB</Typography>
          </div>
        </div>
      )}
    </>
  )
}

export default FileUploaderRestrictions
