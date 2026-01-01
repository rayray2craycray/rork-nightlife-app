/**
 * Contacts Service
 * Handles phone contacts sync and matching for friend suggestions
 */

import * as Contacts from 'expo-contacts';
import { Platform, Alert } from 'react-native';

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
 * Sync contacts with backend to find matches
 * In production, this would hash phone numbers before sending for privacy
 */
export async function syncContactsWithBackend(
  contacts: Contacts.Contact[]
): Promise<ContactSyncResult> {
  try {
    // Extract phone numbers from contacts
    const phoneNumbers: string[] = [];

    contacts.forEach(contact => {
      if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
        contact.phoneNumbers.forEach(phoneEntry => {
          if (phoneEntry.number) {
            const normalized = normalizePhoneNumber(phoneEntry.number);
            phoneNumbers.push(normalized);
          }
        });
      }
    });

    // TODO: In production, send hashed phone numbers to backend
    // For now, simulate matching with mock data
    const matchedContacts = await mockContactMatching(contacts);

    return {
      totalContacts: contacts.length,
      matchedContacts,
      syncedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error syncing contacts:', error);
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
