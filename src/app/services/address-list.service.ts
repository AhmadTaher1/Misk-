import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AddressListService {
  private profileUrl = 'http://localhost:8085/users/profile';

  constructor(private http: HttpClient) {}

  getUserAddresses(): Observable<any> {
    return this.http.get(this.profileUrl);
  }
}
