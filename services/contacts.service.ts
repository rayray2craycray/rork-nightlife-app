/**
 * Contacts Service
 * Handles phone contacts sync and matching for friend suggestions
 */

import * as Contacts from 'expo-contacts';
import { Platform, Alert } from 'react-native';
import * as Crypto from 'expo-crypto';
import { syncContacts } from './api';

const USE_MOCK_DATA = process.env.NODE_ENV === 'development';
const ENABLE_CONTACT_SYNC = process.env.ENABLE_CONTACT_SYNC === 'true';

export interface ContactMatch {
  contactId: string;
  name: string;
  phoneNumber: string;
  userId?: string; // Matched user ID in the app
  avatarUrl?: string;
}

export interface ContactSyncResult {
  totalContacts: number;
  matchedContacts: ContactMatch[];
  syncedAt: string;
}

/**
 * Request permission to access contacts
 */
export async function requestContactsPermission(): Promise<boolean> {
  try {
    const { status } = await Contacts.requestPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Contacts Permission',
        'Enable contacts access to find friends who are also on the app.',
        [{ text: 'OK' }]
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting contacts permission:', error);
    return false;
  }
}

/**
 * Get all phone contacts
 */
export async function getPhoneContacts(): Promise<Contacts.Contact[]> {
  try {
    const hasPermission = await requestContactsPermission();
    if (!hasPermission) {
      return [];
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.Name,
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Emails,
        Contacts.Fields.Image,
      ],
    });

    return data;
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return [];
  }
}

/**
 * Extract and normalize phone numbers from contacts
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If it starts with country code, keep it; otherwise assume US (+1)
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  } else if (digits.length === 10) {
    return `+1${digits}`;
  }

  return `+${digits}`;
}

/**
 * Hash phone number for privacy (SHA-256)
 * This ensures phone numbers are not sent in plain text to the backend
 */
async function hashPhoneNumber(phoneNumber: string): Promise<string> {
  try {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      phoneNumber
    );
    return hash;
  } catch (error) {
    console.error('Error hashing phone number:', error);
    return phoneNumber; // Fallback to unhashed (not recommended for production)
  }
}

/**
 * Sync contacts with backend to find matches
 * Hashes phone numbers before sending for privacy
 */
export async function syncContactsWithBackend(
  contacts: Contacts.Contact[],
  userId: string = 'user-me'
): Promise<ContactSyncResult> {
  if (!ENABLE_CONTACT_SYNC) {
    console.log('Contact sync is disabled');
    return {
      totalContacts: 0,
      matchedContacts: [],
      syncedAt: new Date().toISOString(),
    };
  }

  try {
    // Use mock data in development
    if (USE_MOCK_DATA) {
      console.log('Using mock contact data (development mode)');
      const matchedContacts = await mockContactMatching(contacts);
      return {
        totalContacts: contacts.length,
        matchedContacts,
        syncedAt: new Date().toISOString(),
      };
    }

    // PRODUCTION: Extract and hash phone numbers
    const phoneNumberMap = new Map<string, { contact: Contacts.Contact; phone: string }>();
    const phoneNumbers: string[] = [];

    for (const contact of contacts) {
      if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
        for (const phoneEntry of contact.phoneNumbers) {
          if (phoneEntry.number) {
            const normalized = normalizePhoneNumber(phoneEntry.number);
            phoneNumbers.push(normalized);
            phoneNumberMap.set(normalized, { contact, phone: phoneEntry.number });
          }
        }
      }
    }

    // Hash phone numbers for privacy
    const hashedPhoneNumbers: string[] = [];
    const hashMap = new Map<string, string>(); // hashed -> original

    for (const phoneNumber of phoneNumbers) {
      const hashed = await hashPhoneNumber(phoneNumber);
      hashedPhoneNumbers.push(hashed);
      hashMap.set(hashed, phoneNumber);
    }

    console.log(`Syncing ${hashedPhoneNumbers.length} hashed phone numbers with backend`);

    // Send to backend
    const response = await syncContacts({
      phoneNumbers: hashedPhoneNumbers,
      userId,
    });

    // Map backend matches back to contacts
    const matchedContacts: ContactMatch[] = response.matches.map(match => {
      const originalPhone = hashMap.get(match.hashedPhone);
      const contactData = originalPhone ? phoneNumberMap.get(originalPhone) : undefined;

      return {
        contactId: match.userId,
        name: match.displayName,
        phoneNumber: contactData?.phone || '',
        userId: match.userId,
        avatarUrl: match.avatarUrl,
      };
    });

    return {
      totalContacts: contacts.length,
      matchedContacts,
      syncedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error syncing contacts:', error);

    // Fallback to mock data if API fails
    if (USE_MOCK_DATA) {
      console.log('API failed, falling back to mock data');
      const matchedContacts = await mockContactMatching(contacts);
      return {
        totalContacts: contacts.length,
        matchedContacts,
        syncedAt: new Date().toISOString(),
      };
    }

    return {
      totalContacts: 0,
      matchedContacts: [],
      syncedAt: new Date().toISOString(),
    };
  }
}

/**
 * Mock contact matching (replace with real API call in production)
 * Simulates finding users who are in the user's contacts and on the app
 */
async function mockContactMatching(contacts: Contacts.Contact[]): Promise<ContactMatch[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simulate finding some matches (in production, backend would do this)
  const matches: ContactMatch[] = [];

  // Take first 5 contacts as "matched" users for demo
  contacts.slice(0, 5).forEach((contact, index) => {
    if (contact.phoneNumbers && contact.phoneNumbers[0]) {
      matches.push({
        contactId: contact.id,
        name: contact.name || 'Unknown',
        phoneNumber: contact.phoneNumbers[0].number || '',
        userId: `contact-user-${index + 1}`,
        avatarUrl: contact.image?.uri || `https://i.pravatar.cc/150?img=${40 + index}`,
      });
    }
  });

  return matches;
}

/**
 * Get contact-based friend suggestions
 */
export async function getContactSuggestions(): Promise<ContactMatch[]> {
  try {
    const contacts = await getPhoneContacts();
    const syncResult = await syncContactsWithBackend(contacts);
    return syncResult.matchedContacts;
  } catch (error) {
    console.error('Error getting contact suggestions:', error);
    return [];
  }
}
