export type DocumentFileType = "pdf" | "doc" | "docx" | "xls" | "xlsx" | "other";

export interface DocumentItem {
  id: string;
  title: string;
  category: string;
  topic: string;
  fileType: DocumentFileType;
  url: string;
  publishedAt: string;
  tags: string[];
  isNormative: boolean;
  sourcePage: string;
}

export interface ProcessGuide {
  id: string;
  title: string;
  audience: string;
  summary: string;
  steps: string[];
  requirements: string[];
  relatedDocuments: string[];
}

export interface FaqItem {
  id: string;
  section: string;
  question: string;
  answer: string;
  relatedDocuments: string[];
}

export interface ContactChannel {
  id: string;
  name: string;
  description: string;
  type: "whatsapp" | "email" | "phone" | "form";
  url: string;
  availability?: string;
}

export type ModuleVisibility = "public" | "private";

export interface ModuleDescriptor {
  key: string;
  title: string;
  description: string;
  path: string;
  visibility: ModuleVisibility;
  enabled: boolean;
  badge?: string;
}

export interface ContentResponse<T> {
  success: boolean;
  data: T;
  source: "wordpress" | "cache" | "fallback";
}
