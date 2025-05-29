// lib/helptype.ts
import axios from "axios";
import { prisma } from "../prisma/connection";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_HELP_TYPES = ['Billing', 'Appeal', 'Giveaway', 'Rust', 'Other'];

export const fetchHelpTypes = async (): Promise<string[]> => {
  try {
    // Try to get cached types
    const cached = await prisma.helpTypeCache.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    // Return cached types if fresh
    if (cached && (Date.now() - cached.updatedAt.getTime()) < CACHE_TTL_MS) {
      return cached.types as string[];
    }

    // Fetch from Intercom
    console.log("Fetching fresh help types from Intercom");
    const response = await axios.get('https://api.intercom.io/data_attributes', {
      headers: {
        'Authorization': `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`,
        'Accept': 'application/json',
      },
      params: {
        model: 'conversation'
      }
    });

    const helpTypeAttribute = response.data.data.find(
      (attr: { name: string; }) => attr.name === 'help_type' || attr.name === 'category'
    );

    const types = helpTypeAttribute?.options || DEFAULT_HELP_TYPES;

    // Update cache - MySQL compatible upsert
    await prisma.helpTypeCache.upsert({
      where: { uuid: cached?.uuid || '' },
      create: { types },
      update: { types }
    });

    return types;
  } catch (error) {
    console.error('Error in fetchHelpTypes:', error);
    // Try to return cached types if available
    const fallback = await prisma.helpTypeCache.findFirst({
      orderBy: { updatedAt: 'desc' }
    });
    return fallback?.types as string[] || DEFAULT_HELP_TYPES;
  }
};


export const initializeHelpTypes = async (): Promise<void> => {
  try {
    // Initial fetch
    await fetchHelpTypes(); 
    
    // Set up periodic refresh
    setInterval(async () => {
      try {
        await fetchHelpTypes();
      } catch (err) {
        console.error('Scheduled refresh failed:', err);
      }
    }, CACHE_TTL_MS);
  } catch (error) {
    console.error('HelpType initialization failed:', error);
  }
};