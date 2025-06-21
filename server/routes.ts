import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDomainSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all domains
  app.get("/api/domains", async (req, res) => {
    try {
      const domains = await storage.getAllDomains();
      res.json(domains);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch domains" });
    }
  });

  // Get domain stats
  app.get("/api/domains/stats", async (req, res) => {
    try {
      const domains = await storage.getAllDomains();
      const currentDate = new Date();
      
      const stats = {
        totalDomains: domains.length,
        activeSsl: domains.filter(d => d.sslStatus === "valid").length,
        expiringSoon: domains.filter(d => d.sslStatus === "expiring_soon").length,
        expired: domains.filter(d => d.sslStatus === "expired").length,
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch domain stats" });
    }
  });

  // Create a new domain
  app.post("/api/domains", async (req, res) => {
    try {
      const validatedData = insertDomainSchema.parse(req.body);
      const { installSsl, ...domainData } = validatedData;
      
      // Check if domain already exists
      const existingDomain = await storage.getDomainByName(domainData.name);
      if (existingDomain) {
        return res.status(400).json({ message: "Domain already exists" });
      }

      // Set initial SSL status
      if (installSsl) {
        domainData.sslStatus = "valid";
        domainData.sslExpiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 90 days from now
      } else {
        domainData.sslStatus = "no_ssl";
        domainData.sslExpiryDate = null;
      }

      const domain = await storage.createDomain(domainData);
      res.status(201).json(domain);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create domain" });
    }
  });

  // Install SSL for a domain
  app.post("/api/domains/:id/ssl", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const domain = await storage.getDomain(id);
      
      if (!domain) {
        return res.status(404).json({ message: "Domain not found" });
      }

      // Simulate SSL installation
      const expiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 90 days from now
      
      const updatedDomain = await storage.updateDomain(id, {
        sslStatus: "valid",
        sslExpiryDate: expiryDate,
      });

      res.json(updatedDomain);
    } catch (error) {
      res.status(500).json({ message: "Failed to install SSL certificate" });
    }
  });

  // Delete a domain
  app.delete("/api/domains/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const domain = await storage.getDomain(id);
      
      if (!domain) {
        return res.status(404).json({ message: "Domain not found" });
      }

      const deleted = await storage.deleteDomain(id);
      if (deleted) {
        res.json({ message: "Domain deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete domain" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete domain" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
