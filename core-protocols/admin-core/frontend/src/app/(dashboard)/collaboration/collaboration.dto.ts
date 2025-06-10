export type CollaborationDTO = {
  User: {
    id: string
    email: string
    firstName: string
    lastName: string
  }
} & {
  id: number
  userId: string
  feedbackOptions: string[]
  additionalFeedback: string | null
  userFriendlyRating: number
  createdAt: Date
  updatedAt: Date
}
