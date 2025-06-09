import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private redirectUrl: string | null = null;
  private loggedIn = new BehaviorSubject<boolean>(this.isLoggedIn());

  constructor(private http: HttpClient) {}

  /* login(): void {
    const newUserId = '1';
    const currentUserId = this.getUserId();
    localStorage.setItem('userId', newUserId);
  } */

  isLoggedInObservable() {
    return this.loggedIn.asObservable();
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post("http://localhost:8085/users/login", {email, password});
  }

  saveToken(token: string, role:string): void {
    localStorage.setItem("token", token);
    localStorage.setItem("role", role );
    this.loggedIn.next(true);
  }

  getToken(): string | null {
    return localStorage.getItem("token");
  }

  logout(): void {
    localStorage.removeItem("token");
    this.loggedIn.next(false);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  // To keep track with the page the user was in before goToLogin to redirect user to it again after login
  setRedirectUrl(url: string): void {
    this.redirectUrl = url;
  }

  getRedirectUrl(): string | null {
    return this.redirectUrl;
  }

  clearRedirectUrl(): void {
    this.redirectUrl = null;
  }

}
