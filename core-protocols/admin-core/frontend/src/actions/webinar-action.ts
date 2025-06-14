'use server'
import { db } from 'aixtiv-admin-core/firebase/firebaseConfig'
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, Timestamp, query } from 'firebase/firestore'
import type { Webinar } from 'aixtiv-admin-core/firebase/models/firebaseSchema'

const webinarCollection = collection(db, 'webinars')

export interface CreateWebinarDto {
  name: string
  description: string
  startDate: Date
  endDate: Date
  thumbnail: string
  speakerId: string
}

export const createWebinar = async (data: CreateWebinarDto): Promise<Webinar> => {
try {
    const room = await createRoomDailWebinar({ data: { startDate: data.startDate, endDate: data.endDate } })

    console.log('room:', room)

    // Create a new document reference with auto-generated ID
    const webinarRef = doc(webinarCollection)
    
    // Convert JavaScript Date objects to Firebase Timestamps
    const webinarData: Webinar = {
    id: webinarRef.id,
    name: data.name,
    description: data.description,
    startDate: Timestamp.fromDate(data.startDate),
    endDate: Timestamp.fromDate(data.endDate),
    webinarIdRoom: room.id,
    webinarUrlRoom: room.url,
    thumbnail: data.thumbnail,
    speakerId: data.speakerId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
    }

    // Save the webinar data to Firestore
    await setDoc(webinarRef, webinarData)

    console.log('webinar:', webinarData)

    // Convert Firebase Timestamps back to JavaScript Date objects for the return value
    return {
    ...webinarData,
    startDate: webinarData.startDate.toDate(),
    endDate: webinarData.endDate.toDate(),
    createdAt: webinarData.createdAt.toDate(),
    updatedAt: webinarData.updatedAt.toDate()
    } as any
} catch (error) {
    console.error(error)
    throw new Error('Failed to create webinar')
}
}

export const getAllWebinar = async (): Promise<Webinar[]> => {
try {
    const webinarQuery = query(webinarCollection)
    const querySnapshot = await getDocs(webinarQuery)
    
    const webinars: Webinar[] = []
    
    querySnapshot.forEach((doc) => {
    const data = doc.data() as Omit<Webinar, 'id'> & { 
        startDate: Timestamp, 
        endDate: Timestamp,
        createdAt: Timestamp,
        updatedAt: Timestamp
    }
    
    // Convert Firebase Timestamps to JavaScript Date objects
    webinars.push({
        ...data,
        id: doc.id,
        startDate: data.startDate.toDate(),
        endDate: data.endDate.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
    } as any)
    })
    
    return webinars
} catch (error) {
    console.error(error)
    throw new Error('Failed to find webinars')
}
}

export const getWebinarById = async (id: string): Promise<Webinar | null> => {
try {
    const webinarRef = doc(webinarCollection, id)
    const webinarSnap = await getDoc(webinarRef)
    
    if (!webinarSnap.exists()) {
    return null
    }
    
    const data = webinarSnap.data() as Omit<Webinar, 'id'> & {
    startDate: Timestamp,
    endDate: Timestamp,
    createdAt: Timestamp,
    updatedAt: Timestamp
    }
    
    // Convert Firebase Timestamps to JavaScript Date objects
    return {
    ...data,
    id: webinarSnap.id,
    startDate: data.startDate.toDate(),
    endDate: data.endDate.toDate(),
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate()
    } as any
} catch (error) {
    console.error(error)
    throw new Error('Failed to find webinar')
}
}

export const updateWebinar = async (id: string, data: Partial<Webinar>): Promise<Webinar> => {
try {
    const webinarRef = doc(webinarCollection, id)
    const webinarSnap = await getDoc(webinarRef)
    
    if (!webinarSnap.exists()) {
    throw new Error(`Webinar with ID ${id} not found`)
    }
    
    // Convert any Date objects to Firestore Timestamps
    const updateData: Record<string, any> = { ...data, updatedAt: Timestamp.now() }
    
    if (updateData.startDate instanceof Date) {
    updateData.startDate = Timestamp.fromDate(updateData.startDate)
    }
    
    if (updateData.endDate instanceof Date) {
    updateData.endDate = Timestamp.fromDate(updateData.endDate)
    }
    
    // Remove id from update data if present
    if ('id' in updateData) {
    delete updateData.id
    }
    
    await updateDoc(webinarRef, updateData)
    
    // Get the updated document
    const updatedSnap = await getDoc(webinarRef)
    const updatedData = updatedSnap.data() as Omit<Webinar, 'id'> & {
    startDate: Timestamp,
    endDate: Timestamp,
    createdAt: Timestamp,
    updatedAt: Timestamp
    }
    
    // Convert Firebase Timestamps back to JavaScript Date objects
    return {
    ...updatedData,
    id: updatedSnap.id,
    startDate: updatedData.startDate.toDate(),
    endDate: updatedData.endDate.toDate(),
    createdAt: updatedData.createdAt.toDate(),
    updatedAt: updatedData.updatedAt.toDate()
    } as any
} catch (error) {
    console.error(error)
    throw new Error('Failed to update webinar')
}
}

export const deleteWebinar = async (id: string): Promise<void> => {
try {
    const webinarRef = doc(webinarCollection, id)
    const webinarSnap = await getDoc(webinarRef)
    
    if (!webinarSnap.exists()) {
    throw new Error(`Webinar with ID ${id} not found`)
    }
    
    await deleteDoc(webinarRef)
} catch (error) {
    console.error(error)
    throw new Error('Failed to delete webinar')
}
}

export const createRoomDailWebinar = async ({
  data
}: {
  data: {
    startDate: Date
    endDate: Date
  }
}) => {
  const roomProperties = {
    privacy: 'private',
    properties: {
      eject_at_room_exp: true,
      start_audio_off: true,
      start_video_off: true,
      enable_recording: 'cloud',
      enable_transcription_storage: true,
      auto_transcription_settings: {
        language: 'en',
        model: 'nova-2'
      },
      nbf: new Date(data.startDate).getTime() / 1000,
      exp: new Date(data.endDate).getTime() / 1000,
      permissions: {
        canSend: ['video']
      },
      recordings_bucket: {
        bucket_name: process.env.BUCKET_AWS_NAME,
        bucket_region: process.env.REGION_AWS,
        assume_role_arn: process.env.DAYLY_AWS_ARN,
        allow_api_access: true
      },
      transcription_bucket: {
        bucket_name: process.env.BUCKET_AWS_NAME,
        bucket_region: process.env.REGION_AWS,
        assume_role_arn: process.env.DAYLY_AWS_ARN,
        allow_api_access: true
      }
    }
  }

  const response = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.DAILY_API_KEY}`
    },
    body: JSON.stringify(roomProperties)
  })

  if (!response.ok) {
    console.log(response.text())
    console.log(response)
    throw new Error(`Error creating Daily.co room: ${response.statusText}`)
  }

  const room = await response.json()

  return room
}
