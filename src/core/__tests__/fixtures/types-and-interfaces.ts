/**
 * Test fixture: Interfaces, types, and enums
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  age?: number;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

export type StringOrNumber = string | number;

export type Point = {
  x: number;
  y: number;
};

export enum Status {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum Priority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
}

// Not exported
interface _InternalConfig {
  secret: string;
}

export const API_URL = 'https://api.example.com';

export const DEFAULT_TIMEOUT = 5000;

// Not exported
const _INTERNAL_KEY = 'secret';
