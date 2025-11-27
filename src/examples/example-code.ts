/**
 * Example code file that demonstrates symbols that would be tracked by Doctype
 */

/**
 * Authenticates a user with email and password
 */
export function login(_email: string, _password: string): string {
  // Authentication logic here
  return 'auth-token-123';
}

/**
 * Process and transform data
 */
export function processData(data: unknown): unknown {
  // Data processing logic
  return data;
}

/**
 * Represents a user in the system
 */
export class User {
  id: string;
  email: string;
  name: string;

  constructor(id: string, email: string, name: string) {
    this.id = id;
    this.email = email;
    this.name = name;
  }

  public updateEmail(newEmail: string): void {
    this.email = newEmail;
  }
}
