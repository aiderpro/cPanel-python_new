import { domains, type Domain, type InsertDomain } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<any | undefined>;
  getUserByUsername(username: string): Promise<any | undefined>;
  createUser(user: any): Promise<any>;
  
  // Domain operations
  getAllDomains(): Promise<Domain[]>;
  getDomain(id: number): Promise<Domain | undefined>;
  getDomainByName(name: string): Promise<Domain | undefined>;
  createDomain(domain: Omit<InsertDomain, 'installSsl'>): Promise<Domain>;
  updateDomain(id: number, updates: Partial<Domain>): Promise<Domain | undefined>;
  deleteDomain(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, any>;
  private domains: Map<number, Domain>;
  private currentUserId: number;
  private currentDomainId: number;

  constructor() {
    this.users = new Map();
    this.domains = new Map();
    this.currentUserId = 1;
    this.currentDomainId = 1;
    
    // Add some sample domains for demonstration
    this.seedDomains();
  }

  private seedDomains() {
    const sampleDomains: Domain[] = [
      {
        id: 1,
        name: "example.com",
        sslStatus: "valid",
        sslExpiryDate: "2024-08-15",
        createdAt: new Date("2024-01-01"),
      },
      {
        id: 2,
        name: "blog.example.com",
        sslStatus: "expiring_soon",
        sslExpiryDate: "2024-07-05",
        createdAt: new Date("2024-02-01"),
      },
      {
        id: 3,
        name: "old.example.com",
        sslStatus: "expired",
        sslExpiryDate: "2024-04-10",
        createdAt: new Date("2024-01-15"),
      },
      {
        id: 4,
        name: "shop.example.com",
        sslStatus: "no_ssl",
        sslExpiryDate: null,
        createdAt: new Date("2024-03-01"),
      },
    ];

    sampleDomains.forEach(domain => {
      this.domains.set(domain.id, domain);
      if (domain.id >= this.currentDomainId) {
        this.currentDomainId = domain.id + 1;
      }
    });
  }

  async getUser(id: number): Promise<any | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: any): Promise<any> {
    const id = this.currentUserId++;
    const user: any = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllDomains(): Promise<Domain[]> {
    return Array.from(this.domains.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getDomain(id: number): Promise<Domain | undefined> {
    return this.domains.get(id);
  }

  async getDomainByName(name: string): Promise<Domain | undefined> {
    return Array.from(this.domains.values()).find(domain => domain.name === name);
  }

  async createDomain(domainData: Omit<InsertDomain, 'installSsl'>): Promise<Domain> {
    const id = this.currentDomainId++;
    const domain: Domain = {
      ...domainData,
      id,
      createdAt: new Date(),
    };
    this.domains.set(id, domain);
    return domain;
  }

  async updateDomain(id: number, updates: Partial<Domain>): Promise<Domain | undefined> {
    const existing = this.domains.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.domains.set(id, updated);
    return updated;
  }

  async deleteDomain(id: number): Promise<boolean> {
    return this.domains.delete(id);
  }
}

export const storage = new MemStorage();
