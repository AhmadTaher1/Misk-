import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UserRegisterModel } from '../models/UserRegister';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RegisterService {

  private apiUrl = 'http://localhost:8085/users/register';

  constructor(private http: HttpClient) { }

  registerUser(user: UserRegisterModel): Observable<any> {
    return this.http.post(this.apiUrl, user);
  }
}
