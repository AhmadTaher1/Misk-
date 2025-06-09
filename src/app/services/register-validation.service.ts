import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RegisterValidationService {

  constructor() { }

  isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  isValidPhone(phone: string): boolean {
    const regex = /^(01)[0-9]{9}$/;
    return regex.test(phone);
  }

  isValidPassword(password: string): boolean {
    return password.length >= 6;
  }

  isValidCreditLimit(limit: string): boolean {
    const val = parseInt(limit, 10);
    return !isNaN(val) && val >= 1000 && val <= 50000;
  }

  validateAll(user: any): string[] {
    const errors: string[] = [];

    if (!user.userName) errors.push("Username is required.");
    if (!this.isValidEmail(user.email)) errors.push("Invalid email format.");
    if (!this.isValidPhone(user.phoneNumber)) errors.push("Invalid phone number.");
    if (!this.isValidPassword(user.password)) errors.push("Password must be at least 6 characters.");
    if (!this.isValidCreditLimit(user.creditLimit)) errors.push("Credit limit must be between 1000 and 50000.");

    return errors;
  }
}
