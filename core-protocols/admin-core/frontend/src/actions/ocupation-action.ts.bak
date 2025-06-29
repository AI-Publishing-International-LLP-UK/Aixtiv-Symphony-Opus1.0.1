'use server'

import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc } from '@firebase/firestore'

import { db } from '@/aixtiv-orchestra/services/firebase'

interface Occupation {
id: string
name: string
}

const occupationsRef = collection(db, 'occupations')

//crud basic

export const createOccupation = async (name: string): Promise<Occupation> => {
  try {
    const docRef = await addDoc(occupationsRef, { name })
    const newDoc = await getDoc(docRef)

    
return { id: docRef.id, ...newDoc.data() } as Occupation
  } catch (error) {
    console.error(error)
    throw new Error('Failed to occupation webinar')
  }
}

export const getAllOccupation = async (): Promise<Occupation[]> => {
  try {
    const snapshot = await getDocs(occupationsRef)

    
return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Occupation[]
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find occupation')
  }
}

export const getOccupationById = async (id: string) => {
  try {
    const docRef = doc(occupationsRef, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) return null
    
return { id: docSnap.id, ...docSnap.data() } as Occupation
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find occupation')
  }
}

export const deleteOccupation = async (id: string): Promise<Occupation> => {
  try {
    const docRef = doc(occupationsRef, id)

    await deleteDoc(docRef)
    
return { id } as Occupation
  } catch (error) {
    console.error(error)
    throw new Error('Failed to delete occupation')
  }
}

export const updateOccupation = async (id: string, data: Partial<Occupation>): Promise<Occupation> => {
  try {
    const docRef = doc(occupationsRef, id)

    await updateDoc(docRef, data)
    const updatedDoc = await getDoc(docRef)

    
return { id: updatedDoc.id, ...updatedDoc.data() } as Occupation
  } catch (error) {
    console.error(error)
    throw new Error('Failed to update occupation')
  }
}
