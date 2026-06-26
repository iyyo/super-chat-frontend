export interface LegalSection {
  id: string
  title: string
  paragraphs: string[]
  list?: string[]
}

export interface LegalDocument {
  title: string
  updatedAt: string
  intro: string
  sections: LegalSection[]
}
