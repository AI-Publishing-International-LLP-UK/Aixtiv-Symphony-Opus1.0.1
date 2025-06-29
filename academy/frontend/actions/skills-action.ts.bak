'use server'

import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc } from '@firebase/firestore'
import { db } from '@/aixtiv-orchestra/services/firebase'

const skillsRef = collection(db, 'skills')

export interface CreateSkillDto {
  skillName: string
  description: string
}

export const createSkill = async (
  data: CreateSkillDto
): Promise<{
  id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
}> => {
  try {
    const docRef = await addDoc(skillsRef, {
    name: data.skillName,
    description: data.description,
    createdAt: new Date(),
    updatedAt: new Date()
    })
    const newDoc = await getDoc(docRef)
    return { id: docRef.id, ...newDoc.data() } as any

    return createdSkill
  } catch (error) {
    console.error(error)
    throw new Error('Failed to create skill')
  }
}

export const getAllSkills = async (): Promise<
  {
    id: string
    name: string
    description: string
    createdAt: Date
    updatedAt: Date
  }[]
> => {
  try {
    const snapshot = await getDocs(skillsRef)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find skills')
  }
}

export const getSkillById = async (id: string) => {
  try {
    const docRef = doc(skillsRef, id)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return { id: docSnap.id, ...docSnap.data() }
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find skill')
  }
}

export const updateSkill = async (
  id: string,
  data: Partial<CreateSkillDto>
): Promise<{
  id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
}> => {
  try {
    const docRef = doc(skillsRef, id)
    const updateData = {
    ...data,
    updatedAt: new Date()
    }
    await updateDoc(docRef, updateData)
    const updatedDoc = await getDoc(docRef)
    return { id: updatedDoc.id, ...updatedDoc.data() }

    return updatedSkill
  } catch (error) {
    console.error(error)
    throw new Error('Failed to update skill')
  }
}

export const deleteSkill = async (id: string): Promise<void> => {
  try {
    const docRef = doc(skillsRef, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error(error)
    throw new Error('Failed to delete skill')
  }
}
