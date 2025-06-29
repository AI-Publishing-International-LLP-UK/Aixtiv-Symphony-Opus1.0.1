// Mock Prisma types and client for use in application
// This is a stand-in replacement for @prisma/client imports

// Model type definitions
export type User = {
  id: string;
  name?: string;
  email: string;
  image?: string;
  bio?: string;
  organizationId?: string;
  role?: string;
  createdAt: Date;
  updatedAt: Date;
  interests?: Interests[];
  industries?: Industry[];
};

export type Course = {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  published?: boolean;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  activities?: Activity[];
};

export type Activity = {
  id: string;
  title: string;
  description?: string;
  type: ActivityType;
  courseId: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  webinar?: Webinar;
};

export type Webinar = {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  activityId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Industry = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  users?: User[];
};

export type Interests = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  users?: User[];
};

export type ProductsVendor = {
  id: string;
  name: string;
  description?: string;
  website?: string;
  logo?: string;
  createdAt: Date;
  updatedAt: Date;
};

export enum ActivityType {
  VIDEO = 'VIDEO',
  QUIZ = 'QUIZ',
  ASSIGNMENT = 'ASSIGNMENT',
  DOCUMENT = 'DOCUMENT',
  WEBINAR = 'WEBINAR'
}

// Mock class for collection operations
class MockCollection<T> {
  private data: T[] = [];

  async findMany(args?: { where?: any; include?: any; orderBy?: any }): Promise<T[]> {
    return this.data;
  }

  async findUnique(args: { where: any; include?: any }): Promise<T | null> {
    return this.data.find(item => 
      Object.keys(args.where).every(key => 
        // @ts-ignore
        (item as any)[key] === args.where[key]
      )
    ) || null;
  }

  async create(args: { data: any; include?: any }): Promise<T> {
    const newItem = {
      id: `mock-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...args.data
    } as T;
    this.data.push(newItem);
    return newItem;
  }

  async update(args: { where: any; data: any; include?: any }): Promise<T> {
    const index = this.data.findIndex(item => 
      Object.keys(args.where).every(key => 
        // @ts-ignore
        (item as any)[key] === args.where[key]
      )
    );
    
    if (index !== -1) {
      this.data[index] = {
        ...this.data[index],
        ...args.data,
        updatedAt: new Date()
      };
      return this.data[index];
    }
    
    throw new Error('Record not found');
  }

  async delete(args: { where: any }): Promise<T> {
    const index = this.data.findIndex(item => 
      Object.keys(args.where).every(key => 
        // @ts-ignore
        (item as any)[key] === args.where[key]
      )
    );
    
    if (index !== -1) {
      const deleted = this.data[index];
      this.data.splice(index, 1);
      return deleted;
    }
    
    throw new Error('Record not found');
  }

  async count(args?: { where?: any }): Promise<number> {
    return this.data.length;
  }
}

// Mock PrismaClient class
export class PrismaClient {
  user = new MockCollection<User>();
  course = new MockCollection<Course>();
  activity = new MockCollection<Activity>();
  webinar = new MockCollection<Webinar>();
  industry = new MockCollection<Industry>();
  interests = new MockCollection<Interests>();
  productsVendor = new MockCollection<ProductsVendor>();

  constructor() {
    console.log('Mock PrismaClient initialized');
  }

  async $connect(): Promise<void> {
    console.log('Mock connection established');
  }

  async $disconnect(): Promise<void> {
    console.log('Mock connection closed');
  }
}

// Export a singleton instance of the PrismaClient
export const prisma = new PrismaClient();

// Also export as default export
export default prisma;

