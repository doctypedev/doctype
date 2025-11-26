/**
 * Test fixture: Exported classes
 */

export class Calculator {
  private result: number = 0;

  public add(value: number): void {
    this.result += value;
  }

  public subtract(value: number): void {
    this.result -= value;
  }

  public getResult(): number {
    return this.result;
  }

  private _reset(): void {
    this.result = 0;
  }
}

export class User {
  constructor(
    public name: string,
    public email: string,
    private password: string
  ) {}

  public validatePassword(input: string): boolean {
    return this.password === input;
  }

  public getName(): string {
    return this.name;
  }
}

// Not exported - should be ignored
class _InternalService {
  process(): void {}
}
