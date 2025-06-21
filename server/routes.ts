import type { Express } from "express";
import { createServer, type Server } from "http";
import { insertDomainSchema } from "@shared/schema";
import { z } from "zod";
import { spawn } from "child_process";
import path from "path";

function executePythonScript(action: string, ...args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, "python_api.py");
    const pythonProcess = spawn("python3", [pythonScript, action, ...args]);
    
    let output = "";
    let errorOutput = "";
    
    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });
    
    pythonProcess.on("close", (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output.trim());
          resolve(result);
        } catch (e) {
          reject(new Error("Failed to parse Python script output"));
        }
      } else {
        reject(new Error(`Python script failed: ${errorOutput || output}`));
      }
    });
    
    pythonProcess.on("error", (error) => {
      reject(error);
    });
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all domains
  app.get("/api/domains", async (req, res) => {
    try {
      const result = await executePythonScript("list");
      if (result.success) {
        res.json(result.data);
      } else {
        res.status(500).json({ message: result.message || "Failed to fetch domains" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch domains from server" });
    }
  });

  // Get domain stats
  app.get("/api/domains/stats", async (req, res) => {
    try {
      const result = await executePythonScript("stats");
      if (result.success) {
        res.json(result.data);
      } else {
        res.status(500).json({ message: result.message || "Failed to fetch domain stats" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch domain stats from server" });
    }
  });

  // Create a new domain
  app.post("/api/domains", async (req, res) => {
    try {
      const validatedData = insertDomainSchema.parse(req.body);
      const { name, installSsl } = validatedData;
      
      const result = await executePythonScript("add", name, installSsl ? "true" : "false");
      
      if (result.success) {
        // Get updated domain list to return the created domain
        const domainsResult = await executePythonScript("list");
        if (domainsResult.success) {
          const newDomain = domainsResult.data.find((d: any) => d.name === name);
          res.status(201).json(newDomain || { name, message: result.message });
        } else {
          res.status(201).json({ name, message: result.message });
        }
      } else {
        res.status(400).json({ message: result.message });
      }
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
      const domainId = req.params.id;
      
      // First get the domain list to find the domain name by ID
      const domainsResult = await executePythonScript("list");
      if (!domainsResult.success) {
        return res.status(500).json({ message: "Failed to fetch domains" });
      }
      
      const domain = domainsResult.data.find((d: any) => d.id.toString() === domainId);
      if (!domain) {
        return res.status(404).json({ message: "Domain not found" });
      }

      const result = await executePythonScript("install_ssl", domain.name);
      
      if (result.success) {
        // Get updated domain info
        const updatedDomainsResult = await executePythonScript("list");
        if (updatedDomainsResult.success) {
          const updatedDomain = updatedDomainsResult.data.find((d: any) => d.name === domain.name);
          res.json(updatedDomain || domain);
        } else {
          res.json(domain);
        }
      } else {
        res.status(500).json({ message: result.message });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to install SSL certificate" });
    }
  });

  // Delete a domain
  app.delete("/api/domains/:id", async (req, res) => {
    try {
      const domainId = req.params.id;
      
      // First get the domain list to find the domain name by ID
      const domainsResult = await executePythonScript("list");
      if (!domainsResult.success) {
        return res.status(500).json({ message: "Failed to fetch domains" });
      }
      
      const domain = domainsResult.data.find((d: any) => d.id.toString() === domainId);
      if (!domain) {
        return res.status(404).json({ message: "Domain not found" });
      }

      const result = await executePythonScript("delete", domain.name);
      
      if (result.success) {
        res.json({ message: result.message });
      } else {
        res.status(500).json({ message: result.message });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete domain" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
